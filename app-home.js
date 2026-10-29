// Spell Quest — welcome, home hub, world map.

Object.assign(App, {
  // ── first run ────────────────────────────────────────────────────────────
  welcome(pre) {
    const start = pre || { hero: 'kai', skin: 1 };
    this._new = { hero: start.hero, skin: start.skin };
    const free = ['kai', 'mira', 'dax', 'zoe'];
    this.render(`<div class="screen center">
      <div class="stage"><div class="glow"></div><div class="pet" style="width:150px">${this.allyHtml('cinder', 3, {})}</div></div>
      <h1>Spell Quest</h1>
      <p class="tag">Spell your way through eight worlds, beat the bosses, and build the ultimate squad.</p>
      <input type="text" id="np-name" maxlength="14" placeholder="Your name" autocomplete="off" autocapitalize="words" spellcheck="false">
      <p class="tag" style="margin-top:2px">Pick your hero</p>
      <div class="heropick" id="np-heroes">${Art.HEROES.map(h => `
        <button class="hp ${h.k === this._new.hero ? 'on' : ''} ${free.includes(h.k) ? '' : 'locked'}" onclick="App.pickNewHero('${h.k}')">${this.heroHtml(h.k, this._new.skin)}${esc(h.n)}</button>`).join('')}</div>
      <div class="skins" id="np-skins">${Art.SKIN.map((c, i) => `<button class="${i === this._new.skin ? 'on' : ''}" style="background:${c}" onclick="App.pickNewSkin(${i})" aria-label="skin ${i + 1}"></button>`).join('')}</div>
      <button class="btn go big" onclick="App.createPlayer()">Start your quest</button>
      <button class="btn ghost small" onclick="App.cloudScreen()">I already have an account</button>
      <p class="small-note">Other heroes are found in crates as you play.</p>
    </div>`);
  },
  pickNewHero(k) {
    if (!['kai', 'mira', 'dax', 'zoe'].includes(k)) { this.toast('Find me in a crate!', '#ffd95e'); return; }
    const n = ($('np-name') || {}).value; this._new.hero = k; Sfx.play('tap'); this.welcome(this._new); const i = $('np-name'); if (i) i.value = n || '';
  },
  pickNewSkin(i) { const n = ($('np-name') || {}).value; this._new.skin = i; Sfx.play('tap'); this.welcome(this._new); const e = $('np-name'); if (e) e.value = n || ''; },
  createPlayer() {
    const name = (($('np-name') || {}).value || '').trim();
    if (!name) { const i = $('np-name'); if (i) { i.classList.add('shakeall'); i.focus(); setTimeout(() => i.classList.remove('shakeall'), 500); } return; }
    const prof = Store.newProfile(name, this._new.hero, this._new.skin);
    this.root.profiles[prof.id] = prof; this.root.activeId = prof.id;
    this.use(prof.id, true); Sfx.play('unlock');
    this.home(); this.offerPlacement();
  },
  offerPlacement() {
    this.modal(`<div class="rays"><div class="art">${this.partnerHtml(1)}</div></div>
      <h1>Find your level</h1>
      <div class="tag">Take the Challenge Test: ${14} words, about three minutes. It starts you in the right world, and you earn a gem bonus.</div>
      <button class="btn go big" onclick="App.closeModal(true);App.play('placement')">Take the test</button>
      <button class="btn ghost" onclick="App.closeModal()">Start at World 1</button>`);
  },

  // ── home ─────────────────────────────────────────────────────────────────
  bossTarget() { const f = Engine.focusWorld(this.p); return f; },
  home() {
    const p = this.p, day = Engine.dayNum(), fw = Engine.focusWorld(p), W = WORLDS[fw - 1];
    const bw = this.bossTarget(), BW = WORLDS[bw - 1], bp = Engine.worldProgress(p, bw), beaten = !!p.bosses[bw];
    const need = Math.max(0, Math.ceil(BOSS_READY * bp.total) - bp.known);
    const bossReady = bp.ready || beaten;
    const tricky = Engine.trickyWords(p).length;
    const crates = ['bronze', 'silver', 'gold'].map(t => [t, Engine.bal(p, t)]).filter(x => x[1] > 0);
    const q = Engine.questState(p, day);
    const speech = this.speech();
    this.render(`<div class="screen">
      ${this.hud()}
      ${Engine.calendarReady(p, day) ? `<button class="btn go big pulse" style="max-width:none" onclick="App.claimDaily()">${I('gem')} Daily reward ready! Tap to claim</button>` : ''}
      <div class="stage"><div class="glow"></div>
        <div class="heroface">${this.myHero()}</div>
        <div class="pet" onclick="App.petTap()">${this.partnerHtml()}</div>
        <div class="bubble" id="bubble">${esc(speech)}</div></div>
      ${!p.placed && Object.keys(p.words).length < 3 ? `<button class="btn blue big" style="max-width:none" onclick="App.play('placement')">${I('sword')} Take the Challenge Test</button>` : ''}
      <button class="btn go big pulse" style="max-width:none" onclick="App.play('quest', ${fw})">${I('bolt')} Play · World ${fw}: ${esc(W.name)}</button>
      <div class="grid2">
        <button class="modecard m-daily" onclick="App.play('daily')"><span class="art">${Art.icon(p.dailyDone === day ? 'check' : 'gem')}</span><span class="nm">Daily Challenge</span><span class="sub">${p.dailyDone === day ? 'Done today!' : 'Crate + 3 gems'}</span></button>
        <button class="modecard m-speed" onclick="App.play('speed')"><span class="art">${Art.icon('bolt')}</span><span class="nm">Speed Round</span><span class="sub">60 seconds · best ${p.stats.speedBest}</span></button>
        <button class="modecard m-boss ${bossReady ? '' : 'disabled'}" onclick="App.${bossReady ? `play('boss', ${bw})` : `bossAsleep(${bw}, ${need})`}"><span class="art">${Art.boss(Art.BOSSES[bw - 1].k)}</span><span class="nm">${beaten ? 'Rematch' : 'Boss Battle'}</span><span class="sub">${bossReady ? esc(Art.BOSSES[bw - 1].n) : 'Asleep · know ' + need + ' more'}</span></button>
        <button class="modecard m-rematch ${tricky ? '' : 'disabled'}" onclick="App.${tricky ? "play('rematch')" : "toast('No tricky words yet!', '#ffd95e')"}"><span class="art">${Art.icon('shield')}</span><span class="nm">Tricky Words</span><span class="sub">${tricky ? tricky + ' to fix' : 'None yet'}</span></button>
      </div>
      <div class="card"><div class="row sp"><h3>Daily quests</h3><span class="small-note">resets at midnight</span></div>
        ${q.map((x, i) => `<div class="qrow"><div class="qt">${esc(x.text)}<div class="qbar"><i style="width:${Math.round(x.have / x.need * 100)}%"></i></div></div>
          ${p.quests.list[i].claimed ? I('check') : x.done ? `<button class="btn green small" onclick="App.claimQuest(${i}, this)">Claim</button>` : `<span class="small-note">${x.have}/${x.need}</span>`}</div>`).join('')}</div>
      <div class="card"><div class="row sp"><h3>Crate meter</h3><span class="small-note">${p.crateProg} / ${WORDS_PER_CRATE} words</span></div>
        <div class="meter"><i style="width:${Math.round(p.crateProg / WORDS_PER_CRATE * 100)}%"></i></div>
        ${crates.length ? `<div class="row sp" style="margin-top:10px"><div class="row">${crates.map(([t, n]) => `<span class="pill">${I('key')}${n} ${t}</span>`).join('')}</div><button class="btn mint small" onclick="App.crates()">Open</button></div>` : '<p class="small-note" style="margin-top:6px">Spell 25 words right to earn a Bronze Crate.</p>'}</div>
    </div>${this.tabbar('home')}`, { view: 'home' });
  },
  speech() {
    const p = this.p, a = Engine.ALLYBY[p.ally], r = Math.random();
    const due = Engine.dueWords(p, Engine.dayNum(), 8).length;
    if (r < .3 && due > 3) return `${due} words are ready to review!`;
    if (r < .5 && p.streak.n >= 2) return `${p.streak.n}-day streak. Keep it burning!`;
    return a.say;
  },
  petTap() { Sfx.play('star'); const b = $('bubble'); if (b) b.textContent = Engine.ALLYBY[this.p.ally].say; const pet = document.querySelector('.stage .pet'); if (pet) { pet.style.animation = 'none'; void pet.offsetWidth; pet.style.animation = ''; } },
  bossAsleep(w, need) { Sfx.play('wrong', .3); this.toast(`Know ${need} more words in ${WORLDS[w - 1].name} to wake the boss`, '#ffd95e'); },

  claimDaily() {
    const r = Engine.claimCalendar(this.p); if (!r) return; this.save();
    Sfx.play('unlock'); this.confetti(30);
    const parts = [r.coins ? `<span class="pill">${I('coin')}+${r.coins}</span>` : '', r.gems ? `<span class="pill">${I('gem')}+${r.gems}</span>` : '', r.crate ? `<span class="pill">${I('key')}${r.crate} crate</span>` : ''].join('');
    const n = Math.max(1, this.p.streak.n), cur = (n - 1) % 7;
    this.modal(`<h1>Day ${n} streak!</h1><div class="tag">Come back every day for bigger rewards.</div>
      <div class="cal">${CALENDAR.map((c, i) => `<div class="${i < cur ? 'done' : i === cur ? 'today' : ''}">${I(c.crate ? 'key' : c.gems ? 'gem' : 'coin')}<span>${i + 1}</span></div>`).join('')}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center">${parts}</div>
      <button class="btn go big" onclick="App.closeModal();App.home()">Collect</button>`);
  },
  claimQuest(i, btn) {
    const r = Engine.claimQuest(this.p, i); if (!r) return;
    this.save(); Sfx.play('coin'); this.floatAt(btn, `${I('gem')}+${r.gems}`, '#7df5e8');
    if (r.bonus) { Sfx.play('fanfare'); this.confetti(30); this.banner('key', 'All quests done!', 'Bonus Bronze Crate + gems'); }
    setTimeout(() => this.home(), 500);
  },

  // ── worlds ───────────────────────────────────────────────────────────────
  worlds() {
    const p = this.p, fw = Engine.focusWorld(p);
    const ring = (frac, color) => { const r = 31, c = 2 * Math.PI * r; return `<svg class="ring" viewBox="0 0 70 70"><circle cx="35" cy="35" r="${r}" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="5"/><circle cx="35" cy="35" r="${r}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="${frac > 0 ? 'round' : 'butt'}" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}"/></svg>`; };
    this.render(`<div class="screen">
      ${this.hud()}
      <div class="topbar"><h2>Worlds</h2><span class="small-note">8 worlds · ${WORDS.length} words</span></div>
      ${!p.placed ? `<button class="btn blue" style="width:100%" onclick="App.play('placement')">${I('sword')} Not sure where to start? Take the Challenge Test</button>` : ''}
      <div class="path">${WORLDS.map(w => {
        const open = Engine.unlocked(p, w.n), pr = Engine.worldProgress(p, w.n), beaten = !!p.bosses[w.n];
        return `<button class="wnode ${open ? '' : 'locked'} ${w.n === fw ? 'focus' : ''}" style="--wc:${w.color}" onclick="App.${open ? `worldSheet(${w.n})` : `lockedWorld(${w.n})`}">
          <span class="wico">${ring(pr.total ? pr.mastered / pr.total : 0, '#3ee6a0')}${Art.world(w.n)}</span>
          <span class="winfo"><div class="wn">${w.n}. ${esc(w.name)}</div><div class="wg">${esc(w.grade)} · ${esc(w.blurb)}</div>
            <div class="wp">${open ? `${pr.known}/${pr.total} known · ${pr.mastered} mastered` : 'Locked — beat the boss before it'}</div></span>
          ${beaten ? `<span class="lockmark" style="width:30px">${Art.icon('trophy')}</span>` : !open ? `<span class="lockmark">${Art.icon('lock')}</span>` : ''}</button>`;
      }).join('')}</div></div>${this.tabbar('worlds')}`, { view: 'worlds' });
  },
  lockedWorld(n) { Sfx.play('wrong', .3); this.toast(`Beat ${Art.BOSSES[n - 2].n} to open this world`, '#ffd95e'); },

  worldSheet(n) {
    const p = this.p, w = WORLDS[n - 1], pr = Engine.worldProgress(p, n), B = Art.BOSSES[n - 1], beaten = !!p.bosses[n];
    const need = Math.max(0, Math.ceil(BOSS_READY * pr.total) - pr.known), ready = pr.ready || beaten;
    const pct = (x) => pr.total ? Math.round(x / pr.total * 100) : 0;
    this.render(`<div class="screen center">
      <div class="topbar" style="width:100%"><button class="btn ghost small" onclick="App.worlds()">‹ Worlds</button><span class="ttl">World ${n}</span><span></span></div>
      <div class="wico" style="--wc:${w.color};width:104px;height:104px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,${w.color} 70%,#fff),${w.color});box-shadow:0 6px 0 rgba(0,0,0,.25),inset 0 0 0 4px rgba(255,255,255,.35)"><span style="width:66%;display:block">${Art.world(n)}</span></div>
      <h1>${esc(w.name)}</h1><p class="tag">${esc(w.grade)} · ${esc(w.blurb)}</p>
      <div class="card" style="width:100%;text-align:left">
        <div class="row sp"><b>Words you know</b><span class="small-note">${pr.known} / ${pr.total}</span></div><div class="sheet-bar"><i class="k" style="width:${pct(pr.known)}%"></i></div>
        <div class="row sp" style="margin-top:10px"><b>Mastered</b><span class="small-note">${pr.mastered} / ${pr.total}</span></div><div class="sheet-bar"><i class="m" style="width:${pct(pr.mastered)}%"></i></div>
        <p class="small-note" style="text-align:left;margin-top:8px">Mastered = typed from memory on two different days.</p></div>
      <button class="btn go big" onclick="App.play('quest', ${n})">${I('bolt')} Quest Round</button>
      <div class="card" style="width:100%"><div class="row" style="gap:12px"><div style="width:96px;flex:none;${ready ? '' : 'filter:grayscale(1) brightness(.6)'}">${Art.boss(B.k)}</div>
        <div style="text-align:left;flex:1"><b>${esc(B.n)}</b><div class="small-note" style="text-align:left">${esc(B.sub)}</div>
        <div class="small-note" style="text-align:left;margin-top:4px">${beaten ? 'Defeated ' + p.bosses[n] + '×' : ready ? 'Awake and waiting!' : 'Asleep. Know ' + need + ' more words.'}</div></div></div>
        <button class="btn ${ready ? 'red' : 'ghost'} big" style="margin-top:10px;width:100%;max-width:none" onclick="App.${ready ? `play('boss', ${n})` : `bossAsleep(${n}, ${need})`}">${I('sword')} ${beaten ? 'Fight again' : 'Boss Battle'}</button></div>
    </div>${this.tabbar('worlds')}`, { view: 'world' });
  },
});
