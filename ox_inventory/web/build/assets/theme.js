// ============================================================
//  THEME DE L'INVENTAIRE
//  Change simplement la couleur ci-dessous (format #RRGGBB).
//  Toutes les teintes (survols, boutons, fonds, bordures,
//  lueurs, barre de défilement...) sont calculées à partir d'elle.
//
//  Exemples :  violet #7b4bb8   bleu #3b82f6   rouge #dc2626
//              vert #16a34a     orange #ea580c   rose #db2777
// ============================================================
window.INVENTORY_THEME = {
  color: '#7b4bb8',

  // Logo affiché en haut au milieu : remplace web/build/assets/logo.png
  // par ton image (PNG transparent), ou mets logo: false pour le masquer.
  logo: 'assets/logo.png',

  // Bloc "Tenue" en bas au milieu (boutons + case).
  // Image de la case : ex. image: 'assets/tenue.png' (vide = silhouette).
  tenue: {
    enabled: true,
    label: 'Tenue',
    image: ''
  }
};
