// Spell Quest — the App object: profiles, theme, HUD, tab bar, overlays, effects.
// The screens live in app-home.js, app-play.js and app-meta.js (all extend App).

const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const I = (n, cls) => `<span class="ico ${cls || ''}">${Art.icon(n)}</span>`;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const TABICON = {
  home:   '<svg viewBox="0 0 28 28"><path d="M4 14L14 4L24 14V24H17V17H11V24H4Z" fill="currentColor" stroke="#1d1440" stroke-width="2" stroke-linejoin="round"/></svg>',
  worlds: '<svg viewBox="0 0 28 28"><path d="M4 8L10 5L18 8L24 5V20L18 23L10 20L4 23Z" fill="currentColor" stroke="#1d1440" stroke-width="2" stroke-linejoin="round"/><path d="M10 5V20M18 8V23" stroke="#1d1440" stroke-width="2"/></svg>',
  squad:  '<svg viewBox="0 0 28 28"><circle cx="14" cy="10" r="5.5" fill="currentColor" stroke="#1d1440" stroke-width="2"/><path d="M4 25C4 18 9 15 14 15C19 15 24 18 24 25Z" fill="currentColor" stroke="#1d1440" stroke-width="2" stroke-linejoin="round"/><circle cx="5" cy="12" r="3" fill="currentColor" stroke="#1d1440" stroke-width="1.6"/><circle cx="23" cy="12" r="3" fill="currentColor" stroke="#1d1440" stroke-width="1.6"/></svg>',
  shop:   '<svg viewBox="0 0 28 28"><path d="M4 10H24L22 24H6Z" fill="currentColor" stroke="#1d1440" stroke-width="2" stroke-linejoin="round"/><path d="M9 10V8C9 3 19 3 19 8V10" fill="none" stroke="#1d1440" stroke-width="2.4"/></svg>',
  me:     '<svg viewBox="0 0 28 28"><path d="M14 3L17 10L25 11L19 16L21 24L14 20L7 24L9 16L3 11L11 10Z" fill="currentColor" stroke="#1d1440" stroke-width="2" stroke-linejoin="round"/></svg>',
};
const TABS = [['home', 'Home'], ['worlds', 'Worlds'], ['squad', 'Squad'], ['shop', 'Shop'], ['me', 'Me']];

const App = {
  root: null, profile: null, view: '', _cache: {}, _banners: 0, _modalOpen: false,

  // Safe to call before a profile exists (Voice/Sfx ask for settings early).
  data() { return this.profile ? this.profile.p : Engine.blank(); },
  get p() { return this.profile.p; },

  init() {
    this.root = Store.load();
    const prof = this.root.profiles[this.root.activeId] || Object.values(this.root.profiles)[0];
    this.paintSky();
    // pinch and double-tap zoom off: this is a game, and a stray zoom looks like a broken app
    ['gesturestart', 'gesturechange'].forEach(ev => document.addEventListener(ev, e => e.preventDefault()));
    document.addEventListener('keydown', e => this.onKey(e));
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.hidden) { Voice.stop(); this.onHidden && this.onHidden(); } });
    if (prof) { this.use(prof.id, true); this.home(); } else this.welcome();
    this.checkForUpdate();
  },

  paintSky() {
    if (document.querySelector('.sky')) return;
    const sky = document.createElement('div'); sky.className = 'sky';
    for (let i = 0; i < 14; i++) {
      const d = 4 + (i % 4) * 3, m = document.createElement('i');
      m.style.cssText = `left:${(i * 7.3 + 4) % 96}vw;bottom:-6vh;width:${d}px;height:${d}px;animation-duration:${18 + (i % 5) * 5}s;animation-delay:-${i * 2.6}s`;
      sky.appendChild(m);
    }
    document.body.appendChild(sky);
  },

  // ── profiles & saving ────────────────────────────────────────────────────
  use(id, quiet) {
    if (!this.root.profiles[id]) return;
    this.profile = this.root.profiles[id];
    this.root.activeId = id;
    Engine.sanitize(this.profile.p);
    Engine.ensureQuests(this.p);
    this.applyTheme();
    Store.save(this.root);
    this.resumeCloud();
  },
  applyTheme() { document.documentElement.dataset.theme = this.p.theme === 'night' ? '' : this.p.theme; },
  save() {
    if (!this.profile) return;
    this.profile.updatedAt = Date.now();
    this.profile.playedAt = this.p.playedAt || this.profile.playedAt || 0;
    Store.save(this.root);
    if (this.profile.cloud && Sync.uid && Sync.uid === this.profile.uid) Sync.schedulePush(this.profile);
  },
  profileList() { return Object.values(this.root.profiles).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)); },

  // ── art, cached (an SVG string is built once per look) ───────────────────
  allyHtml(k, form, gear) {
    const key = k + '|' + form + '|' + JSON.stringify(gear || {});
    return this._cache[key] || (this._cache[key] = Art.ally(Engine.ALLYBY[k], form, gear || {}));
  },
  partnerHtml(form) {
    const k = this.p.ally, f = form || Engine.formFromBond((this.p.allies[k] || {}).bond || 0);
    return this.allyHtml(k, f, Engine.gearFor(this.p, k));
  },
  heroHtml(k, skin) {
    const key = 'h|' + k + '|' + skin;
    return this._cache[key] || (this._cache[key] = Art.hero(Engine.HEROBY[k], { skin }));
  },
  myHero() { return this.heroHtml(this.p.hero, this.p.skin); },

  // ── level math ───────────────────────────────────────────────────────────
  lv() { return levelFromXp(this.p.xp); },
  lvPct() { const l = this.lv(), a = xpForLevel(l), b = xpForLevel(l + 1); return Math.round((this.p.xp - a) / (b - a) * 100); },

  // ── chrome ───────────────────────────────────────────────────────────────
  hud() {
    const p = this.p, l = this.lv();
    return `<div class="hud">
      <div class="face">${this.myHero()}</div>
      <div class="who"><div class="nm">${esc(this.profile.name)}</div>
        <div class="rk"><span>Lv ${l} · ${esc(rankTitle(l))}</span></div>
        <div class="xpbar"><i style="width:${this.lvPct()}%"></i></div></div>
      <div class="pills">
        <span class="pill">${I('coin')}<span id="hud-coins">${Engine.bal(p, 'coins')}</span></span>
        <span class="pill">${I('gem')}<span id="hud-gems">${Engine.bal(p, 'gems')}</span></span>
        <span class="pill">${I('flame')}${p.streak.last >= Engine.dayNum() - 1 ? p.streak.n : 0}</span>
      </div></div>`;
  },
  tabbar(active) {
    const crates = ['bronze', 'silver', 'gold'].reduce((s, t) => s + Engine.bal(this.p, t), 0);
    const claim = Engine.questState(this.p).some((q, i) => q.done && !this.p.quests.list[i].claimed) || Engine.calendarReady(this.p);
    return `<nav class="tabs"><div>${TABS.map(([k, n]) => `
      <button class="tab ${k === active ? 'on' : ''}" onclick="App.go('${k}')">${TABICON[k].replace('currentColor', active === k ? '#ffd95e' : 'rgba(255,255,255,.75)')}${n}
        ${(k === 'home' && claim) || (k === 'shop' && crates) ? '<span class="dot"></span>' : ''}</button>`).join('')}</div></nav>`;
  },
  go(v, a) {
    ({ home: () => this.home(), worlds: () => this.worlds(), squad: () => this.squad(a), shop: () => this.shop(a), me: () => this.me() })[v]();
  },

  render(html, opts = {}) {
    Voice.stop();
    clearTimeout(this._adv); clearTimeout(this._cd); this._adv = null; this.keyHandler = null;
    if (!opts.play) { clearInterval(this._tick); this._tick = null; }      // the Speed Round clock lives across its words
    this.closeModal(true);
    document.querySelectorAll('.toast, .float, .cd').forEach(t => t.remove());
    const app = $('app');
    app.className = opts.play ? 'play' : '';
    app.innerHTML = html;
    window.scrollTo(0, 0);
    this.view = opts.view || '';
  },

  // ── overlays ─────────────────────────────────────────────────────────────
  modal(html, opts = {}) {
    this.closeModal(true);
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'modal';
    m.innerHTML = `<div class="mbox ${opts.cls || ''}">${html}</div>`;
    document.body.appendChild(m); this._modalOpen = true; this._onModalClose = opts.onclose || null;
    return m;
  },
  closeModal(silent) {
    const m = $('modal'); if (m) m.remove();
    this._modalOpen = false;
    const cb = this._onModalClose; this._onModalClose = null;
    if (cb && !silent) cb();
  },
  banner(icon, title, sub) {
    const el = document.createElement('div'); el.className = 'toastban'; el.style.top = `calc(max(12px, env(safe-area-inset-top)) + ${this._banners * 74}px)`;
    el.innerHTML = `${I(icon)}<div><b>${esc(title)}</b><span>${esc(sub || '')}</span></div>`;
    document.body.appendChild(el); this._banners++;
    setTimeout(() => { el.remove(); this._banners = Math.max(0, this._banners - 1); }, 3500);
  },
  toast(text, color) {
    document.querySelectorAll('.toast').forEach(t => t.remove());
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = text; if (color) t.style.color = color;
    const card = $('qcard'); const r = card && card.getBoundingClientRect();
    t.style.top = r ? Math.max(70, r.top - 6) + 'px' : '18%';
    document.body.appendChild(t); setTimeout(() => t.remove(), 1400);
  },
  floatAt(el, html, color) {
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
    const f = document.createElement('div'); f.className = 'float'; f.style.cssText = `left:${r.left + r.width / 2}px;top:${r.top + r.height / 2}px;color:${color || '#fff'}`;
    f.innerHTML = html; document.body.appendChild(f); setTimeout(() => f.remove(), 1150);
  },
  confetti(n = 36) {
    const c = document.createElement('div'); c.className = 'confetti';
    const cols = ['#ffc83d', '#3ee6d3', '#ff4fa0', '#8b5cf6', '#4aa8ff', '#3ee6a0'];
    for (let i = 0; i < n; i++) { const s = document.createElement('span'); s.style.cssText = `left:${Math.random() * 100}vw;background:${cols[i % 6]};animation-delay:${Math.random() * .6}s;animation-duration:${1.7 + Math.random() * 1.4}s`; c.appendChild(s); }
    document.body.appendChild(c); setTimeout(() => c.remove(), 3600);
  },
  burst(card, n = 10) {
    if (!card) return;
    let b = card.querySelector('.burst'); if (!b) { b = document.createElement('div'); b.className = 'burst'; card.appendChild(b); }
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * .5, d = 70 + Math.random() * 90, s = document.createElement('i');
      s.style.setProperty('--dx', Math.cos(a) * d + 'px'); s.style.setProperty('--dy', Math.sin(a) * d - 30 + 'px');
      s.innerHTML = i % 3 === 0 ? Art.icon('gem') : i % 3 === 1 ? Art.icon('xp') : Art.icon('coin');
      b.appendChild(s); setTimeout(() => s.remove(), 1000);
    }
  },
  flash() { const f = document.createElement('div'); f.className = 'flash'; document.body.appendChild(f); setTimeout(() => f.remove(), 700); },
  refreshHud() {
    const c = $('hud-coins'), g = $('hud-gems'); if (c) c.textContent = Engine.bal(this.p, 'coins'); if (g) g.textContent = Engine.bal(this.p, 'gems');
  },

  // ── the cards for things she owns or has just won ───────────────────────
  allyCard(k, form, label) {
    const a = Engine.ALLYBY[k], r = RARITY[a.r];
    return `<div class="card-stage"><div class="acard" id="acard" style="--rc:${r.color}">
      <div class="back">${Art.icon('xp')}</div>
      <div class="front foil"><div class="art">${this.allyHtml(k, form || 1, {})}</div>
        <div class="nm"><span>${esc(label || r.name)} · ${esc(a.el)}</span><b>${esc(a.n)}</b></div></div></div></div>`;
  },
  flipCard() { setTimeout(() => { const el = $('acard'); if (el) el.classList.add('flip'); }, 160); },

  // ── events (level ups, evolutions, crates, achievements) ─────────────────
  // During play they surface as banners; at the end of a round the big ones get a full screen.
  banners(events) {
    for (const e of events) {
      if (e.t === 'ach') { Sfx.play('star'); this.banner('trophy', 'Achievement: ' + e.name, `+${e.reward.gems} gems`); }
      else if (e.t === 'crate') { Sfx.play('coin'); this.banner('key', 'Bronze Crate earned!', 'Open it in the Shop'); }
      else if (e.t === 'evolve') { Sfx.play('evolve'); this.banner('bolt', Engine.ALLYBY[e.k].n + ' evolved!', 'Now in Form ' + e.to); }
      else if (e.t === 'levelup') { Sfx.play('levelup'); this.banner('xp', 'Level ' + e.level + '!', e.title + ' · +' + e.rewards.gems + ' gems'); }
    }
  },
  // Show the headline moments one after another (level up, evolve), then continue.
  showMoments(events, done) {
    const q = [];
    const evo = events.filter(e => e.t === 'evolve'), ups = events.filter(e => e.t === 'levelup');
    if (ups.length) q.push(ups[ups.length - 1]);
    for (const e of evo) q.push(e);
    const next = () => {
      const e = q.shift(); if (!e) return done && done();
      if (e.t === 'levelup') this.levelModal(e, ups, next); else this.evolveModal(e, next);
    };
    next();
  },
  levelModal(e, ups, next) {
    Sfx.play('levelup'); this.confetti(40);
    const gems = ups.reduce((s, x) => s + x.rewards.gems, 0), coins = ups.reduce((s, x) => s + x.rewards.coins, 0);
    const crates = ups.filter(x => x.rewards.crate).map(x => x.rewards.crate);
    this.modal(`<div class="rays"><div class="art">${this.myHero()}</div></div>
      <h1>Level ${e.level}!</h1>
      <div class="tag"><b>${esc(e.title)}</b>${e.newRank ? '<br>You reached a new rank!' : ''}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">
        <span class="pill">${I('gem')}+${gems}</span><span class="pill">${I('coin')}+${coins}</span>${crates.map(c => `<span class="pill">${I('key')}${c} crate</span>`).join('')}</div>
      <button class="btn go big" onclick="App.closeModal()">Awesome!</button>`, { onclose: next });
  },
  evolveModal(e, next) {
    Sfx.play('evolve'); this.confetti(50); this.flash();
    const a = Engine.ALLYBY[e.k];
    this.modal(`${this.allyCard(e.k, e.to, 'Form ' + e.to)}
      <h1>${esc(a.n)} evolved!</h1><div class="tag">Form ${e.from} → Form ${e.to}. Keep spelling to grow stronger.</div>
      <button class="btn go big" onclick="App.closeModal()">Nice!</button>`, { onclose: next });
    this.flipCard();
  },

  // ── keyboard (physical) routing ──────────────────────────────────────────
  onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (document.activeElement && document.activeElement.tagName === 'INPUT') return;
    if (this.keyHandler && !this._modalOpen) {
      if (/^[a-zA-Z]$/.test(e.key)) { e.preventDefault(); this.keyHandler(e.key.toLowerCase()); }
      else if (e.key === 'Backspace') { e.preventDefault(); this.keyHandler('del'); }
      else if (e.key === 'Enter') { e.preventDefault(); this.keyHandler('enter'); }
    }
  },

  // ── updates: version.json tells a stale page to reload itself once ───────
  async checkForUpdate() {
    try {
      const meta = document.querySelector('meta[name="build"]'); const mine = meta && meta.content;
      const r = await fetch('version.json?_=' + Date.now(), { cache: 'no-store' });
      const v = await r.json();
      if (mine && v.build && v.build !== mine && !sessionStorage.getItem('sq-reloaded:' + v.build)) {
        sessionStorage.setItem('sq-reloaded:' + v.build, '1');
        if (!this.round) location.reload();
      }
    } catch (e) { /* offline is fine */ }
  },
};
window.addEventListener('DOMContentLoaded', () => App.init());
