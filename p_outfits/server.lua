local ITEM = Config.ItemName
local PED_MALE = 1885233650

local function getSlots()
    local ok, slots = pcall(function() return exports.p_itemclothes:getClothingSlots() end)
    return ok and type(slots) == 'table' and slots or {}
end

local function getOutfitSlot()
    return exports.ox_inventory:getOutfitSlot()
end

local function sexOf(src)
    local ped = GetPlayerPed(src)
    return (ped and ped ~= 0 and GetEntityModel(ped) ~= PED_MALE) and 'female' or 'male'
end

-- cles de skin gerees par p_itemclothes (14 emplacements), tous sexes confondus
local function allowedKeys()
    local keys = {}
    for _, slot in pairs(getSlots()) do
        for _, skin in pairs(slot.skin or {}) do
            for key in pairs(skin) do keys[key] = true end
        end
    end
    return keys
end

--- Nettoie une tenue recue (cle -> entier borne). Renvoie nil si vide.
local function sanitize(skin)
    if type(skin) ~= 'table' then return end
    local allowed, clean, n = allowedKeys(), {}, 0

    for key, value in pairs(skin) do
        if allowed[key] and type(value) == 'number' and value == value and value % 1 == 0 and value >= -1 and value <= 10000 then
            clean[key] = value
            n += 1
        end
    end

    return n > 0 and clean or nil
end

exports('sanitize', sanitize)
exports('itemName', function() return ITEM end)

-- la piece portee correspond-elle a la tenue ? (toutes les cles de l'emplacement identiques)
local function matches(meta, slotSkin, outfit)
    for key, default in pairs(slotSkin) do
        local expected = outfit[key]
        if expected == nil then expected = default end
        if not meta or meta[key] ~= expected then return false end
    end
    return true
end

local function isDefault(meta, slotSkin)
    for key, default in pairs(slotSkin) do
        if meta[key] ~= default then return false end
    end
    return true
end

local function store(src, item)
    -- true = la piece peut quitter son emplacement (rangee dans l'inventaire, ou supprimee si StoreReplacedPieces = false)
    if not Config.StoreReplacedPieces then return true end
    return exports.ox_inventory:AddItem(src, item.name, item.count, item.metadata) and true or false
end

--- Retire la tenue `old` (pieces identiques detruites, pieces differentes rangees) puis equipe `new`.
local function applyChange(src, old, new)
    local sex = sexOf(src)
    local kept = 0

    -- 1. retirer la tenue precedente
    if old then
        for slot, cfg in pairs(getSlots()) do
            local item = exports.ox_inventory:GetSlot(src, slot)
            local slotSkin = cfg.skin and cfg.skin[sex]

            if item and slotSkin and item.name == cfg.itemName then
                if matches(item.metadata, slotSkin, old) then
                    exports.ox_inventory:RemoveItem(src, item.name, item.count, item.metadata, slot)
                elseif store(src, item) then
                    exports.ox_inventory:RemoveItem(src, item.name, item.count, item.metadata, slot)
                else
                    kept += 1
                end
            end
        end
    end

    -- 2. equiper la nouvelle
    if new then
        for slot, cfg in pairs(getSlots()) do
            local slotSkin = cfg.skin and cfg.skin[sex]

            if slotSkin then
                local meta = {}
                for key, default in pairs(slotSkin) do
                    meta[key] = new[key] ~= nil and new[key] or default
                end

                local item = exports.ox_inventory:GetSlot(src, slot)
                local same = item and item.name == cfg.itemName and matches(item.metadata, slotSkin, new)

                if not same then
                    local freed = true

                    if item then
                        if store(src, item) then
                            exports.ox_inventory:RemoveItem(src, item.name, item.count, item.metadata, slot)
                        elseif isDefault(meta, slotSkin) then
                            freed = false
                        else
                            freed = false
                            kept += 1
                        end
                    end

                    if freed and not isDefault(meta, slotSkin) then
                        exports.ox_inventory:AddItem(src, cfg.itemName, 1, meta, slot)
                    end
                end
            end
        end
    end

    if kept > 0 then
        TriggerClientEvent('ox_lib:notify', src, { type = 'warning', description = Config.Locale.kept:format(kept) })
    elseif new then
        TriggerClientEvent('ox_lib:notify', src, { type = 'success', description = Config.Locale.equipped })
    elseif old then
        TriggerClientEvent('ox_lib:notify', src, { type = 'inform', description = Config.Locale.removed })
    end
end

local function slotNumber(v)
    return type(v) == 'table' and v.slot or tonumber(v)
end

CreateThread(function()
    while GetResourceState('ox_inventory') ~= 'started' do Wait(200) end
    Wait(1500)

    exports.ox_inventory:registerHook('swapItems', function(payload)
        local tenue = getOutfitSlot()
        if not tenue then return true end

        local src = payload.source
        local fromN, toN = slotNumber(payload.fromSlot), slotNumber(payload.toSlot)
        local toTenue = payload.toType == 'player' and toN == tenue
        local fromTenue = payload.fromType == 'player' and fromN == tenue

        if not toTenue and not fromTenue then return true end

        local new, old

        if toTenue then
            -- seul le joueur lui-meme, seule une tenue
            if payload.toInventory ~= src or payload.fromType ~= 'player' or payload.fromInventory ~= src then return false end
            local from = payload.fromSlot
            if type(from) ~= 'table' or from.name ~= ITEM then return false end
            new = from

            local current = exports.ox_inventory:GetSlot(src, tenue)
            if current and current.name == ITEM then old = current end
        end

        if fromTenue then
            if payload.fromInventory ~= src then return false end
            old = payload.fromSlot

            -- echange : l'item de destination va prendre la place dans le slot Tenue
            local occupant = type(payload.toSlot) == 'table' and payload.toSlot.name and payload.toSlot or nil
            if payload.toType == 'player' and payload.toInventory == src and not occupant then
                local o = exports.ox_inventory:GetSlot(src, toN)
                if o and o.name then occupant = o end
            end
            if occupant then
                if occupant.name ~= ITEM then return false end
                new = occupant
            end
        end

        local newSkin = new and new.metadata and new.metadata.skin
        if new then
            if type(newSkin) ~= 'table' then return false end
            local sex = new.metadata.sex
            if sex and sex ~= sexOf(src) then
                TriggerClientEvent('ox_lib:notify', src, { type = 'error', description = Config.Locale.wrong_sex })
                return false
            end
        end

        local oldSkin = old and old.metadata and old.metadata.skin
        if not new and not old then return true end

        SetTimeout(Config.ApplyDelay, function()
            applyChange(src, type(oldSkin) == 'table' and oldSkin or nil, newSkin)
        end)

        return true
    end)
end)
