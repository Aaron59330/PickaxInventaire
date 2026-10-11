# p_outfits

Tenues sauvegardées pour ESX, branchées sur la case « Tenue » de l'inventaire (`ox_inventory`) et sur `p_itemclothes`.

## Installation
1. Mets le dossier `p_outfits` dans `resources`.
2. Dans `server.cfg`, après `ox_inventory` et `p_itemclothes` : `ensure p_outfits`
3. La table SQL `p_outfits` est créée automatiquement au premier démarrage (oxmysql).

## Utilisation
Clic sur la case **Tenue** dans l'inventaire (ou commande `/tenues`) :
sauvegarder la tenue actuelle, porter une tenue, supprimer.

Une tenue = les 14 emplacements gérés par `p_itemclothes` (chapeau, oreilles, t-shirt, haut, bras, pantalon,
chaussures, masque, lunettes, gilet, sac, montre, chaîne, bracelet). En la portant, `p_itemclothes`
resynchronise les items des 14 slots.

Réglages (nombre max de tenues, textes, délais) : `config.lua`.
