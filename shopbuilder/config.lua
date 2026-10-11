Config = {}

-- ─────────────────────────────── Général ───────────────────────────────
Config.AllowedGroups   = { '_dev', 'admin', 'superadmin' }   -- groupes ESX autorisés à ouvrir le builder
Config.AcePermission   = 'shopbuilder.admin'                 -- (optionnel) permission ACE alternative
Config.Command         = 'shopbuilder'                       -- /shopbuilder ouvre le builder

Config.DrawDistance     = 15.0   -- distance d'affichage des markers
Config.InteractDistance = 1.8    -- distance pour interagir (E)
Config.ServerDistance   = 12.0   -- tolérance côté serveur (anti-triche)
Config.PedDistance      = 60.0   -- distance d'apparition des vendeurs (PNJ)

Config.Inventory = 'auto'        -- 'auto' | 'ox' | 'esx'
Config.Target    = 'none'        -- 'none' (marker + touche E) | 'ox_target' (zone cliquable, en plus du marker)
Config.InteractKey = 38          -- E

Config.MaxShops          = 300
Config.MaxItemsPerShop   = 300
Config.MaxLocations      = 30
Config.MaxQtyPerPurchase = 100   -- plafond absolu par ligne du panier (modifiable par produit)
Config.MaxCartLines      = 40

Config.Currency = '$'
Config.ImagePath = 'nui://ox_inventory/web/images/%s.png'   -- image des produits ('%s' = nom de l'item) ; laisse '' pour désactiver
Config.DefaultWeaponAmmo = 42    -- (inventaire ESX classique) munitions données avec une arme achetée

Config.Webhook = ''              -- (optionnel) webhook Discord pour les logs d'achats / de gestion

-- Moyens de paiement proposables (compte ESX correspondant)
Config.Payments = {
    cash        = { label = 'Espèces',       account = 'money' },
    bank        = { label = 'Carte bancaire', account = 'bank' },
    black_money = { label = 'Argent sale',   account = 'black_money' },
}

-- ─────────────────────────────── Apparence des points ───────────────────────────────
Config.Marker = { type = 25, color = { 64, 224, 208 }, alpha = 140, scale = { x = 0.9, y = 0.9, z = 0.6 }, offset = -0.95 }

Config.UI = { Accent = { 239, 68, 68 } }   -- couleur d'accentuation (modifiable en jeu : Paramètres → Apparence)

-- ─────────────────────────────── Vendeurs (PNJ) ───────────────────────────────
Config.PedScenarios = {
    { id = 'WORLD_HUMAN_STAND_IMPATIENT', label = 'Debout, patient' },
    { id = 'WORLD_HUMAN_CLIPBOARD',       label = 'Bloc-notes' },
    { id = 'WORLD_HUMAN_AA_COFFEE',       label = 'Café' },
    { id = 'WORLD_HUMAN_SMOKING',         label = 'Fume' },
    { id = 'WORLD_HUMAN_GUARD_STAND',     label = 'Garde' },
    { id = 'WORLD_HUMAN_HANG_OUT_STREET', label = 'Appuyé' },
    { id = '',                            label = 'Aucune animation' },
}

-- ─────────────────────────────── Vêtements / coiffeur ───────────────────────────────
-- Parties du corps modifiables dans une boutique de vêtements (clés esx_skin / skinchanger)
Config.ClothingParts = {
    top      = { label = 'Hauts',        keys = { 'tshirt_1', 'tshirt_2', 'torso_1', 'torso_2', 'decals_1', 'decals_2', 'arms', 'arms_2' } },
    pants    = { label = 'Pantalons',    keys = { 'pants_1', 'pants_2' } },
    shoes    = { label = 'Chaussures',   keys = { 'shoes_1', 'shoes_2' } },
    hat      = { label = 'Chapeaux',     keys = { 'helmet_1', 'helmet_2' } },
    glasses  = { label = 'Lunettes',     keys = { 'glasses_1', 'glasses_2' } },
    mask     = { label = 'Masques',      keys = { 'mask_1', 'mask_2' } },
    chain    = { label = 'Chaînes',      keys = { 'chain_1', 'chain_2' } },
    ears     = { label = 'Oreilles',     keys = { 'ears_1', 'ears_2' } },
    watches  = { label = 'Montres',      keys = { 'watches_1', 'watches_2' } },
    bracelets = { label = 'Bracelets',   keys = { 'bracelets_1', 'bracelets_2' } },
    bags     = { label = 'Sacs',         keys = { 'bags_1', 'bags_2' } },
    bproof   = { label = 'Gilets',       keys = { 'bproof_1', 'bproof_2' } },
    hair     = { label = 'Cheveux',      keys = { 'hair_1', 'hair_2', 'hair_color_1', 'hair_color_2' } },
    beard    = { label = 'Barbe',        keys = { 'beard_1', 'beard_2', 'beard_3', 'beard_4' } },
    makeup   = { label = 'Maquillage',   keys = { 'makeup_1', 'makeup_2', 'makeup_3', 'makeup_4', 'lipstick_1', 'lipstick_2', 'lipstick_3', 'lipstick_4', 'blush_1', 'blush_2', 'blush_3' } },
}

-- Vêtements en items (ox_inventory) : à l'achat d'une tenue, chaque pièce modifiée est remise au joueur sous forme d'item dont les
-- métadonnées contiennent le look (clés skinchanger). C'est le format du script « vetements » (clothes_tshirt, clothes_torso, ...) :
-- sans ça, retirer puis remettre un vêtement de l'inventaire rétablit l'ANCIEN look. Ajoute tes propres items (chapeau, lunettes…) ici.
--   mode 'p_itemclothes' : tes vêtements portés SONT les items des emplacements de tenue de l'inventaire. Après l'achat, le script
--                          demande à p_itemclothes de resynchroniser ces emplacements avec le nouveau skin (aucun item en double).
--   mode 'items'         : (inventaire ox classique) chaque pièce modifiée est remise en item avec métadonnées (groupes ci-dessous).
--   mode 'none'          : seulement le skin est enregistré.
--   mode 'outfit'        : l'achat donne un item « Tenue » (ressource p_outfits) contenant les 14 pièces ; le joueur le glisse sur la
--                          case Tenue de l'inventaire pour l'équiper. Le look d'avant l'achat est restauré dans la cabine.
--   mode 'auto'          : outfit si p_outfits démarré, sinon p_itemclothes si démarré, sinon 'items' (si enabled et ox_inventory), sinon 'none'.
Config.ClothingItems = {
    mode = 'auto',
    enabled = true,       -- utilisé par le mode 'items'       -- seulement si ox_inventory est utilisé ; false = la tenue n'est enregistrée que dans le skin
    groups = {
        { item = 'clothes_tshirt', keys = { 'tshirt_1', 'tshirt_2' } },
        { item = 'clothes_torso',  keys = { 'torso_1', 'torso_2', 'arms', 'arms_2', 'decals_1', 'decals_2' } },
        { item = 'clothes_pants',  keys = { 'pants_1', 'pants_2' } },
        { item = 'clothes_shoes',  keys = { 'shoes_1', 'shoes_2' } },
        -- { item = 'clothes_helmet',  keys = { 'helmet_1', 'helmet_2' } },
        -- { item = 'clothes_glasses', keys = { 'glasses_1', 'glasses_2' } },
    },
}

function Config.ClothingMode()
    local ci = Config.ClothingItems
    if ci.mode ~= 'auto' then return ci.mode end
    if GetResourceState('p_outfits') == 'started' then return 'outfit' end
    if GetResourceState('p_itemclothes') == 'started' then return 'p_itemclothes' end
    if ci.enabled and GetResourceState('ox_inventory') == 'started' then return 'items' end
    return 'none'
end

-- ─────────────────────────────── Modèles de boutiques ───────────────────────────────
-- mode : 'items' (catalogue de produits) | 'clothing' (cabine d'essayage payante)
-- Les produits proposés par défaut ne sont ajoutés que s'ils existent dans ton inventaire (items ox_inventory / table items ESX).
-- Chaque type est entièrement modifiable ensuite en jeu.
Config.ShopTypes = {
    general = {
        label = 'Supérette', icon = 'cart', mode = 'items',
        blip = { sprite = 52, color = 2 }, ped = 'mp_m_shopkeep_01',
        categories = { 'Nourriture', 'Boissons', 'Divers' },
        items = {
            { 'bread', 'Pain', 5, 'Nourriture' }, { 'sandwich', 'Sandwich', 8, 'Nourriture' }, { 'burger', 'Burger', 12, 'Nourriture' },
            { 'chips', 'Chips', 4, 'Nourriture' }, { 'water', 'Eau', 3, 'Boissons' }, { 'cola', 'Cola', 4, 'Boissons' },
            { 'coffee', 'Café', 4, 'Boissons' }, { 'phone', 'Téléphone', 450, 'Divers' }, { 'radio', 'Radio', 250, 'Divers' },
        },
    },
    weapons = {
        label = 'Armurerie', icon = 'target', mode = 'items',
        blip = { sprite = 110, color = 1 }, ped = 's_m_y_ammucity_01',
        categories = { 'Armes de poing', 'Armes blanches', 'Munitions', 'Accessoires' },
        items = {
            { 'WEAPON_PISTOL', 'Pistolet', 2500, 'Armes de poing', 'weapon' }, { 'WEAPON_COMBATPISTOL', 'Pistolet de combat', 3200, 'Armes de poing', 'weapon' },
            { 'WEAPON_KNIFE', 'Couteau', 150, 'Armes blanches' }, { 'WEAPON_BAT', 'Batte', 120, 'Armes blanches' }, { 'WEAPON_FLASHLIGHT', 'Lampe torche', 60, 'Accessoires' },
            { 'ammo-9', 'Munitions 9mm', 2, 'Munitions', 'weapon' }, { 'armour', 'Gilet pare-balles', 900, 'Accessoires', 'weapon' },
        },
    },
    clothing = {
        label = 'Boutique de vêtements', icon = 'shirt', mode = 'clothing',
        blip = { sprite = 73, color = 47 }, ped = 's_f_y_shop_mid',
        clothing = { price = 150, parts = { 'top', 'pants', 'shoes', 'hat', 'glasses', 'mask', 'chain', 'ears', 'watches', 'bracelets', 'bags' } },
    },
    barber = {
        label = 'Coiffeur', icon = 'user', mode = 'clothing',
        blip = { sprite = 71, color = 0 }, ped = 's_f_m_fembarber',
        clothing = { price = 60, parts = { 'hair', 'beard', 'makeup' } },
    },
    pharmacy = {
        label = 'Pharmacie', icon = 'heart', mode = 'items',
        blip = { sprite = 51, color = 2 }, ped = 's_f_y_scrubs_01',
        categories = { 'Soins', 'Médicaments' },
        items = { { 'bandage', 'Bandage', 40, 'Soins' }, { 'medikit', 'Kit de soin', 250, 'Soins' }, { 'painkillers', 'Antidouleurs', 60, 'Médicaments' } },
    },
    bar = {
        label = 'Bar / Restaurant', icon = 'utensils', mode = 'items',
        blip = { sprite = 93, color = 5 }, ped = 's_m_y_barman_01',
        categories = { 'Boissons', 'Plats' },
        items = { { 'beer', 'Bière', 8, 'Boissons' }, { 'whisky', 'Whisky', 18, 'Boissons' }, { 'vodka', 'Vodka', 18, 'Boissons' }, { 'burger', 'Burger', 14, 'Plats' }, { 'pizza', 'Pizza', 16, 'Plats' } },
    },
    hardware = {
        label = 'Bricolage / Outils', icon = 'wrench', mode = 'items',
        blip = { sprite = 402, color = 17 }, ped = 's_m_y_construct_01',
        categories = { 'Outils', 'Divers' },
        items = { { 'repairkit', 'Kit de réparation', 400, 'Outils' }, { 'lockpick', 'Crochet', 150, 'Outils' }, { 'jerrycan', 'Jerrican', 80, 'Divers' }, { 'rope', 'Corde', 30, 'Divers' } },
    },
    electronics = {
        label = 'Électronique', icon = 'tablet', mode = 'items',
        blip = { sprite = 521, color = 3 }, ped = 'a_m_y_business_02',
        categories = { 'Appareils', 'Accessoires' },
        items = { { 'phone', 'Téléphone', 450, 'Appareils' }, { 'radio', 'Radio', 250, 'Appareils' }, { 'tablet', 'Tablette', 600, 'Appareils' }, { 'powerbank', 'Batterie externe', 40, 'Accessoires' } },
    },
    blackmarket = {
        label = 'Marché noir', icon = 'lock', mode = 'items',
        blip = nil, ped = 'g_m_m_chigoon_01',
        payments = { cash = false, bank = false, black_money = true },
        categories = { 'Illégal' },
        items = { { 'lockpick', 'Crochet', 200, 'Illégal' }, { 'WEAPON_SWITCHBLADE', 'Cran d\'arrêt', 600, 'Illégal' } },
    },
    custom = {
        label = 'Boutique personnalisée', icon = 'tag', mode = 'items',
        blip = { sprite = 52, color = 0 }, ped = 'mp_m_shopkeep_01',
        categories = { 'Général' },
        items = {},
    },
}

-- ─────────────────────────────── Hooks (adapter à ton serveur) ───────────────────────────────
-- Vérifie une licence côté serveur (ex : 'weapon'). Par défaut : esx_license si démarré, sinon la condition est ignorée.
if IsDuplicityVersion() then
    Config.HasLicense = function(src, license)
        if GetResourceState('esx_license') ~= 'started' then return true end
        local p = promise.new()
        TriggerEvent('esx_license:checkLicense', src, license, function(has) p:resolve(has == true) end)
        SetTimeout(2500, function() p:resolve(false) end)
        return Citizen.Await(p)
    end
end

if not IsDuplicityVersion() then
    -- Système de vêtements :
    --   'auto'                 → illenium-appearance / fivem-appearance si démarré, sinon la cabine intégrée (skinchanger)
    --   'skinchanger'          → cabine d'essayage intégrée au Shop Builder (utilise skinchanger + esx_skin:save, comme esx_skin)
    --   'esx_skin_menu'        → menu d'esx_skin (esx_skin:openRestrictedMenu)
    --   'illenium-appearance' / 'fivem-appearance'
    Config.SkinSystem = 'auto'

    function Config.GetSkinSystem()
        if Config.SkinSystem ~= 'auto' then return Config.SkinSystem end
        for _, r in ipairs({ 'illenium-appearance', 'fivem-appearance' }) do
            if GetResourceState(r) == 'started' then return r end
        end
        return 'skinchanger'
    end

    -- Traduit la liste de clés esx_skin autorisées en options illenium / fivem-appearance
    local function appearanceConfig(restrict)
        local has = {}
        for _, k in ipairs(restrict or {}) do has[(k:gsub('_%d+$', ''))] = true end
        local props = has.helmet or has.glasses or has.ears or has.watches or has.bracelets
        local comps = has.tshirt or has.torso or has.pants or has.shoes or has.mask or has.bags or has.bproof or has.chain or has.arms or has.decals
        local face = has.hair or has.beard or has.makeup or has.lipstick or has.blush
        return { ped = false, headBlend = false, faceFeatures = false, headOverlays = face and true or false, components = comps and true or false, props = props and true or false, tattoos = false }
    end

    local backup
    -- Menus externes (tout sauf la cabine intégrée). `restrict` = clés de vêtements modifiables. submit() / cancel() à appeler.
    Config.OpenClothingMenu = function(restrict, submit, cancel)
        local sys = Config.GetSkinSystem()
        if sys == 'illenium-appearance' or sys == 'fivem-appearance' then
            backup = exports[sys]:getPedAppearance(PlayerPedId())
            exports[sys]:startPlayerCustomization(function(appearance) if appearance then submit() else cancel() end end, appearanceConfig(restrict))
        elseif sys == 'esx_skin_menu' then
            TriggerEvent('esx_skin:openRestrictedMenu', function() submit() end, function() cancel() end, restrict)
        else
            ESX.ShowNotification('~r~Système de vêtements inconnu : voir Config.SkinSystem.')
            cancel()
        end
    end

    -- Enregistre la tenue achetée (après paiement réussi)
    Config.SaveSkin = function()
        local sys = Config.GetSkinSystem()
        if sys == 'illenium-appearance' then
            TriggerServerEvent('illenium-appearance:server:saveAppearance', exports[sys]:getPedAppearance(PlayerPedId()))
        elseif sys == 'fivem-appearance' then
            TriggerServerEvent('fivem-appearance:save', exports[sys]:getPedAppearance(PlayerPedId()))
        else
            TriggerEvent('skinchanger:getSkin', function(skin) TriggerServerEvent('esx_skin:save', skin) end)
        end
    end

    -- Restaure la tenue d'avant (menus externes : annulation / paiement refusé)
    Config.RestoreSkin = function()
        local sys = Config.GetSkinSystem()
        if (sys == 'illenium-appearance' or sys == 'fivem-appearance') and backup then
            exports[sys]:setPlayerAppearance(backup)
        else
            ESX.TriggerServerCallback('esx_skin:getPlayerSkin', function(skin) TriggerEvent('skinchanger:loadSkin', skin) end)
        end
    end
end

-- ═══════════════════════════════ Réglages modifiables en jeu ═══════════════════════════════
-- Les valeurs ci-dessus sont les DÉFAUTS. L'apparence (couleur) se modifie en jeu via /shopbuilder → Paramètres.
