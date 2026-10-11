local L = Config.Locale

local function getSex()
    return GetEntityModel(cache.ped) == `mp_m_freemode_01` and 'male' or 'female'
end

local function getSkin()
    local skin
    TriggerEvent('skinchanger:getSkin', function(s) skin = s end)
    return type(skin) == 'table' and skin or nil
end

-- cles de skin correspondant aux 14 emplacements de vetements de p_itemclothes
local function getClothingKeys()
    local keys = {}
    local slots = exports.p_itemclothes:getClothingSlots()
    local sex = getSex()

    for _, slot in pairs(slots or {}) do
        for key in pairs(slot.skin and slot.skin[sex] or {}) do keys[#keys + 1] = key end
    end

    return keys
end

local function captureOutfit()
    local skin = getSkin()
    if not skin then return end

    local outfit = {}
    for _, key in ipairs(getClothingKeys()) do
        if type(skin[key]) == 'number' then outfit[key] = skin[key] end
    end

    return next(outfit) and outfit or nil
end

local function wearOutfit(outfit, name)
    local changes = {}

    for key, value in pairs(outfit) do
        -- les variantes (_2) doivent etre appliquees apres le modele (_1)
        if key:find('_2') then changes[#changes + 1] = { key, value } else table.insert(changes, 1, { key, value }) end
    end

    for i = 1, #changes do
        TriggerEvent('skinchanger:change', changes[i][1], changes[i][2])
    end

    Wait(Config.ApplyDelay)

    -- p_itemclothes recalcule les items des 14 slots a partir du skin courant
    TriggerEvent('p_itemclothes/client/updateClothes')

    lib.notify({ type = 'success', description = L.worn:format(name) })
end

local openMenu

local function openOutfit(outfit)
    lib.registerContext({
        id = 'p_outfits:outfit',
        title = outfit.name,
        menu = 'p_outfits:menu',
        options = {
            { title = L.wear, icon = 'shirt', onSelect = function() wearOutfit(outfit.data, outfit.name) end },
            {
                title = L.delete, icon = 'trash', iconColor = '#ef4444',
                onSelect = function()
                    local confirm = lib.alertDialog({ header = L.title, content = L.confirm_delete:format(outfit.name), centered = true, cancel = true })
                    if confirm == 'confirm' and lib.callback.await('p_outfits:delete', false, outfit.id) then
                        lib.notify({ type = 'success', description = L.deleted })
                    end
                    openMenu()
                end
            },
        }
    })
    lib.showContext('p_outfits:outfit')
end

function openMenu()
    local list = lib.callback.await('p_outfits:list', false) or {}
    local options = {
        {
            title = L.save, description = L.save_desc, icon = 'floppy-disk',
            onSelect = function()
                local input = lib.inputDialog(L.title, { { type = 'input', label = L.name_label, required = true, max = Config.MaxNameLength } })
                if not input then return openMenu() end

                local outfit = captureOutfit()
                if not outfit then return lib.notify({ type = 'error', description = L.error }) end

                local ok, res = lib.callback.await('p_outfits:save', false, input[1], outfit)
                if ok then lib.notify({ type = 'success', description = L.saved:format(res) })
                else lib.notify({ type = 'error', description = (L[res] or L.error):format(Config.MaxOutfits) }) end
                openMenu()
            end
        }
    }

    if #list == 0 then
        options[#options + 1] = { title = L.none, icon = 'circle-info', disabled = true }
    end

    for i = 1, #list do
        local o = list[i]
        options[#options + 1] = { title = o.name, icon = 'shirt', arrow = true, onSelect = function() openOutfit(o) end }
    end

    lib.registerContext({ id = 'p_outfits:menu', title = L.title, options = options })
    lib.showContext('p_outfits:menu')
end

-- clic sur la case "Tenue" de l'inventaire (voir ox_inventory/style_client.lua)
AddEventHandler('ox_inventory:uiButton', function(id)
    if id ~= 'outfit' then return end

    exports.ox_inventory:closeInventory()
    Wait(Config.OpenDelay)
    openMenu()
end)

RegisterCommand('tenues', function() openMenu() end, false)
