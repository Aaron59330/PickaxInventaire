# shopbuilder — Shop Builder ESX complet (UI + oxmysql)

Crée **n'importe quelle boutique en jeu** : supérette, armurerie, magasin de vêtements, coiffeur, pharmacie, bar, bricolage, électronique, marché noir… Tout se gère depuis une interface au même style que le Job Builder. Réservé aux groupes ESX définis dans `config.lua` (`_dev`, `admin`, `superadmin` par défaut), vérifié **côté serveur à chaque action**.

## Installation
1. Copie le dossier `shopbuilder` dans `resources/`.
2. `server.cfg` (après les dépendances) :
   ```
   ensure oxmysql
   ensure es_extended
   ensure ox_inventory   # optionnel : l'inventaire ESX classique fonctionne aussi
   ensure shopbuilder
   ```
3. Les tables `shopbuilder_shops`, `shopbuilder_logs`, `shopbuilder_settings` se créent **toutes seules** au démarrage (ou importe `sql/install.sql`).
4. En jeu : `/shopbuilder`.

## Créer une boutique en 1 minute
1. `/shopbuilder` → **Nouvelle boutique** → choisis un modèle (supérette, armurerie, vêtements…) et un nom.
2. Onglet **Emplacements** → *Ajouter* puis *Ma position* (ou *Mode placement* : tu te déplaces librement, `Entrée` enregistre la position, `←/→` change de cible).
3. Onglet **Produits** → ajuste prix / stocks, ou *Depuis le catalogue* pour piocher dans les items de ton serveur.
4. Onglet **Général** → coche **Boutique active** → **Enregistrer**. Les joueurs la voient immédiatement, sans redémarrage.

## Fonctionnalités
| | |
|---|---|
| **Modèles** | Supérette, Armurerie, Vêtements, Coiffeur, Pharmacie, Bar/Restaurant, Bricolage, Électronique, Marché noir, Personnalisé (modifiables dans `Config.ShopTypes`) |
| **Plusieurs emplacements** | Une même boutique (même catalogue / stock) sur autant de points que tu veux, avec nom de lieu, vendeur PNJ orienté, blip |
| **Marker & vendeur séparés** | Le vendeur (PNJ) peut être placé à un autre endroit que le marker d'interaction (case « Placer le vendeur à un autre endroit »), le marker peut être masqué ou changé de type |
| **Couleur par boutique** | Chaque boutique a sa propre couleur générale (interface d'achat + marker au sol), sinon la couleur globale est utilisée |
| **Produits** | Prix, rayon (catégorie), stock limité ou illimité, promo %, max par achat, licence requise, réservé à certains métiers, activer/désactiver, munitions (armes ESX) |
| **Catalogue serveur** | Sélecteur multi-produits avec recherche (ox_inventory, items ESX, armes) et images |
| **Armurerie** | Armes, munitions, accessoires ; licence par produit (esx_license) ; armes ox_inventory ou ESX classique |
| **Vêtements / coiffeur** | Cabine d'essayage intégrée (curseurs par pièce, rotation du personnage), compatible **skinchanger / esx_skin:save**, illenium-appearance et fivem-appearance : parties modifiables au choix, **paiement uniquement à la validation**, restauration de la tenue si annulé / refusé |
| **Vêtements en items** | Compatible **p_itemclothes** : après l'achat, les emplacements de vêtements portés de l'inventaire sont resynchronisés avec la nouvelle tenue (aucun item en double, remettre un vêtement depuis l'inventaire redonne le bon look). Mode `items` (métadonnées ox_inventory) ou `none` via `Config.ClothingItems.mode` |
| **Paiement** | Espèces, carte, argent sale — au choix par boutique |
| **Accès** | Boutique publique ou réservée à des métiers (grade minimum), licence d'entrée, horaires d'ouverture (plage de nuit possible) |
| **Remises** | Remise générale, remise par métier (ex : -20 % pour la police), cumulées aux promos produit |
| **Société** | Option : créditer un compte `esx_addonaccount` (ex. `society_ammunation`) avec les ventes |
| **Stocks** | Décrémentés à chaque achat, réassort automatique (toutes les N minutes, +X par produit, jusqu'au max), remplissage manuel |
| **Statistiques** | Chiffre d'affaires, ventes, panier moyen, meilleures ventes, stocks bas, journal des achats / modifications |
| **Repères privés** | Nom interne (ex : « Centre-ville ») et note privée par boutique, repère interne par emplacement : affichés dans la liste de gestion, jamais envoyés aux joueurs |
| **Gestion** | Dupliquer, désactiver, supprimer, filtre produits, couleur d'interface globale (Paramètres) |
| **Clavier** | Boutique : `↑↓` choisir un produit, `←→` quantité (`Maj` = ×5), `Entrée` payer. Cabine : `↑↓` choisir la pièce, `←→` modifier (`Maj` = ×5) |
| **Interaction** | Marker + touche `E`, ou `ox_target` (`Config.Target = 'ox_target'`) |
| **Logs Discord** | `Config.Webhook` |

## Sécurité
- Tous les prix, stocks et accès sont recalculés **côté serveur** ; le client n'envoie qu'un panier `{index, nom, quantité}` validé (nom ↔ index, quantités, stock, métier, licence, horaires, distance au point, moyen de paiement).
- Une seule transaction à la fois par joueur ; ce qui ne peut pas être remis est remboursé.
- Les actions du builder vérifient le groupe du joueur à chaque appel.

## Adapter à ton serveur (`config.lua`)
- `Config.HasLicense(src, license)` : vérification de licence (par défaut `esx_license` ; ignorée si absent).
- `Config.SkinSystem` : `'auto'` (illenium / fivem-appearance si démarré, sinon la **cabine intégrée** basée sur skinchanger), `'skinchanger'`, `'esx_skin_menu'`, `'illenium-appearance'`, `'fivem-appearance'`. `Config.OpenClothingMenu / SaveSkin / RestoreSkin` permettent d'adapter un autre système.
- `Config.ImagePath` : chemin des images produits (`nui://ox_inventory/web/images/%s.png`, vide pour désactiver).
- `Config.Payments`, `Config.ClothingParts`, `Config.PedScenarios`, `Config.Marker`.

## Dépannage
- `/sbreset` : débloque l'interface si elle reste « ouverte ».
- Un produit d'un modèle n'apparaît pas à la création : son item n'existe pas sur ton serveur (ignoré volontairement).
- « Une licence est requise » alors que tu n'as pas esx_license : retire la licence du produit / de l'accès.


## Tenue en item (p_outfits)
Avec `p_outfits` démarré (`Config.ClothingItems.mode = 'auto'`), valider une tenue dans la cabine d'essayage **donne un item « Tenue »** dans l'inventaire (le look d'avant l'essayage est restauré). Le joueur glisse l'item sur la case **Tenue** (centre bas de l'inventaire) pour porter toutes les pièces, et la retire de la case pour tout enlever.
