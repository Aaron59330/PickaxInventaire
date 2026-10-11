-- Liaison dédiée au thème ; aucune action d'inventaire n'est modifiée.
RegisterNUICallback('getInventoryStyle', function(_, cb)
    cb(InventoryStyle or { enabled = false })
end)
