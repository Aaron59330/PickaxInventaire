-- ─────────────────────────────── Builder (admin) ───────────────────────────────
local function fail(msg) return { ok = false, error = msg } end

local function trim(s) return (tostring(s or ''):gsub('^%s+', ''):gsub('%s+$', '')) end

local function str(v, max, default)
    local s = trim(v)
    if s == '' then return default or '' end
    return s:sub(1, max)
end

local function num(v, min, max, default)
    local n = tonumber(v)
    if not n or n ~= n then n = default or min end
    if n < min then n = min elseif n > max then n = max end
    return n
end

local function int(v, min, max, default) return math.floor(num(v, min, max, default)) end

local function slug(s)
    s = tostring(s or ''):lower()
    local from = { 'à', 'â', 'ä', 'é', 'è', 'ê', 'ë', 'î', 'ï', 'ô', 'ö', 'ù', 'û', 'ü', 'ç' }
    local to   = { 'a', 'a', 'a', 'e', 'e', 'e', 'e', 'i', 'i', 'o', 'o', 'u', 'u', 'u', 'c' }
    for i, ch in ipairs(from) do s = s:gsub(ch, to[i]) end
    s = s:gsub('[^%w]+', '_'):gsub('^_+', ''):gsub('_+$', '')
    return s:sub(1, 40)
end

local function uniqueName(base)
    base = slug(base)
    if base == '' then base = 'boutique' end
    local name, i = base, 1
    while SB.ByName[name] do i = i + 1 name = ('%s_%d'):format(base:sub(1, 36), i) end
    return name
end

-- ─────────────────────────────── Catalogue (items du serveur, métiers) ───────────────────────────────
local catalogCache, catalogAt = nil, 0

local function itemCatalog()
    if catalogCache and GetGameTimer() - catalogAt < 60000 then return catalogCache end
    local list, seen = {}, {}
    local function add(name, label)
        if type(name) ~= 'string' or name == '' then return end
        local k = name:lower()
        if seen[k] then return end
        seen[k] = true
        list[#list + 1] = { name = name, label = (type(label) == 'string' and label ~= '') and label or name }
    end
    if SB.inventory() == 'ox' then
        local ok, items = pcall(function() return exports.ox_inventory:Items() end)
        if ok and type(items) == 'table' then for name, it in pairs(items) do add(it.name or name, it.label) end end
    else
        if type(ESX.Items) == 'table' then for name, it in pairs(ESX.Items) do add(name, it.label) end end
        if #list == 0 then
            for _, r in ipairs(MySQL.query.await('SELECT name, label FROM items') or {}) do add(r.name, r.label) end
        end
        pcall(function() for _, w in ipairs(ESX.GetWeaponList()) do add(w.name, w.label) end end)
    end
    table.sort(list, function(a, b) return a.name:lower() < b.name:lower() end)
    catalogCache, catalogAt = list, GetGameTimer()
    return list
end

local function jobList()
    local out = {}
    for name, job in pairs(ESX.GetJobs()) do
        local grades = {}
        for g, data in pairs(job.grades or {}) do grades[#grades + 1] = { grade = tonumber(g) or tonumber(data.grade) or 0, label = data.label } end
        table.sort(grades, function(a, b) return a.grade < b.grade end)
        out[#out + 1] = { name = name, label = job.label or name, grades = grades }
    end
    table.sort(out, function(a, b) return a.name < b.name end)
    return out
end

-- ─────────────────────────────── Validation ───────────────────────────────
local function cleanItem(it)
    if type(it) ~= 'table' then return nil end
    local name = trim(it.name)
    if name == '' or #name > 64 or not name:match('^[%w_%-%.]+$') then return nil end
    local jobs = {}
    for _, j in ipairs(type(it.jobs) == 'table' and it.jobs or {}) do
        if type(j) == 'string' and j:match('^[%w_%-]+$') and #j <= 40 then jobs[#jobs + 1] = j end
    end
    local stock = int(it.stock, -1, 1000000, -1)
    return {
        name = name,
        label = str(it.label, 80, name),
        price = int(it.price, 0, 100000000, 0),
        category = str(it.category, 30, ''),
        stock = stock,
        max_stock = int(it.max_stock, 0, 1000000, 0),
        max = int(it.max, 1, Config.MaxQtyPerPurchase, Config.MaxQtyPerPurchase),
        license = str(it.license, 30, ''),
        jobs = jobs,
        promo = int(it.promo, 0, 90, 0),
        ammo = int(it.ammo, 0, 9999, 0),
        enabled = it.enabled ~= false,
    }
end

local function cleanSettings(s, old)
    s = type(s) == 'table' and s or {}
    local out = {}
    out.mode = s.mode == 'clothing' and 'clothing' or 'items'

    local b = type(s.blip) == 'table' and s.blip or {}
    out.blip = { enabled = b.enabled == true, sprite = int(b.sprite, 0, 900, 52), color = int(b.color, 0, 85, 0), scale = num(b.scale, 0.1, 3.0, 0.8),
        label = str(b.label, 60, ''), shortRange = b.shortRange ~= false }

    local p = type(s.ped) == 'table' and s.ped or {}
    local model = trim(p.model)
    if not model:match('^[%w_]+$') then model = '' end
    out.ped = { enabled = p.enabled == true and model ~= '', model = model:sub(1, 60), scenario = str(p.scenario, 60, '') }

    local a = type(s.access) == 'table' and s.access or {}
    local jobs, known = {}, ESX.GetJobs()
    for name, grade in pairs(type(a.jobs) == 'table' and a.jobs or {}) do
        if known[name] then jobs[name] = int(grade, 0, 50, 0) end
    end
    out.access = { jobs = jobs, license = str(a.license, 30, '') }

    local pay = type(s.payments) == 'table' and s.payments or {}
    out.payments = {}
    local any = false
    for id in pairs(Config.Payments) do
        out.payments[id] = pay[id] == true
        any = any or out.payments[id]
    end
    if not any then out.payments.cash = true end

    local h = type(s.hours) == 'table' and s.hours or {}
    out.hours = { enabled = h.enabled == true, from = int(h.from, 0, 23, 8), to = int(h.to, 0, 24, 22) }

    out.discount = int(s.discount, 0, 90, 0)
    local jd = {}
    for name, pc in pairs(type(s.jobDiscounts) == 'table' and s.jobDiscounts or {}) do
        if known[name] then jd[name] = int(pc, 0, 100, 0) end
    end
    out.jobDiscounts = jd

    local soc = trim(s.society)
    out.society = soc:match('^[%w_%-]+$') and soc:sub(1, 50) or ''

    local r = type(s.restock) == 'table' and s.restock or {}
    out.restock = { minutes = int(r.minutes, 0, 10080, 0), amount = int(r.amount, 0, 100000, 0), last = old and old.restock and old.restock.last or os.time() }

    local c = type(s.clothing) == 'table' and s.clothing or {}
    local parts = {}
    for _, id in ipairs(type(c.parts) == 'table' and c.parts or {}) do
        if Config.ClothingParts[id] then parts[#parts + 1] = id end
    end
    out.clothing = { price = int(c.price, 0, 10000000, 100), parts = parts }

    local cats = {}
    for _, cname in ipairs(type(s.categories) == 'table' and s.categories or {}) do
        local n = str(cname, 30, '')
        if n ~= '' and #cats < 30 then
            local dup = false
            for _, e in ipairs(cats) do if e == n then dup = true end end
            if not dup then cats[#cats + 1] = n end
        end
    end
    out.categories = cats
    out.note = str(s.note, 200, '')
    -- repères de gestion : jamais envoyés aux joueurs
    out.tag = str(s.tag, 40, '')
    out.memo = str(s.memo, 500, '')

    -- couleur générale de la boutique (interface + marker) ; absente = couleur globale
    local col = s.color
    if type(col) == 'table' and #col == 3 then out.color = { int(col[1], 0, 255, 239), int(col[2], 0, 255, 68), int(col[3], 0, 255, 68) } end
    local mk = type(s.marker) == 'table' and s.marker or {}
    out.marker = { enabled = mk.enabled ~= false, type = int(mk.type, 0, 43, Config.Marker.type) }
    return out
end

local function cleanLocations(list)
    local out = {}
    for _, l in ipairs(type(list) == 'table' and list or {}) do
        local c = type(l) == 'table' and l.coords
        if type(c) == 'table' and tonumber(c.x) and tonumber(c.y) and tonumber(c.z) and #out < Config.MaxLocations then
            local loc = { label = str(l.label, 60, ''), tag = str(l.tag, 40, ''), coords = { x = num(c.x, -20000, 20000), y = num(c.y, -20000, 20000), z = num(c.z, -2000, 4000), h = num(c.h, 0, 360, 0) } }
            -- position du vendeur distincte de celle du marker (optionnelle)
            local p = l.ped
            if type(p) == 'table' and tonumber(p.x) and tonumber(p.y) and tonumber(p.z) then
                loc.ped = { x = num(p.x, -20000, 20000), y = num(p.y, -20000, 20000), z = num(p.z, -2000, 4000), h = num(p.h, 0, 360, 0) }
            end
            out[#out + 1] = loc
        end
    end
    return out
end

-- ─────────────────────────────── Callbacks ───────────────────────────────
local function admin(src, cb)
    if SB.isAdmin(src) then return true end
    cb(fail('Accès refusé'))
    return false
end

ESX.RegisterServerCallback('shopbuilder:isAdmin', function(src, cb) cb(SB.isAdmin(src)) end)

ESX.RegisterServerCallback('shopbuilder:catalog', function(src, cb)
    if not admin(src, cb) then return end
    local types = {}
    for id, t in pairs(Config.ShopTypes) do
        types[#types + 1] = { id = id, label = t.label, icon = t.icon, mode = t.mode, items = t.items and #t.items or 0 }
    end
    table.sort(types, function(a, b) return a.label < b.label end)
    local parts = {}
    for id, p in pairs(Config.ClothingParts) do parts[#parts + 1] = { id = id, label = p.label } end
    table.sort(parts, function(a, b) return a.label < b.label end)
    local pay = {}
    for id, p in pairs(Config.Payments) do pay[#pay + 1] = { id = id, label = p.label } end
    table.sort(pay, function(a, b) return a.id < b.id end)
    local scen = {}
    for _, sc in ipairs(Config.PedScenarios) do scen[#scen + 1] = sc end
    cb({ ok = true, types = types, items = itemCatalog(), jobs = jobList(), parts = parts, payments = pay, scenarios = scen,
        inventory = SB.inventory(), imagePath = Config.ImagePath, currency = Config.Currency, accent = Config.UI.Accent,
        limits = { items = Config.MaxItemsPerShop, locations = Config.MaxLocations, qty = Config.MaxQtyPerPurchase } })
end)

ESX.RegisterServerCallback('shopbuilder:list', function(src, cb)
    if not SB.isAdmin(src) then return cb({}) end
    local list = {}
    for id, s in pairs(SB.Shops) do
        list[#list + 1] = { id = id, name = s.name, label = s.label, tag = s.settings.tag or '', memo = s.settings.memo or '', type = s.type, mode = s.settings.mode or 'items', enabled = s.enabled,
            items = #s.items, locations = #s.locations, revenue = s.stats.revenue or 0, sales = s.stats.sales or 0 }
    end
    table.sort(list, function(a, b) return a.label:lower() < b.label:lower() end)
    cb(list)
end)

ESX.RegisterServerCallback('shopbuilder:get', function(src, cb, id)
    if not admin(src, cb) then return end
    local s = SB.Shops[tonumber(id) or 0]
    if not s then return cb(fail('Boutique introuvable')) end
    cb({ ok = true, shop = s })
end)

ESX.RegisterServerCallback('shopbuilder:create', function(src, cb, typeId, label)
    if not admin(src, cb) then return end
    local tpl = Config.ShopTypes[tostring(typeId)]
    if not tpl then return cb(fail('Type inconnu')) end
    local count = 0
    for _ in pairs(SB.Shops) do count = count + 1 end
    if count >= Config.MaxShops then return cb(fail('Nombre maximum de boutiques atteint')) end
    label = str(label, 100, tpl.label)
    local name = uniqueName(label)

    local existing, hasCatalog = {}, false
    for _, it in ipairs(itemCatalog()) do existing[it.name:lower()] = true hasCatalog = true end
    local items = {}
    for _, row in ipairs(tpl.items or {}) do
        if not hasCatalog or existing[row[1]:lower()] then
            items[#items + 1] = { name = row[1], label = row[2], price = row[3], category = row[4] or '', stock = -1, max_stock = 0, max = Config.MaxQtyPerPurchase, license = row[5] or '', jobs = {}, promo = 0, ammo = 0, enabled = true }
        end
    end

    local settings = cleanSettings({
        mode = tpl.mode,
        blip = { enabled = tpl.blip ~= nil, sprite = tpl.blip and tpl.blip.sprite or 52, color = tpl.blip and tpl.blip.color or 0, scale = 0.8, shortRange = true },
        ped = { enabled = tpl.ped ~= nil, model = tpl.ped or '', scenario = 'WORLD_HUMAN_STAND_IMPATIENT' },
        payments = tpl.payments or { cash = true, bank = true },
        clothing = tpl.clothing or {},
        categories = tpl.categories or {},
    })

    local id = MySQL.insert.await('INSERT INTO shopbuilder_shops (name, label, type, enabled, settings, items, locations, stats, created_by) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)', {
        name, label, tostring(typeId), json.encode(settings), json.encode(items), '[]', '{}', GetPlayerName(src) or 'console',
    })
    if not id then return cb(fail('Erreur base de données')) end
    local shop = { id = id, name = name, label = label, type = tostring(typeId), enabled = false, settings = settings, items = items, locations = {}, stats = {} }
    SB.Shops[id] = shop
    SB.ByName[name] = id
    SB.log(shop, ESX.GetPlayerFromId(src), 'create', ('%s (%s) — %d produit(s)'):format(label, typeId, #items))
    cb({ ok = true, shop = shop })
end)

ESX.RegisterServerCallback('shopbuilder:save', function(src, cb, data)
    if not admin(src, cb) then return end
    if type(data) ~= 'table' then return cb(fail('Données invalides')) end
    local shop = SB.Shops[tonumber(data.id) or 0]
    if not shop then return cb(fail('Boutique introuvable')) end

    local label = str(data.label, 100, '')
    if label == '' then return cb(fail('Le nom de la boutique est obligatoire')) end

    local items, seen = {}, {}
    for _, it in ipairs(type(data.items) == 'table' and data.items or {}) do
        local c = cleanItem(it)
        if c and not seen[c.name:lower()] and #items < Config.MaxItemsPerShop then
            seen[c.name:lower()] = true
            items[#items + 1] = c
        end
    end

    local settings = cleanSettings(data.settings, shop.settings)
    -- les catégories utilisées par un produit sont toujours déclarées
    local have = {}
    for _, cname in ipairs(settings.categories) do have[cname] = true end
    for _, it in ipairs(items) do
        if it.category ~= '' and not have[it.category] and #settings.categories < 30 then
            have[it.category] = true
            settings.categories[#settings.categories + 1] = it.category
        end
    end

    shop.label = label
    shop.type = Config.ShopTypes[tostring(data.type)] and tostring(data.type) or shop.type
    shop.enabled = data.enabled == true
    shop.settings = settings
    shop.items = items
    shop.locations = cleanLocations(data.locations)
    SB.saveShop(shop)
    SB.syncAll()
    SB.log(shop, ESX.GetPlayerFromId(src), 'save', ('%d produit(s), %d emplacement(s), %s'):format(#items, #shop.locations, shop.enabled and 'active' or 'désactivée'))
    cb({ ok = true, shop = shop })
end)

ESX.RegisterServerCallback('shopbuilder:delete', function(src, cb, id)
    if not admin(src, cb) then return end
    local shop = SB.Shops[tonumber(id) or 0]
    if not shop then return cb(fail('Boutique introuvable')) end
    MySQL.update.await('DELETE FROM shopbuilder_shops WHERE id = ?', { shop.id })
    SB.Shops[shop.id], SB.ByName[shop.name], SB.Dirty[shop.id] = nil, nil, nil
    SB.syncAll()
    SB.log(shop, ESX.GetPlayerFromId(src), 'delete', shop.label)
    cb({ ok = true })
end)

ESX.RegisterServerCallback('shopbuilder:duplicate', function(src, cb, id)
    if not admin(src, cb) then return end
    local shop = SB.Shops[tonumber(id) or 0]
    if not shop then return cb(fail('Boutique introuvable')) end
    local label = (shop.label .. ' (copie)'):sub(1, 100)
    local name = uniqueName(shop.name .. '_copie')
    local settings = json.decode(json.encode(shop.settings))
    settings.restock = settings.restock or {}
    settings.restock.last = os.time()
    local newId = MySQL.insert.await('INSERT INTO shopbuilder_shops (name, label, type, enabled, settings, items, locations, stats, created_by) VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?)', {
        name, label, shop.type, json.encode(settings), json.encode(shop.items), '[]', '{}', GetPlayerName(src) or 'console',
    })
    if not newId then return cb(fail('Erreur base de données')) end
    local copy = { id = newId, name = name, label = label, type = shop.type, enabled = false, settings = settings, items = json.decode(json.encode(shop.items)), locations = {}, stats = {} }
    SB.Shops[newId], SB.ByName[name] = copy, newId
    SB.log(copy, ESX.GetPlayerFromId(src), 'duplicate', ('copie de %s'):format(shop.label))
    cb({ ok = true, shop = copy })
end)

ESX.RegisterServerCallback('shopbuilder:toggle', function(src, cb, id, state)
    if not admin(src, cb) then return end
    local shop = SB.Shops[tonumber(id) or 0]
    if not shop then return cb(fail('Boutique introuvable')) end
    shop.enabled = state == true
    MySQL.update.await('UPDATE shopbuilder_shops SET enabled = ? WHERE id = ?', { shop.enabled and 1 or 0, shop.id })
    SB.syncAll()
    SB.log(shop, ESX.GetPlayerFromId(src), 'toggle', shop.enabled and 'activée' or 'désactivée')
    cb({ ok = true })
end)

-- Réapprovisionnement manuel : 'full' remplit au maximum, 'all' fixe le stock (et le maximum) de tous les produits à `amount`
ESX.RegisterServerCallback('shopbuilder:restock', function(src, cb, id, mode, amount)
    if not admin(src, cb) then return end
    local shop = SB.Shops[tonumber(id) or 0]
    if not shop then return cb(fail('Boutique introuvable')) end
    amount = int(amount, 0, 1000000, 0)
    for _, it in ipairs(shop.items) do
        if mode == 'all' then
            it.stock, it.max_stock = amount, amount
        elseif mode == 'full' and it.stock >= 0 and (it.max_stock or 0) > 0 then
            it.stock = it.max_stock
        elseif mode == 'unlimited' then
            it.stock = -1
        end
    end
    SB.saveShop(shop)
    SB.log(shop, ESX.GetPlayerFromId(src), 'restock', mode == 'all' and ('stock fixé à %d'):format(amount) or mode)
    cb({ ok = true, shop = shop })
end)

ESX.RegisterServerCallback('shopbuilder:resetStats', function(src, cb, id)
    if not admin(src, cb) then return end
    local shop = SB.Shops[tonumber(id) or 0]
    if not shop then return cb(fail('Boutique introuvable')) end
    shop.stats = {}
    SB.saveShop(shop)
    cb({ ok = true, shop = shop })
end)

ESX.RegisterServerCallback('shopbuilder:logs', function(src, cb, id)
    if not admin(src, cb) then return end
    id = tonumber(id) or 0
    local rows
    if id > 0 then
        rows = MySQL.query.await('SELECT shop_label, player_name, action, detail, amount, UNIX_TIMESTAMP(created_at) AS t FROM shopbuilder_logs WHERE shop_id = ? ORDER BY id DESC LIMIT 60', { id })
    else
        rows = MySQL.query.await('SELECT shop_label, player_name, action, detail, amount, UNIX_TIMESTAMP(created_at) AS t FROM shopbuilder_logs ORDER BY id DESC LIMIT 60')
    end
    cb({ ok = true, logs = rows or {} })
end)

ESX.RegisterServerCallback('shopbuilder:settings:save', function(src, cb, accent)
    if not admin(src, cb) then return end
    if type(accent) ~= 'table' or #accent ~= 3 then return cb(fail('Couleur invalide')) end
    local c = { int(accent[1], 0, 255, 239), int(accent[2], 0, 255, 68), int(accent[3], 0, 255, 68) }
    Config.UI.Accent = c
    MySQL.update.await("INSERT INTO shopbuilder_settings (k, v) VALUES ('accent', ?) ON DUPLICATE KEY UPDATE v = VALUES(v)", { json.encode(c) })
    SB.syncAll()
    cb({ ok = true, accent = c })
end)

-- Réactualise le catalogue quand ox_inventory redémarre
AddEventHandler('onResourceStart', function(res)
    if res == 'ox_inventory' or res == 'es_extended' then catalogCache = nil end
end)
