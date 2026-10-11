'use strict';
/* ════════════════════════════ Utilitaires ════════════════════════════ */
const $root = document.getElementById('root');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let CUR = '$';
const money = n => Number(n || 0).toLocaleString('fr-FR') + ' ' + CUR;
const r2 = n => Math.round(n * 100) / 100;
const fmtDate = t => new Date(t * 1000).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
const initials = n => String(n || '?').split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
const resName = () => (typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'shopbuilder');
const clone = o => JSON.parse(JSON.stringify(o));

async function rpc(name, ...args) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  try {
    const r = await fetch(`https://${resName()}/rpc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, args }), signal: ctl.signal });
    return await r.json();
  } catch (e) {
    return { ok: false, error: ctl.signal.aborted ? `Le serveur ne répond pas à « ${name} » : vérifie que les fichiers sont à jour (refresh + restart shopbuilder)` : 'Erreur de communication' };
  } finally { clearTimeout(timer); }
}

function toast(msg, type = '') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function confirmBox(title, text, okLabel = 'Confirmer', danger = true) {
  return new Promise(resolve => {
    const c = document.getElementById('confirm');
    c.innerHTML = `<div class="box"><h2>${esc(title)}</h2><p>${esc(text)}</p><div class="row"><span class="spacer"></span><button id="c-no">Annuler</button><button class="${danger ? 'danger' : 'primary'}" id="c-yes">${esc(okLabel)}</button></div></div>`;
    c.classList.remove('hidden');
    const done = v => { c.classList.add('hidden'); c.innerHTML = ''; resolve(v); };
    document.getElementById('c-no').onclick = () => done(false);
    document.getElementById('c-yes').onclick = () => done(true);
  });
}

function setPath(obj, path, val) {
  const keys = path.split('.');
  let o = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (o[keys[i]] == null || typeof o[keys[i]] !== 'object') o[keys[i]] = {};
    o = o[keys[i]];
  }
  o[keys[keys.length - 1]] = val;
}
const getPath = (obj, path) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);

/* ── Icônes (style trait fin) ── */
const P = {
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  shirt: '<path d="M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/>',
  box: '<path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  store: '<path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 7v3a2 2 0 0 1-2 2 2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.6-.6.7.7 0 0 0-.8 0A2.7 2.7 0 0 1 4 12a2 2 0 0 1-2-2V7"/>',
  shield: '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>',
  dollar: '<path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  grid: '<rect width="7" height="7" x="3" y="3" rx="1"/><rect width="7" height="7" x="14" y="3" rx="1"/><rect width="7" height="7" x="14" y="14" rx="1"/><rect width="7" height="7" x="3" y="14" rx="1"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  tag: '<path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42z"/><circle cx="7.5" cy="7.5" r=".5"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  utensils: '<path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/>',
  tablet: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M12 18h.01"/>',
  sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M2 14h4"/><path d="M10 8h4"/><path d="M18 16h4"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  chart: '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15"/><path d="M15 6v15"/>',
  settings: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>',
  card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
};
const ic = (n, s) => `<svg class="ic" viewBox="0 0 24 24" ${s ? `style="width:${s}px;height:${s}px"` : ''}>${P[n] || P.grid}</svg>`;
const PAY_ICON = { cash: 'dollar', bank: 'card', black_money: 'lock' };

/* ── Thème : couleur d'accentuation (modifiable en jeu) ── */
function applyTheme(rgb) {
  rgb = Array.isArray(rgb) && rgb.length === 3 ? rgb : [239, 68, 68];
  const [r, g, b] = rgb.map(n => Math.max(0, Math.min(255, Math.round(Number(n) || 0))));
  const st = document.documentElement.style;
  st.setProperty('--accent-rgb', `${r}, ${g}, ${b}`);
  st.setProperty('--on-accent', (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.62 ? '#0b0b0c' : '#ffffff');
}

/* ── Gabarits de coque ── */
const tile = (icon, cls = '') => `<div class="tile ${cls}">${ic(icon)}</div>`;
const closeBtn = `<button class="icon" data-a="close" title="Fermer">${ic('x', 16)}</button>`;
const fld = (label, input, extra = '') => `<label class="f" ${extra}><span>${label}</span>${input}</label>`;
const chip = (text, cls = '') => `<span class="chip ${cls}">${esc(text)}</span>`;

function header({ icon, title, sub, acts = '' }) {
  return `<div class="head">${tile(icon, 'lg')}<div class="ttl"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="acts">${acts}${closeBtn}</div></div>`;
}

function shellSide({ profile, nav, active, foot = '', head, body, bodyCls = '' }) {
  return `<div class="shell"><aside class="side">
    <div class="profile"><div class="avatar">${esc(profile.initials)}</div><div><b>${esc(profile.title)}</b><small>${esc(profile.sub)}</small></div></div>
    <div class="nav">${nav.map(sec => `${sec.label ? `<div class="nav-label">${esc(sec.label)}</div>` : ''}${sec.items.map(it => `<div class="nav-item ${it.id === active ? 'active' : ''} ${it.sub ? 'has-sub' : ''}" data-a="nav" data-v="${esc(it.id)}">${ic(it.icon)}<span class="grow">${esc(it.text)}${it.sub ? `<small class="navsub">${esc(it.sub)}</small>` : ''}</span>${it.count != null ? `<span class="count">${esc(it.count)}</span>` : ''}</div>`).join('')}`).join('')}</div>
    <div class="side-foot">${foot}</div></aside>
    <section class="main">${header(head)}<div class="body ${bodyCls}">${body}</div></section></div>`;
}

function panel({ icon, title, sub, body, cls = '' }) {
  return `<div class="panel ${cls}">${header({ icon, title, sub })}<div class="pb">${body}</div></div>`;
}

const emptyState = (icon, title, text) => `<div class="empty">${tile(icon)}<h2>${esc(title)}</h2><p>${esc(text)}</p></div>`;

function coordField(path, c, { tp = false } = {}) {
  c = c || {};
  const f = (k, l) => fld(l, `<input type="number" step="0.01" data-path="${path}.${k}" data-t="n" value="${c[k] ?? ''}">`);
  return `<div class="coord ${tp ? 'tp' : ''}">${f('x', 'X')}${f('y', 'Y')}${f('z', 'Z')}${f('h', 'Cap')}
    <button data-a="coords" data-v="${path}">${ic('pin', 15)} Ma position</button>${tp ? `<button data-a="tp" data-v="${path}" ${c.x == null ? 'disabled' : ''}>TP</button>` : ''}</div>`;
}

async function grabCoords(root, path) {
  const p = await rpc('getCoords');
  setPath(root, path, Object.assign({}, getPath(root, path) || {}, { x: r2(p.x), y: r2(p.y), z: r2(p.z), h: r2(p.h) }));
  toast('Position enregistrée', 'ok');
}

const productImg = (path, name, cls = '') => path && name ? `<img class="pimg ${cls}" src="${esc(path.replace('%s', name))}" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'pimg-ph',innerHTML:window.__box}))">` : `<span class="pimg-ph">${ic('box', 22)}</span>`;
window.__box = ic('box', 22);

/* ════════════════════════════ Mode placement ════════════════════════════ */
const Placement = {
  on: false, targets: [], i: 0, mod: null,

  async start(mod) {
    const t = mod && mod.placementTargets ? mod.placementTargets() : [];
    if (!t.length) return toast('Rien à placer : ajoute d\'abord un emplacement', 'err');
    this.mod = mod; this.targets = t; this.on = true;
    const first = t.findIndex(x => { const c = getPath(x.root, x.path); return !c || c.x == null; });
    this.i = first >= 0 ? first : 0;
    $root.classList.add('hidden');
    this.render();
    await rpc('placement', true);
  },

  hide() { this.on = false; document.getElementById('placement').classList.add('hidden'); },

  render() {
    const el = document.getElementById('placement'), t = this.targets[this.i], c = getPath(t.root, t.path);
    const has = c && c.x != null;
    el.innerHTML = `<div class="eyebrow">Mode placement · ${this.i + 1}/${this.targets.length}</div><b>${esc(t.label)}</b>
      <div class="coords ${has ? 'ok' : ''}">${has ? `✔ ${c.x}, ${c.y}, ${c.z}` : '⚠ position non définie'}</div>
      <div class="dots">${this.targets.map((x, k) => { const cc = getPath(x.root, x.path); return `<i class="${cc && cc.x != null ? 'set' : ''} ${k === this.i ? 'cur' : ''}"></i>`; }).join('')}</div>
      <div class="keys"><span><kbd>Entrée</kbd> Enregistrer ma position ici</span><span><kbd>←</kbd><kbd>→</kbd> Changer de cible</span><span><kbd>Retour</kbd> Revenir au menu</span></div>`;
    el.classList.remove('hidden');
  },

  save(c) {
    if (!this.on) return;
    const t = this.targets[this.i];
    setPath(t.root, t.path, Object.assign({}, getPath(t.root, t.path) || {}, { x: r2(c.x), y: r2(c.y), z: r2(c.z), h: r2(c.h) }));
    if (this.mod) this.mod.dirty = true;
    toast(`${t.label} : position enregistrée`, 'ok');
    if (this.i < this.targets.length - 1) this.i++;
    this.render();
  },

  nav(d) { if (!this.on) return; this.i = (this.i + d + this.targets.length) % this.targets.length; this.render(); },

  end() {
    if (!this.on) return;
    this.hide();
    $root.classList.remove('hidden');
    if (this.mod && this.mod.render) this.mod.render();
  },
};

/* ════════════════════════════ Routage global ════════════════════════════ */
let Mod = null;
const close = () => rpc('close');

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') { if (Mod && Mod.onKey && $root && !$root.classList.contains('hidden')) Mod.onKey(e); return; }
  const modal = document.getElementById('modal');
  if (modal && !modal.classList.contains('hidden')) { Modal.close(); return; }
  if (!document.getElementById('confirm').classList.contains('hidden')) return;
  close();
});
document.addEventListener('keyup', e => { if (Mod && Mod.onKeyUp) Mod.onKeyUp(e); });
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el) return;
  if (el.dataset.a === 'close') return close();
  if (el.dataset.a === 'placeStart') return Placement.start(Mod);
  if (Mod && Mod.onA) Mod.onA(el, e);
});
document.addEventListener('input', e => { if (Mod && Mod.onInput && e.target.dataset.path) Mod.onInput(e.target, false); });
document.addEventListener('change', e => { if (Mod && Mod.onInput) Mod.onInput(e.target, true); });

/* ── Fenêtre modale (sélecteur de produits) ── */
const Modal = {
  open(html) { const m = document.getElementById('modal'); m.innerHTML = html; m.classList.remove('hidden'); },
  close() { const m = document.getElementById('modal'); m.classList.add('hidden'); m.innerHTML = ''; if (Mod && Mod.onModalClose) Mod.onModalClose(); },
  get el() { return document.getElementById('modal'); },
};
document.getElementById('modal').addEventListener('mousedown', e => { if (e.target.id === 'modal') Modal.close(); });

window.addEventListener('message', e => {
  const d = e.data;
  if (d.action === 'close') { applyTheme(window.__theme); $root.classList.add('hidden'); $root.innerHTML = ''; Placement.hide(); Modal.close(); return; }
  if (d.action === 'placementSave') return Placement.save(d.coords);
  if (d.action === 'placementNav') return Placement.nav(d.dir);
  if (d.action === 'placementEnd') return Placement.end();
  if (d.action === 'theme') { window.__theme = d.accent; return applyTheme(d.accent); }
  if (d.action !== 'open') return;
  if (d.theme) { window.__theme = d.theme; applyTheme(d.theme); }
  const now = Date.now();
  if (!$root.classList.contains('hidden') && now - (window.__lastOpen || 0) < 600) return;   // double ouverture : ignorée
  window.__lastOpen = now;
  if ($root.classList.contains('hidden')) { $root.innerHTML = ''; $root.classList.add('fresh'); setTimeout(() => $root.classList.remove('fresh'), 260); }
  $root.classList.remove('hidden', 'corner');
  Placement.hide();
  if (d.kind === 'builder') { Mod = Builder; Builder.open(); }
  else { Mod = Shop; Shop.open(d.data); }
});

/* ════════════════════════════ BOUTIQUE (joueur) ════════════════════════════ */
const Shop = {
  d: null, cat: '__all', q: '', cart: {}, method: null, busy: false, sel: null, cabin: null, cabinSel: 0, inCabin: false,

  open(data) {
    this.d = data; this.cat = '__all'; this.q = ''; this.cart = {}; this.busy = false; this.sel = null; this.inCabin = false;
    CUR = data.currency || '$';
    if (data.shop.color) applyTheme(data.shop.color);   // couleur générale de la boutique
    this.method = (data.payments[0] || {}).id;
    this.render();
  },

  shopIcon() {
    const t = this.d.shop.type;
    return { weapons: 'target', clothing: 'shirt', barber: 'user', pharmacy: 'heart', bar: 'utensils', hardware: 'wrench', electronics: 'tablet', blackmarket: 'lock', general: 'cart' }[t] || (this.d.shop.mode === 'clothing' ? 'shirt' : 'store');
  },

  discChip() { return this.d.shop.discount > 0 ? chip(`-${this.d.shop.discount}% de remise`, 'ok') : ''; },

  payPicker() {
    const d = this.d;
    if (d.payments.length === 1) return `<div class="lbl">Paiement</div><div class="paybox one">${ic(PAY_ICON[d.payments[0].id] || 'dollar', 16)}<b>${esc(d.payments[0].label)}</b><span class="muted">${money(d.payments[0].balance)}</span></div>`;
    return `<div class="lbl">Paiement</div><div class="paygrid">${d.payments.map(p => `<button class="paybtn ${p.id === this.method ? 'on' : ''}" data-a="pay" data-v="${esc(p.id)}">${ic(PAY_ICON[p.id] || 'dollar', 16)}<span>${esc(p.label)}<small>${money(p.balance)}</small></span></button>`).join('')}</div>`;
  },

  render() {
    if (this.d.shop.mode === 'clothing') return this.renderClothing();
    const d = this.d;
    const cats = d.categories.filter(c => d.items.some(i => i.category === c));
    const uncat = d.items.some(i => !i.category || !d.categories.includes(i.category));
    const nav = [{ label: 'Rayons', items: [{ id: '__all', icon: 'grid', text: 'Tout', count: d.items.length }, ...cats.map(c => ({ id: c, icon: 'tag', text: c, count: d.items.filter(i => i.category === c).length })), ...(uncat && cats.length ? [{ id: '__other', icon: 'box', text: 'Autres', count: d.items.filter(i => !i.category || !d.categories.includes(i.category)).length }] : [])] }];
    $root.innerHTML = shellSide({
      profile: { initials: initials(d.shop.label), title: d.shop.label, sub: 'Boutique' },
      nav, active: this.cat,
      foot: `<div class="side-pay">${this.payPicker()}</div>${d.shop.note ? `<small>${esc(d.shop.note)}</small>` : ''}`,
      head: { icon: this.shopIcon(), title: d.shop.label, sub: d.shop.note || 'Choisis tes articles puis paie', acts: `${this.discChip()}<div class="searchbox">${ic('search', 15)}<input id="shop-q" placeholder="Rechercher un produit…" value="${esc(this.q)}"></div>` },
      body: `<div class="shop-wrap"><div class="prod-grid" id="prod-grid"></div><div class="cart" id="cart"></div></div>`,
      bodyCls: 'fill',
    });
    document.getElementById('shop-q').addEventListener('input', e => { this.q = e.target.value; this.renderGrid(); });
    this.renderGrid(); this.renderCart();
  },

  visible() {
    const q = this.q.trim().toLowerCase(), d = this.d;
    return d.items.filter(i => {
      if (this.cat === '__other') { if (i.category && d.categories.includes(i.category)) return false; }
      else if (this.cat !== '__all' && i.category !== this.cat) return false;
      return !q || i.label.toLowerCase().includes(q) || i.name.toLowerCase().includes(q);
    });
  },

  renderGrid() {
    const el = document.getElementById('prod-grid');
    if (!el) return;
    const list = this.visible();
    if (!list.length) { el.innerHTML = `<div style="grid-column:1/-1">${emptyState('search', 'Aucun produit', this.d.items.length ? 'Rien ne correspond à ta recherche.' : 'Cette boutique n\'a rien en vente pour le moment.')}</div>`; return; }
    el.innerHTML = list.map(it => {
      const out = it.stock === 0, inCart = this.cart[it.i] || 0, discounted = it.price < it.base;
      const pct = discounted ? Math.round((1 - it.price / Math.max(1, it.base)) * 100) : 0;
      return `<div class="prod ${out || it.locked ? 'out' : ''} ${inCart ? 'incart' : ''} ${this.sel === it.i ? 'sel' : ''}" data-i="${it.i}" data-a="add" data-v="${it.i}" title="${esc(it.name)}">
        ${pct > 0 ? `<span class="badge">-${pct}%</span>` : ''}${inCart ? `<span class="badge cnt">×${inCart}</span>` : ''}
        <div class="img">${productImg(this.d.imagePath, it.name)}</div>
        <b>${esc(it.label)}</b>
        <div class="pmeta"><span class="price">${money(it.price)}</span>${discounted ? `<span class="old">${money(it.base)}</span>` : ''}</div>
        <div class="pmeta">${it.locked ? chip('Licence requise', 'bad') : out ? chip('Rupture', 'bad') : it.stock > 0 ? chip(`${it.stock} en stock`, it.stock <= 5 ? 'warn' : 'mute') : ''}</div>
      </div>`;
    }).join('');
  },

  total() { return this.d.items.reduce((s, it) => s + (this.cart[it.i] || 0) * it.price, 0); },
  count() { return Object.values(this.cart).reduce((s, n) => s + n, 0); },

  renderCart() {
    const el = document.getElementById('cart');
    if (!el) return;
    const lines = this.d.items.filter(i => this.cart[i.i]);
    const pay = this.d.payments.find(p => p.id === this.method);
    const total = this.total();
    el.innerHTML = `<div class="card-h"><div class="t">${ic('cart', 17)} Panier</div>${this.count() ? chip(`${this.count()} article${this.count() > 1 ? 's' : ''}`, 'mute nodot') : ''}${lines.length ? `<button class="sm" data-a="clear">Vider</button>` : ''}</div>
      <div class="cart-list">${lines.length ? lines.map(it => `<div class="cline"><div class="thumb">${productImg(this.d.imagePath, it.name)}</div><div class="grow"><b>${esc(it.label)}</b><small>${money(it.price)} l'unité</small></div>
        <div class="stepper"><button class="icon" data-a="dec" data-v="${it.i}">${ic('minus', 13)}</button><span>${this.cart[it.i]}</span><button class="icon" data-a="inc" data-v="${it.i}">${ic('plus', 13)}</button></div>
        <button class="icon" data-a="rm" data-v="${it.i}" title="Retirer">${ic('x', 13)}</button></div>`).join('') : `<div class="empty small">${tile('cart')}<p>Clique sur un produit pour l'ajouter.</p></div>`}</div>
      <div class="cart-foot"><div class="kv"><span>Total</span><span class="money sm">${money(total)}</span></div>
      ${pay && total > pay.balance ? `<div class="hint warn">Solde insuffisant (${money(pay.balance)})</div>` : ''}
      <button class="primary wide" data-a="buy" ${!lines.length || this.busy ? 'disabled' : ''}>${ic('check', 16)} Payer ${total ? money(total) : ''}</button>
      <div class="keyhint"><kbd>↑</kbd><kbd>↓</kbd> choisir <kbd>←</kbd><kbd>→</kbd> quantité <kbd>Entrée</kbd> payer</div></div>`;
  },

  setQty(i, qty) {
    const it = this.d.items.find(x => x.i === i);
    if (!it) return;
    const max = Math.max(0, Math.min(it.max || 100, it.stock >= 0 ? it.stock : 100));
    qty = Math.min(qty, max);
    if (qty <= 0) delete this.cart[i]; else this.cart[i] = qty;
    this.renderGrid(); this.renderCart();
  },

  async buy() {
    if (this.busy || !this.count()) return;
    this.busy = true; this.renderCart();
    const cart = this.d.items.filter(i => this.cart[i.i]).map(i => ({ i: i.i, name: i.name, qty: this.cart[i.i] }));
    const r = await rpc('buy', this.d.shop.id, this.d.shop.locIdx, cart, this.method);
    this.busy = false;
    if (!r || !r.ok) { toast((r && r.error) || 'Achat impossible', 'err'); this.renderCart(); return; }
    toast(`Achat effectué : ${money(r.paid)}`, 'ok');
    for (const [i, st] of Object.entries(r.stocks || {})) { const it = this.d.items.find(x => x.i === Number(i)); if (it) it.stock = st; }
    const p = this.d.payments.find(x => x.id === r.method); if (p) p.balance = r.balance;
    if (r.refunded) toast(`${money(r.refunded)} remboursés (articles non remis)`, 'err');
    this.cart = {};
    this.render();
  },

  async tryOn() {
    const r = await rpc('clothing:start', this.method);
    if (r && r.cabin) { this.cabin = r.components; this.cabinBusy = false; this.inCabin = true; this.cabinSel = 0; return this.renderCabin(); }
    if (r && r.ok === false) toast(r.error || 'Impossible', 'err');
  },

  /* Cabine d'essayage intégrée : panneau sur le côté, le joueur reste visible à l'écran */
  renderCabin() {
    const d = this.d;
    $root.classList.add('corner');
    const body = `<div class="cabin-list">${this.cabin.map(c => this.cabinRow(c)).join('')}</div>
      <div class="row cams">${[['body', 'Corps'], ['head', 'Tête'], ['top', 'Haut'], ['legs', 'Bas'], ['feet', 'Pieds']].map(c => `<button class="sm" data-a="ccam" data-v="${c[0]}">${c[1]}</button>`).join('')}</div>
      <div class="keyhint"><kbd>↑</kbd><kbd>↓</kbd> pièce <kbd>←</kbd><kbd>→</kbd> modifier <kbd>Maj</kbd> ×5</div>
      <div class="row"><button class="sm grow-i" data-a="crot" data-v="-1">↺ Tourner</button><button class="sm grow-i" data-a="crot" data-v="1">Tourner ↻</button></div>
      <button class="primary wide" data-a="cpay" ${this.cabinBusy ? 'disabled' : ''}>${ic('check', 16)} Valider et payer ${money(d.price)}</button>
      <button class="wide" data-a="close">Annuler (tenue d'origine)</button>`;
    $root.innerHTML = panel({ icon: this.shopIcon(), title: d.shop.label, sub: 'Cabine d\'essayage', body, cls: 'corner cabin' });
    $root.querySelectorAll('.crow').forEach(r => r.addEventListener('mouseenter', () => this.cabinSelect(this.cabin.findIndex(c => c.name === r.dataset.row), false)));
    $root.querySelectorAll('input[data-cab]').forEach(i => {
      i.addEventListener('input', () => this.cabinSet(i.dataset.cab, Number(i.value), false));
      i.addEventListener('change', () => this.cabinSet(i.dataset.cab, Number(i.value), true));
    });
  },

  cabinRow(c) {
    return `<div class="crow ${this.cabin[this.cabinSel] && this.cabin[this.cabinSel].name === c.name ? 'sel' : ''}" data-row="${esc(c.name)}"><div class="crow-h"><span>${esc(c.label)}</span><span class="muted" data-val="${esc(c.name)}">${c.value} / ${c.max}</span></div>
      <div class="row"><button class="icon" data-a="cstep" data-v="${esc(c.name)}:-1">${ic('minus', 13)}</button>
      <input type="range" data-cab="${esc(c.name)}" min="${c.min}" max="${Math.max(c.min, c.max)}" value="${c.value}" ${c.max <= c.min ? 'disabled' : ''}>
      <button class="icon" data-a="cstep" data-v="${esc(c.name)}:1">${ic('plus', 13)}</button></div></div>`;
  },

  // Met à jour les curseurs sans tout re-rendre (conserve le défilement et le curseur en cours)
  cabinApply(list) {
    this.cabin = list;
    for (const c of list) {
      const i = $root.querySelector(`input[data-cab="${CSS.escape(c.name)}"]`);
      if (!i) continue;
      i.min = c.min; i.max = Math.max(c.min, c.max); i.disabled = c.max <= c.min;
      if (document.activeElement !== i) i.value = c.value;
      const v = $root.querySelector(`[data-val="${CSS.escape(c.name)}"]`);
      if (v) v.textContent = `${i.value} / ${c.max}`;
    }
  },

  async cabinSet(name, value, refresh) {
    const v = $root.querySelector(`[data-val="${CSS.escape(name)}"]`);
    const c = this.cabin.find(x => x.name === name);
    if (v && c) v.textContent = `${value} / ${c.max}`;
    clearTimeout(this._ct);
    const send = async () => { const r = await rpc('cabin:change', name, value); if (refresh && r && r.ok) this.cabinApply(r.components); };
    if (refresh) send(); else this._ct = setTimeout(send, 40);
  },

  cabinSelect(idx, scroll = true) {
    if (idx < 0 || idx >= this.cabin.length) return;
    this.cabinSel = idx;
    $root.querySelectorAll('.crow').forEach(r => r.classList.toggle('sel', r.dataset.row === this.cabin[idx].name));
    if (scroll) { const r = $root.querySelector('.crow.sel'); if (r) r.scrollIntoView({ block: 'nearest' }); }
  },

  // Clavier : ↑/↓ choisit, ←/→ modifie (Maj = ×5), Entrée paie. Fonctionne en cabine et en boutique.
  onKey(e) {
    if (this.inCabin) return this.cabinKey(e);
    if (!this.d || this.d.shop.mode === 'clothing') return;
    const t = e.target;
    if (t && t.tagName === 'INPUT') {                      // dans la recherche : on ne vole que ↓ (aller à la grille) et Entrée
      if (e.key === 'ArrowDown') { e.preventDefault(); t.blur(); }
      return;
    }
    const list = this.visible();
    if (!list.length || e.ctrlKey || e.altKey) return;
    if (!list.some(i => i.i === this.sel)) this.sel = list[0].i;
    const pos = list.findIndex(i => i.i === this.sel);
    const k = e.key;
    if (k === 'ArrowLeft' || k === 'ArrowRight') {
      e.preventDefault();
      const it = list[pos], step = e.shiftKey ? 5 : 1;
      if (it.stock === 0 || it.locked) return;
      this.setQty(it.i, (this.cart[it.i] || 0) + (k === 'ArrowRight' ? step : -step));
    } else if (k === 'ArrowUp' || k === 'ArrowDown') {
      e.preventDefault();
      const g = document.getElementById('prod-grid');
      const cols = g ? Math.max(1, getComputedStyle(g).gridTemplateColumns.split(' ').length) : 1;
      const np = Math.max(0, Math.min(list.length - 1, pos + (k === 'ArrowDown' ? cols : -cols)));
      this.sel = list[np].i;
      this.renderGrid();
      const el = g && g.querySelector(`[data-i="${this.sel}"]`); if (el) el.scrollIntoView({ block: 'nearest' });
    } else if (k === 'Enter') { e.preventDefault(); this.buy(); }
  },

  cabinKey(e) {
    const k = e.key;
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) return;
    e.preventDefault();                                    // empêche le curseur natif de bouger seul : on gère tout ici
    if (k === 'ArrowUp' || k === 'ArrowDown') {
      const n = this.cabin.length;
      return this.cabinSelect((this.cabinSel + (k === 'ArrowDown' ? 1 : -1) + n) % n);
    }
    const c = this.cabin[this.cabinSel];
    const i = c && $root.querySelector(`input[data-cab="${CSS.escape(c.name)}"]`);
    if (!i || i.disabled) return;
    const step = (e.shiftKey ? 5 : 1) * (k === 'ArrowRight' ? 1 : -1);
    const nv = Math.max(c.min, Math.min(c.max, Number(i.value) + step));
    if (nv === Number(i.value)) return;
    i.value = nv;
    this.cabinSet(c.name, nv, !e.repeat);                  // touche maintenue : envoi allégé, mise à jour complète au relâchement
  },

  onKeyUp(e) {
    if (!this.inCabin || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const c = this.cabin[this.cabinSel], i = c && $root.querySelector(`input[data-cab="${CSS.escape(c.name)}"]`);
    if (i) this.cabinSet(c.name, Number(i.value), true);
  },

  async cabinPay() {
    if (this.cabinBusy) return;
    this.cabinBusy = true; this.renderCabin();
    const r = await rpc('cabin:confirm');
    this.cabinBusy = false;
    if (r && r.ok) { this.inCabin = false; $root.classList.remove('corner'); return close(); }
    toast((r && r.error) || 'Paiement refusé', 'err');
    this.renderCabin();
  },

  renderClothing() {
    const d = this.d;
    const body = `<div class="card" style="text-align:center">
        <div class="eyebrow" style="justify-content:center">Cabine d'essayage</div>
        <div class="big" style="margin:12px 0">${d.price === d.basePrice ? money(d.price) : `${money(d.price)} <small class="old">${money(d.basePrice)}</small>`}</div>
        <div class="row wrap" style="justify-content:center;gap:6px">${d.parts.map(p => chip(p, 'mute nodot')).join('')}</div>
      </div>
      <div>${this.payPicker()}</div>
      <div class="hint">Essaie autant de tenues que tu veux : <b>tu ne paies que si tu valides</b> ta tenue. Si tu annules, tu retrouves ton ancien look.</div>
      <button class="primary" data-a="tryon">${ic('shirt', 16)} Entrer en cabine</button>`;
    $root.innerHTML = panel({ icon: this.shopIcon(), title: d.shop.label, sub: d.shop.note || (d.shop.discount ? `Remise ${d.shop.discount}%` : 'Boutique'), body, cls: '' });
  },

  onA(el) {
    const a = el.dataset.a, v = el.dataset.v;
    if (a === 'nav') { this.cat = v; this.render(); return; }
    if (a === 'add') { const it = this.d.items.find(x => x.i === Number(v)); this.sel = Number(v); if (!it || it.stock === 0 || it.locked) return; this.setQty(it.i, (this.cart[it.i] || 0) + 1); return; }
    if (a === 'inc') { this.setQty(Number(v), (this.cart[v] || 0) + 1); return; }
    if (a === 'dec') { this.setQty(Number(v), (this.cart[v] || 0) - 1); return; }
    if (a === 'rm') { delete this.cart[v]; this.renderGrid(); this.renderCart(); return; }
    if (a === 'clear') { this.cart = {}; this.renderGrid(); this.renderCart(); return; }
    if (a === 'pay') { this.method = v; this.render(); return; }
    if (a === 'buy') return this.buy();
    if (a === 'tryon') return this.tryOn();
    if (a === 'cpay') return this.cabinPay();
    if (a === 'ccam') { rpc('cabin:cam', v); return; }
    if (a === 'crot') { rpc('cabin:rotate', Number(v)); return; }
    if (a === 'cstep') {
      const [name, dir] = v.split(':'), c = this.cabin.find(x => x.name === name);
      if (!c) return;
      const i = $root.querySelector(`input[data-cab="${CSS.escape(name)}"]`);
      const cur = i ? Number(i.value) : c.value;
      const nv = Math.max(c.min, Math.min(c.max, cur + Number(dir)));
      if (i) i.value = nv;
      this.cabinSet(name, nv, true);
      return;
    }
  },
};

/* ════════════════════════════ BUILDER (admin) ════════════════════════════ */
const ACTION_LABEL = { buy: 'Achat', clothing: 'Tenue', create: 'Création', save: 'Modification', delete: 'Suppression', duplicate: 'Duplication', toggle: 'Statut', restock: 'Réassort' };
const SWATCHES = [[239, 68, 68], [249, 115, 22], [245, 158, 11], [34, 197, 94], [20, 184, 166], [59, 130, 246], [99, 102, 241], [168, 85, 247], [236, 72, 153], [244, 244, 245]];
const NEW_ITEM = () => ({ name: '', label: 'Nouveau produit', price: 0, category: '', stock: -1, max_stock: 0, max: 100, license: '', jobs: [], promo: 0, ammo: 0, enabled: true });

const Builder = {
  cat: null, shops: [], cur: null, view: 'home', tab: 'general', dirty: false,
  newType: 'general', newLabel: '', itemQ: '', bulkN: 20, openItems: {}, logs: null, homeLogs: [], pick: null, accentDraft: null,

  async open() {
    this.cat = await rpc('catalog');
    if (!this.cat || !this.cat.ok) { toast('Accès refusé', 'err'); close(); return; }
    CUR = this.cat.currency || '$';
    await this.refreshList();
    const l = await rpc('logs', 0);
    this.homeLogs = (l && l.logs) || [];
    this.view = 'home'; this.cur = null; this.dirty = false; this.accentDraft = null;
    this.render(true);
  },

  async refreshList() { const l = await rpc('list'); this.shops = Array.isArray(l) ? l : []; },

  typeInfo(id) { return (this.cat.types || []).find(t => t.id === id) || { label: id, icon: 'store' }; },
  typeIcon(id) { return this.typeInfo(id).icon || 'store'; },
  jobLabel(name) { const j = (this.cat.jobs || []).find(x => x.name === name); return j ? j.label : name; },
  isItems() { return (this.cur.settings.mode || 'items') === 'items'; },

  markDirty() { this.dirty = true; const el = document.getElementById('dirty'); if (el) el.classList.remove('hidden'); },

  /* ── Navigation ── */
  async guard() {
    if (!this.dirty) return true;
    const ok = await confirmBox('Modifications non enregistrées', 'Si tu quittes cette boutique, tes changements seront perdus.', 'Abandonner');
    if (ok) this.dirty = false;
    return ok;
  },

  async go(view, id) {
    if (!(await this.guard())) return;
    this.view = view; this.logs = null;
    if (view === 'shop') {
      const r = await rpc('get', id);
      if (!r || !r.ok) { toast((r && r.error) || 'Boutique introuvable', 'err'); return; }
      this.cur = clone(r.shop); this.tab = 'general'; this.openItems = {}; this.itemQ = '';
    } else this.cur = null;
    if (view === 'home') { const l = await rpc('logs', 0); this.homeLogs = (l && l.logs) || []; await this.refreshList(); }
    if (view === 'settings') this.accentDraft = clone(this.cat.accent);
    this.render(true);
  },

  /* ── Rendu ── */
  render(resetScroll) {
    const body = $root.querySelector('.body'), nav = $root.querySelector('.nav');
    const sc = body ? body.scrollTop : 0, nsc = nav ? nav.scrollTop : 0;
    let head, html;
    if (this.view === 'shop' && this.cur) { head = this.shopHead(); html = this.shopBody(); }
    else if (this.view === 'new') { head = { icon: 'plus', title: 'Nouvelle boutique', sub: 'Choisis un modèle : tout reste modifiable ensuite' }; html = this.viewNew(); }
    else if (this.view === 'settings') { head = { icon: 'sliders', title: 'Paramètres', sub: 'Apparence et informations système' }; html = this.viewSettings(); }
    else { head = { icon: 'store', title: 'Shop Builder', sub: `${this.shops.length} boutique${this.shops.length > 1 ? 's' : ''} · ${this.shops.filter(s => s.enabled).length} active${this.shops.filter(s => s.enabled).length > 1 ? 's' : ''}` }; html = this.viewHome(); }
    const active = this.view === 'shop' && this.cur ? 'shop:' + this.cur.id : this.view;
    $root.innerHTML = shellSide({
      profile: { initials: 'SB', title: 'Shop Builder', sub: `${this.shops.length} boutique(s)` },
      nav: [
        { label: 'Général', items: [{ id: 'home', icon: 'grid', text: 'Vue d\'ensemble' }, { id: 'new', icon: 'plus', text: 'Nouvelle boutique' }] },
        { label: 'Boutiques', items: this.shops.length ? this.shops.map(s => ({ id: 'shop:' + s.id, icon: this.typeIcon(s.type), text: s.label, sub: s.tag, count: s.enabled ? (s.mode === 'items' ? s.items : '') : 'off' })) : [] },
        { label: 'Système', items: [{ id: 'settings', icon: 'sliders', text: 'Paramètres' }] },
      ],
      active,
      foot: `<small>Réservé aux administrateurs. Les droits sont vérifiés côté serveur à chaque action.</small>`,
      head: { ...head, acts: head.acts || '' },
      body: html,
    });
    const nb = $root.querySelector('.body'), nn = $root.querySelector('.nav');
    if (nb && !resetScroll) nb.scrollTop = sc;
    if (nn) nn.scrollTop = nsc;
  },

  /* ── Vue d'ensemble ── */
  viewHome() {
    const s = this.shops;
    const rev = s.reduce((a, x) => a + (x.revenue || 0), 0), sales = s.reduce((a, x) => a + (x.sales || 0), 0);
    const stat = (l, v, sub) => `<div class="stat"><div class="eyebrow">${l}</div><div class="v">${v}</div><div class="s">${sub || '&nbsp;'}</div></div>`;
    return `<div class="grid4">${stat('Boutiques', s.length, `${s.filter(x => x.enabled).length} active(s)`)}${stat('Produits', s.reduce((a, x) => a + (x.items || 0), 0), 'au catalogue')}${stat('Chiffre d\'affaires', money(rev), 'depuis le début')}${stat('Ventes', sales, 'transactions')}</div>
      <div class="card mt"><div class="card-h"><div class="t">${ic('store', 17)} Boutiques</div><button class="primary sm" data-a="nav" data-v="new">${ic('plus', 14)} Nouvelle</button></div>
        ${s.length ? s.map(x => `<div class="item click" data-a="nav" data-v="shop:${x.id}">${tile(this.typeIcon(x.type))}<div class="grow"><b>${esc(x.label)}${x.tag ? ` ${chip(x.tag, 'info nodot')}` : ''}</b><small>${x.memo ? `🔒 ${esc(x.memo)} — ` : ''}${esc(this.typeInfo(x.type).label)}${x.mode === 'items' ? ` · ${x.items} produit${x.items > 1 ? 's' : ''}` : ' · cabine'} · ${x.locations} emplacement${x.locations > 1 ? 's' : ''}</small></div>
          ${x.revenue ? `<span class="price">${money(x.revenue)}</span>` : ''}${x.locations ? '' : chip('Sans emplacement', 'warn')}${chip(x.enabled ? 'Active' : 'Désactivée', x.enabled ? 'ok' : 'mute')}<span class="chev">${ic('chevron', 16)}</span></div>`).join('')
          : emptyState('store', 'Aucune boutique', 'Crée ta première boutique : supérette, armurerie, vêtements, coiffeur, bar, marché noir…')}</div>
      <div class="card"><div class="card-h"><div class="t">${ic('list', 17)} Activité récente</div></div>${this.logHtml(this.homeLogs, true)}</div>`;
  },

  logHtml(list, withShop) {
    if (!list || !list.length) return `<div class="hint">Aucune activité pour le moment.</div>`;
    return list.map(l => `<div class="logline"><b>${esc(l.player_name || 'système')}</b> · ${esc(ACTION_LABEL[l.action] || l.action)}${withShop && l.shop_label ? ` · ${esc(l.shop_label)}` : ''}${l.detail ? ` — ${esc(l.detail)}` : ''} <span style="float:right">${fmtDate(l.t)}</span></div>`).join('');
  },

  /* ── Nouvelle boutique ── */
  viewNew() {
    return `<div class="card"><div class="card-h"><div class="t">${ic('tag', 17)} Modèle</div></div>
        <div class="grid3">${this.cat.types.map(t => `<div class="tpl ${t.id === this.newType ? 'sel' : ''}" data-a="pickType" data-v="${esc(t.id)}">${ic(t.icon || 'store', 24)}<span>${esc(t.label)}</span><small class="muted">${t.mode === 'clothing' ? 'cabine d\'essayage' : (t.items ? `${t.items} produit${t.items > 1 ? 's' : ''} d'exemple` : 'catalogue vide')}</small></div>`).join('')}</div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('edit', 17)} Nom de la boutique</div></div>
        <div class="row">${`<input data-path="__newLabel" placeholder="${esc(this.typeInfo(this.newType).label)}" value="${esc(this.newLabel)}" maxlength="100">`}<button class="primary" data-a="create">${ic('plus', 16)} Créer la boutique</button></div>
        <div class="hint mt-s">La boutique est créée <b>désactivée</b> : ajoute ses emplacements, ajuste les produits puis active-la. Les produits d'exemple absents de ton serveur sont ignorés.</div></div>`;
  },

  /* ── Paramètres ── */
  viewSettings() {
    const c = this.accentDraft || this.cat.accent || [239, 68, 68];
    const hex = '#' + c.map(n => Math.round(n).toString(16).padStart(2, '0')).join('');
    return `<div class="card"><div class="card-h"><div class="t">${ic('sliders', 17)} Apparence</div></div>
        <div class="lbl" style="margin-bottom:10px">Couleur d'accentuation (tous les joueurs)</div>
        <div class="row wrap">${SWATCHES.map(s => `<button class="swatch-pick ${s.join() === c.join() ? 'on' : ''}" style="background:rgb(${s.join(',')})" data-a="swatch" data-v="${s.join(',')}"></button>`).join('')}
          <input type="color" data-path="__accent" value="${hex}" style="width:60px"><span class="spacer"></span><button class="primary" data-a="saveAccent">Enregistrer</button></div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('box', 17)} Système</div></div>
        <div class="kv"><span>Inventaire détecté</span><span>${esc(this.cat.inventory === 'ox' ? 'ox_inventory' : 'ESX (inventaire classique)')}</span></div>
        <div class="kv"><span>Produits dans le catalogue</span><span>${this.cat.items.length}</span></div>
        <div class="kv"><span>Métiers ESX</span><span>${this.cat.jobs.length}</span></div>
        <div class="kv"><span>Limites</span><span>${this.cat.limits.items} produits · ${this.cat.limits.locations} emplacements par boutique</span></div></div>`;
  },

  /* ── Édition d'une boutique ── */
  shopHead() {
    const c = this.cur;
    const nI = c.items.length, nL = c.locations.length;
    return {
      icon: this.typeIcon(c.type), title: c.label || 'Boutique',
      sub: `${c.settings.tag ? c.settings.tag + ' · ' : ''}${this.typeInfo(c.type).label} · ${this.isItems() ? `${nI} produit${nI > 1 ? 's' : ''}` : 'cabine d\'essayage'} · ${nL} emplacement${nL > 1 ? 's' : ''}`,
      acts: `<span id="dirty" class="chip warn ${this.dirty ? '' : 'hidden'}">Non enregistré</span>${chip(c.enabled ? 'Active' : 'Désactivée', c.enabled ? 'ok' : 'mute')}
        <button class="sm" data-a="duplicate">${ic('copy', 14)} Dupliquer</button><button class="sm danger" data-a="delete">${ic('trash', 14)} Supprimer</button><button class="primary" data-a="save">${ic('check', 16)} Enregistrer</button>`,
    };
  },

  shopBody() {
    const c = this.cur;
    const tabs = [['general', 'Général'], ...(this.isItems() ? [['products', `Produits (${c.items.length})`]] : []), ['locations', `Emplacements (${c.locations.length})`], ['access', 'Accès & paiement'], ['stats', 'Statistiques']];
    if (!tabs.some(t => t[0] === this.tab)) this.tab = 'general';
    const warn = !c.locations.length ? `<div class="card" style="border-color:rgba(251,191,36,.35)"><div class="row">${ic('pin', 18)}<div class="hint"><b>Aucun emplacement</b> — la boutique n'apparaîtra nulle part. Ajoute-en un dans l'onglet « Emplacements ».</div><span class="spacer"></span><button class="sm" data-a="tab" data-v="locations">Ajouter</button></div></div>` : '';
    return `<div class="seg">${tabs.map(t => `<button class="${t[0] === this.tab ? 'active' : ''}" data-a="tab" data-v="${t[0]}">${t[1]}</button>`).join('')}</div>${warn}${this['tab_' + this.tab]()}`;
  },

  inp(path, v, { t = '', r = false, ph = '', type = 'text', extra = '' } = {}) {
    return `<input type="${type}" data-path="${path}" ${t ? `data-t="${t}"` : ''} ${r ? 'data-r="1"' : ''} placeholder="${esc(ph)}" value="${esc(v ?? '')}" ${extra}>`;
  },
  chk(path, label, on, r = false) { return `<label class="chk"><input type="checkbox" data-path="${path}" data-t="b" ${r ? 'data-r="1"' : ''} ${on ? 'checked' : ''}> ${label}</label>`; },
  sel(path, opts, v, { t = '', r = false } = {}) { return `<select data-path="${path}" ${t ? `data-t="${t}"` : ''} ${r ? 'data-r="1"' : ''}>${opts.map(o => `<option value="${esc(o[0])}" ${String(o[0]) === String(v) ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select>`; },

  /* Onglet : Général */
  tab_general() {
    const c = this.cur, s = c.settings, b = s.blip || {}, p = s.ped || {}, h = s.hours || {}, r = s.restock || {};
    const noLoc = !c.locations.length;
    return `<div class="card"><div class="card-h"><div class="t">${ic('store', 17)} Identité</div></div>
        <div class="grid2">${fld('Nom affiché', this.inp('label', c.label, { extra: 'maxlength="100"' }))}${fld('Modèle', this.sel('type', this.cat.types.map(t => [t.id, t.label]), c.type))}</div>
        <div class="grid2 mt-s">${fld('Fonctionnement', this.sel('settings.mode', [['items', 'Catalogue de produits'], ['clothing', 'Cabine d\'essayage (vêtements / coiffeur)']], s.mode || 'items', { r: true }))}${fld('Message affiché aux clients (optionnel)', this.inp('settings.note', s.note, { extra: 'maxlength="200"', ph: 'Ex : Ouvert à tous, sans permis requis' }))}</div>
        <div class="mt">${this.chk('enabled', 'Boutique active (visible et utilisable par les joueurs)', c.enabled, true)}</div>
        ${c.enabled && noLoc ? `<div class="hint mt-s">⚠ Active mais sans emplacement : personne ne peut l'ouvrir.</div>` : ''}</div>
      <div class="card" style="border-color:rgba(96,165,250,.35)"><div class="card-h"><div class="t">${ic('lock', 17)} Repères de gestion</div>${chip('Invisible aux joueurs', 'info nodot')}</div>
        <div class="grid2">${fld('Nom interne / repère', this.inp('settings.tag', s.tag, { ph: 'Ex : Centre-ville, Sandy Shores…', extra: 'maxlength="40"' }))}${fld('Note privée', this.inp('settings.memo', s.memo, { ph: 'Ex : celle près du commissariat', extra: 'maxlength="500"' }))}</div>
        <div class="hint mt-s">Sert à reconnaître tes boutiques quand plusieurs ont le même nom : affiché dans la liste de gestion, jamais côté joueurs.</div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('sliders', 17)} Apparence de la boutique</div>${s.color ? `<button class="sm" data-a="shopColorReset">Couleur par défaut</button>` : ''}</div>
        <div class="lbl" style="margin-bottom:10px">Couleur générale (interface d'achat + marker au sol)</div>
        <div class="row wrap">${SWATCHES.map(sw => `<button class="swatch-pick ${s.color && sw.join() === s.color.join() ? 'on' : ''}" style="background:rgb(${sw.join(',')})" data-a="shopSwatch" data-v="${sw.join(',')}"></button>`).join('')}
          <input type="color" data-path="__shopcolor" value="${'#' + (s.color || this.cat.accent || [239, 68, 68]).map(n => Math.round(n).toString(16).padStart(2, '0')).join('')}" style="width:60px">${s.color ? '' : '<span class="hint">Couleur globale du serveur utilisée</span>'}</div>
        <div class="grid2 mt">${this.chk('settings.marker.enabled', 'Afficher le marker au sol', (s.marker || {}).enabled !== false, true)}${(s.marker || {}).enabled !== false ? fld('Type de marker', this.inp('settings.marker.type', (s.marker || {}).type, { t: 'n', type: 'number', extra: 'min="0" max="43"' })) : '<div></div>'}</div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('pin', 17)} Blip sur la carte</div>${this.chk('settings.blip.enabled', 'Afficher', b.enabled, true)}</div>
        ${b.enabled ? `<div class="grid4">${fld('Sprite', this.inp('settings.blip.sprite', b.sprite, { t: 'n', type: 'number' }))}${fld('Couleur', this.inp('settings.blip.color', b.color, { t: 'n', type: 'number' }))}${fld('Taille', this.inp('settings.blip.scale', b.scale, { t: 'n', type: 'number', extra: 'step="0.1"' }))}${fld('Nom du blip', this.inp('settings.blip.label', b.label, { ph: 'Par défaut : nom de la boutique' }))}</div>
        <div class="mt-s">${this.chk('settings.blip.shortRange', 'Visible uniquement à proximité', b.shortRange !== false)}</div>` : '<div class="hint">Le blip est affiché à chaque emplacement de la boutique.</div>'}</div>
      <div class="card"><div class="card-h"><div class="t">${ic('user', 17)} Vendeur (PNJ)</div>${this.chk('settings.ped.enabled', 'Afficher un vendeur', p.enabled, true)}</div>
        ${p.enabled ? `<div class="grid2">${fld('Modèle du PNJ', `<div class="row">${this.inp('settings.ped.model', p.model, { ph: 'ex : mp_m_shopkeep_01' })}<button data-a="checkPed">Vérifier</button></div>`)}${fld('Animation', this.sel('settings.ped.scenario', this.cat.scenarios.map(x => [x.id, x.label]), p.scenario || ''))}</div>
        <div class="hint mt-s">Le vendeur apparaît à chaque emplacement, dans la direction du « Cap » enregistré.</div>` : '<div class="hint">Sans vendeur, seul le marker au sol est affiché.</div>'}</div>
      <div class="card"><div class="card-h"><div class="t">${ic('clock', 17)} Horaires d'ouverture</div>${this.chk('settings.hours.enabled', 'Limiter les horaires', h.enabled, true)}</div>
        ${h.enabled ? `<div class="grid2">${fld('Ouverture (heure)', this.inp('settings.hours.from', h.from, { t: 'n', type: 'number', extra: 'min="0" max="23"' }))}${fld('Fermeture (heure)', this.inp('settings.hours.to', h.to, { t: 'n', type: 'number', extra: 'min="0" max="24"' }))}</div>
        <div class="hint mt-s">Heure réelle du serveur. Une plage de nuit est possible (ex : 20 → 4).</div>` : '<div class="hint">Ouverte en permanence.</div>'}</div>
      ${this.isItems() ? `<div class="card"><div class="card-h"><div class="t">${ic('refresh', 17)} Réapprovisionnement automatique</div></div>
        <div class="grid2">${fld('Toutes les (minutes, 0 = désactivé)', this.inp('settings.restock.minutes', r.minutes, { t: 'n', type: 'number', extra: 'min="0"' }))}${fld('Quantité ajoutée par produit', this.inp('settings.restock.amount', r.amount, { t: 'n', type: 'number', extra: 'min="0"' }))}</div>
        <div class="hint mt-s">S'applique aux produits dont le stock est limité et dont le « stock max » est renseigné (onglet Produits → options).</div></div>`
      : `<div class="card"><div class="card-h"><div class="t">${ic('shirt', 17)} Cabine d'essayage</div></div>
        ${fld('Prix de la tenue', this.inp('settings.clothing.price', (s.clothing || {}).price, { t: 'n', type: 'number', extra: 'min="0"' }))}
        <div class="lbl mt">Parties modifiables</div><div class="partgrid">${this.cat.parts.map(pt => `<label class="chk"><input type="checkbox" data-path="__part:${pt.id}" ${((s.clothing || {}).parts || []).includes(pt.id) ? 'checked' : ''}> ${esc(pt.label)}</label>`).join('')}</div>
        <div class="hint mt-s">Le joueur ne peut changer que ces éléments. Le paiement n'est prélevé que lorsqu'il valide sa tenue.</div></div>`}`;
  },

  /* Onglet : Produits */
  tab_products() {
    const c = this.cur;
    const cats = c.settings.categories || [];
    return `<datalist id="cat-names">${this.cat.items.slice(0, 4000).map(i => `<option value="${esc(i.name)}">${esc(i.label)}</option>`).join('')}</datalist>
      <div class="card"><div class="card-h"><div class="t">${ic('tag', 17)} Catégories (rayons)</div></div>
        <div class="row wrap">${cats.map((n, i) => `<span class="chip nodot">${esc(n)} <button class="chipx" data-a="catDel" data-v="${i}">${ic('x', 11)}</button></span>`).join('')}${cats.length ? '' : '<span class="hint">Aucune catégorie : tous les produits sont dans un seul rayon.</span>'}</div>
        <div class="row mt-s"><input id="cat-add" placeholder="Nouvelle catégorie (ex : Boissons)" maxlength="30"><button data-a="catAdd">${ic('plus', 14)} Ajouter</button></div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('box', 17)} Produits</div><button data-a="pick">${ic('search', 15)} Depuis le catalogue</button><button class="primary" data-a="itemAdd">${ic('plus', 15)} Produit manuel</button></div>
        <div class="row wrap" style="margin-bottom:12px"><div class="searchbox grow-i">${ic('search', 15)}<input data-path="__itemQ" placeholder="Filtrer les produits…" value="${esc(this.itemQ)}"></div>
          <button class="sm" data-a="allUnl" title="Stock illimité pour tous">Stock illimité</button>
          <input data-path="__bulkN" type="number" min="0" value="${this.bulkN}" style="width:80px;height:30px"><button class="sm" data-a="allStock" title="Fixe stock et stock max de tous les produits">Stock = N</button>
          <button class="sm" data-a="refill" title="Remet les produits au stock max (enregistré immédiatement)">Remplir au max</button></div>
        <div id="items-list">${this.itemRows()}</div></div>`;
  },

  itemRows() {
    const c = this.cur, q = this.itemQ.trim().toLowerCase();
    const cats = c.settings.categories || [];
    const rows = [];
    c.items.forEach((it, i) => {
      if (q && !(String(it.label).toLowerCase().includes(q) || String(it.name).toLowerCase().includes(q) || String(it.category).toLowerCase().includes(q))) return;
      const open = !!this.openItems[i], P = `items.${i}`;
      const opts = [['', '— Aucune —'], ...cats.map(n => [n, n])];
      if (it.category && !cats.includes(it.category)) opts.push([it.category, it.category]);
      const isW = /^weapon_/i.test(it.name || '');
      rows.push(`<div class="irow ${it.enabled === false ? 'off' : ''}">
        <div class="thumb">${productImg(this.cat.imagePath, it.name)}</div>
        <div class="namecol">${this.inp(`${P}.label`, it.label, { extra: 'maxlength="80"' })}<small class="mono ${it.name ? '' : 'bad'}">${it.name ? esc(it.name) : '⚠ identifiant manquant (options)'}</small></div>
        ${this.inp(`${P}.price`, it.price, { t: 'n', type: 'number', extra: 'min="0" title="Prix"' })}
        ${this.sel(`${P}.category`, opts, it.category || '')}
        <input type="number" data-path="${P}.stock" data-t="n" min="0" placeholder="∞" title="Stock (vide = illimité)" value="${it.stock < 0 ? '' : it.stock}">
        <div class="pcent"><input type="number" data-path="${P}.promo" data-t="n" min="0" max="90" title="Promotion %" value="${it.promo || 0}"><span>%</span></div>
        <input type="checkbox" data-path="${P}.enabled" data-t="b" title="En vente" ${it.enabled === false ? '' : 'checked'}>
        <button class="icon" data-a="itemOpen" data-v="${i}" title="Options">${ic('settings', 15)}</button>
        <button class="icon" data-a="itemDel" data-v="${i}" title="Retirer">${ic('trash', 15)}</button>
        ${open ? `<div class="idet">
          ${fld('Identifiant (item)', this.inp(`${P}.name`, it.name, { extra: 'list="cat-names" autocomplete="off"' }))}
          ${fld('Stock max (réassort)', this.inp(`${P}.max_stock`, it.max_stock, { t: 'n', type: 'number', extra: 'min="0"' }))}
          ${fld('Max par achat', this.inp(`${P}.max`, it.max, { t: 'n', type: 'number', extra: `min="1" max="${this.cat.limits.qty}"` }))}
          ${fld('Licence requise', this.inp(`${P}.license`, it.license, { ph: 'ex : weapon' }))}
          ${isW ? fld('Munitions (inventaire ESX)', this.inp(`${P}.ammo`, it.ammo, { t: 'n', type: 'number', extra: 'min="0"' })) : ''}
          <div class="jobsel" style="grid-column:span 2"><span class="lbl">Réservé aux métiers (vide = tout le monde)</span>
            <div class="row wrap" style="margin-top:6px">${(it.jobs || []).map((j, k) => `<span class="chip nodot">${esc(this.jobLabel(j))} <button class="chipx" data-a="itemJobDel" data-v="${i}:${k}">${ic('x', 11)}</button></span>`).join('')}
              <select data-path="__itemjob:${i}" style="width:auto;min-width:150px;height:30px"><option value="">+ Ajouter un métier</option>${this.cat.jobs.filter(j => !(it.jobs || []).includes(j.name)).map(j => `<option value="${esc(j.name)}">${esc(j.label)}</option>`).join('')}</select></div></div>
        </div>` : ''}
      </div>`);
    });
    if (!c.items.length) return emptyState('box', 'Aucun produit', 'Ajoute des produits depuis le catalogue de ton serveur ou saisis-les à la main.');
    if (!rows.length) return `<div class="hint">Aucun produit ne correspond au filtre.</div>`;
    return `<div class="ihead"><span></span><span>Produit</span><span>Prix</span><span>Rayon</span><span>Stock</span><span>Promo</span><span>Vente</span><span></span><span></span></div>${rows.join('')}`;
  },

  /* Onglet : Emplacements */
  tab_locations() {
    const c = this.cur;
    return `<div class="card"><div class="card-h"><div class="t">${ic('map', 17)} Emplacements (${c.locations.length})</div><button data-a="placeStart">${ic('pin', 15)} Mode placement</button><button class="primary" data-a="locAdd">${ic('plus', 15)} Ajouter</button></div>
        <div class="hint">Une même boutique peut avoir plusieurs points de vente (ex : toutes les supérettes de la ville avec le même catalogue). Place-toi sur le lieu voulu et utilise « Ma position » ou le mode placement.</div></div>
      ${c.locations.map((l, i) => `<div class="card"><div class="card-h"><div class="t">${ic('pin', 17)} Emplacement ${i + 1}${l.tag ? ` ${chip(l.tag, 'info nodot')}` : ''}</div>${l.coords && l.coords.x != null ? chip('Placé', 'ok') : chip('Sans position', 'warn')}<button class="icon" data-a="locDel" data-v="${i}" title="Supprimer">${ic('trash', 15)}</button></div>
        <div class="grid2">${fld('Précision affichée aux joueurs (optionnel)', this.inp(`locations.${i}.label`, l.label, { ph: 'Ex : Strawberry, Vinewood…', extra: 'maxlength="60"' }))}${fld('Repère interne 🔒 (invisible aux joueurs)', this.inp(`locations.${i}.tag`, l.tag, { ph: 'Ex : devant le commissariat', extra: 'maxlength="40"' }))}</div>
        <div class="lbl mt-s">Marker ${this.cur.settings.ped && this.cur.settings.ped.enabled ? '(et vendeur)' : ''} — point d'interaction</div>
        <div class="mt-s">${coordField(`locations.${i}.coords`, l.coords, { tp: true })}</div>
        ${this.cur.settings.ped && this.cur.settings.ped.enabled ? `<div class="mt">${this.chk(`__pedsep:${i}`, 'Placer le vendeur (PNJ) à un autre endroit que le marker', !!l.ped, true)}</div>
          ${l.ped ? `<div class="mt-s">${coordField(`locations.${i}.ped`, l.ped, { tp: true })}</div>` : ''}` : ''}</div>`).join('')}`;
  },

  /* Onglet : Accès & paiement */
  tab_access() {
    const c = this.cur, s = c.settings, a = s.access || {}, jobs = a.jobs || {}, jd = s.jobDiscounts || {};
    const gradeOpts = jn => { const j = this.cat.jobs.find(x => x.name === jn); return (j ? j.grades : [{ grade: 0, label: 'Tous' }]).map(g => [g.grade, `${g.grade} — ${g.label}`]); };
    return `<div class="card"><div class="card-h"><div class="t">${ic('dollar', 17)} Moyens de paiement acceptés</div></div>
        <div class="row wrap" style="gap:22px">${this.cat.payments.map(p => this.chk(`settings.payments.${p.id}`, esc(p.label), (s.payments || {})[p.id])).join('')}</div>
        <div class="hint mt-s">Au moins un moyen est requis. L'argent sale est utile pour un marché noir.</div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('lock', 17)} Accès réservé</div></div>
        <div class="lbl">Métiers autorisés (vide = boutique publique)</div>
        ${Object.keys(jobs).length ? Object.keys(jobs).map(jn => `<div class="cat-row" style="grid-template-columns:1fr 1.2fr auto"><b>${esc(this.jobLabel(jn))}</b>${this.sel(`settings.access.jobs.${jn}`, gradeOpts(jn), jobs[jn], { t: 'n' })}<button class="icon" data-a="accDel" data-v="${esc(jn)}">${ic('trash', 15)}</button></div>`).join('') : `<div class="hint" style="margin:6px 0">Tout le monde peut utiliser cette boutique.</div>`}
        <select data-path="__accessjob" style="margin-top:6px"><option value="">+ Réserver à un métier…</option>${this.cat.jobs.filter(j => !(j.name in jobs)).map(j => `<option value="${esc(j.name)}">${esc(j.label)}</option>`).join('')}</select>
        <div class="mt">${fld('Licence requise pour entrer (optionnel)', this.inp('settings.access.license', a.license, { ph: 'ex : weapon (via esx_license)' }))}</div></div>
      <div class="card"><div class="card-h"><div class="t">${ic('percent', 17)} Remises</div></div>
        <div class="grid2">${fld('Remise générale (%)', this.inp('settings.discount', s.discount, { t: 'n', type: 'number', extra: 'min="0" max="90"' }))}${fld('Compte société crédité (optionnel)', this.inp('settings.society', s.society, { ph: 'ex : society_ammunation' }))}</div>
        <div class="lbl mt">Remises par métier (%)</div>
        ${Object.keys(jd).map(jn => `<div class="cat-row" style="grid-template-columns:1fr 1.2fr auto"><b>${esc(this.jobLabel(jn))}</b><div class="pcent">${this.inp(`settings.jobDiscounts.${jn}`, jd[jn], { t: 'n', type: 'number', extra: 'min="0" max="100"' })}<span>%</span></div><button class="icon" data-a="discDel" data-v="${esc(jn)}">${ic('trash', 15)}</button></div>`).join('')}
        <select data-path="__discjob" style="margin-top:6px"><option value="">+ Remise pour un métier…</option>${this.cat.jobs.filter(j => !(j.name in jd)).map(j => `<option value="${esc(j.name)}">${esc(j.label)}</option>`).join('')}</select>
        <div class="hint mt-s">Les remises s'additionnent (plafond 90 %) et se cumulent avec les promotions de chaque produit. Le compte société reçoit l'argent des ventes en espèces / par carte (esx_addonaccount).</div></div>`;
  },

  /* Onglet : Statistiques */
  tab_stats() {
    const c = this.cur, st = c.stats || {};
    const rev = st.revenue || 0, sales = st.sales || 0;
    const top = Object.entries(st.items || {}).map(([name, v]) => ({ name, q: v.q, r: v.r, label: (c.items.find(i => i.name === name) || {}).label || (name === 'clothing' ? 'Tenues' : name) })).sort((a, b) => b.r - a.r).slice(0, 8);
    const maxR = top.length ? top[0].r : 1;
    if (this.logs === null) { this.logs = []; rpc('logs', c.id).then(r => { this.logs = (r && r.logs) || []; if (this.view === 'shop' && this.tab === 'stats') this.render(); }); }
    const stat = (l, v) => `<div class="stat"><div class="eyebrow">${l}</div><div class="v">${v}</div></div>`;
    return `<div class="grid3">${stat('Chiffre d\'affaires', money(rev))}${stat('Ventes', sales)}${stat('Panier moyen', sales ? money(Math.round(rev / sales)) : '—')}</div>
      <div class="card mt"><div class="card-h"><div class="t">${ic('chart', 17)} Meilleures ventes</div><button class="sm danger" data-a="resetStats">Réinitialiser</button></div>
        ${top.length ? top.map(t => `<div class="toprow"><span>${esc(t.label)}</span><div class="bar"><i style="width:${Math.max(4, Math.round(t.r / maxR * 100))}%"></i></div><span class="muted">${t.q}× · ${money(t.r)}</span></div>`).join('') : '<div class="hint">Aucune vente enregistrée.</div>'}</div>
      ${this.isItems() ? `<div class="card"><div class="card-h"><div class="t">${ic('box', 17)} Stocks</div></div>${c.items.filter(i => i.stock >= 0).length ? c.items.filter(i => i.stock >= 0).map(i => `<div class="kv"><span>${esc(i.label)}</span><span>${i.stock}${i.max_stock ? ` / ${i.max_stock}` : ''} ${i.stock === 0 ? chip('Rupture', 'bad') : i.max_stock && i.stock <= i.max_stock * 0.2 ? chip('Bas', 'warn') : ''}</span></div>`).join('') : '<div class="hint">Tous les produits ont un stock illimité.</div>'}</div>` : ''}
      <div class="card"><div class="card-h"><div class="t">${ic('list', 17)} Journal</div></div>${this.logHtml(this.logs, false)}</div>`;
  },

  placementTargets() {
    if (this.view !== 'shop' || !this.cur) return [];
    const t = [];
    this.cur.locations.forEach((l, i) => {
      t.push({ root: this.cur, path: `locations.${i}.coords`, label: `${this.cur.label}${l.tag ? ' (' + l.tag + ')' : ''} — marker ${i + 1}` });
      if (l.ped) t.push({ root: this.cur, path: `locations.${i}.ped`, label: `${this.cur.label} — vendeur ${i + 1}` });
    });
    return t;
  },

  /* ── Sélecteur de produits (catalogue du serveur) ── */
  pickOpen() {
    this.pick = { q: '', sel: {}, price: 100, cat: (this.cur.settings.categories || [])[0] || '' };
    Modal.open(this.pickHtml());
    this.pickList();
    setTimeout(() => { const i = document.getElementById('pick-q'); if (i) i.focus(); }, 30);
  },
  pickHtml() {
    const cats = this.cur.settings.categories || [];
    return `<div class="mbox"><div class="mbox-h">${tile('box')}<div class="ttl"><h1>Ajouter depuis le catalogue</h1><p>${this.cat.items.length} produit(s) disponibles sur ton serveur</p></div><button class="icon" data-a="pickClose">${ic('x', 16)}</button></div>
      <div class="mbox-b"><div class="grid3" style="margin-bottom:12px"><div class="searchbox grow-i">${ic('search', 15)}<input id="pick-q" data-path="__pickq" placeholder="Rechercher (nom ou identifiant)…" autocomplete="off"></div>
        <input id="pick-price" data-path="__pickprice" type="number" min="0" value="${this.pick.price}" title="Prix par défaut">
        <select data-path="__pickcat">${[['', '— Aucune catégorie —'], ...cats.map(n => [n, n])].map(o => `<option value="${esc(o[0])}" ${o[0] === this.pick.cat ? 'selected' : ''}>${esc(o[1])}</option>`).join('')}</select></div>
        <div id="pick-list" class="pick-list"></div></div>
      <div class="mbox-f"><span class="muted" id="pick-count"></span><span class="spacer"></span><button data-a="pickClose">Annuler</button><button class="primary" data-a="pickAdd">${ic('plus', 15)} Ajouter la sélection</button></div></div>`;
  },
  pickList() {
    const el = document.getElementById('pick-list');
    if (!el) return;
    const q = this.pick.q.trim().toLowerCase(), have = new Set(this.cur.items.map(i => i.name.toLowerCase()));
    const list = this.cat.items.filter(i => !q || i.name.toLowerCase().includes(q) || i.label.toLowerCase().includes(q));
    el.innerHTML = list.slice(0, 80).map(i => {
      const used = have.has(i.name.toLowerCase()), on = !!this.pick.sel[i.name];
      return `<div class="prow ${on ? 'on' : ''} ${used ? 'used' : ''}" data-a="pickToggle" data-v="${esc(i.name)}"><input type="checkbox" ${on ? 'checked' : ''} ${used ? 'disabled' : ''} tabindex="-1"><div class="thumb">${productImg(this.cat.imagePath, i.name)}</div><div class="grow"><b>${esc(i.label)}</b><small class="mono">${esc(i.name)}</small></div>${used ? chip('Déjà ajouté', 'mute nodot') : ''}</div>`;
    }).join('') || `<div class="hint" style="padding:20px;text-align:center">Aucun résultat</div>`;
    if (list.length > 80) el.insertAdjacentHTML('beforeend', `<div class="hint" style="padding:10px;text-align:center">${list.length - 80} autres résultats — affine ta recherche</div>`);
    this.pickCount();
  },
  pickCount() { const n = Object.keys(this.pick.sel).length, el = document.getElementById('pick-count'); if (el) el.textContent = n ? `${n} sélectionné${n > 1 ? 's' : ''}` : 'Rien de sélectionné'; },
  onModalClose() { this.pick = null; },

  /* ── Saisie ── */
  onInput(el, final) {
    const p = el.dataset.path;
    if (!p) return;
    if (p.startsWith('__')) return this.special(p, el, final);
    if (!this.cur) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.dataset.t === 'n') v = el.value === '' ? (/\.stock$/.test(p) ? -1 : null) : Number(el.value);
    else v = el.value;
    setPath(this.cur, p, v);
    this.markDirty();
    if (final && el.dataset.r) this.render();
    else if (p === 'label') { const h = $root.querySelector('.head h1'); if (h) h.textContent = v || 'Boutique'; }
    else if (final && p === 'type') this.render();
  },

  special(p, el, final) {
    const v = el.value;
    // champs de recherche / saisie libre : traités à la frappe uniquement (un « change » à la perte du focus re-rendrait la liste et ferait perdre le clic)
    if (final && ['__pickq', '__itemQ', '__newLabel', '__bulkN', '__pickprice'].includes(p)) return;
    if (p === '__newLabel') { this.newLabel = v; return; }
    if (p === '__itemQ') { this.itemQ = v; const l = document.getElementById('items-list'); if (l) l.innerHTML = this.itemRows(); return; }
    if (p === '__bulkN') { this.bulkN = Math.max(0, Math.floor(Number(v) || 0)); return; }
    if (p === '__pickq' && this.pick) { this.pick.q = v; this.pickList(); return; }
    if (p === '__pickprice' && this.pick) { this.pick.price = Math.max(0, Math.floor(Number(v) || 0)); return; }
    if (p === '__pickcat' && this.pick) { this.pick.cat = v; return; }
    if (p === '__accent') { this.accentDraft = [1, 3, 5].map(i => parseInt(v.slice(i, i + 2), 16)); applyTheme(this.accentDraft); if (final) this.render(); return; }
    if (!this.cur) return;
    if (p === '__shopcolor') { this.cur.settings.color = [1, 3, 5].map(k => parseInt(v.slice(k, k + 2), 16)); applyTheme(this.cur.settings.color); this.markDirty(); if (final) this.render(); return; }
    if (p.startsWith('__pedsep:')) {
      const l = this.cur.locations[Number(p.slice(9))];
      if (l) { if (el.checked) l.ped = Object.assign({}, l.coords || {}); else delete l.ped; this.markDirty(); this.render(); }
      return;
    }
    if (p.startsWith('__part:')) {
      const id = p.slice(7), cl = this.cur.settings.clothing = this.cur.settings.clothing || { parts: [] };
      cl.parts = (cl.parts || []).filter(x => x !== id);
      if (el.checked) cl.parts.push(id);
      this.markDirty(); return;
    }
    if (!final || !v) return;
    if (p.startsWith('__itemjob:')) { const it = this.cur.items[Number(p.slice(10))]; if (it) { it.jobs = it.jobs || []; if (!it.jobs.includes(v)) it.jobs.push(v); this.markDirty(); this.render(); } return; }
    if (p === '__accessjob') { const a = this.cur.settings.access = this.cur.settings.access || { jobs: {} }; a.jobs = a.jobs || {}; a.jobs[v] = 0; this.markDirty(); this.render(); return; }
    if (p === '__discjob') { const d = this.cur.settings.jobDiscounts = this.cur.settings.jobDiscounts || {}; d[v] = 10; this.markDirty(); this.render(); return; }
  },

  /* ── Actions ── */
  async onA(el) {
    const a = el.dataset.a, v = el.dataset.v, c = this.cur;
    switch (a) {
      case 'nav':
        if (v.startsWith('shop:')) return this.go('shop', Number(v.slice(5)));
        return this.go(v);
      case 'tab': this.tab = v; if (v === 'stats') this.logs = null; this.render(true); return;
      case 'pickType': this.newType = v; this.render(); return;
      case 'create': {
        const r = await rpc('create', this.newType, this.newLabel);
        if (!r || !r.ok) return toast((r && r.error) || 'Création impossible', 'err');
        toast('Boutique créée (désactivée) : ajoute un emplacement puis active-la', 'ok');
        this.newLabel = ''; await this.refreshList();
        this.cur = clone(r.shop); this.view = 'shop'; this.tab = 'locations'; this.dirty = false; this.openItems = {}; this.itemQ = ''; this.logs = null;
        this.render(true); return;
      }
      case 'swatch': this.accentDraft = v.split(',').map(Number); applyTheme(this.accentDraft); this.render(); return;
      case 'saveAccent': {
        const r = await rpc('settings:save', this.accentDraft || this.cat.accent);
        if (r && r.ok) { this.cat.accent = r.accent; toast('Couleur enregistrée pour tous les joueurs', 'ok'); } else toast((r && r.error) || 'Erreur', 'err');
        return;
      }
      case 'save': return this.save();
      case 'delete': {
        if (!(await confirmBox('Supprimer la boutique ?', `« ${c.label} » sera définitivement supprimée (produits, emplacements, statistiques).`, 'Supprimer'))) return;
        const r = await rpc('delete', c.id);
        if (!r || !r.ok) return toast((r && r.error) || 'Erreur', 'err');
        toast('Boutique supprimée', 'ok'); this.dirty = false; await this.go('home'); return;
      }
      case 'duplicate': {
        if (!(await this.guard())) return;
        const r = await rpc('duplicate', c.id);
        if (!r || !r.ok) return toast((r && r.error) || 'Erreur', 'err');
        toast('Boutique dupliquée (désactivée, sans emplacement)', 'ok'); await this.refreshList();
        this.cur = clone(r.shop); this.tab = 'locations'; this.logs = null; this.render(true); return;
      }
      case 'shopSwatch': c.settings.color = v.split(',').map(Number); this.markDirty(); this.render(); return;
      case 'shopColorReset': delete c.settings.color; this.markDirty(); this.render(); return;
      case 'checkPed': {
        const r = await rpc('checkPed', c.settings.ped.model);
        toast(r && r.valid ? 'Modèle valide' : 'Modèle introuvable', r && r.valid ? 'ok' : 'err'); return;
      }
      case 'coords': await grabCoords(c, v); this.markDirty(); this.render(); return;
      case 'tp': { const pos = getPath(c, v); if (pos && pos.x != null) { await rpc('teleport', pos); } return; }
      case 'locAdd':
        if (c.locations.length >= this.cat.limits.locations) return toast('Nombre maximum d\'emplacements atteint', 'err');
        c.locations.push({ label: '', coords: {} }); this.markDirty(); this.render(); return;
      case 'locDel': c.locations.splice(Number(v), 1); this.markDirty(); this.render(); return;
      case 'catAdd': {
        const i = document.getElementById('cat-add'), n = (i && i.value || '').trim();
        if (!n) return;
        c.settings.categories = c.settings.categories || [];
        if (!c.settings.categories.includes(n)) c.settings.categories.push(n);
        this.markDirty(); this.render(); return;
      }
      case 'catDel': { const n = c.settings.categories[Number(v)]; c.settings.categories.splice(Number(v), 1); c.items.forEach(i => { if (i.category === n) i.category = ''; }); this.markDirty(); this.render(); return; }
      case 'itemAdd':
        if (c.items.length >= this.cat.limits.items) return toast('Nombre maximum de produits atteint', 'err');
        c.items.unshift(NEW_ITEM()); this.openItems = { 0: true }; this.itemQ = ''; this.markDirty(); this.render(); return;
      case 'itemDel': c.items.splice(Number(v), 1); this.openItems = {}; this.markDirty(); this.render(); return;
      case 'itemOpen': this.openItems[v] = !this.openItems[v]; this.render(); return;
      case 'itemJobDel': { const [i, k] = v.split(':').map(Number); c.items[i].jobs.splice(k, 1); this.markDirty(); this.render(); return; }
      case 'accDel': delete c.settings.access.jobs[v]; this.markDirty(); this.render(); return;
      case 'discDel': delete c.settings.jobDiscounts[v]; this.markDirty(); this.render(); return;
      case 'allUnl': c.items.forEach(i => { i.stock = -1; }); this.markDirty(); this.render(); return;
      case 'allStock': c.items.forEach(i => { i.stock = this.bulkN; i.max_stock = this.bulkN; }); this.markDirty(); this.render(); return;
      case 'refill': {
        if (this.dirty) return toast('Enregistre d\'abord tes modifications', 'err');
        const r = await rpc('restock', c.id, 'full', 0);
        if (r && r.ok) { this.cur = clone(r.shop); toast('Stocks remis au maximum', 'ok'); this.render(); } else toast((r && r.error) || 'Erreur', 'err');
        return;
      }
      case 'resetStats': {
        if (!(await confirmBox('Réinitialiser les statistiques ?', 'Le chiffre d\'affaires et les meilleures ventes repartiront de zéro (le journal est conservé).', 'Réinitialiser'))) return;
        const r = await rpc('resetStats', c.id);
        if (r && r.ok) { c.stats = r.shop.stats; this.render(); }
        return;
      }
      case 'pick': return this.pickOpen();
      case 'pickClose': return Modal.close();
      case 'pickToggle': {
        if (!this.pick || el.classList.contains('used')) return;
        if (this.pick.sel[v]) delete this.pick.sel[v]; else this.pick.sel[v] = true;
        el.classList.toggle('on'); const cb = el.querySelector('input'); if (cb) cb.checked = !!this.pick.sel[v];
        this.pickCount(); return;
      }
      case 'pickAdd': {
        const names = Object.keys(this.pick.sel);
        if (!names.length) return toast('Sélectionne au moins un produit', 'err');
        const room = this.cat.limits.items - c.items.length;
        if (names.length > room) return toast(`Il reste de la place pour ${room} produit(s) seulement`, 'err');
        const { price, cat } = this.pick;
        names.forEach(n => { const ci = this.cat.items.find(x => x.name === n); c.items.push({ ...NEW_ITEM(), name: n, label: ci ? ci.label : n, price, category: cat }); });
        Modal.close(); this.markDirty(); this.render();
        toast(`${names.length} produit(s) ajouté(s) — pense à régler les prix`, 'ok'); return;
      }
    }
  },

  async save() {
    const c = this.cur;
    if (!c.label || !c.label.trim()) return toast('Le nom de la boutique est obligatoire', 'err');
    const bad = c.items.filter(i => !i.name || !/^[\w.\-]+$/.test(i.name));
    if (bad.length) return toast(`${bad.length} produit(s) sans identifiant valide : ouvre leurs options (roue dentée)`, 'err');
    const r = await rpc('save', clone(c));
    if (!r || !r.ok) return toast((r && r.error) || 'Enregistrement impossible', 'err');
    this.cur = clone(r.shop); this.dirty = false; this.openItems = {};
    await this.refreshList();
    toast('Boutique enregistrée et synchronisée avec les joueurs', 'ok');
    this.render();
  },
};
