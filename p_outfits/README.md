# p_outfits — tenues complètes (ox_inventory + p_itemclothes)

- Un item **Tenue** (`clothes_outfit`) contient les 14 pièces d'un look (métadonnées `skin`, `sex`).
- Il se glisse sur la case **Tenue** (centre, en bas de l'inventaire) :
  - les 14 emplacements de vêtements prennent les pièces de la tenue ;
  - les pièces portées avant sont rangées dans l'inventaire (si place) ;
  - retirer la tenue de la case retire toutes ses pièces (les pièces ajoutées à la main sont rangées dans l'inventaire).
- Le slot Tenue n'accepte que cet item, uniquement dans l'inventaire du joueur lui-même.

Installation : `ensure p_outfits` après `ox_inventory` et `p_itemclothes`.
La tenue est créée par `shopbuilder` (boutique de vêtements) via `exports.p_outfits:sanitize`.
