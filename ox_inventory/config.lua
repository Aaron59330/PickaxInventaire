-- Couleurs reprises du design de cette archive.
-- Bordures bleues transparentes ; menus assortis au fond des cases.
-- Enregistrer puis lancer restart ox_inventory dans la console serveur.
-- Garder les guillemets et les virgules. Les arrondis d'origine sont conservés.
-- rgba : rouge, vert, bleu (0 à 255), puis opacité (0 transparent, 1 opaque).
InventoryStyle = {
    enabled = true, -- false : désactiver cette configuration et retrouver l'original.
    border = '#3b83f65d', -- Bordures bleues des cases, menus, champs et icônes.
    hoverBorder = '#3b83f65d', -- Bordures bleues au survol et lors de la saisie.
    slotBackground = '#1e1e1e9b', -- Fond gris d'origine des cases et notifications.
    controlBackground = '#1e1e1e9b', -- Fond gris d'origine des boutons et quantité.
    controlHoverBackground = '#0c0c0ccc', -- Fond d'origine des boutons au survol.
    inputFocusBackground = '#1e1e1ee4', -- Fond d'origine de la quantité en saisie.
    panelBackground = '#1e1e1e9b', -- Même fond que les cases pour le menu clic droit et les infobulles.
    helpBackground = '#1e1e1e9b', -- Même fond que les cases pour le menu Contrôles utiles et les icônes.
    accent = '#ffffff', -- Reflets blancs d'origine des cases et commandes.
    numberBackground = '#ffffff21', -- Fond blanc transparent des numéros de cases.
    notificationAccent = '#ffffff', -- Reflet blanc des notifications, comme les cases de l'inventaire.
    textColor = '#c1c2c5', -- Texte gris clair d'origine des cases et menus.
}
