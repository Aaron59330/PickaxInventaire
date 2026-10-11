-- ─────────────────────────────── Cabine d'essayage ───────────────────────────────
-- Cabine intégrée (skinchanger) : le panneau reste ouvert, le joueur règle chaque pièce, puis « Valider et payer ».
-- Le paiement n'est demandé qu'à la validation ; annulation / fermeture → la tenue d'origine est restaurée.
-- Autres systèmes (illenium-appearance, menu esx_skin) : voir Config.OpenClothingMenu.
local cabin = nil    -- { cur, method, allowed = { [clé] = true }, snapshot, cam, base, fwd, preset }

-- ─────────────────────────────── Caméra de la cabine ───────────────────────────────
-- Caméra scriptée propre à la cabine, ancrée devant le joueur : elle ne dépend d'aucun autre script, ne se déplace pas toute seule
-- et est toujours détruite à la fermeture. d = distance devant le joueur, z = hauteur de la caméra, t = hauteur visée.
local PRESETS = {
    body = { d = 2.8, z = 0.30, t = 0.00 },
    top  = { d = 1.5, z = 0.45, t = 0.35 },
    legs = { d = 1.9, z = -0.20, t = -0.40 },
    feet = { d = 1.3, z = -0.60, t = -0.85 },
    head = { d = 0.9, z = 0.60, t = 0.62 },
}
local GROUP = { tshirt = 'top', torso = 'top', decals = 'top', arms = 'top', bproof = 'top', chain = 'top', bags = 'top', watches = 'top', bracelets = 'top',
    pants = 'legs', shoes = 'feet', helmet = 'head', glasses = 'head', mask = 'head', ears = 'head', hair = 'head', beard = 'head', makeup = 'head', lipstick = 'head', blush = 'head' }

local function camPoint(c, key)
    local p = PRESETS[key] or PRESETS.body
    return vector3(c.base.x + c.fwd.x * p.d, c.base.y + c.fwd.y * p.d, c.base.z + p.z), vector3(c.base.x, c.base.y, c.base.z + p.t)
end

function CabinCamera(key)
    if not cabin then return end
    key = PRESETS[key] and key or 'body'
    local pos, target = camPoint(cabin, key)
    local new = CreateCam('DEFAULT_SCRIPTED_CAMERA', true)
    SetCamCoord(new, pos.x, pos.y, pos.z)
    PointCamAtCoord(new, target.x, target.y, target.z)
    SetCamFov(new, 50.0)
    if cabin.cam then
        local old = cabin.cam
        SetCamActiveWithInterp(new, old, 450, 1, 1)
        SetTimeout(600, function() if DoesCamExist(old) then DestroyCam(old, false) end end)
    else
        SetCamActive(new, true)
        RenderScriptCams(true, true, 450, true, true)
    end
    cabin.cam, cabin.preset = new, key
end

local function destroyCamera(c)
    RenderScriptCams(false, true, 450, true, true)
    if c.cam and DoesCamExist(c.cam) then
        local cm = c.cam
        SetTimeout(500, function() if DoesCamExist(cm) then DestroyCam(cm, false) end end)
    end
end

-- Filet de sécurité : si un autre script reprend la caméra de rendu, on la remet
CreateThread(function()
    while true do
        Wait(400)
        if cabin and cabin.cam and DoesCamExist(cabin.cam) and not IsCamRendering(cabin.cam) then
            RenderScriptCams(true, false, 0, true, true)
            SetCamActive(cabin.cam, true)
        end
    end
end)

-- Liste les pièces modifiables avec leur valeur actuelle et leur maximum
local function listComponents(allowed, cb)
    TriggerEvent('skinchanger:getSkin', function(skin)
        TriggerEvent('skinchanger:getData', function(components, maxVals)
            local out = {}
            for _, c in ipairs(components or {}) do
                if allowed[c.name] then
                    out[#out + 1] = { name = c.name, label = c.label or c.name, value = tonumber(skin and skin[c.name]) or tonumber(c.value) or 0, min = tonumber(c.min) or 0, max = tonumber(maxVals and maxVals[c.name]) or 0 }
                end
            end
            cb(out)
        end)
    end)
end

function EndCabin(restore)
    if not cabin then return end
    local c = cabin
    cabin = nil
    FreezeEntityPosition(PlayerPedId(), false)
    destroyCamera(c)
    if restore and c.snapshot then TriggerEvent('skinchanger:loadSkin', c.snapshot) end
end

function StartCabin(cur, method, cb)
    local allowed = {}
    for _, k in ipairs(cur.restrict or {}) do allowed[k] = true end
    TriggerEvent('skinchanger:getSkin', function(skin)
        cabin = { cur = cur, method = method, allowed = allowed, snapshot = skin }
        listComponents(allowed, function(list)
            if #list == 0 then
                cabin = nil
                return cb({ ok = false, error = 'Aucune pièce modifiable (skinchanger indisponible ?)' })
            end
            local ped = PlayerPedId()
            FreezeEntityPosition(ped, true)
            local pos = GetEntityCoords(ped)
            cabin.base = pos
            cabin.fwd = GetEntityForwardVector(ped)
            CabinCamera('body')
            cb({ ok = true, cabin = true, components = list })
        end)
    end)
end

function CabinChange(name, value, cb)
    if not cabin or not cabin.allowed[name] then return cb({ ok = false }) end
    TriggerEvent('skinchanger:change', name, math.floor(tonumber(value) or 0))
    local g = GROUP[(name:gsub('_%d+$', ''))]
    if g and cabin.preset ~= g then CabinCamera(g) end      -- le cadrage suit la pièce modifiée
    SetTimeout(60, function()
        if not cabin then return cb({ ok = false }) end
        listComponents(cabin.allowed, function(list) cb({ ok = true, components = list }) end)
    end)
end

function CabinRotate(dir)
    local ped = PlayerPedId()
    SetEntityHeading(ped, GetEntityHeading(ped) + (dir or 1) * 25.0)
end

-- Pièces modifiées depuis `snapshot`, au format des items de vêtements (Config.ClothingItems, mode 'items')
local function changedClothingItems(snapshot, cb)
    TriggerEvent('skinchanger:getSkin', function(skin)
        local out = {}
        for _, g in ipairs((Config.ClothingItems and Config.ClothingItems.groups) or {}) do
            local changed, meta = false, {}
            for _, k in ipairs(g.keys) do
                meta[k] = skin[k]
                if skin[k] ~= (snapshot or {})[k] then changed = true end
            end
            if changed then out[#out + 1] = { item = g.item, meta = meta } end
        end
        cb(out)
    end)
end

-- Au moins une pièce autorisée par la boutique a-t-elle changé ?
local function anyChange(snapshot, restrict, cb)
    TriggerEvent('skinchanger:getSkin', function(skin)
        for _, k in ipairs(restrict or {}) do
            if skin[k] ~= (snapshot or {})[k] then return cb(true) end
        end
        cb(false)
    end)
end

-- Items à envoyer au serveur selon le mode ; nil = rien n'a changé (pas d'achat)
local function purchaseItems(snapshot, restrict, cb)
    if Config.ClothingMode() == 'outfit' then
        return anyChange(snapshot, restrict, function(changed)
            if not changed then return cb(nil) end
            TriggerEvent('skinchanger:getSkin', function(skin)
                local outfit = exports.p_outfits:captureOutfit(skin)
                cb(outfit and { outfit = outfit } or nil)
            end)
        end)
    end
    if Config.ClothingMode() == 'items' then
        return changedClothingItems(snapshot, function(items) cb(#items > 0 and items or nil) end)
    end
    anyChange(snapshot, restrict, function(changed) cb(changed and {} or nil) end)
end

-- Après paiement : enregistre le skin et, avec p_itemclothes, resynchronise les emplacements de vêtements portés
local function afterPurchase()
    if Config.ClothingMode() == 'outfit' then return end      -- le look reste celui d'avant : la tenue est dans l'inventaire
    Config.SaveSkin()
    if Config.ClothingMode() == 'p_itemclothes' then
        SetTimeout(300, function() TriggerEvent('p_itemclothes/client/updateClothes') end)
    end
end

local function notifyBought(res)
    if res.outfit then
        return ESX.ShowNotification(('~g~Tenue achetée pour %s%s — glisse-la sur la case Tenue de ton inventaire pour la porter'):format(res.paid, Config.Currency))
    end
    local extra = (res.items and res.items > 0) and (' — %d vêtement(s) ajouté(s) à ton inventaire'):format(res.items) or ''
    ESX.ShowNotification(('~g~Tenue achetée pour %s%s%s'):format(res.paid, Config.Currency, extra))
end

function CabinConfirm(cb)
    if not cabin then return cb({ ok = false, error = 'Cabine fermée' }) end
    local c = cabin
    purchaseItems(c.snapshot, c.cur.restrict, function(items)
        if not items then return cb({ ok = false, error = 'Aucun vêtement modifié : rien à acheter' }) end
        ESX.TriggerServerCallback('shopbuilder:clothing:pay', function(res)
            if res and res.ok then
                EndCabin(Config.ClothingMode() == 'outfit')      -- mode tenue : on restaure le look d'avant l'essayage
                afterPurchase()
                notifyBought(res)
                cb({ ok = true })
            else
                cb({ ok = false, error = (res and res.error) or 'Paiement refusé' })   -- on reste en cabine : le joueur peut réessayer
            end
        end, c.cur.id, c.cur.locIdx, c.method, items)
    end)
end

-- Menus externes (illenium-appearance, menu esx_skin…)
function StartClothing(cur, method)
    local done = false
    if not cur.restrict or #cur.restrict == 0 then
        ESX.ShowNotification('~r~Cette boutique n\'a aucune partie de vêtements activée (builder → Général → Cabine d\'essayage).')
        return
    end
    TriggerEvent('skinchanger:getSkin', function(before)
        Config.OpenClothingMenu(cur.restrict, function()
            if done then return end
            done = true
            purchaseItems(before, cur.restrict, function(items)
                if not items then
                    Config.RestoreSkin()
                    return ESX.ShowNotification('~r~Aucun vêtement modifié : rien à acheter')
                end
                ESX.TriggerServerCallback('shopbuilder:clothing:pay', function(res)
                    if res and res.ok then
                        if Config.ClothingMode() == 'outfit' then Config.RestoreSkin() end
                        afterPurchase()
                        notifyBought(res)
                    else
                        Config.RestoreSkin()
                        ESX.ShowNotification('~r~' .. ((res and res.error) or 'Paiement refusé'))
                    end
                end, cur.id, cur.locIdx, method, items)
            end)
        end, function()
            if done then return end
            done = true
            Config.RestoreSkin()
        end)
    end)
end
