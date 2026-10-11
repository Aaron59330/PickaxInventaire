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

  // Fond sombre teinté derrière l'inventaire (le « flou violet ») :
  //   backdrop: false          -> aucun fond
  //   backdropOpacity: 0 à 1   -> intensité (1 = par défaut)
  // Le flou de l'écran du jeu (derrière l'interface) se règle côté serveur :
  //   set inventory:screenblur 0   dans server.cfg
  backdrop: true,
  backdropOpacity: 1,

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
