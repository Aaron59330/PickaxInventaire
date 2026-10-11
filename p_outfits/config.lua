Config = {}

-- Nom de l'item "tenue" (doit exister dans ox_inventory/data/items.lua et correspondre a
-- `inventory:outfititem` dans server.cfg si tu le changes)
Config.ItemName = 'clothes_outfit'

-- Delai (ms) entre le deplacement de la tenue et l'application des pieces
Config.ApplyDelay = 100

-- Apres equipement, les pieces portees avant (qui ne font pas partie de la tenue) sont rangees dans l'inventaire.
-- Si l'inventaire est plein, la piece actuelle est conservee.
Config.StoreReplacedPieces = true

Config.Locale = {
    wrong_sex = "Cette tenue n'est pas faite pour ton personnage",
    equipped = 'Tenue equipee',
    removed = 'Tenue retiree',
    kept = "Inventaire plein : %s piece(s) n'ont pas pu etre rangees et restent portees",
}
