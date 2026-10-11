-- Liaison dédiée au thème ; aucune action d'inventaire n'est modifiée.
RegisterNUICallback('getInventoryStyle', function(_, cb)
    cb(InventoryStyle or { enabled = false })
end)

-- Boutons du bloc "Tenue" (bas de l'inventaire) : id = 'outfit'
-- Branche ton script là-dessus :
--   AddEventHandler('ox_inventory:uiButton', function(id) ... end)
RegisterNUICallback('uiButton', function(data, cb)
    TriggerEvent('ox_inventory:uiButton', data and data.id)
    cb(1)
end)
