ESX = exports['es_extended']:getSharedObject()

SB = {
    Shops = {},      -- [id] = boutique complète (settings, items, locations, stats)
    ByName = {},     -- [name] = id
    Dirty = {},      -- [id] = true : stock / stats à écrire en base
    ready = false,
}

-- ─────────────────────────────── Helpers ───────────────────────────────
function SB.decode(str, default)
    if not str or str == '' then return default end
    local ok, res = pcall(json.decode, str)
    if ok and res ~= nil then return res end
    return default
end

function SB.flag(v) return v == 1 or v == true or v == '1' end

function SB.isAdmin(src)
    if src == 0 then return true end
    local xPlayer = ESX.GetPlayerFromId(src)
    if xPlayer then
        local g = xPlayer.getGroup()
        for _, allowed in ipairs(Config.AllowedGroups) do
            if g == allowed then return true end
        end
    end
    return Config.AcePermission and Config.AcePermission ~= '' and IsPlayerAceAllowed(src, Config.AcePermission) or false
end

function SB.playerName(xPlayer)
    return xPlayer.getName and xPlayer.getName() or GetPlayerName(xPlayer.source)
end

function SB.inventory()
    if Config.Inventory == 'ox' then return 'ox' end
    if Config.Inventory == 'esx' then return 'esx' end
    return GetResourceState('ox_inventory') == 'started' and 'ox' or 'esx'
end

function SB.distanceTo(src, c)
    local ped = GetPlayerPed(src)
    if not ped or ped == 0 then return 9999.0 end
    local p = GetEntityCoords(ped)
    return #(vector3(p.x, p.y, p.z) - vector3(c.x, c.y, c.z))
end

function SB.log(shop, xPlayer, action, detail, amount)
    local label = shop and shop.label or '—'
    MySQL.insert('INSERT INTO shopbuilder_logs (shop_id, shop_label, identifier, player_name, action, detail, amount) VALUES (?, ?, ?, ?, ?, ?, ?)', {
        shop and shop.id or 0, label, xPlayer and xPlayer.identifier or nil, xPlayer and SB.playerName(xPlayer) or 'système',
        action, detail and tostring(detail):sub(1, 255) or nil, math.floor(tonumber(amount) or 0),
    })
    if Config.Webhook and Config.Webhook ~= '' then
        PerformHttpRequest(Config.Webhook, function() end, 'POST', json.encode({
            username = 'ShopBuilder',
            embeds = {{ title = ('[%s] %s'):format(label, action), description = ('%s\n%s'):format(xPlayer and SB.playerName(xPlayer) or 'système', detail or ''), color = 3447003 }},
        }), { ['Content-Type'] = 'application/json' })
    end
end

-- ─────────────────────────────── Base de données ───────────────────────────────
local function installTables()
    local sql = LoadResourceFile(GetCurrentResourceName(), 'sql/install.sql')
    if not sql then print('^1[shopbuilder] sql/install.sql introuvable^0') return end
    sql = sql:gsub('%-%-[^\n]*', '')
    for stmt in sql:gmatch('[^;]+') do
        if stmt:match('%S') then MySQL.query.await(stmt) end
    end
end

function SB.loadAll()
    SB.Shops, SB.ByName = {}, {}
    for _, r in ipairs(MySQL.query.await('SELECT * FROM shopbuilder_shops ORDER BY id') or {}) do
        r.enabled = SB.flag(r.enabled)
        r.settings = SB.decode(r.settings, {})
        r.items = SB.decode(r.items, {})
        r.locations = SB.decode(r.locations, {})
        r.stats = SB.decode(r.stats, {})
        SB.Shops[r.id] = r
        SB.ByName[r.name] = r.id
    end
end

-- Écrit la boutique complète (édition depuis le builder)
function SB.saveShop(shop)
    MySQL.update.await('UPDATE shopbuilder_shops SET label = ?, type = ?, enabled = ?, settings = ?, items = ?, locations = ?, stats = ? WHERE id = ?', {
        shop.label, shop.type, shop.enabled and 1 or 0, json.encode(shop.settings), json.encode(shop.items), json.encode(shop.locations), json.encode(shop.stats), shop.id,
    })
    SB.Dirty[shop.id] = nil
end

-- Stocks et statistiques : écrits par lots (évite une requête par achat)
function SB.flush()
    for id in pairs(SB.Dirty) do
        local shop = SB.Shops[id]
        if shop then MySQL.update('UPDATE shopbuilder_shops SET items = ?, stats = ? WHERE id = ?', { json.encode(shop.items), json.encode(shop.stats), id }) end
        SB.Dirty[id] = nil
    end
end

CreateThread(function()
    while true do
        Wait(30000)
        if SB.ready then SB.flush() end
    end
end)

-- ─────────────────────────────── Réglages (apparence) ───────────────────────────────
function SB.loadSettings()
    local r = MySQL.scalar.await("SELECT v FROM shopbuilder_settings WHERE k = 'accent'")
    local acc = SB.decode(r, nil)
    if type(acc) == 'table' and #acc == 3 then Config.UI.Accent = { tonumber(acc[1]) or 239, tonumber(acc[2]) or 68, tonumber(acc[3]) or 68 } end
end

-- ─────────────────────────────── Synchronisation clients ───────────────────────────────
-- Chaque joueur ne reçoit que les boutiques activées dont l'accès (métiers) lui est ouvert.
function SB.canSee(shop, xPlayer)
    if not shop.enabled then return false end
    local jobs = shop.settings.access and shop.settings.access.jobs
    if jobs and next(jobs) then
        if SB.isAdmin(xPlayer.source) then return true end
        return jobs[xPlayer.job.name] ~= nil and xPlayer.job.grade >= (tonumber(jobs[xPlayer.job.name]) or 0)
    end
    return true
end

function SB.publicShop(shop)
    local s = shop.settings
    local locs = {}
    for i, l in ipairs(shop.locations) do locs[i] = { label = l.label, coords = l.coords, ped = l.ped } end   -- sans les repères de gestion
    return {
        id = shop.id, label = shop.label, type = shop.type, mode = s.mode or 'items',
        locations = locs, blip = s.blip, ped = s.ped, color = s.color, marker = s.marker,
    }
end

function SB.syncPlayer(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    if not xPlayer then return end
    local list = {}
    for _, shop in pairs(SB.Shops) do
        if SB.canSee(shop, xPlayer) then list[#list + 1] = SB.publicShop(shop) end
    end
    TriggerClientEvent('shopbuilder:client:sync', src, { shops = list, accent = Config.UI.Accent, config = {
        marker = Config.Marker, drawDistance = Config.DrawDistance, interactDistance = Config.InteractDistance, pedDistance = Config.PedDistance,
    } })
end

function SB.syncAll()
    for _, src in ipairs(GetPlayers()) do SB.syncPlayer(tonumber(src)) end
end

AddEventHandler('esx:playerLoaded', function(src) SetTimeout(1500, function() SB.syncPlayer(src) end) end)
AddEventHandler('esx:setJob', function(src) SetTimeout(300, function() SB.syncPlayer(src) end) end)
RegisterNetEvent('shopbuilder:server:requestSync', function() SB.syncPlayer(source) end)

AddEventHandler('onResourceStart', function(res)
    if res ~= GetCurrentResourceName() then return end
    installTables()
    SB.loadAll()
    SB.loadSettings()
    SB.ready = true
    SetTimeout(1000, SB.syncAll)
    local n = 0
    for _ in pairs(SB.Shops) do n = n + 1 end
    print(('^2[shopbuilder] %d boutique(s) chargée(s).^0'):format(n))
end)

AddEventHandler('onResourceStop', function(res)
    if res ~= GetCurrentResourceName() then return end
    for id in pairs(SB.Dirty) do
        local shop = SB.Shops[id]
        if shop then MySQL.update.await('UPDATE shopbuilder_shops SET items = ?, stats = ? WHERE id = ?', { json.encode(shop.items), json.encode(shop.stats), id }) end
    end
end)

-- /shopbuilder : ouvre le builder (droits vérifiés ici ET à chaque action)
RegisterCommand(Config.Command, function(src)
    if src == 0 then print('[shopbuilder] commande disponible en jeu uniquement') return end
    if not SB.isAdmin(src) then
        TriggerClientEvent('esx:showNotification', src, '~r~Tu n\'as pas la permission d\'utiliser le Shop Builder.')
        return
    end
    TriggerClientEvent('shopbuilder:client:openBuilder', src)
end, false)
