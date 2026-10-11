local ESX = exports['es_extended']:getSharedObject()

MySQL.ready(function()
    MySQL.query.await([[
        CREATE TABLE IF NOT EXISTS `p_outfits` (
            `id` INT NOT NULL AUTO_INCREMENT,
            `identifier` VARCHAR(80) NOT NULL,
            `name` VARCHAR(60) NOT NULL,
            `data` LONGTEXT NOT NULL,
            PRIMARY KEY (`id`),
            KEY `identifier` (`identifier`)
        )
    ]])
end)

local function getIdentifier(src)
    local xPlayer = ESX.GetPlayerFromId(src)
    return xPlayer and xPlayer.identifier
end

-- cles de skin autorisees = celles gerees par p_itemclothes (14 emplacements)
local function getAllowedKeys()
    local allowed = {}
    local ok, slots = pcall(function() return exports.p_itemclothes:getClothingSlots() end)
    if not ok or type(slots) ~= 'table' then return allowed end

    for _, slot in pairs(slots) do
        for _, sex in pairs(slot.skin or {}) do
            for key in pairs(sex) do allowed[key] = true end
        end
    end

    return allowed
end

local function sanitizeOutfit(data)
    if type(data) ~= 'table' then return end

    local allowed, clean, count = getAllowedKeys(), {}, 0

    for key, value in pairs(data) do
        if allowed[key] and type(value) == 'number' and value == value and value % 1 == 0 and value >= -1 and value <= 10000 then
            clean[key] = value
            count += 1
        end
    end

    return count > 0 and clean or nil
end

lib.callback.register('p_outfits:list', function(source)
    local identifier = getIdentifier(source)
    if not identifier then return {} end

    local rows = MySQL.query.await('SELECT id, name, data FROM p_outfits WHERE identifier = ? ORDER BY id', { identifier }) or {}
    local list = {}

    for i = 1, #rows do
        list[i] = { id = rows[i].id, name = rows[i].name, data = json.decode(rows[i].data) }
    end

    return list
end)

lib.callback.register('p_outfits:save', function(source, name, data)
    local identifier = getIdentifier(source)
    if not identifier then return false, 'error' end

    if type(name) ~= 'string' then return false, 'invalid' end
    name = name:gsub('%s+', ' '):gsub('^%s', ''):gsub('%s$', '')
    if #name < 1 or #name > Config.MaxNameLength then return false, 'invalid' end

    local clean = sanitizeOutfit(data)
    if not clean then return false, 'error' end

    local count = MySQL.scalar.await('SELECT COUNT(*) FROM p_outfits WHERE identifier = ?', { identifier }) or 0
    if count >= Config.MaxOutfits then return false, 'full' end

    MySQL.insert.await('INSERT INTO p_outfits (identifier, name, data) VALUES (?, ?, ?)', { identifier, name, json.encode(clean) })

    return true, name
end)

lib.callback.register('p_outfits:delete', function(source, id)
    local identifier = getIdentifier(source)
    if not identifier or type(id) ~= 'number' then return false end

    return MySQL.update.await('DELETE FROM p_outfits WHERE id = ? AND identifier = ?', { id, identifier }) > 0
end)
