local PED_MALE = `mp_m_freemode_01`

local function getSkin()
    local skin
    TriggerEvent('skinchanger:getSkin', function(s) skin = s end)
    return type(skin) == 'table' and skin or nil
end

--- Extrait du skin courant les 14 emplacements de vetements de p_itemclothes.
--- Renvoie (outfit, sex)
local function captureOutfit(skin)
    skin = skin or getSkin()
    if not skin then return end

    local sex = GetEntityModel(cache.ped) == PED_MALE and 'male' or 'female'
    local outfit = {}

    for _, slot in pairs(exports.p_itemclothes:getClothingSlots() or {}) do
        for key in pairs(slot.skin and slot.skin[sex] or {}) do
            if type(skin[key]) == 'number' then outfit[key] = skin[key] end
        end
    end

    return next(outfit) and outfit or nil, sex
end

exports('captureOutfit', captureOutfit)
