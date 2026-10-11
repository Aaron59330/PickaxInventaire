-- ─────────────────────────────── Boutiques : ouverture, achats, vêtements, réassort ───────────────────────────────
local function fail(msg) return { ok = false, error = msg } end

local function hourOk(h)
    if not h or not h.enabled then return true end
    local now = tonumber(os.date('%H'))
    local from, to = h.from or 0, h.to or 24
    if from == to then return true end
    if from < to then return now >= from and now < to end
    return now >= from or now < to        -- plage de nuit (ex : 20h → 4h)
end

-- Vérifie en une fois : boutique, emplacement, distance, accès (métier / licence), horaires
local function access(src, shopId, locIdx)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return nil, nil, nil, 'Joueur introuvable' end
    local shop = SB.Shops[tonumber(shopId) or 0]
    if not shop or not shop.enabled then return nil, nil, nil, 'Cette boutique est fermée' end
    local loc = shop.locations[tonumber(locIdx) or 0]
    if not loc then return nil, nil, nil, 'Emplacement introuvable' end
    if SB.distanceTo(src, loc.coords) > Config.ServerDistance then return nil, nil, nil, 'Tu es trop loin de la boutique' end
    if not SB.canSee(shop, xPlayer) then return nil, nil, nil, 'Boutique réservée' end
    local lic = shop.settings.access and shop.settings.access.license
    if lic and lic ~= '' and not Config.HasLicense(src, lic) then return nil, nil, nil, 'Une licence est requise pour entrer ici' end
    if not hourOk(shop.settings.hours) then
        local h = shop.settings.hours
        return nil, nil, nil, ('Fermé — ouvert de %dh à %dh'):format(h.from, h.to)
    end
    return shop, xPlayer, loc
end

-- ─────────────────────────────── Prix & paiement ───────────────────────────────
local function discountFor(shop, xPlayer)
    local s = shop.settings
    local d = (s.discount or 0) + ((s.jobDiscounts or {})[xPlayer.job.name] or 0)
    return math.min(90, d)
end

local function finalPrice(item, disc)
    local p = item.price
    if (item.promo or 0) > 0 then p = p * (100 - item.promo) / 100 end
    if disc > 0 then p = p * (100 - disc) / 100 end
    return math.floor(p + 0.5)
end

local function balance(xPlayer, method)
    local acc = Config.Payments[method].account
    if acc == 'money' then return xPlayer.getMoney() end
    local a = xPlayer.getAccount(acc)
    return a and a.money or 0
end

local function charge(xPlayer, method, amount)
    if amount <= 0 then return true end
    if balance(xPlayer, method) < amount then return false end
    local acc = Config.Payments[method].account
    if acc == 'money' then xPlayer.removeMoney(amount) else xPlayer.removeAccountMoney(acc, amount) end
    return true
end

local function refund(xPlayer, method, amount)
    if amount <= 0 then return end
    local acc = Config.Payments[method].account
    if acc == 'money' then xPlayer.addMoney(amount) else xPlayer.addAccountMoney(acc, amount) end
end

-- Les ventes en espèces / par carte peuvent alimenter un compte société (esx_addonaccount)
local function creditSociety(shop, method, amount)
    local acc = shop.settings.society
    if not acc or acc == '' or amount <= 0 or method == 'black_money' then return end
    pcall(function()
        TriggerEvent('esx_addonaccount:getSharedAccount', acc, function(account) if account then account.addMoney(amount) end end)
    end)
end

local function addStats(shop, total, lines)
    local st = shop.stats
    st.revenue = (st.revenue or 0) + total
    st.sales = (st.sales or 0) + 1
    st.items = st.items or {}
    local n = 0
    for _ in pairs(st.items) do n = n + 1 end
    for _, l in ipairs(lines or {}) do
        local e = st.items[l.name]
        if not e and n < 300 then e = { q = 0, r = 0 } st.items[l.name] = e n = n + 1 end
        if e then e.q = e.q + l.qty e.r = e.r + l.total end
    end
    SB.Dirty[shop.id] = true
end

local function paymentList(shop, xPlayer)
    local list = {}
    for id, p in pairs(Config.Payments) do
        if shop.settings.payments and shop.settings.payments[id] then list[#list + 1] = { id = id, label = p.label, balance = balance(xPlayer, id) } end
    end
    table.sort(list, function(a, b) return a.id < b.id end)
    return list
end

-- ─────────────────────────────── Ouverture ───────────────────────────────
ESX.RegisterServerCallback('shopbuilder:open', function(src, cb, shopId, locIdx)
    local shop, xPlayer, loc, err = access(src, shopId, locIdx)
    if not shop then return cb(fail(err)) end
    local s = shop.settings
    local disc = discountFor(shop, xPlayer)
    local payments = paymentList(shop, xPlayer)
    if #payments == 0 then return cb(fail('Aucun moyen de paiement n\'est accepté ici')) end
    local head = { id = shop.id, label = shop.label, type = shop.type, mode = s.mode or 'items', note = s.note or '', locIdx = tonumber(locIdx), discount = disc, color = s.color }

    if s.mode == 'clothing' then
        local restrict = {}
        for _, id in ipairs(s.clothing and s.clothing.parts or {}) do
            local part = Config.ClothingParts[id]
            if part then for _, k in ipairs(part.keys) do restrict[#restrict + 1] = k end end
        end
        local parts = {}
        for _, id in ipairs(s.clothing and s.clothing.parts or {}) do
            if Config.ClothingParts[id] then parts[#parts + 1] = Config.ClothingParts[id].label end
        end
        local base = (s.clothing and s.clothing.price) or 0
        return cb({ ok = true, shop = head, price = finalPrice({ price = base, promo = 0 }, disc), basePrice = base, parts = parts, restrict = restrict, payments = payments,
            currency = Config.Currency })
    end

    local licCache = {}
    local function hasLic(l)
        if l == nil or l == '' then return true end
        if licCache[l] == nil then licCache[l] = Config.HasLicense(src, l) end
        return licCache[l]
    end
    local items = {}
    for i, it in ipairs(shop.items) do
        local jobOk = true
        if it.jobs and #it.jobs > 0 then
            jobOk = false
            for _, j in ipairs(it.jobs) do if j == xPlayer.job.name then jobOk = true break end end
        end
        if it.enabled ~= false and jobOk then
            items[#items + 1] = {
                i = i, name = it.name, label = it.label, category = it.category, price = finalPrice(it, disc), base = it.price,
                promo = it.promo or 0, stock = it.stock, max = it.max or Config.MaxQtyPerPurchase, locked = not hasLic(it.license) or nil, license = it.license ~= '' and it.license or nil,
            }
        end
    end
    cb({ ok = true, shop = head, items = items, categories = s.categories or {}, payments = payments, currency = Config.Currency, imagePath = Config.ImagePath })
end)

-- ─────────────────────────────── Achat (panier) ───────────────────────────────
local busy = {}

local function isWeapon(name) return name:sub(1, 7):upper() == 'WEAPON_' end

local function doBuy(src, shopId, locIdx, cart, method)
    local shop, xPlayer, _, err = access(src, shopId, locIdx)
    if not shop then return fail(err) end
    if type(method) ~= 'string' or not Config.Payments[method] or not (shop.settings.payments or {})[method] then return fail('Moyen de paiement refusé') end
    if type(cart) ~= 'table' or #cart == 0 then return fail('Panier vide') end
    if #cart > Config.MaxCartLines then return fail('Panier trop grand') end

    local disc = discountFor(shop, xPlayer)
    local inv = SB.inventory()
    local merged, order, lines, total = {}, {}, {}, 0
    for _, l in ipairs(cart) do
        local idx, qty = math.floor(tonumber(l.i) or 0), math.floor(tonumber(l.qty) or 0)
        local it = shop.items[idx]
        if not it or it.name ~= l.name then return fail('Le catalogue a changé : rouvre la boutique') end
        if qty < 1 then return fail('Quantité invalide') end
        if not merged[idx] then merged[idx] = 0 order[#order + 1] = idx end
        merged[idx] = merged[idx] + qty
    end

    local licCache = {}
    for _, idx in ipairs(order) do
        local it, qty = shop.items[idx], merged[idx]
        if it.enabled == false then return fail(('« %s » n\'est plus en vente'):format(it.label)) end
        if it.jobs and #it.jobs > 0 then
            local okJob = false
            for _, j in ipairs(it.jobs) do if j == xPlayer.job.name then okJob = true break end end
            if not okJob then return fail(('« %s » est réservé'):format(it.label)) end
        end
        if it.license and it.license ~= '' then
            if licCache[it.license] == nil then licCache[it.license] = Config.HasLicense(src, it.license) end
            if not licCache[it.license] then return fail(('Licence requise pour « %s »'):format(it.label)) end
        end
        if qty > math.min(it.max or Config.MaxQtyPerPurchase, Config.MaxQtyPerPurchase) then return fail(('Quantité maximale dépassée pour « %s »'):format(it.label)) end
        if it.stock >= 0 and qty > it.stock then return fail(it.stock == 0 and ('« %s » est en rupture de stock'):format(it.label) or ('Stock insuffisant pour « %s » (%d restant)'):format(it.label, it.stock)) end
        if inv == 'esx' and isWeapon(it.name) then
            if qty > 1 then return fail('Une seule arme à la fois') end
            if xPlayer.hasWeapon and xPlayer.hasWeapon(it.name) then return fail(('Tu possèdes déjà « %s »'):format(it.label)) end
        end
        if inv == 'ox' then
            if not exports.ox_inventory:CanCarryItem(src, it.name, qty) then return fail(('Tu ne peux pas porter %d × %s'):format(qty, it.label)) end
        elseif not isWeapon(it.name) and xPlayer.canCarryItem and not xPlayer.canCarryItem(it.name, qty) then
            return fail(('Tu ne peux pas porter %d × %s'):format(qty, it.label))
        end
        local unit = finalPrice(it, disc)
        lines[#lines + 1] = { idx = idx, name = it.name, label = it.label, qty = qty, unit = unit, total = unit * qty }
        total = total + unit * qty
    end

    if not charge(xPlayer, method, total) then return fail('Pas assez d\'argent') end

    -- Remise des articles ; ce qui ne peut pas être donné est remboursé
    local refunded, given = 0, {}
    for _, l in ipairs(lines) do
        local ok
        if inv == 'ox' then
            ok = exports.ox_inventory:AddItem(src, l.name, l.qty)
        elseif isWeapon(l.name) then
            local it = shop.items[l.idx]
            ok = pcall(xPlayer.addWeapon, l.name, (it.ammo and it.ammo > 0) and it.ammo or Config.DefaultWeaponAmmo)
        else
            ok = pcall(xPlayer.addInventoryItem, l.name, l.qty)
        end
        if ok then given[#given + 1] = l else refunded = refunded + l.total end
    end
    if refunded > 0 then refund(xPlayer, method, refunded) end
    if #given == 0 then return fail('Impossible de te remettre les articles') end
    total = total - refunded

    local parts, stocks = {}, {}
    for _, l in ipairs(given) do
        local it = shop.items[l.idx]
        if it.stock >= 0 then it.stock = it.stock - l.qty end
        stocks[l.idx] = it.stock
        parts[#parts + 1] = ('%dx %s'):format(l.qty, l.label)
    end
    addStats(shop, total, given)
    creditSociety(shop, method, total)
    SB.log(shop, xPlayer, 'buy', ('%s — %d%s (%s)'):format(table.concat(parts, ', '), total, Config.Currency, Config.Payments[method].label), total)
    return { ok = true, paid = total, refunded = refunded, stocks = stocks, balance = balance(xPlayer, method), method = method }
end

ESX.RegisterServerCallback('shopbuilder:buy', function(src, cb, shopId, locIdx, cart, method)
    if busy[src] then return cb(fail('Une transaction est déjà en cours')) end
    busy[src] = true
    local ok, res = pcall(doBuy, src, shopId, locIdx, cart, method)
    busy[src] = nil
    if not ok then
        print(('^1[shopbuilder] erreur pendant un achat : %s^0'):format(tostring(res)))
        return cb(fail('Erreur interne, réessaie'))
    end
    cb(res)
end)

-- ─────────────────────────────── Vêtements / coiffeur : paiement à la validation de la tenue ───────────────────────────────
-- Valide les items de vêtements demandés par le client : groupe connu, clés du groupe uniquement, valeurs entières bornées,
-- et groupe réellement modifiable dans cette boutique (parties cochées dans le builder).
local function cleanClothingItems(shop, list)
    local ci = Config.ClothingItems
    if Config.ClothingMode() ~= 'items' or SB.inventory() ~= 'ox' then return {} end
    local allowed = {}
    for _, id in ipairs(shop.settings.clothing and shop.settings.clothing.parts or {}) do
        local part = Config.ClothingParts[id]
        if part then for _, k in ipairs(part.keys) do allowed[k] = true end end
    end
    local out, seen = {}, {}
    for _, e in ipairs(type(list) == 'table' and list or {}) do
        local group
        for _, g in ipairs(ci.groups) do if type(e) == 'table' and g.item == e.item then group = g end end
        if group and not seen[group.item] and type(e.meta) == 'table' then
            local meta, touches = {}, false
            for _, k in ipairs(group.keys) do
                local v = e.meta[k]
                if v ~= nil then
                    if type(v) ~= 'number' or v < 0 or v > 1024 or v % 1 ~= 0 then return nil, 'Tenue invalide' end
                    meta[k] = v
                    if allowed[k] then touches = true end
                end
            end
            if touches then seen[group.item] = true out[#out + 1] = { name = group.item, metadata = meta } end
        end
    end
    return out
end

ESX.RegisterServerCallback('shopbuilder:clothing:pay', function(src, cb, shopId, locIdx, method, items)
    if busy[src] then return cb(fail('Une transaction est déjà en cours')) end
    local shop, xPlayer, _, err = access(src, shopId, locIdx)
    if not shop then return cb(fail(err)) end
    if shop.settings.mode ~= 'clothing' then return cb(fail('Cette boutique ne vend pas de vêtements')) end
    if type(method) ~= 'string' or not Config.Payments[method] or not (shop.settings.payments or {})[method] then return cb(fail('Moyen de paiement refusé')) end
    local entries, ierr = cleanClothingItems(shop, items)
    if not entries then return cb(fail(ierr)) end
    -- mode « tenue » : le client envoie le look complet, le serveur le nettoie et en fait un item
    local outfitMode = Config.ClothingMode() == 'outfit' and SB.inventory() == 'ox'
    local outfit, outfitItem
    if outfitMode then
        outfit = type(items) == 'table' and exports.p_outfits:sanitize(items.outfit) or nil
        if not outfit then return cb(fail('Tenue invalide')) end
        outfitItem = exports.p_outfits:itemName()
        if not exports.ox_inventory:Items(outfitItem) then
            print(('^1[shopbuilder] item de tenue absent de ox_inventory : %s^0'):format(outfitItem))
            return cb(fail('Tenue non configurée dans l\'inventaire'))
        end
        if not exports.ox_inventory:CanCarryItem(src, outfitItem, 1) then return cb(fail('Pas assez de place ou de poids dans ton inventaire')) end
    end
    local asItems = Config.ClothingMode() == 'items' and SB.inventory() == 'ox'
    if asItems and #entries == 0 then return cb(fail('Aucun vêtement modifié : rien à acheter')) end
    for _, e in ipairs(entries) do
        if not exports.ox_inventory:Items(e.name) then
            print(('^1[shopbuilder] item de vêtement absent de ox_inventory : %s^0'):format(e.name))
            return cb(fail('Vêtement non configuré dans l\'inventaire'))
        end
        if not exports.ox_inventory:CanCarryItem(src, e.name, 1, e.metadata) then return cb(fail('Pas assez de place ou de poids dans ton inventaire')) end
    end
    local price = finalPrice({ price = (shop.settings.clothing and shop.settings.clothing.price) or 0, promo = 0 }, discountFor(shop, xPlayer))
    busy[src] = true
    local ok, res = pcall(function()
        if not charge(xPlayer, method, price) then return fail('Pas assez d\'argent') end
        local added = {}
        if outfitMode then
            local ped = GetPlayerPed(src)
            local sex = (ped and ped ~= 0 and GetEntityModel(ped) ~= 1885233650) and 'female' or 'male'
            local label = ('Tenue — %s'):format(shop.label or 'Boutique')
            local count = 0
            for _ in pairs(outfit) do count += 1 end
            local success = exports.ox_inventory:AddItem(src, outfitItem, 1, {
                label = label,
                description = ('Tenue complete (%d reglages). Glisse-la sur la case Tenue de ton inventaire pour la porter.'):format(count),
                skin = outfit,
                sex = sex,
            })
            if not success then
                refund(xPlayer, method, price)
                return fail('Impossible d\'ajouter la tenue (inventaire plein ?)')
            end
            addStats(shop, price, { { name = 'clothing', qty = 1, total = price } })
            creditSociety(shop, method, price)
            SB.log(shop, xPlayer, 'clothing', ('Tenue (item) — %d%s (%s)'):format(price, Config.Currency, Config.Payments[method].label), price)
            return { ok = true, paid = price, items = 1, outfit = true }
        end
        for _, e in ipairs(entries) do
            local success = exports.ox_inventory:AddItem(src, e.name, 1, e.metadata)
            if not success then
                for _, a in ipairs(added) do exports.ox_inventory:RemoveItem(src, a.name, 1, a.metadata) end
                refund(xPlayer, method, price)
                return fail('Impossible de te remettre les vêtements (inventaire plein ?)')
            end
            added[#added + 1] = e
        end
        addStats(shop, price, { { name = 'clothing', qty = 1, total = price } })
        creditSociety(shop, method, price)
        SB.log(shop, xPlayer, 'clothing', ('Tenue (%d pièce(s)) — %d%s (%s)'):format(#added, price, Config.Currency, Config.Payments[method].label), price)
        return { ok = true, paid = price, items = #added }
    end)
    busy[src] = nil
    if not ok then print(('^1[shopbuilder] erreur achat tenue : %s^0'):format(tostring(res))) return cb(fail('Erreur interne, réessaie')) end
    cb(res)
end)

AddEventHandler('playerDropped', function() busy[source] = nil end)

-- ─────────────────────────────── Réapprovisionnement automatique ───────────────────────────────
CreateThread(function()
    while true do
        Wait(30000)
        if SB.ready then
            local now = os.time()
            for _, shop in pairs(SB.Shops) do
                local r = shop.settings.restock
                if r and (r.minutes or 0) > 0 and (r.amount or 0) > 0 and now - (r.last or now) >= r.minutes * 60 then
                    r.last = now
                    for _, it in ipairs(shop.items) do
                        if it.stock >= 0 and (it.max_stock or 0) > 0 and it.stock < it.max_stock then
                            it.stock = math.min(it.max_stock, it.stock + r.amount)
                        end
                    end
                    SB.Dirty[shop.id] = true
                    MySQL.update('UPDATE shopbuilder_shops SET settings = ? WHERE id = ?', { json.encode(shop.settings), shop.id })
                end
            end
        end
    end
end)
