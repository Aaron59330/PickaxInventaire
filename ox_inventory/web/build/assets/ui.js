/* ox_inventory — interface 3 panneaux (Inventaire / Vêtements / Autour)
 * Même protocole NUI que l'interface d'origine : messages init, setupInventory,
 * refreshSlots, closeInventory, displayMetadata, itemNotify, toggleHotbar
 * et callbacks swapItems, buyItem, craftItem, useItem, giveItem, exit, etc.
 */
(() => {
  'use strict';

  /* =====================================================================
   *  Constantes & état
   * ===================================================================== */
  const CLOTH_COUNT = 14;
  // ordre des 14 derniers slots du joueur (identique à l'interface d'origine)
  const CLOTH_KEYS = ['hat', 'ears', 'tshirt', 'torso', 'arms', 'pants', 'shoes', 'mask', 'glasses', 'vest', 'bag', 'watches', 'chain', 'bracelet'];
  const CLOTH_ICON = {
    hat: 'hat', ears: 'ear', tshirt: 'tshirt', torso: 'torso', arms: 'arms', pants: 'pants', shoes: 'shoes',
    mask: 'mask', glasses: 'glasses', vest: 'vest', bag: 'bag', watches: 'watches', chain: 'chain', bracelet: 'bracelet'
  };
  // disposition visuelle (clé de vêtement -> colonne)
  const CLOTH_LEFT = ['hat', 'mask', 'tshirt', 'torso', 'vest', 'pants', 'shoes'];
  const CLOTH_RIGHT = ['ears', 'glasses', 'chain', 'watches', 'bracelet', 'bag', 'arms'];

  const inGame = !!window.invokeNative;
  const RESOURCE = typeof GetParentResourceName === 'function' ? GetParentResourceName() : 'ox_inventory';

  const state = {
    left: { id: '', type: 'player', slots: 0, maxWeight: 0, items: [] },
    right: { id: '', type: '', slots: 0, maxWeight: 0, items: [] },
    itemData: {
      water: { name: 'water', label: 'Eau', stack: true, usable: true, count: 0 }
    },
    locale: {},
    options: { rarity: false, clothing: false, throwing: false, rename: false, playerslots: 50 },
    imagepath: 'images',
    itemAmount: 0,
    shift: false,
    busy: false,
    history: null,
    extraMeta: [],
    open: false,
    payment: 'money',
    filter: { left: 'all', right: 'all' },
    search: { left: '', right: '' }
  };

  const L = (key, fallback) => state.locale[key] || fallback;

  /* =====================================================================
   *  Utilitaires
   * ===================================================================== */
  function nui(name, data) {
    if (window.__nuiMock) return Promise.resolve(window.__nuiMock(name, data));
    if (!inGame) return Promise.resolve(undefined);
    return fetch(`https://${RESOURCE}/${name}`, {
      method: 'post',
      headers: { 'Content-Type': 'application/json; charset=UTF-8' },
      body: JSON.stringify(data === undefined ? {} : data)
    }).then(r => r.json()).catch(e => { console.error(`[ox_inventory] callback ${name} : ${e}`); throw e; });
  }

  const hasItem = it => !!it && it.name !== undefined && it.weight !== undefined;

  function deepEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return a == b;
    if (typeof a !== 'object' || typeof b !== 'object') return false;
    const ka = Object.keys(a), kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every(k => deepEqual(a[k], b[k]));
  }

  const clone = v => (v === undefined ? v : JSON.parse(JSON.stringify(v)));
  const nowSec = () => Math.floor(Date.now() / 1000);

  function durability(meta, now) {
    if (!meta || meta.durability === undefined) return undefined;
    let d = meta.durability;
    if (d > 100 && meta.degrade) d = ((meta.durability - now) / (60 * meta.degrade)) * 100;
    if (d < 0) d = 0;
    return d;
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // mini markdown (gras, italique, code, liens, sauts de ligne)
  function md(text) {
    let s = esc(text);
    s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<i>$2</i>').replace(/`(.+?)`/g, '<code>$1</code>');
    s = s.replace(/\[(.+?)\]\((https?:[^)\s]+)\)/g, '<a>$1</a>');
    return s.replace(/\r?\n/g, '<br>');
  }

  function fmtWeight(w) {
    return w >= 1000
      ? `${(w / 1000).toLocaleString('en-us', { minimumFractionDigits: 2 })}kg`
      : `${w.toLocaleString('en-us', { minimumFractionDigits: 0 })}g`;
  }

  function imageOf(item) {
    if (typeof item === 'object') {
      if (!item.name) return '';
      const m = item.metadata;
      if (m && m.imageurl) return `${m.imageurl}`;
      if (m && m.image) return `${state.imagepath}/${m.image}.png`;
    }
    const name = typeof item === 'object' ? item.name : item;
    const data = state.itemData[name];
    if (data) {
      if (!data.image) data.image = `${state.imagepath}/${name}.png`;
      return data.image;
    }
    return `${state.imagepath}/${name}.png`;
  }

  const clothIcon = key => `../clothes/${CLOTH_ICON[key] || 'xmark'}.svg`;
  const XMARK = '../clothes/xmark.svg';

  async function ensureItemData(name) {
    if (!name || state.itemData[name]) return;
    try {
      const d = await nui('getItemData', name);
      if (d && d.name) { state.itemData[name] = d; renderAll(); }
    } catch (e) { /* ignore */ }
  }

  /* =====================================================================
   *  Icônes (SVG inline)
   * ===================================================================== */
  const ICON = {
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg>',
    shirt: '<svg viewBox="0 0 24 24"><path d="M8 3 3 6l2 4 3-1v12h8V9l3 1 2-4-5-3c-.5 1.5-2 2.5-4 2.5S8.5 4.5 8 3Z"/></svg>',
    gun: '<svg viewBox="0 0 24 24"><path d="M3 8h15l3 2v3h-8l-1 4H7l1-4H3Z"/></svg>',
    box: '<svg viewBox="0 0 24 24"><path d="m12 3 8 4v10l-8 4-8-4V7Z"/><path d="m4 7 8 4 8-4M12 11v10"/></svg>',
    x: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="m16 16 5 5"/></svg>',
    hanger: '<svg viewBox="0 0 24 24"><path d="M12 7a2.5 2.5 0 1 0-2.5-2.5M12 7v2.5l9 6c1 .7.5 2.5-.8 2.5H3.8c-1.3 0-1.8-1.8-.8-2.5l9-6"/></svg>',
    bag: '<svg viewBox="0 0 24 24"><path d="M5 8h14l1 13H4Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>',
    car: '<svg viewBox="0 0 24 24"><path d="M5 16V11l2-5h10l2 5v5M3 16h18v3H3zM7 13h.01M17 13h.01"/></svg>',
    cart: '<svg viewBox="0 0 24 24"><path d="M3 4h2l2.5 11h10L20 7H6.5"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/></svg>',
    hammer: '<svg viewBox="0 0 24 24"><path d="m14 6 4 4M4 20l9-9M12 5l3-2 5 5-2 3Z"/></svg>',
    plane: '<svg viewBox="0 0 24 24"><path d="M2 13l20-8-8 16-3-7Z"/></svg>',
    help: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/></svg>'
  };
  const TYPE_ICON = { player: 'user', otherplayer: 'user', drop: 'bag', newdrop: 'bag', trunk: 'car', glovebox: 'car', shop: 'cart', crafting: 'hammer', container: 'box' };

  /* =====================================================================
   *  Squelette DOM
   * ===================================================================== */
  const app = document.getElementById('app');
  app.innerHTML = `
    <div id="backdrop"></div>
    <div id="stage">
      <img id="logo" src="assets/logo.png" alt="" onerror="this.style.display='none'">
      <section class="panel left" id="panel-left">
        <div class="panel-head">
          <div class="panel-title"><div class="hex">${ICON.user}</div><h2 data-role="title"></h2></div>
          <div class="head-right">
            <div class="weight-text" data-role="weight"></div>
            <div class="weight-bar"><i></i></div>
            <label class="search">${ICON.search}<input type="text" data-role="search" placeholder="Rechercher" autocomplete="off" spellcheck="false"></label>
          </div>
          <div class="shop-pay"></div>
        </div>
        <div class="grid-wrap">
          <div class="rail" data-role="rail"></div>
          <div class="grid" data-role="grid"></div>
        </div>
      </section>

      <section class="panel center" id="panel-center">
        <div class="panel-head">
          <div class="panel-title"><div class="hex">${ICON.hanger}</div><h2>${esc('Vêtements')}</h2></div>
        </div>
        <div class="cloth-area">
          <div class="cloth-col l" data-role="cloth-l"></div>
          <div class="cloth-col r" data-role="cloth-r"></div>
        </div>
      </section>

      <section class="panel right" id="panel-right">
        <div class="panel-head">
          <div class="panel-title"><div class="hex" data-role="icon"></div><h2 data-role="title"></h2></div>
          <div class="head-right">
            <div class="weight-text" data-role="weight"></div>
            <div class="weight-bar"><i></i></div>
            <label class="search">${ICON.search}<input type="text" data-role="search" placeholder="Rechercher" autocomplete="off" spellcheck="false"></label>
          </div>
          <div class="shop-pay">
            <button type="button" data-pay="money" class="active"></button>
            <button type="button" data-pay="card"></button>
          </div>
        </div>
        <div class="grid-wrap">
          <div class="rail" data-role="rail"></div>
          <div class="grid" data-role="grid"></div>
        </div>
      </section>

      <div class="amount-box">
        <div class="amount-label" data-role="amount-label">Quantité</div>
        <div class="amount">
          <button type="button" data-role="amount-minus">−</button>
          <input type="number" min="0" value="0" data-role="amount">
          <button type="button" data-role="amount-plus">+</button>
        </div>
      </div>

      <div class="tenue-row" id="tenue-row">
        <button type="button" class="hex-btn active" data-ui-btn="character" title="Personnage">${ICON.user}</button>
        <button type="button" class="tenue-slot" data-ui-btn="outfit"><img data-role="tenue-img" alt=""><span data-role="tenue-label">Tenue</span></button>
        <button type="button" class="hex-btn" data-ui-btn="extra" title="Autre">${ICON.plane}</button>
      </div>

      <button id="help-btn" type="button" title="Contrôles utiles">${ICON.help}</button>
    </div>
    <div id="drag-ghost"><img alt=""><span></span></div>
    <div id="tooltip"></div>
    <div id="ctx"></div>
    <div id="help"><div class="box"></div></div>
    <div id="hotbar"></div>
    <div id="notifs"></div>
  `;

  const $ = sel => app.querySelector(sel);
  const stage = $('#stage');
  const ui = {
    left: {
      panel: $('#panel-left'), grid: $('#panel-left [data-role=grid]'), title: $('#panel-left [data-role=title]'),
      weight: $('#panel-left [data-role=weight]'), bar: $('#panel-left .weight-bar i'), barWrap: $('#panel-left .weight-bar'),
      search: $('#panel-left [data-role=search]'), rail: $('#panel-left [data-role=rail]'), slots: []
    },
    right: {
      panel: $('#panel-right'), grid: $('#panel-right [data-role=grid]'), title: $('#panel-right [data-role=title]'),
      weight: $('#panel-right [data-role=weight]'), bar: $('#panel-right .weight-bar i'), barWrap: $('#panel-right .weight-bar'),
      search: $('#panel-right [data-role=search]'), rail: $('#panel-right [data-role=rail]'), icon: $('#panel-right [data-role=icon]'), slots: []
    },
    clothL: $('[data-role=cloth-l]'), clothR: $('[data-role=cloth-r]'),
    clothSlots: {},
    amount: $('[data-role=amount]'),
    ghost: $('#drag-ghost'), tooltip: $('#tooltip'), ctx: $('#ctx'), help: $('#help'),
    hotbar: $('#hotbar'), notifs: $('#notifs')
  };

  /* ---------- thème (couleur de base) ---------- */
  function hexToHsl(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    const n = parseInt(m[1], 16);
    const r = (n >> 16 & 255) / 255, g = (n >> 8 & 255) / 255, b = (n & 255) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2;
    let h = 0, s = 0;
    if (max !== min) {
      const d = max - min;
      s = l > .5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
      h *= 60;
    }
    return { h, s, l };
  }
  function hslToRgb(h, s, l) {
    s = Math.max(0, Math.min(1, s)); l = Math.max(0, Math.min(1, l));
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
  }
  const toHex = c => `#${c.map(v => v.toString(16).padStart(2, '0')).join('')}`;

  function applyTheme(color) {
    const hsl = hexToHsl(color);
    if (!hsl) return console.warn(`[ox_inventory] couleur de thème invalide : ${color}`);
    const root = document.documentElement.style;
    const base = hslToRgb(hsl.h, hsl.s, hsl.l);
    const light = hslToRgb(hsl.h, hsl.s, Math.min(.85, hsl.l + .1));
    const dark = hslToRgb(hsl.h, hsl.s, Math.max(.12, hsl.l - .12));
    const bg = hslToRgb(hsl.h, Math.min(.45, hsl.s), .08);
    root.setProperty('--accent', toHex(base));
    root.setProperty('--accent-2', toHex(light));
    root.setProperty('--accent-light', toHex(hslToRgb(hsl.h, hsl.s, Math.min(.85, hsl.l + .06))));
    root.setProperty('--accent-dark', toHex(dark));
    root.setProperty('--accent-rgb', base.join(', '));
    root.setProperty('--accent-light-rgb', light.join(', '));
    root.setProperty('--accent-dark-rgb', dark.join(', '));
    root.setProperty('--bg-rgb', bg.join(', '));
  }
  applyTheme((window.INVENTORY_THEME && window.INVENTORY_THEME.color) || '#7b4bb8');

  /* ---------- logo & bloc Tenue (configurables dans theme.js) ---------- */
  (function applyBranding() {
    const cfg = window.INVENTORY_THEME || {};
    const logo = $('#logo');
    if (cfg.logo === false) logo.style.display = 'none';
    else if (typeof cfg.logo === 'string' && cfg.logo) logo.src = cfg.logo;
    const t = cfg.tenue || {};
    if (t.enabled === false) $('#tenue-row').style.display = 'none';
    $('[data-role=tenue-label]').textContent = t.label || 'Tenue';
    const img = $('[data-role=tenue-img]');
    if (t.image) img.src = t.image; else img.style.display = 'none';
    const slot = $('#tenue-row .tenue-slot');
    if (!t.image) slot.classList.add('no-img');
    if (t.hideButtons) app.querySelectorAll('#tenue-row .hex-btn').forEach(b => { b.style.display = 'none'; });
  })();

  // les boutons du bloc Tenue préviennent le client Lua (évènement ox_inventory:uiButton)
  app.querySelectorAll('[data-ui-btn]').forEach(b => b.addEventListener('click', () => nui('uiButton', { id: b.dataset.uiBtn })));

  /* ---------- échelle ---------- */
  function rescale() {
    const s = Math.min(window.innerWidth / 1590, window.innerHeight / 868);
    document.documentElement.style.setProperty('--scale', String(s));
    return s;
  }
  window.addEventListener('resize', rescale);
  rescale();

  /* ---------- rails de filtre ---------- */
  const FILTERS = [
    { id: 'all', icon: 'x', test: () => true },
    { id: 'clothes', icon: 'shirt', test: it => /^clothes?_/.test(it.name) || it.name === 'clothing' },
    { id: 'weapons', icon: 'gun', test: it => /^WEAPON_/i.test(it.name) },
    { id: 'other', icon: 'box', test: it => !/^clothes?_/.test(it.name) && it.name !== 'clothing' && !/^WEAPON_/i.test(it.name) }
  ];

  for (const side of ['left', 'right']) {
    const rail = ui[side].rail;
    rail.innerHTML = FILTERS.map(f => `<button type="button" data-filter="${f.id}" class="${f.id === 'all' ? 'active' : ''}">${ICON[f.icon]}</button>`).join('');
    rail.addEventListener('click', e => {
      const b = e.target.closest('button');
      if (!b) return;
      state.filter[side] = b.dataset.filter;
      rail.querySelectorAll('button').forEach(x => x.classList.toggle('active', x === b));
      applyFilters(side);
    });
    ui[side].search.addEventListener('input', () => { state.search[side] = ui[side].search.value.trim().toLowerCase(); applyFilters(side); });
  }

  function itemLabel(it) {
    return (it.metadata && it.metadata.label) || (state.itemData[it.name] && state.itemData[it.name].label) || it.name;
  }

  function applyFilters(side) {
    const f = FILTERS.find(x => x.id === state.filter[side]) || FILTERS[0];
    const q = state.search[side];
    const inv = state[side];
    const active = f.id !== 'all' || q !== '';
    for (const el of ui[side].slots) {
      if (!el) continue;
      const it = inv.items[el._i];
      let dim = false;
      if (active) {
        if (!hasItem(it)) dim = true;
        else if (!f.test(it)) dim = true;
        else if (q && !(itemLabel(it).toLowerCase().includes(q) || it.name.toLowerCase().includes(q))) dim = true;
      }
      el.classList.toggle('dim', dim);
    }
  }

  /* =====================================================================
   *  Slots : création & mise à jour
   * ===================================================================== */
  function createSlotEl() {
    const el = document.createElement('div');
    el.className = 'slot';
    el.innerHTML = '<img class="ghost-icon" alt=""><img class="pic" alt=""><div class="count"></div><div class="num"></div><div class="price"></div><div class="label"></div><div class="rar"></div><div class="dur"><i></i></div>';
    el._pic = el.querySelector('img.pic');
    el._ghost = el.querySelector('img.ghost-icon');
    el._count = el.querySelector('.count');
    el._num = el.querySelector('.num');
    el._price = el.querySelector('.price');
    el._label = el.querySelector('.label');
    el._rar = el.querySelector('.rar');
    el._dur = el.querySelector('.dur i');
    el._pic.onerror = () => { if (!el._pic.src.endsWith('xmark.svg')) el._pic.src = XMARK; };
    return el;
  }

  function colorDur(p) {
    // rouge -> orange -> vert
    const a = [231, 76, 60], b = [211, 84, 0], c = [39, 174, 96];
    const mix = (x, y, t) => `rgb(${x[0] * t + y[0] * (1 - t)}, ${x[1] * t + y[1] * (1 - t)}, ${x[2] * t + y[2] * (1 - t)})`;
    return p < 50 ? mix(b, a, p / 50) : mix(c, b, (p - 50) / 50);
  }

  function restricted(it, inv) {
    // boutique : stock / grade
    if (inv.type !== 'shop' || !hasItem(it)) return false;
    if (it.count !== undefined && it.count === 0) return true;
    if (it.grade === undefined || !inv.groups) return false;
    const mine = state.left.groups;
    if (!mine) return true;
    const keys = Object.keys(inv.groups);
    if (Array.isArray(it.grade)) {
      for (const k of keys) if (mine[k] !== undefined && it.grade.includes(mine[k])) return false;
      return true;
    }
    for (const k of keys) if (mine[k] !== undefined && mine[k] >= it.grade) return false;
    return true;
  }

  function missingIngredients(it, invType) {
    if (!hasItem(it) || invType !== 'crafting' || !it.ingredients) return false;
    return Object.entries(it.ingredients).some(([name, need]) => {
      const data = state.itemData[name];
      if (need >= 1 && data && data.count >= need) return false;
      return !state.left.items.find(p => hasItem(p) && p.name === name && need < 1 && p.metadata && p.metadata.durability >= need * 100);
    });
  }

  function updateSlot(el, inv, side) {
    const it = inv.items[el._i];
    const isCloth = !!el._cloth;
    const has = hasItem(it);
    el.classList.toggle('has', has);
    el.classList.toggle('hasdur', has && inv.type !== 'shop' && it.durability !== undefined);
    el.classList.toggle('locked', has && (restricted(it, inv) || missingIngredients(it, inv.type)));

    if (isCloth && !has) {
      el._ghost.src = clothIcon(el._cloth);
      el._ghost.style.display = '';
    }

    if (!has) {
      el._pic.removeAttribute('src');
      el._src = null;
      return;
    }

    const src = imageOf(it) || XMARK;
    if (el._src !== src) { el._src = src; el._pic.src = src; }

    if (it.count > 0 && inv.type !== 'shop') {
      el._count.textContent = `x${it.count.toLocaleString('en-us')}`;
      if (it.name === 'money') el._count.textContent = `${it.count.toLocaleString('en-us')}${state.locale.$ || '$'}`;
    } else el._count.textContent = '';

    el._num.style.display = (side === 'left' && inv.type === 'player' && it.slot <= 5 && !isCloth) ? 'block' : 'none';
    el._num.textContent = it.slot;

    if (inv.type === 'shop' && it.price !== undefined && it.price > 0) {
      el._price.style.display = 'block';
      el._price.textContent = `${state.locale.$ || '$'}${it.price.toLocaleString('en-us')}`;
      if (it.currency && it.currency !== 'money' && it.currency !== 'black_money') el._price.textContent = `${it.price.toLocaleString('en-us')} ${(state.itemData[it.currency] && state.itemData[it.currency].label) || it.currency}`;
    } else el._price.style.display = 'none';
    if (el._num.style.display === 'block' && el._price.style.display === 'block') el._num.style.display = 'none';

    el._label.textContent = itemLabel(it);

    const rarity = state.options.rarity && state.itemData[it.name] && state.itemData[it.name].rarity;
    el._rar.className = rarity ? `rar ${rarity}` : 'rar';
    el._rar.style.display = rarity ? '' : 'none';

    if (it.durability !== undefined && inv.type !== 'shop') {
      el._dur.style.width = `${Math.max(0, Math.min(100, it.durability))}%`;
      el._dur.style.background = colorDur(it.durability);
    }
  }

  // construit (ou reconstruit) la grille d'un inventaire
  function buildGrid(side) {
    const inv = state[side];
    const u = ui[side];
    u.grid.textContent = '';
    u.slots = [];
    const isPlayerClothing = side === 'left' && inv.type === 'player' && state.options.clothing;
    const visible = isPlayerClothing ? inv.slots - CLOTH_COUNT : inv.slots;
    const frag = document.createDocumentFragment();
    for (let i = 0; i < visible; i++) {
      const el = createSlotEl();
      el._i = i; el._side = side;
      // inventaire d'un autre joueur : les 14 derniers slots sont des vêtements
      if (inv.type === 'otherplayer' && state.options.clothing && i >= inv.slots - CLOTH_COUNT) {
        el._cloth = CLOTH_KEYS[i - (inv.slots - CLOTH_COUNT)];
        el.classList.add('cloth');
      }
      u.slots[i] = el;
      frag.appendChild(el);
    }
    u.grid.appendChild(frag);
  }

  function buildCloth() {
    ui.clothL.textContent = '';
    ui.clothR.textContent = '';
    ui.clothSlots = {};
    const inv = state.left;
    if (!state.options.clothing || !inv.slots) return;
    const base = inv.slots - CLOTH_COUNT;
    const mk = (key, parent) => {
      const idx = base + CLOTH_KEYS.indexOf(key);
      const el = createSlotEl();
      el._i = idx; el._side = 'left'; el._cloth = key;
      el.classList.add('cloth');
      ui.clothSlots[idx] = el;
      parent.appendChild(el);
    };
    CLOTH_LEFT.forEach(k => mk(k, ui.clothL));
    CLOTH_RIGHT.forEach(k => mk(k, ui.clothR));
  }

  function slotEl(side, index) {
    return ui[side].slots[index] || (side === 'left' ? ui.clothSlots[index] : undefined);
  }

  function allSlotEls() {
    return [...ui.left.slots, ...Object.values(ui.clothSlots), ...ui.right.slots].filter(Boolean);
  }

  /* ---------- en-têtes ---------- */
  function renderHead(side) {
    const inv = state[side];
    const u = ui[side];
    const items = inv.items;
    const total = items.reduce((t, it) => (hasItem(it) ? t + it.weight : t), 0);
    u.panel.classList.toggle('is-shop', inv.type === 'shop');

    if (side === 'left') u.title.textContent = L('ui_your_inventory', 'Inventaire');
    else {
      u.title.textContent = inv.label || L('ui_ground', 'Autour');
      u.icon.innerHTML = ICON[TYPE_ICON[inv.type] || 'box'];
    }

    if (inv.maxWeight) {
      u.weight.innerHTML = `${(total / 1000).toFixed(1)}/${inv.maxWeight / 1000} <small>kg</small>`;
      u.barWrap.style.display = 'block';
      u.bar.style.width = `${Math.min(100, (total / inv.maxWeight) * 100)}%`;
    } else {
      u.weight.textContent = '';
      u.barWrap.style.display = 'none';
    }
  }

  function renderSlots(side) {
    const inv = state[side];
    for (const el of ui[side].slots) if (el) updateSlot(el, inv, side);
    if (side === 'left') for (const el of Object.values(ui.clothSlots)) updateSlot(el, inv, 'left');
    applyFilters(side);
  }

  function renderAll() {
    renderHead('left'); renderHead('right');
    renderSlots('left'); renderSlots('right');
    renderHotbar();
  }

  function setPaymentUI() {
    app.querySelectorAll('[data-pay]').forEach(b => b.classList.toggle('active', b.dataset.pay === state.payment));
  }

  /* =====================================================================
   *  Réducteurs (reproduisent la logique d'origine)
   * ===================================================================== */
  function invOf(type) { return type === 'player' ? state.left : state.right; }

  function buildItems(inv) {
    const now = nowSec();
    const list = Array.isArray(inv.items) ? inv.items : Object.values(inv.items || {});
    const out = Array.from({ length: inv.slots }, (_, i) => {
      const found = list.find(c => c && c.slot === i + 1) || { slot: i + 1 };
      if (found.name) {
        if (!state.itemData[found.name]) ensureItemData(found.name);
        found.durability = durability(found.metadata, now);
      }
      return found;
    });
    return out;
  }

  function setupInventory(payload) {
    if (payload.options) Object.assign(state.options, payload.options);
    if (payload.leftInventory) state.left = { ...payload.leftInventory, items: buildItems(payload.leftInventory) };
    if (payload.rightInventory) state.right = { ...payload.rightInventory, items: buildItems(payload.rightInventory) };
    state.shift = false;
    setBusy(false);
    state.history = null;
    if (payload.leftInventory) { buildGrid('left'); buildCloth(); }
    if (payload.rightInventory) { buildGrid('right'); resetFilters('right'); }
    renderAll();
    setPaymentUI();
  }

  function resetFilters(side) {
    state.filter[side] = 'all';
    state.search[side] = '';
    ui[side].search.value = '';
    ui[side].rail.querySelectorAll('button').forEach(b => b.classList.toggle('active', b.dataset.filter === 'all'));
  }

  function refreshSlots(p) {
    let rebuildLeft = false, rebuildRight = false;
    if (p.items) {
      const arr = (Array.isArray(p.items) ? p.items : [p.items]).filter(Boolean);
      const now = nowSec();
      for (const r of arr) {
        const side = r.inventory && r.inventory !== 'player' ? 'right' : 'left';
        const inv = state[side];
        r.item.durability = durability(r.item.metadata, now);
        if (r.item.name && !state.itemData[r.item.name]) ensureItemData(r.item.name);
        inv.items[r.item.slot - 1] = r.item;
        const el = slotEl(side, r.item.slot - 1);
        if (el) {
          if (drag.active && drag.srcEl === el) cancelDrag();
          updateSlot(el, inv, side);
        }
      }
      if (state.right.type === 'crafting') renderSlots('right');
    }
    if (p.itemCount) {
      for (const [name, n] of Object.entries(p.itemCount)) {
        if (state.itemData[name]) state.itemData[name].count += n;
      }
      if (state.right.type === 'crafting') renderSlots('right');
    }
    if (p.weightData) {
      const { inventoryId, maxWeight } = p.weightData;
      const side = inventoryId === state.left.id ? 'left' : inventoryId === state.right.id ? 'right' : null;
      if (side) state[side].maxWeight = maxWeight;
    }
    if (p.slotsData) {
      const { inventoryId, slots } = p.slotsData;
      const side = inventoryId === state.left.id ? 'left' : inventoryId === state.right.id ? 'right' : null;
      if (side) {
        state[side].slots = slots;
        state[side].items = buildItems(state[side]);
        if (side === 'left') rebuildLeft = true; else rebuildRight = true;
      }
    }
    if (rebuildLeft) { buildGrid('left'); buildCloth(); }
    if (rebuildRight) buildGrid('right');
    renderHead('left'); renderHead('right');
    if (rebuildLeft) renderSlots('left');
    if (rebuildRight) renderSlots('right');
    if (!state.open || p.items) renderHotbar();
    applyFilters('left'); applyFilters('right');
  }

  function swapSlots(d) {
    const src = invOf(d.fromType), tgt = invOf(d.toType);
    const now = nowSec();
    const a = src.items[d.fromSlot.slot - 1], b = tgt.items[d.toSlot.slot - 1];
    const na = { ...b, slot: d.fromSlot.slot, durability: durability(d.toSlot.metadata, now) };
    const nb = { ...a, slot: d.toSlot.slot, durability: durability(d.fromSlot.metadata, now) };
    src.items[d.fromSlot.slot - 1] = na;
    tgt.items[d.toSlot.slot - 1] = nb;
  }

  function stackSlots(d) {
    const src = invOf(d.fromType), tgt = invOf(d.toType);
    const unit = d.fromSlot.weight / d.fromSlot.count;
    tgt.items[d.toSlot.slot - 1] = { ...tgt.items[d.toSlot.slot - 1], count: d.toSlot.count + d.count, weight: unit * (d.toSlot.count + d.count) };
    if (!(d.fromType === 'shop' || d.fromType === 'crafting')) {
      src.items[d.fromSlot.slot - 1] = d.fromSlot.count - d.count > 0
        ? { ...src.items[d.fromSlot.slot - 1], count: d.fromSlot.count - d.count, weight: unit * (d.fromSlot.count - d.count) }
        : { slot: d.fromSlot.slot };
    }
  }

  function moveSlots(d) {
    const src = invOf(d.fromType), tgt = invOf(d.toType);
    const unit = d.fromSlot.weight / d.fromSlot.count;
    const h = src.items[d.fromSlot.slot - 1];
    tgt.items[d.toSlot.slot - 1] = { ...h, count: d.count, weight: unit * d.count, slot: d.toSlot.slot, durability: durability(h.metadata, nowSec()) };
    if (!(d.fromType === 'shop' || d.fromType === 'crafting')) {
      src.items[d.fromSlot.slot - 1] = d.fromSlot.count - d.count > 0
        ? { ...src.items[d.fromSlot.slot - 1], count: d.fromSlot.count - d.count, weight: unit * (d.fromSlot.count - d.count) }
        : { slot: d.fromSlot.slot };
    }
  }

  function setBusy(v) {
    state.busy = v;
    ui.left.panel.classList.toggle('busy', v);
    ui.right.panel.classList.toggle('busy', v);
    $('#panel-center').classList.toggle('busy', v);
  }

  function snapshot() { state.history = { left: clone(state.left.items), right: clone(state.right.items) }; }
  function restore() {
    if (state.history) { state.left.items = state.history.left; state.right.items = state.history.right; }
    state.history = null;
    setBusy(false);
    renderAll();
  }

  /* =====================================================================
   *  Actions : déplacement, achat, craft, utilisation
   * ===================================================================== */
  function findTargetSlot(it, data, items) {
    if (data && data.stack) {
      const s = items.find(i => i.name === it.name && deepEqual(i.metadata, it.metadata));
      if (s) return s;
    }
    return items.find(i => i.name === undefined);
  }

  // déplacement : target = {inventory, item:{slot}} ou undefined (déplacement rapide)
  async function moveItem(source, target) {
    if (state.busy) return;
    const srcInv = invOf(source.inventory);
    const tgtInv = target ? invOf(target.inventory) : (source.inventory === 'player' ? state.right : state.left);
    const o = srcInv.items[source.item.slot - 1];
    if (!hasItem(o)) return;
    const data = state.itemData[o.name];
    if (!data) return console.error(`${o.name} item data undefined!`);

    if (o.metadata && o.metadata.container !== undefined) {
      if (tgtInv.type === 'container') return;
      if (state.right.id === o.metadata.container) return;
    }

    const a = target ? tgtInv.items[target.item.slot - 1] : findTargetSlot(o, data, tgtInv.items);
    if (!a) return;
    if (a.metadata && a.metadata.container !== undefined && state.right.id === a.metadata.container) return;

    const count = state.shift && o.count > 1 && srcInv.type !== 'shop'
      ? Math.floor(o.count / 2)
      : (state.itemAmount === 0 || state.itemAmount > o.count ? o.count : state.itemAmount);

    const d = { fromSlot: o, toSlot: a, fromType: srcInv.type, toType: tgtInv.type, count };

    // validation serveur (optimiste, annulation si refus)
    snapshot();
    setBusy(true);
    const payload = { ...d, fromSlot: o.slot, toSlot: a.slot };
    if (hasItem(a)) {
      if (data.stack && o.name === a.name && deepEqual(o.metadata, a.metadata)) stackSlots(d); else swapSlots(d);
    } else moveSlots(d);
    renderAll();

    try {
      const r = await nui('swapItems', payload);
      if (r === false) return restore();
      if (typeof r === 'number') {
        const cont = state.left.items.find(i => i && i.metadata && i.metadata.container === state.right.id);
        if (cont) cont.weight = r;
      }
      state.history = null;
      setBusy(false);
      renderHead('left'); renderHead('right');
    } catch (e) { restore(); }
  }

  async function buyItem(source, target) {
    if (state.busy) return;
    const o = state.right.items[source.item.slot - 1];
    if (!hasItem(o) || o.count === 0) return;
    if (!state.itemData[o.name]) return console.error(`Item ${o.name} data undefined!`);
    const a = state.left.items[target.item.slot - 1];
    if (!a) return;
    const count = state.itemAmount !== 0 ? (o.count && state.itemAmount > o.count ? o.count : state.itemAmount) : 1;
    snapshot();
    setBusy(true);
    try {
      const r = await nui('buyItem', { fromSlot: o.slot, toSlot: a.slot, fromType: state.right.type, toType: state.left.type, count });
      if (r === false) return restore();
      state.history = null;
      setBusy(false);
    } catch (e) { restore(); }
  }

  async function craftItem(source, target) {
    if (state.busy) return;
    const o = state.right.items[source.item.slot - 1];
    if (!hasItem(o) || o.count === 0) return;
    if (!state.itemData[o.name]) return console.error(`Item ${o.name} data undefined!`);
    const a = state.left.items[target.item.slot - 1];
    if (!a) return;
    const count = state.itemAmount === 0 ? 1 : state.itemAmount;
    snapshot();
    setBusy(true);
    try {
      const r = await nui('craftItem', { fromSlot: o.slot, toSlot: a.slot, fromType: state.right.type, toType: state.left.type, count });
      if (r === false) return restore();
      state.history = null;
      setBusy(false);
    } catch (e) { restore(); }
  }

  const useItem = it => nui('useItem', it.slot);
  const giveItem = it => nui('giveItem', { slot: it.slot, count: state.itemAmount });

  function dropOnSlot(srcInfo, tgtInfo) {
    const sType = srcInfo.inventory;
    if (sType === 'shop') return buyItem({ item: { slot: srcInfo.slot } }, { item: { slot: tgtInfo.slot } });
    if (sType === 'crafting') return craftItem({ item: { slot: srcInfo.slot } }, { item: { slot: tgtInfo.slot } });
    return moveItem({ inventory: sType, item: { slot: srcInfo.slot } }, { inventory: tgtInfo.inventory, item: { slot: tgtInfo.slot } });
  }

  /* =====================================================================
   *  Glisser-déposer & clics (événements souris)
   * ===================================================================== */
  const drag = { active: false, pending: false, srcEl: null, startX: 0, startY: 0, info: null, overEl: null };

  function slotInfo(el) {
    const side = el._side;
    const inv = state[side];
    return { side, inventory: inv.type, slot: el._i + 1, item: inv.items[el._i], inv };
  }

  function canDrag(el) {
    const { item, inv } = slotInfo(el);
    return hasItem(item) && !restricted(item, inv) && !missingIngredients(item, inv.type);
  }

  function cancelDrag() {
    if (drag.srcEl) drag.srcEl.classList.remove('dragging');
    if (drag.overEl) drag.overEl.classList.remove('over');
    ui.ghost.style.display = 'none';
    drag.active = drag.pending = false;
    drag.srcEl = drag.overEl = null;
  }

  function moveGhost(x, y) {
    const s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--scale')) || 1;
    ui.ghost.style.transform = `translate(${x - 36.5 * s}px, ${y - 36.5 * s}px) scale(${s})`;
  }

  app.addEventListener('mousedown', e => {
    if (!state.open || e.button !== 0) return;
    const el = e.target.closest('.slot');
    if (!el || el._side === undefined) return;
    hideCtx();
    hideTooltip();
    if (!canDrag(el)) return;
    drag.pending = true;
    drag.srcEl = el;
    drag.startX = e.clientX;
    drag.startY = e.clientY;
  });

  window.addEventListener('mousemove', e => {
    if (!drag.pending && !drag.active) return;
    if (drag.pending && !drag.active) {
      if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 5) return;
      drag.pending = false;
      drag.active = true;
      const info = slotInfo(drag.srcEl);
      drag.info = info;
      drag.srcEl.classList.add('dragging');
      ui.ghost.querySelector('img').src = imageOf(info.item) || XMARK;
      ui.ghost.querySelector('span').textContent = info.item.count > 0 ? `x${info.item.count}` : '';
      ui.ghost.style.display = 'block';
      ui.ghost.style.left = '0';
      ui.ghost.style.top = '0';
      hideTooltip();
    }
    if (!drag.active) return;
    moveGhost(e.clientX, e.clientY);
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const target = under && under.closest ? under.closest('.slot') : null;
    const valid = target && target._side !== undefined && target !== drag.srcEl && !(target._side === 'right' && ['shop', 'crafting'].includes(state.right.type));
    if (drag.overEl && drag.overEl !== target) drag.overEl.classList.remove('over');
    drag.overEl = valid ? target : null;
    if (valid) target.classList.add('over');
  });

  window.addEventListener('mouseup', e => {
    if (drag.pending && !drag.active) { drag.pending = false; drag.srcEl = null; return; }
    if (!drag.active) return;
    const info = drag.info;
    const over = drag.overEl;
    cancelDrag();
    drag.justDragged = true;
    setTimeout(() => { drag.justDragged = false; }, 0);
    if (over) {
      const t = slotInfo(over);
      if (t.slot === info.slot && t.inventory === info.inventory && t.side === info.side) return;
      dropOnSlot({ inventory: info.inventory, slot: info.slot }, { inventory: t.inventory, slot: t.slot });
    }
  });

  // clic simple : ctrl = déplacement rapide, alt = utiliser
  app.addEventListener('click', e => {
    if (!state.open) return;
    const el = e.target.closest('.slot');
    if (!el || el._side === undefined) return;
    if (drag.justDragged) return;
    hideTooltip();
    const { item, inventory, slot } = slotInfo(el);
    if (!hasItem(item)) return;
    if (e.ctrlKey && inventory !== 'shop' && inventory !== 'crafting') moveItem({ inventory, item: { slot } });
    else if (e.altKey && inventory === 'player') useItem(item);
  });

  app.addEventListener('dblclick', e => {
    if (!state.open) return;
    const el = e.target.closest('.slot');
    if (!el || el._side === undefined) return;
    const { item, inventory } = slotInfo(el);
    hideTooltip();
    if (hasItem(item) && inventory === 'player') useItem(item);
  });

  app.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (!state.open) return;
    const el = e.target.closest('.slot');
    if (!el || el._side === undefined) return hideCtx();
    const { item, inventory } = slotInfo(el);
    hideTooltip();
    if (inventory !== 'player' || !hasItem(item)) return hideCtx();
    showCtx(item, e.clientX, e.clientY);
  });

  /* =====================================================================
   *  Infobulle
   * ===================================================================== */
  let tipTimer = null;
  let mouse = { x: 0, y: 0 };

  app.addEventListener('mouseover', e => {
    if (!state.open || drag.active) return;
    const el = e.target.closest('.slot');
    clearTimeout(tipTimer);
    if (!el || el._side === undefined) return hideTooltip();
    const { item, inventory } = slotInfo(el);
    if (!hasItem(item)) return hideTooltip();
    tipTimer = setTimeout(() => showTooltip(item, inventory), 450);
  });
  app.addEventListener('mouseout', e => {
    const el = e.target.closest('.slot');
    if (el && !el.contains(e.relatedTarget)) { clearTimeout(tipTimer); hideTooltip(); }
  });
  window.addEventListener('mousemove', e => { mouse = { x: e.clientX, y: e.clientY }; if (ui.tooltip.style.display === 'block') placeTooltip(); });

  function placeTooltip() {
    const t = ui.tooltip;
    const w = t.offsetWidth, h = t.offsetHeight;
    let x = mouse.x + 18, y = mouse.y + 14;
    if (x + w > window.innerWidth - 8) x = mouse.x - w - 18;
    if (y + h > window.innerHeight - 8) y = window.innerHeight - h - 8;
    t.style.left = `${Math.max(8, x)}px`;
    t.style.top = `${Math.max(8, y)}px`;
  }

  function hideTooltip() { clearTimeout(tipTimer); ui.tooltip.style.display = 'none'; }

  function showTooltip(it, invType) {
    const data = state.itemData[it.name];
    const t = ui.tooltip;
    if (!data) { t.innerHTML = `<div class="t-head"><p>${esc(it.name)}</p></div>`; }
    else {
      const desc = (it.metadata && it.metadata.description) || data.description;
      const ammoLabel = data.ammoName && state.itemData[data.ammoName] && state.itemData[data.ammoName].label;
      const ing = it.ingredients ? Object.entries(it.ingredients).sort((a, b) => a[1] - b[1]) : null;
      const rarity = state.options.rarity && data.rarity;
      const money = state.locale.$ || '$';
      let h = '<div class="t-head">';
      if (it.count > 0) h += `<p>${it.count.toLocaleString('en-us')}${it.name === 'money' ? money : 'x'}</p>`;
      if (it.weight !== undefined && it.weight > 0) h += `<p>${fmtWeight(it.weight)}</p>`;
      if (ammoLabel) h += `<p>${esc(ammoLabel)}</p>`;
      if (it.metadata && it.metadata.ammo) h += `<p>${it.metadata.ammo}x ${esc(L('ui_ammo', 'Munitions'))}</p>`;
      if (invType === 'crafting') h += `<p>⏱ ${(it.duration !== undefined ? it.duration : 3000) / 1000}s</p>`;
      else if (it.metadata && it.metadata.type) h += `<p>${esc(it.metadata.type)}</p>`;
      if (invType === 'shop' && it.price !== undefined && it.price > 0) h += `<p>${money}${it.price.toLocaleString('en-us')}</p>`;
      h += '</div>';
      h += `<div class="t-body"><img src="${esc(imageOf(it.name))}" onerror="this.src='${XMARK}'" alt=""><div><div class="t-name">${esc((it.metadata && it.metadata.label) || data.label || it.name)}</div><div class="t-desc">${md(desc || L('ui_no_description_item', "Aucune description de l'objet"))}</div></div></div>`;

      const meta = [];
      if (invType !== 'crafting') {
        if (it.durability !== undefined) meta.push([L('ui_durability', 'Durabilité'), `${Math.trunc(it.durability)}%`]);
        if (it.metadata && it.metadata.serial) meta.push([L('ui_serial', 'Numéro de série'), it.metadata.serial]);
        if (it.metadata && it.metadata.components && it.metadata.components[0]) meta.push([L('ui_components', 'Accessoires'), it.metadata.components.map(c => (state.itemData[c] && state.itemData[c].label) || c).join(', ')]);
        if (it.metadata && it.metadata.weapontint) meta.push([`${L('ui_tint', 'Teinte')}:`, it.metadata.weapontint]);
        for (const p of state.extraMeta) {
          if (it.metadata && it.metadata[p.metadata] !== undefined && it.metadata[p.metadata] !== null) meta.push([`${p.value}:`, it.metadata[p.metadata]]);
        }
      }
      if (meta.length || ing) h += '<hr>';
      if (invType !== 'crafting') h += meta.map(([k, v]) => `<div class="t-meta"><b>${esc(k)}</b>${esc(v)}</div>`).join('');
      else if (ing) {
        h += ing.map(([name, n]) => {
          const label = (state.itemData[name] && state.itemData[name].label) || name;
          const txt = n >= 1 ? `${n.toLocaleString('en-us')}x ${label}` : n === 0 ? label : `${n * 100}% ${label}`;
          return `<div class="t-ing"><img src="${esc(imageOf(name))}" alt=""><span>${esc(txt)}</span></div>`;
        }).join('');
      }
      if (rarity) h += `<div class="t-rar rar ${rarity}"></div>`;
      t.innerHTML = h;
    }
    t.style.display = 'block';
    placeTooltip();
  }

  /* =====================================================================
   *  Menu contextuel
   * ===================================================================== */
  function hideCtx() { ui.ctx.style.display = 'none'; ui.ctx.textContent = ''; }

  function ctxAction(item, a) {
    hideCtx();
    switch (a.action) {
      case 'use': useItem({ slot: item.slot }); break;
      case 'give': giveItem({ slot: item.slot }); break;
      case 'drop': if (hasItem(item)) moveItem({ inventory: 'player', item: { slot: item.slot } }); break;
      case 'remove': nui('removeComponent', { component: a.component, slot: a.slot }); break;
      case 'removeAmmo': nui('removeAmmo', item.slot); break;
      case 'copy': {
        const i = document.createElement('input');
        i.value = a.serial || ''; document.body.appendChild(i); i.select(); document.execCommand('copy'); document.body.removeChild(i);
        break;
      }
      case 'throw': nui('throwItem', item.slot); break;
      case 'rename': nui('renameItem', item.slot); break;
      case 'custom': nui('useButton', { id: (a.id || 0) + 1, slot: item.slot }); break;
    }
  }

  function showCtx(item, x, y) {
    const data = state.itemData[item.name] || {};
    const list = document.createElement('div');
    list.className = 'ctx-list';
    const btn = (label, fn) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ctx-item'; b.textContent = label;
      b.addEventListener('click', e => { e.stopPropagation(); fn(); });
      return b;
    };
    const sub = (label, children) => {
      const b = document.createElement('div');
      b.className = 'ctx-item'; b.innerHTML = `<span>${esc(label)}</span><span class="arrow">▶</span>`;
      const inner = document.createElement('div');
      inner.className = 'ctx-list';
      children.forEach(c => inner.appendChild(c));
      b.appendChild(inner);
      b.addEventListener('mouseenter', () => b.classList.add('open'));
      b.addEventListener('mouseleave', () => b.classList.remove('open'));
      return b;
    };
    list.appendChild(btn(L('ui_use', 'Utiliser'), () => ctxAction(item, { action: 'use' })));
    list.appendChild(btn(L('ui_give', 'Donner'), () => ctxAction(item, { action: 'give' })));
    list.appendChild(btn(L('ui_drop', 'Jeter'), () => ctxAction(item, { action: 'drop' })));
    if (state.options.throwing) list.appendChild(btn(L('ui_throw', 'Lancer'), () => ctxAction(item, { action: 'throw' })));
    if (state.options.rename) list.appendChild(btn(L('ui_rename', 'Renommer'), () => ctxAction(item, { action: 'rename' })));
    if (item.metadata && item.metadata.ammo > 0) list.appendChild(btn(L('ui_remove_ammo', 'Vider le chargeur'), () => ctxAction(item, { action: 'removeAmmo' })));
    if (item.metadata && item.metadata.serial) list.appendChild(btn(L('ui_copy', 'Copier le numéro de série'), () => ctxAction(item, { action: 'copy', serial: item.metadata.serial })));
    if (item.metadata && item.metadata.components && item.metadata.components.length > 0) {
      list.appendChild(sub(L('ui_removeattachments', 'Retirer des accessoires'), item.metadata.components.map(c =>
        btn((state.itemData[c] && state.itemData[c].label) || c, () => ctxAction(item, { action: 'remove', component: c, slot: item.slot })))));
    }
    if (data.buttons && data.buttons.length) {
      const groups = [];
      data.buttons.forEach((b, index) => {
        if (b.group) {
          const g = groups.find(x => x.name === b.group);
          if (g) g.buttons.push({ ...b, index }); else groups.push({ name: b.group, buttons: [{ ...b, index }] });
        } else groups.push({ name: null, buttons: [{ ...b, index }] });
      });
      for (const g of groups) {
        const mk = b => btn(b.label, () => ctxAction(item, { action: 'custom', id: b.index }));
        if (g.name) list.appendChild(sub(g.name, g.buttons.map(mk)));
        else g.buttons.forEach(b => list.appendChild(mk(b)));
      }
    }
    ui.ctx.textContent = '';
    ui.ctx.appendChild(list);
    ui.ctx.style.display = 'block';
    ui.ctx.style.left = '0'; ui.ctx.style.top = '0';
    const w = list.offsetWidth, h = list.offsetHeight;
    list.style.left = `${Math.min(x, window.innerWidth - w - 150)}px`;
    list.style.top = `${Math.min(y, window.innerHeight - h - 8)}px`;
  }

  window.addEventListener('mousedown', e => { if (!e.target.closest('#ctx')) hideCtx(); });

  /* =====================================================================
   *  Quantité, paiement, aide
   * ===================================================================== */
  const amountInput = ui.amount;
  amountInput.addEventListener('input', () => {
    let v = amountInput.valueAsNumber;
    v = isNaN(v) || v < 0 ? 0 : Math.floor(v);
    amountInput.value = v;
    state.itemAmount = v;
  });
  $('[data-role=amount-minus]').addEventListener('click', () => { state.itemAmount = Math.max(0, state.itemAmount - 1); amountInput.value = state.itemAmount; });
  $('[data-role=amount-plus]').addEventListener('click', () => { state.itemAmount += 1; amountInput.value = state.itemAmount; });

  app.querySelectorAll('[data-pay]').forEach(b => b.addEventListener('click', () => {
    state.payment = b.dataset.pay;
    setPaymentUI();
    nui('setShopPayment', state.payment);
  }));

  function buildHelp() {
    const rows = [
      ['ui_rmb_key', 'Clic droit', 'ui_rmb', 'Ouvrir le menu contextuel'],
      ['ui_alt_lmb_key', 'ALT + Clic gauche', 'ui_alt_lmb', 'Utiliser un item rapidement'],
      ['ui_ctrl_lmb_key', 'CTRL + Clic gauche', 'ui_ctrl_lmb', "Déplacer rapidement une pile d'items"],
      ['ui_shift_drag_key', 'SHIFT + Glisser', 'ui_shift_drag', "Séparer une pile d'items en 2"],
      ['ui_ctrl_shift_lmb_key', 'CTRL + SHIFT + Clic gauche', 'ui_ctrl_shift_lmb', 'Déplacer rapidement une demi-pile']
    ];
    ui.help.querySelector('.box').innerHTML = `<h3>${esc(L('ui_usefulcontrols', 'Contrôles utiles'))}<button type="button" data-close>✕</button></h3>` +
      rows.map(r => `<div class="row"><b>${esc(L(r[0], r[1]))}</b><span>${esc(L(r[2], r[3]))}</span></div>`).join('');
  }
  $('#help-btn').addEventListener('click', () => { buildHelp(); ui.help.classList.add('show'); });
  ui.help.addEventListener('click', e => { if (e.target === ui.help || e.target.closest('[data-close]')) ui.help.classList.remove('show'); });

  /* =====================================================================
   *  Hotbar & notifications
   * ===================================================================== */
  let hotbarTimer = null;
  function renderHotbar() {
    const items = state.left.items.slice(0, 5);
    if (!items.length) { ui.hotbar.textContent = ''; return; }
    if (ui.hotbar.children.length !== items.length) {
      ui.hotbar.textContent = '';
      items.forEach((_, i) => { const el = createSlotEl(); el._i = i; el._side = 'left'; ui.hotbar.appendChild(el); });
    }
    items.forEach((it, i) => {
      const el = ui.hotbar.children[i];
      updateSlot(el, state.left, 'left');
      el._num.style.display = 'block'; el._num.textContent = i + 1;
    });
  }
  function toggleHotbar() {
    if (ui.hotbar.classList.contains('show')) { ui.hotbar.classList.remove('show'); return; }
    renderHotbar();
    ui.hotbar.classList.add('show');
    clearTimeout(hotbarTimer);
    hotbarTimer = setTimeout(() => ui.hotbar.classList.remove('show'), 3000);
  }

  function itemNotify([item, rawText, count]) {
    const cls = { ui_added: 'notify-added', ui_removed: 'notify-removed', ui_holstered: 'notify-holstered', ui_equipped: 'notify-equipped' }[rawText || 'ui_added'] || 'notify-added';
    const base = L(rawText, rawText || '');
    const text = count ? `${base} ${Number(count).toLocaleString('en-us')}${item.name === 'money' ? (state.locale.$ || '$') : 'x'}` : base;
    const el = document.createElement('div');
    el.className = `notif ${cls}`;
    el.innerHTML = `<img src="${esc(imageOf(item))}" onerror="this.src='${XMARK}'" alt=""><div><div class="n-name">${esc((item.metadata && item.metadata.label) || (state.itemData[item.name] && state.itemData[item.name].label) || item.name)}</div><div class="n-text">${esc(text)}</div></div>`;
    ui.notifs.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('in')));
    setTimeout(() => el.classList.remove('in'), 2500);
    setTimeout(() => el.remove(), 3100);
  }

  /* =====================================================================
   *  Ouverture / fermeture
   * ===================================================================== */
  function show() { state.open = true; app.classList.add('open'); }
  function hide() {
    state.open = false;
    app.classList.remove('open');
    cancelDrag(); hideTooltip(); hideCtx();
    ui.help.classList.remove('show');
  }

  function closeInventory() {
    hide();
    state.history = null;
    setBusy(false);
  }

  window.addEventListener('keydown', e => { if (e.key === 'Shift') state.shift = true; });
  window.addEventListener('keyup', e => {
    if (e.key === 'Shift') state.shift = false;
    if (!state.open) return;
    if (e.code === 'Escape' || e.code === 'Tab') {
      if (ui.help.classList.contains('show')) return ui.help.classList.remove('show');
      if (document.activeElement && document.activeElement.tagName === 'INPUT' && e.code === 'Escape') document.activeElement.blur();
      hide();
      nui('exit');
    }
  });
  window.addEventListener('blur', () => { state.shift = false; });
  window.addEventListener('dragstart', e => e.preventDefault());

  /* =====================================================================
   *  Messages du jeu
   * ===================================================================== */
  window.addEventListener('message', ev => {
    const { action, data } = ev.data || {};
    switch (action) {
      case 'init':
        if (data.locale) Object.assign(state.locale, data.locale);
        if (data.items) Object.assign(state.itemData, data.items);
        if (data.options) Object.assign(state.options, data.options);
        if (data.imagepath) state.imagepath = data.imagepath;
        setupInventory({ leftInventory: data.leftInventory });
        ui.left.search.placeholder = ui.right.search.placeholder = 'Rechercher';
        app.querySelector('[data-pay=money]').textContent = L('ui_money', 'Espèces');
        app.querySelector('[data-pay=card]').textContent = L('ui_card', 'Carte');
        break;
      case 'setupInventory': setupInventory(data); show(); break;
      case 'refreshSlots': refreshSlots(data); break;
      case 'closeInventory': closeInventory(); break;
      case 'setInventoryVisible': data ? show() : hide(); break;
      case 'toggleHotbar': toggleHotbar(); break;
      case 'setTheme': applyTheme(data && data.color || data); break;
      case 'itemNotify': itemNotify(data); break;
      case 'displayMetadata': {
        for (const m of data || []) if (!state.extraMeta.find(x => x.value === m.value)) state.extraMeta.push(m);
        break;
      }
    }
  });

  // exposition pour les tests hors du jeu
  window.__oxui = { state, ui, show, hide };

  nui('uiLoaded', {});
})();
