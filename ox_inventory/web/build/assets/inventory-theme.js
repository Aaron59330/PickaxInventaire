// Cette passerelle applique exclusivement des variables CSS.
(() => {
  const root = document.documentElement;
  const colors = {
    accent: '--inventory-accent', accentSoft: '--inventory-accent-soft',
    border: '--inventory-border', hoverBorder: '--inventory-hover-border',
    slotBackground: '--inventory-slot-background',
    panelBackground: '--inventory-panel-background', glow: '--inventory-glow'
  };
  const radii = {
    slotRadius: '--inventory-slot-radius', panelRadius: '--inventory-panel-radius',
    controlRadius: '--inventory-control-radius'
  };
  if (typeof GetParentResourceName !== 'function') return;
  fetch(`https://${GetParentResourceName()}/getInventoryStyle`, {
    method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    body: '{}'
  }).then(response => response.json()).then(config => {
    if (!config || config.enabled === false) return;
    for (const [key, variable] of Object.entries(colors)) {
      if (typeof config[key] === 'string' && CSS.supports('color', config[key])) {
        root.style.setProperty(variable, config[key]);
      }
    }
    for (const [key, variable] of Object.entries(radii)) {
      if (typeof config[key] === 'number' && Number.isFinite(config[key])) {
        root.style.setProperty(variable, `${Math.max(0, Math.min(64, config[key]))}px`);
      }
    }
    root.dataset.inventoryTheme = 'blue';
  }).catch(error => console.warn('[ox_inventory] Thème indisponible', error));
})();
