// Spell Quest — crates, shop, squad, me, achievements, word vault, players, cloud.

const ACH_ICON = (id) => /^right/.test(id) ? 'book' : /^streak/.test(id) ? 'flame' : /^combo/.test(id) ? 'bolt' : /^mast/.test(id) ? 'book' : /^boss/.test(id) ? 'sword' :
  /^perfect|^nh/.test(id) ? 'check' : /^allies|^evolve/.test(id) ? 'shield' : /^speed/.test(id) ? 'bolt' : /^level/.test(id) ? 'xp' : /^crates/.test(id) ? 'key' : /^world/.test(id) ? 'trophy' : 'gem';

Object.assign(App, {
  // ── crates ───────────────────────────────────────────────────────────────
  crates(tier) {
    const p = this.p, have = (t) => Engine.bal(p, t);
    const order = ['bronze', 'silver', 'gold'];
    tier = tier || order.find(t => have(t) > 0) || 'bronze';
    this._crate = tier;
    this.render(`<div class="screen center">
      <div class="topbar" style="width:100%"><button class="btn ghost small" onclick="App.go('home')">‹ Home</button><span class="ttl">Crates</span><span class="pill">${I('gem')}${Engine.bal(p, 'gems')}</span></div>
      <div class="seg-tabs" style="width:100%">${order.map(t => `<button class="${t === tier ? 'on' : ''}" onclick="App.crates('${t}')">${CRATES[t].n.split(' ')[0]} (${have(t)})</button>`).join('')}</div>
      <div class="cratebox idle" id="cratebox" onclick="App.openCrateUi()">${Art.crate(tier)}</div>
      <h1>${CRATES[tier].n}</h1><p class="tag">${CRATES[tier].blurb}</p>
      <div id="loot"></div>
      <div id="cbtns">${have(tier) > 0 ? `<button class="btn go big" onclick="App.openCrateUi()">${I('key')} Open it!</button>` : `<p class="tag">You have no ${tier} crates. Earn them by spelling, bosses and daily quests, or buy one in the Shop.</p><button class="btn mint big" onclick="App.shop('crates')">Go to the Shop</button>`}</div>
    </div>${this.tabbar('shop')}`, { view: 'crates' });
  },
  async openCrateUi() {
    const tier = this._crate, p = this.p; if (this._opening || Engine.bal(p, tier) < 1) return;
    this._opening = true; Voice.unlock();
    const box = $('cratebox'), btns = $('cbtns'); if (btns) btns.innerHTML = '';
    box.classList.remove('idle'); box.classList.add('shaking'); Sfx.play('shake');
    await sleep(750);
    const items = Engine.openCrate(p, tier); this.save();
    box.classList.remove('shaking'); box.classList.add('open'); Sfx.play('open'); this.flash();
    const hasBig = items.some(i => i.t === 'ally' && ['E', 'L'].includes(Engine.ALLYBY[i.k].r));
    if (hasBig) { this.confetti(60); setTimeout(() => Sfx.play('levelup', .6), 300); }
    await sleep(350);
    const loot = $('loot'); if (!loot) { this._opening = false; return; }
    loot.innerHTML = `<div class="loot">${items.map((it, i) => this.lootCard(it, i)).join('')}</div>`;
    items.forEach((_, i) => setTimeout(() => Sfx.play(i === 0 ? 'star' : 'coin', .5), 200 + i * 220));
    await sleep(300 + items.length * 220);
    this._opening = false;
    const b = $('cbtns'); if (!b) return;
    b.innerHTML = `${Engine.bal(p, tier) > 0 ? `<button class="btn go big" onclick="App.crates('${tier}')">Open another (${Engine.bal(p, tier)})</button>` : ''}
      ${items.some(i => i.t === 'ally' && !i.dup) ? `<button class="btn violet big" onclick="App.squad('allies')">See my squad</button>` : ''}
      <button class="btn ghost" onclick="App.go('home')">Done</button>`;
  },
  lootCard(it, i) {
    const d = `style="animation-delay:${i * .22}s;`;
    if (it.t === 'ally') {
      const a = Engine.ALLYBY[it.k], r = RARITY[a.r];
      return `<div class="lootcard" ${d}--rc:${r.color}"><div class="art">${this.allyHtml(it.k, 1, {})}</div><b>${esc(a.n)}</b><span class="rar" style="--rc:${r.color}">${r.name}</span>
        ${it.dup ? `<small>Duplicate: +${it.bond} bond, +${it.coins} coins</small>` : '<span class="new">NEW!</span>'}</div>`;
    }
    if (it.t === 'gear') { const g = Engine.GEARBY[it.id]; return `<div class="lootcard" ${d}--rc:#4aa8ff"><div class="art">${this.allyHtml(this.p.ally, 1, { [g.slot]: g.id })}</div><b>${esc(g.n)}</b><span class="new">NEW GEAR</span></div>`; }
    if (it.t === 'hero') { const h = Engine.HEROBY[it.k]; return `<div class="lootcard" ${d}--rc:#b66bff"><div class="art">${this.heroHtml(h.k, h.skin)}</div><b>${esc(h.n)}</b><small>${esc(h.cls)}</small><span class="new">NEW HERO</span></div>`; }
    const ic = it.t === 'gems' ? 'gem' : it.t === 'hint' ? 'hint' : 'coin';
    return `<div class="lootcard" ${d}--rc:#ffc83d"><div class="art" style="width:60px;height:60px">${Art.icon(ic)}</div><b>+${it.n} ${it.t === 'hint' ? 'hint' + (it.n > 1 ? 's' : '') : it.t}</b></div>`;
  },

  // ── shop ─────────────────────────────────────────────────────────────────
  shop(tab) {
    const p = this.p; tab = tab || this._shopTab || 'crates'; this._shopTab = tab;
    const tabs = [['crates', 'Crates'], ['gear', 'Gear'], ['themes', 'Themes'], ['heroes', 'Heroes'], ['boosts', 'Boosts']];
    const price = (c, g) => `<span class="price">${c ? I('coin') + c : I('gem') + g}</span>`;
    const afford = (c, g) => c ? Engine.bal(p, 'coins') >= c : Engine.bal(p, 'gems') >= g;
    let body = '';
    if (tab === 'crates') body = `<div class="shopgrid">${['bronze', 'silver', 'gold'].map(t => `<div class="item"><div class="art">${Art.crate(t)}</div><b>${CRATES[t].n}</b><small>${CRATES[t].blurb}</small><small>You have ${Engine.bal(p, t)}</small>
      <button class="btn ${afford(CRATES[t].coin, CRATES[t].gem) ? 'go' : 'ghost'} small" onclick="App.buy('crate','${t}')">${price(CRATES[t].coin, CRATES[t].gem)}</button></div>`).join('')}
      <div class="item"><div class="art">${Art.icon('key')}</div><b>Your crates</b><small>${['bronze', 'silver', 'gold'].map(t => Engine.bal(p, t) + ' ' + t).join(' · ')}</small><button class="btn mint small" onclick="App.crates()">Open</button></div></div>`;
    else if (tab === 'gear') body = `<div class="shopgrid">${GEAR.map(g => { const own = p.gearOwned.includes(g.id); return `<div class="item"><div class="art">${this.allyHtml(p.ally, 1, { [g.slot]: g.id })}</div><b>${esc(g.n)}</b><small>${g.slot === 'hat' ? 'Hat' : g.slot === 'eyes' ? 'Eyewear' : 'Back'} for any ally</small>
      ${own ? `<button class="btn ghost small" onclick="App.squad('allies')">Owned · equip</button>` : `<button class="btn ${afford(g.price) ? 'go' : 'ghost'} small" onclick="App.buy('gear','${g.id}')">${price(g.price)}</button>`}</div>`; }).join('')}</div>`;
    else if (tab === 'themes') body = `<div class="shopgrid">${THEMES.map(t => { const own = p.themesOwned.includes(t.id), on = p.theme === t.id; return `<div class="item"><div class="sw" style="background:linear-gradient(135deg,${t.sw[0]},${t.sw[1]})"></div><b>${esc(t.n)}</b>
      ${own ? `<button class="btn ${on ? 'mint' : 'ghost'} small" onclick="App.useTheme('${t.id}')">${on ? 'In use' : 'Use'}</button>` : `<button class="btn ${afford(t.price) ? 'go' : 'ghost'} small" onclick="App.buy('theme','${t.id}')">${price(t.price)}</button>`}</div>`; }).join('')}</div>`;
    else if (tab === 'heroes') body = `<div class="shopgrid">${Art.HEROES.filter(h => !p.heroes.includes(h.k)).map(h => `<div class="item"><div class="art">${this.heroHtml(h.k, h.skin)}</div><b>${esc(h.n)}</b><small>${esc(h.cls)}</small>
      <button class="btn ${afford(HERO_PRICE) ? 'go' : 'ghost'} small" onclick="App.buy('hero','${h.k}')">${price(HERO_PRICE)}</button></div>`).join('') || '<p class="tag">You have every hero!</p>'}</div>`;
    else body = `<div class="shopgrid"><div class="item"><div class="art">${Art.icon('hint')}</div><b>${HINT_PACK.n}</b><small>You have ${Engine.bal(p, 'hint')}</small><button class="btn ${afford(HINT_PACK.coin) ? 'go' : 'ghost'} small" onclick="App.buy('hint')">${price(HINT_PACK.coin)}</button></div>
      <div class="item"><div class="art">${Art.icon('shield')}</div><b>${SHIELD.n}</b><small>Saves your streak if you miss a day. You have ${Engine.bal(p, 'shield')}.</small><button class="btn ${afford(SHIELD.coin) ? 'go' : 'ghost'} small" onclick="App.buy('shield')">${price(SHIELD.coin)}</button></div></div>`;
    this.render(`<div class="screen">
      <div class="topbar"><h2>Shop</h2><div class="pills"><span class="pill">${I('coin')}${Engine.bal(p, 'coins')}</span><span class="pill">${I('gem')}${Engine.bal(p, 'gems')}</span></div></div>
      <div class="seg-tabs">${tabs.map(([k, n]) => `<button class="${k === tab ? 'on' : ''}" onclick="App.shop('${k}')">${n}</button>`).join('')}</div>
      ${body}<p class="small-note">Earn coins and gems by spelling, beating bosses, quests and achievements.</p></div>${this.tabbar('shop')}`, { view: 'shop' });
  },
  buy(what, id) {
    const ok = Engine.buy(this.p, what, id);
    if (!ok) { Sfx.play('wrong', .4); this.toast('Not enough ' + (what === 'crate' && id !== 'bronze' ? 'gems' : 'coins'), '#ffd95e'); return; }
    this.save(); Sfx.play('coin');
    if (what === 'crate') { this.crates(id); this.toast('Crate added!', '#7df5e8'); return; }
    this.confetti(14); this.shop(); this.toast('Got it!', '#7df5e8');
  },
  useTheme(id) { if (!this.p.themesOwned.includes(id)) return; this.p.theme = id; this.applyTheme(); this.save(); Sfx.play('unlock', .5); this.shop('themes'); },

  // ── squad ────────────────────────────────────────────────────────────────
  squad(tab) {
    const p = this.p; tab = tab || this._squadTab || 'allies'; this._squadTab = tab;
    const owned = Object.keys(p.allies).length;
    let body = '';
    if (tab === 'allies') body = `<div class="cgrid">${ALLIES.slice().sort((a, b) => 'LECR'.indexOf(a.r) < 0 ? 0 : 0).map(a => {
      const has = !!p.allies[a.k], r = RARITY[a.r], f = has ? Engine.formFromBond(p.allies[a.k].bond) : 1;
      return `<button class="cell ${has ? '' : 'locked'} ${p.ally === a.k ? 'cur' : ''}" style="--rc:${r.color}" onclick="App.${has ? `allyDetail('${a.k}')` : "toast('Find me in a crate!', '#ffd95e')"}">
        ${p.ally === a.k ? '<span class="tagc">PARTNER</span>' : ''}<span class="art">${this.allyHtml(a.k, f, has ? Engine.gearFor(p, a.k) : {})}</span><span class="cn">${has ? esc(a.n) : '???'}</span><span class="rar" style="--rc:${r.color};font-size:.55rem">${r.name}</span></button>`; }).join('')}</div>`;
    else body = `<div class="cgrid">${Art.HEROES.map(h => { const has = p.heroes.includes(h.k); return `<button class="cell ${has ? '' : 'locked'} ${p.hero === h.k ? 'cur' : ''}" onclick="App.${has ? `pickHero('${h.k}')` : "toast('Find me in a crate or the shop!', '#ffd95e')"}">
        <span class="art">${this.heroHtml(h.k, p.hero === h.k ? p.skin : h.skin)}</span><span class="cn">${has ? esc(h.n) : '???'}</span><span class="small-note" style="font-size:.6rem">${has ? esc(h.cls) : 'locked'}</span></button>`; }).join('')}</div>
      <div class="card"><h3>Skin tone</h3><div class="skins">${Art.SKIN.map((c, i) => `<button class="${p.skin === i ? 'on' : ''}" style="background:${c}" onclick="App.setSkin(${i})" aria-label="skin ${i + 1}"></button>`).join('')}</div></div>`;
    this.render(`<div class="screen">
      ${this.hud()}
      <div class="topbar"><h2>Squad</h2><span class="small-note">${owned}/${ALLIES.length} allies · ${p.heroes.length}/${Art.HEROES.length} heroes</span></div>
      <div class="seg-tabs"><button class="${tab === 'allies' ? 'on' : ''}" onclick="App.squad('allies')">Allies</button><button class="${tab === 'heroes' ? 'on' : ''}" onclick="App.squad('heroes')">Heroes</button></div>
      ${body}</div>${this.tabbar('squad')}`, { view: 'squad' });
  },
  pickHero(k) { this.p.hero = k; this.save(); Sfx.play('tap'); this.squad('heroes'); },
  setSkin(i) { this.p.skin = i; this.save(); Sfx.play('tap'); this.squad('heroes'); },

  allyDetail(k, form) {
    const p = this.p, a = Engine.ALLYBY[k], st = p.allies[k]; if (!st) return this.squad('allies');
    const cur = Engine.formFromBond(st.bond), show = form || cur, r = RARITY[a.r], gear = Engine.gearFor(p, k);
    const nextAt = cur >= 3 ? null : FORM_AT[cur], prevAt = FORM_AT[cur - 1];
    const pct = nextAt == null ? 100 : Math.round((st.bond - prevAt) / (nextAt - prevAt) * 100);
    const slot = (name, key) => { const have = GEAR.filter(g => g.slot === key && p.gearOwned.includes(g.id)); return `<div class="card"><h3>${name}</h3><div class="gearrow">
      <button class="gchip ${!gear[key] ? 'on' : ''}" onclick="App.equip('${k}','${key}',null)">None</button>${have.map(g => `<button class="gchip ${gear[key] === g.id ? 'on' : ''}" onclick="App.equip('${k}','${key}','${g.id}')">${esc(g.n)}</button>`).join('')}
      ${have.length ? '' : '<span class="small-note">Find gear in crates or the Shop</span>'}</div></div>`; };
    this.render(`<div class="screen center">
      <div class="topbar" style="width:100%"><button class="btn ghost small" onclick="App.squad('allies')">‹ Squad</button><span class="ttl">${esc(a.n)}</span><span class="rar" style="--rc:${r.color}">${r.name}</span></div>
      <div class="big-art">${this.allyHtml(k, show, gear)}</div>
      <div class="formrow">${[1, 2, 3].map(f => `<button class="${f === show ? 'on' : ''} ${f > cur ? 'lock' : ''}" onclick="App.allyDetail('${k}', ${f > cur ? cur : f})">${this.allyHtml(k, f, {})}Form ${f}</button>`).join('')}</div>
      <p class="tag">“${esc(a.say)}”<br><span class="small-note">${esc(a.el)} · ${esc(a.t)}</span></p>
      <div class="card" style="width:100%"><div class="row sp"><b>Bond</b><span class="small-note">${nextAt == null ? 'Max form reached!' : `${st.bond} / ${nextAt} to Form ${cur + 1}`}</span></div><div class="meter"><i style="width:${pct}%"></i></div>
        <p class="small-note" style="text-align:left;margin-top:6px">Spell words with this ally as your partner to grow your bond and evolve it.</p></div>
      ${p.ally === k ? `<div class="pill">${I('check')} Your partner</div>` : `<button class="btn go big" onclick="App.setPartner('${k}')">Make partner</button>`}
      <div style="width:100%;display:grid;gap:10px">${slot('Hat', 'hat')}${slot('Eyewear', 'eyes')}${slot('Back', 'back')}</div>
    </div>${this.tabbar('squad')}`, { view: 'ally' });
  },
  setPartner(k) { this.p.ally = k; this.save(); Sfx.play('unlock', .6); this.allyDetail(k); },
  equip(k, slot, id) {
    const e = this.p.equip[k] || (this.p.equip[k] = {});
    if (id == null) e[slot] = null; else Engine.equipGear(this.p, k, id);
    this.save(); Sfx.play('tap'); this.allyDetail(k);
  },

  // ── me ───────────────────────────────────────────────────────────────────
  me() {
    const p = this.p, s = p.stats, acc = s.right + s.wrong ? Math.round(s.right / (s.right + s.wrong) * 100) : 0;
    const done = Object.keys(p.ach).length;
    this.render(`<div class="screen">
      ${this.hud()}
      <div class="statgrid"><div class="stat"><b>${Engine.masteredCount(p)}</b><span>words mastered</span></div><div class="stat"><b>${s.right}</b><span>spelled right</span></div><div class="stat"><b>${acc}%</b><span>accuracy</span></div>
        <div class="stat"><b>${p.streak.n}</b><span>day streak</span></div><div class="stat"><b>${s.comboBest}</b><span>best combo</span></div><div class="stat"><b>${s.speedBest}</b><span>speed best</span></div></div>
      <div class="card"><h3>World progress</h3>${WORLDS.map(w => { const pr = Engine.worldProgress(p, w.n); return `<div style="margin:7px 0"><div class="row sp"><span class="small-note" style="color:var(--ink)">${w.n}. ${esc(w.name)}</span><span class="small-note">${pr.mastered} mastered · ${pr.known} known / ${pr.total}</span></div>
        <div class="sheet-bar"><i class="k" style="width:${pr.total ? Math.round(pr.known / pr.total * 100) : 0}%"></i><i class="m" style="width:${pr.total ? Math.round(pr.mastered / pr.total * 100) : 0}%"></i></div></div>`; }).join('')}</div>
      <div class="grid2"><button class="btn violet" onclick="App.achievements()">${I('trophy')} Achievements ${done}/${Engine.ACH.length}</button><button class="btn blue" onclick="App.vault()">${I('book')} Word Vault</button></div>
      <div class="card"><h3>Settings</h3>
        <div class="row sp" style="padding:6px 0"><span>Sound</span><button class="btn ${p.settings.sound ? 'mint' : 'ghost'} small" onclick="App.toggle('sound')">${p.settings.sound ? 'On' : 'Off'}</button></div>
        <div class="row sp" style="padding:6px 0"><span>Say each word automatically</span><button class="btn ${p.settings.autoplay ? 'mint' : 'ghost'} small" onclick="App.toggle('autoplay')">${p.settings.autoplay ? 'On' : 'Off'}</button></div>
        <div class="row sp" style="padding:6px 0"><span>Play offline<br><span class="small-note" id="dl-txt" style="text-align:left;display:block">Save every word and sentence (about 22 MB)</span></span><button class="btn ghost small" id="dl-btn" onclick="App.downloadAudio()">Download</button></div>
        <div class="row sp" style="padding:6px 0"><span>Theme</span><button class="btn ghost small" onclick="App.shop('themes')">${esc(THEMEBYID(p.theme))}</button></div></div>
      <div class="card"><h3>Players and saving</h3><div class="row sp"><span>${esc(this.profile.name)}${this.profile.cloud ? ' · saved online' : ''}</span><button class="btn ghost small" onclick="App.players()">Switch player</button></div>
        ${this.profile.cloud ? `<p class="small-note" style="text-align:left;margin-top:6px">Your progress is backed up to your account and follows you to any device.</p>` : `<button class="btn mint big" style="margin-top:10px" onclick="App.cloudScreen()">Save my progress online</button><p class="small-note" style="margin-top:6px">Sign in with the same name and PIN you use in Wonder Lab.</p>`}</div>
    </div>${this.tabbar('me')}`, { view: 'me' });
  },
  // Recordings are cached as they are played; this fetches the rest so the game works with no wifi.
  async downloadAudio() {
    if (this._dl) return; this._dl = true; Voice.unlock();
    const urls = []; for (const w of WORDS) urls.push(Voice.url('w', w.i), Voice.url('s', w.i));
    const total = urls.length; let done = 0, fail = 0; const btn = $('dl-btn');
    if (btn) btn.disabled = true;
    const say = (t) => { const e = $('dl-txt'); if (e) e.textContent = t; };
    const worker = async () => { while (urls.length) { const u = urls.pop(); try { const r = await fetch(u); if (!r.ok) fail++; else await r.arrayBuffer(); } catch (e) { fail++; } done++; if (done % 25 === 0) say(`Saving… ${done} of ${total}`); } };
    await Promise.all([worker(), worker(), worker(), worker()]);
    this._dl = false; if (btn) btn.disabled = false;
    say(fail ? `Saved ${total - fail} of ${total}. Check your wifi and try again.` : 'All saved. The game works offline now.');
    Sfx.play(fail ? 'wrong' : 'star', .5);
  },
  toggle(k) { this.p.settings[k] = !this.p.settings[k]; this.save(); if (k === 'sound' && this.p.settings.sound) Sfx.play('tap'); this.me(); },

  achievements() {
    const p = this.p, done = Engine.ACH.filter(a => p.ach[a.id] != null).length;
    this.render(`<div class="screen">
      <div class="topbar"><button class="btn ghost small" onclick="App.me()">‹ Me</button><span class="ttl">Achievements ${done}/${Engine.ACH.length}</span><span></span></div>
      <div class="ach">${Engine.ACH.slice().sort((a, b) => (p.ach[b.id] != null) - (p.ach[a.id] != null)).map(a => `<div class="achc ${p.ach[a.id] != null ? '' : 'locked'}">${I(ACH_ICON(a.id))}<div><b>${esc(a.name)}</b><span>${esc(a.desc)}${p.ach[a.id] == null ? ' · ' + a.reward.gems + ' gems' : ''}</span></div></div>`).join('')}</div></div>${this.tabbar('me')}`, { view: 'ach' });
  },
  vault(n) {
    const p = this.p; n = n || this._vaultW || Engine.focusWorld(p); this._vaultW = n;
    const ws = Engine.BYWORLD[n] || [];
    const cls = (w) => { const r = p.words[w.i]; return Engine.isMastered(r) ? 'm' : r && r.w > 0 && r.b <= 2 ? 't' : Engine.isKnown(r) ? 'k' : ''; };
    const cnt = (c) => ws.filter(w => cls(w) === c).length;
    this.render(`<div class="screen">
      <div class="topbar"><button class="btn ghost small" onclick="App.me()">‹ Me</button><span class="ttl">Word Vault</span><span></span></div>
      <div class="seg-tabs" style="overflow-x:auto">${WORLDS.map(w => `<button class="${w.n === n ? 'on' : ''}" style="flex:none;padding:9px 13px" onclick="App.vault(${w.n})">${w.n}</button>`).join('')}</div>
      <h2>${esc(WORLDS[n - 1].name)}</h2>
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip m">${cnt('m')} mastered</span><span class="chip k">${cnt('k')} known</span><span class="chip t">${cnt('t')} tricky</span><span class="chip">${ws.length - cnt('m') - cnt('k') - cnt('t')} to learn</span></div>
      <div class="chips">${ws.map(w => { const c = cls(w), seen = Engine.isSeen(p.words[w.i]); return `<span class="chip ${c}" style="${seen ? '' : 'opacity:.45'}" onclick="Voice.unlock();Voice.word('${w.i}')">${seen ? w.i : '•'.repeat(Math.min(8, w.i.length))}</span>`; }).join('')}</div>
      <p class="small-note">Tap a word you have seen to hear it. Unseen words stay hidden until you meet them.</p></div>${this.tabbar('me')}`, { view: 'vault' });
  },

  // ── players ──────────────────────────────────────────────────────────────
  players() {
    const list = this.profileList();
    this.render(`<div class="screen">
      <div class="topbar"><button class="btn ghost small" onclick="App.me()">‹ Me</button><span class="ttl">Who's playing?</span><span></span></div>
      <div class="cgrid">${list.map(pr => `<button class="cell ${pr.id === this.root.activeId ? 'cur' : ''}" onclick="App.switchPlayer('${pr.id}')"><span class="art" style="width:70%">${this.heroHtml(pr.p.hero, pr.p.skin)}</span><span class="cn">${esc(pr.name)}</span><span class="small-note" style="font-size:.62rem">Lv ${levelFromXp(pr.p.xp)}${pr.cloud ? ' · ☁' : ''}</span></button>`).join('')}</div>
      <button class="btn go big" onclick="App.welcome()">Add a player</button>
      <button class="btn ghost" onclick="App.renameScreen()">Rename ${esc(this.profile.name)}</button>
      <p class="small-note">Each player has their own progress, coins and squad.</p></div>${this.tabbar('me')}`, { view: 'players' });
  },
  switchPlayer(id) { if (id === this.root.activeId) return this.home(); Sync.signOut(); this.use(id); Sfx.play('unlock', .5); this.home(); },
  renameScreen() {
    this.render(`<div class="screen center"><h1>What's your name?</h1><input type="text" id="rn" maxlength="14" value="${esc(this.profile.name)}" autocomplete="off" spellcheck="false">
      <button class="btn go big" onclick="App.doRename()">Save</button><button class="btn ghost small" onclick="App.players()">Never mind</button></div>`);
  },
  doRename() { const v = (($('rn') || {}).value || '').trim(); if (!v) return; this.profile.name = v; this.save(); Sfx.play('tap'); this.players(); },

  // ── the cloud ────────────────────────────────────────────────────────────
  cloudScreen(msg) {
    this._pin = '';
    const pre = this.profile ? this.profile.name : '';
    this.render(`<div class="screen center">
      <div class="topbar" style="width:100%"><button class="btn ghost small" onclick="App.${this.profile ? 'me' : 'welcome'}()">‹ Back</button><span class="ttl">Sign in</span><span></span></div>
      <h1>Your account</h1><p class="tag">Use the same name and four-number PIN as Wonder Lab. Your progress is saved online and follows you to any device.</p>
      <input type="text" id="cl-name" maxlength="14" placeholder="Your name" value="${esc(pre)}" autocomplete="off" spellcheck="false">
      <div class="pinrow" id="pinrow">${[0, 1, 2, 3].map(i => `<div class="pinslot" id="ps${i}"></div>`).join('')}</div>
      <div class="pinpad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(d => `<button class="pinkey" onclick="App.pinTap(${d})">${d}</button>`).join('')}</div>
      <div class="feed bad" id="cl-msg">${esc(msg || '')}</div>
      <button class="btn go big" id="cl-go" onclick="App.cloudGo()">Sign in</button>
      <button class="btn ghost small" onclick="App.pinDel()">⌫ Delete</button></div>`);
  },
  pinTap(d) { if (this._pin.length >= 4) return; this._pin += d; Sfx.play('key', .4); this.pinDraw(); },
  pinDel() { this._pin = this._pin.slice(0, -1); this.pinDraw(); },
  pinDraw() { for (let i = 0; i < 4; i++) { const s = $('ps' + i); if (s) s.textContent = i < this._pin.length ? '●' : ''; } },
  async cloudGo() {
    const name = (($('cl-name') || {}).value || '').trim(), msg = $('cl-msg'), btn = $('cl-go');
    if (!name) { msg.textContent = 'Type your name first.'; return; }
    if (this._pin.length !== 4) { msg.textContent = 'Tap four numbers for your PIN.'; return; }
    btn.disabled = true; msg.className = 'feed soft'; msg.textContent = 'Signing in…';
    // A profile for this sign-in: the current one, or a brand new one when there is none yet.
    let prof = this.profile;
    if (!prof) { prof = Store.newProfile(name, 'kai', 1); this.root.profiles[prof.id] = prof; this.root.activeId = prof.id; }
    try {
      const uid = await Sync.signIn(name, this._pin);
      const remote = await Sync.pull();
      if (this.profile && this.profile !== prof) { Sync.signOut(); return; }     // she switched player while we waited: touch nothing
      if (remote && remote.progress) prof.p = Engine.merge(prof.p, remote.progress);
      prof.cloud = true; prof.uid = uid; if (!this.profile) { prof.name = (remote && remote.name) || name; }
      this.profile = prof; this.use(prof.id, true); this.save();
      await Sync.push(prof); this.watchCloud(prof);
      Sfx.play('fanfare', .6); this.confetti(30); this.home(); this.toast('Signed in!', '#7df5e8');
    } catch (e) { btn.disabled = false; msg.className = 'feed bad'; msg.textContent = (e && e.message) || 'Could not sign in.'; Sfx.play('wrong', .4); }
  },
  watchCloud(prof) {
    Sync.watch((d) => {
      if (this.profile !== prof || !d.progress) return;
      prof.p = Engine.merge(prof.p, d.progress); Store.save(this.root);
      if (['home', 'me', 'squad', 'shop', 'worlds'].includes(this.view)) this.go(this.view);
    });
  },
  // On launch: if this profile was signed in before, quietly pick the session up and merge.
  async resumeCloud() {
    const prof = this.profile; if (!prof || !prof.cloud || !prof.uid) return;
    try {
      await Sync.ensureLoaded();
      const u = await Sync.currentUser();
      if (this.profile !== prof || !u || u.uid !== prof.uid) return;      // signed out or a different account: local play only
      Sync.uid = u.uid;
      const remote = await Sync.pull();
      if (this.profile !== prof) return;
      if (remote && remote.progress) { prof.p = Engine.merge(prof.p, remote.progress); Store.save(this.root); }
      await Sync.push(prof); this.watchCloud(prof);
    } catch (e) { /* offline or not configured: the device copy is still right */ }
  },
});
const THEMEBYID = (id) => (Engine.THEMEBY[id] || THEMES[0]).n;
