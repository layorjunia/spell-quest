// Spell Quest — playing: rounds, the four challenge types, the keyboard, bosses,
// Speed Round, the Challenge Test and the results screens.

const PRAISE = ['Nice!', 'Great!', 'Boom!', 'Yes!', 'Sharp!', 'Smooth!'];
const HOT = ['On fire!', 'Unstoppable!', 'Legend!'];
const KIND_LABEL = { type: 'Spell it', pick: 'Which one is right?', missing: 'Fill the gaps', scramble: 'Unscramble it' };
const ROWS = ['qwertyuiop', 'asdfghjkl', 'zxcvbnm'];

Object.assign(App, {
  round: null, q: null,
  stopTimers() { clearTimeout(this._adv); clearInterval(this._tick); clearTimeout(this._cd); this._adv = null; this._tick = null; this.keyHandler = null; },
  trapTip(w) {
    const t = (w.tr || []).find(x => x[2]);
    if (w.t) return w.t;
    if (!t) return (w.tr && w.tr.length) ? 'The glowing letters are the tricky part. Look at them closely.' : '';
    const l = t[2];
    if (l.startsWith('double ')) return `Watch the double ${l.slice(7)}: ${l.slice(7)}${l.slice(7)}.`;
    return TRAPTIP[l] || '';
  },
  // Tile width so a word fits on one line when it can (phones are 390 px wide, iPads 834).
  tw(n) {
    const wide = innerWidth >= 700, scale = wide ? 1.32 : 1, gap = wide ? 9 : 6, avail = Math.min(innerWidth, wide ? 760 : 640) - (wide ? 110 : 74);
    return Math.max(22, Math.min(46, Math.floor((avail - (n - 1) * gap) / n / scale)));
  },
  inTrap(w, i) { return (w.tr || []).some(t => i >= t[0] && i < t[1]); },
  wordTiles(w, cls) {
    const n = w.i.length, tw = this.tw(n);
    return `<div class="tiles" style="--tw:${tw}px">${w.i.split('').map((c, i) => `<span class="tile ${this.inTrap(w, i) ? 'trap' : cls || 'given'}">${c}</span>`).join('')}</div>`;
  },
  blankSentence(w) {
    return esc(w.s).replace(new RegExp('\\b' + w.i + '\\b', 'i'), '<span class="blank"></span>');
  },
  hiSentence(w) {
    return esc(w.s).replace(new RegExp('\\b' + w.i + '\\b', 'i'), (m) => `<b>${m}</b>`);
  },

  // ── starting a round ────────────────────────────────────────────────────
  play(mode, world) {
    Voice.unlock();
    const p = this.p, day = Engine.dayNum();
    world = world || Engine.focusWorld(p);
    let items = [];
    if (mode === 'quest') items = Engine.questRound(p, world, 10);
    else if (mode === 'daily') items = Engine.dailyRound(p);
    else if (mode === 'rematch') items = Engine.rematchRound(p);
    else if (mode === 'boss') items = Engine.bossRound(p, world);
    else if (mode === 'speed') items = Engine.speedPool(p);
    if (mode !== 'placement' && !items.length) { this.toast('Nothing to play yet', '#ffd95e'); return; }
    const r = this.round = { mode, world, items, i: -1, okSet: new Set(), firstTry: 0, combo: 0, bestCombo: 0, xp: 0, coins: 0, events: [],
      results: [], redo: [], redone: false, total: items.length, learned: new Set(), asked: 0, missed: [], posOf: {} };
    items.forEach((w, i) => { r.posOf[w.i] = i; });
    if (mode === 'boss') { r.boss = Art.BOSSES[world - 1]; r.hp = r.boss.hp; r.hearts = BOSS_HEARTS; r.total = r.hp; Sfx.play('whoosh'); }
    if (mode === 'speed') { r.time = 60; r.score = 0; r.total = 0; }
    if (mode === 'placement') { r.level = 3; r.trail = []; r.used = new Set(); r.total = 14; }
    if (mode === 'speed') return this.countdown(() => this.startSpeed());
    this.nextItem();
  },
  countdown(done) {
    let n = 3;
    const step = () => {
      document.querySelectorAll('.cd').forEach(c => c.remove());
      if (n === 0) { Sfx.play('go'); const c = document.createElement('div'); c.className = 'cd'; c.innerHTML = '<b>GO!</b>'; document.body.appendChild(c); setTimeout(() => { c.remove(); done(); }, 520); return; }
      Sfx.play('tick'); const c = document.createElement('div'); c.className = 'cd'; c.innerHTML = `<b>${n}</b>`; document.body.appendChild(c); n--; this._cd = setTimeout(step, 750);
    };
    this.render('<div class="screen"></div>', { play: true }); step();
  },

  nextItem() {
    const r = this.round; if (!r) return;
    r.i++;
    let w;
    if (r.mode === 'placement') {
      if (r.trail.length >= r.total) return this.finishPlacement();
      w = Engine.placementWord(r.level, r.used); r.used.add(w.i);
    } else if (r.mode === 'speed') {
      if (r.time <= 0) return this.finishSpeed();
      w = r.items[r.i % r.items.length];
    } else {
      if (r.i >= r.items.length) {
        if (r.mode !== 'boss' && r.redo.length && !r.redone) { r.items = r.redo; r.redo = []; r.redone = true; r.i = 0; }
        else return this.finish();
      }
      w = r.items[r.i];
    }
    if (r.mode === 'boss' && (r.hp <= 0 || r.hearts <= 0)) return this.finish();
    this.setQ(w);
  },

  setQ(w) {
    const p = this.p, r = this.round, special = ['boss', 'speed', 'placement'].includes(r.mode);
    let kind = 'type', scaf = false;
    if (!special) ({ kind, scaf } = Engine.kindFor(p, w));
    const learn = !special && !Engine.isSeen(p.words[w.i]) && !r.learned.has(w.i);
    const q = this.q = { w, kind, scaf, tries: 1, hints: { def: 0, len: 0, letter: 0 }, typed: '', locked: 0, settled: false, busy: false, diff: null, learn };
    r.asked++;
    if (kind === 'missing') { q.blanks = Engine.blanks(w); q.fill = {}; }
    if (kind === 'scramble') { q.bank = Engine.scramble(w); q.built = []; }
    if (kind === 'pick') { q.opts = Engine.choices(w); q.wrong = new Set(); }
    if (learn) this.learnCard(); else this.drawQ(true);
  },

  // ── header and shell shared by every challenge ──────────────────────────
  header() {
    const r = this.round, m = r.mode;
    const quit = `<button class="btn ghost small" onclick="App.quit()">✕</button>`;
    const combo = `<span class="combo ${r.combo >= 5 ? 'hot' : ''}" id="combo">${I('flame')}<b>${r.combo}</b></span>`;
    if (m === 'boss') {
      return `<div class="arena"><div class="row sp" style="width:100%">${quit}<b>${esc(r.boss.n)}</b>${combo}</div>
        <div class="boss" id="boss">${Art.boss(r.boss.k)}</div>
        <div class="hpbar"><i id="hp" style="width:${Math.round(r.hp / r.boss.hp * 100)}%"></i></div>
        <div class="row" style="gap:12px"><div style="width:38px;height:38px;border-radius:50%;overflow:hidden;border:3px solid var(--gold)">${this.myHero()}</div>
          <div class="hearts" id="hearts">${Array.from({ length: BOSS_HEARTS }, (_, i) => `<span class="ico ${i >= r.hearts ? 'lost' : ''}">${Art.icon('heart')}</span>`).join('')}</div></div></div>`;
    }
    if (m === 'speed') return `<div class="topbar">${quit}<div class="timer"><i id="timer" style="width:${r.time / 60 * 100}%"></i></div><span class="pill"><b id="score">${r.score}</b> pts</span>${combo}</div>`;
    if (m === 'placement') return `<div class="topbar">${quit}<div class="segs">${Array.from({ length: r.total }, (_, i) => `<span class="seg"><i style="width:${i < r.trail.length ? 100 : 0}%"></i></span>`).join('')}</div></div>`;
    return `<div class="topbar">${quit}<div class="segs">${Array.from({ length: r.total }, (_, i) => `<span class="seg ${r.results[i] && !r.results[i].ok ? 'bad' : ''}"><i style="width:${r.results[i] && r.results[i].ok ? 100 : 0}%"></i></span>`).join('')}</div>${combo}</div>`;
  },
  quit() {
    Voice.stop();
    this.modal(`<h1>Leave this round?</h1><div class="tag">You keep everything you've earned so far.</div>
      <button class="btn go big" onclick="App.closeModal()">Keep playing</button>
      <button class="btn ghost" onclick="App.closeModal(true);App.round=null;App.home()">Leave</button>`);
  },

  // ── the learn card for a brand-new word ─────────────────────────────────
  // She reads it, hears it, and TYPES it once while it is still in front of her (it only accepts the
  // right letter, so it cannot go wrong). The very next screen asks for it again, from memory.
  learnCard() {
    const w = this.q.w, tip = this.trapTip(w), q = this.q;
    q.copy = ''; q.copyDone = false;
    this.render(`<div class="screen">${this.header()}
      <div class="qcard" id="qcard"><div class="qkind">New word · read it, then type it</div>
        ${this.wordTiles(w)}
        <div class="say"><button class="btn mint" onclick="App.sayWord()">${I('speaker')} Word</button><button class="btn blue" onclick="App.saySentence()">${I('speaker')} Sentence</button></div>
        <div class="def"><i>${esc(w.p)}</i> · ${esc(w.d)}</div>
        <div class="sent">${this.hiSentence(w)}</div>
        ${tip ? `<div class="tip">${I('hint')} ${esc(tip)}</div>` : ''}
        ${w.h ? `<div class="tip">Careful: it sounds like <b>${esc(w.h.join(', '))}</b>. Use the meaning to pick the right one.</div>` : ''}
        <div id="area"></div>
        <div class="feed" id="feed">Now type it to lock it in.</div>
      </div>${this.keyboard('copy')}</div>`, { play: true, view: 'play' });
    this.drawCopy();
    Sfx.play('flip', .4);
    this.keyHandler = (k) => this.learnKey(k);
    if (this.p.settings.autoplay) Voice.say([Voice.url('w', w.i), Voice.url('s', w.i)], 450);
  },
  drawCopy() {
    const q = this.q, w = q.w, area = $('area'); if (!area) return;
    const tw = this.tw(w.i.length);
    area.innerHTML = `<div class="tiles" style="--tw:${tw}px">${w.i.split('').map((c, i) => q.copy[i]
      ? `<span class="tile ok">${q.copy[i]}</span>` : `<span class="tile blank ${i === q.copy.length ? 'cursor' : ''}">_</span>`).join('')}</div>`;
  },
  learnKey(k) {
    const q = this.q; if (!q || !q.learn || q.copyDone) return;
    const w = q.w;
    if (k === 'enter') return;
    if (k === 'del') { if (q.copy.length) { q.copy = q.copy.slice(0, -1); Sfx.play('del', .4); this.drawCopy(); } return; }
    if (q.copy.length >= w.i.length) return;
    const feed = $('feed');
    if (k === w.i[q.copy.length]) {
      q.copy += k; Sfx.play('key', .5); this.drawCopy();
      if (feed) { feed.className = 'feed'; feed.textContent = 'Now type it to lock it in.'; }
      if (q.copy.length === w.i.length) {
        q.copyDone = true; Sfx.play('correct', .6);
        if (feed) { feed.className = 'feed good'; feed.textContent = 'Locked in! Now the quiz.'; }
        setTimeout(() => { if (this.q === q && q.learn) this.startChallenge(); }, 1000);
      }
    } else {                                       // copying: a wrong letter is simply not accepted
      Sfx.play('retry', .4);
      const card = $('qcard'); if (card) { card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); }
      if (feed) { feed.className = 'feed soft'; feed.textContent = 'Not that letter. Look at the word above.'; }
    }
  },
  // The quiz that follows: typed from memory (slots show how long it is). Right after copying it, so it
  // lifts the word to box 1 but does not count as memory (see Engine.answer, fresh).
  startChallenge() {
    const q = this.q; this.round.learned.add(q.w.i); q.learn = false;
    q.fresh = true; q.kind = 'type'; q.scaf = true; q.typed = ''; q.locked = 0; q.diff = null; q.tries = 1;
    q.hints = { def: 0, len: 0, letter: 0 };
    this.drawQ(true);
  },
  sayWord() { Voice.word(this.q.w.i); },
  saySentence() { Voice.sentence(this.q.w.i); },

  // ── the challenge screen ────────────────────────────────────────────────
  drawQ(first) {
    const r = this.round, q = this.q, w = q.w, m = r.mode;
    const speed = m === 'speed', place = m === 'placement';
    const canHint = !speed && !place && q.kind !== 'pick';
    const showSent = !speed;
    const needDef = (w.h && w.h.length) || q.hints.def;
    this.render(`<div class="screen">${this.header()}
      <div class="qcard" id="qcard"><div class="qkind">${KIND_LABEL[q.kind]}${q.scaf ? ' · slots on' : ''}</div>
        <div class="say"><button class="btn mint" onclick="App.sayWord()">${I('speaker')} Word</button>${showSent ? `<button class="btn blue" onclick="App.saySentence()">${I('speaker')} Sentence</button>` : ''}</div>
        ${showSent ? `<div class="sent" id="sent">${this.blankSentence(w)}</div>` : ''}
        <div class="def" id="def" style="${needDef ? '' : 'display:none'}"><i>${esc(w.p)}</i> · ${esc(w.d)}</div>
        <div id="area"></div>
        <div class="feed" id="feed"></div>
        <div id="tipbox"></div>
        ${canHint ? `<div class="hintbar" id="hintbar"><button class="btn ghost small" onclick="App.hintMenu()">${I('hint')} Hint</button></div><div id="hintmenu"></div>` : ''}
        <div id="after"></div>
      </div>
      ${q.kind === 'type' || q.kind === 'missing' ? this.keyboard() : ''}</div>`, { play: true, view: 'play' });
    this.drawArea();
    if (q.kind === 'type' || q.kind === 'missing') this.keyHandler = (k) => this.key(k);
    if (m === 'speed') this.updateTimer();
    if (this.p.settings.autoplay) { Voice.word(w.i); }
    if (first) this.q._shown = Date.now();
  },
  keyboard(mode) {
    const key = (c) => `<button class="key" data-k="${c}" onpointerdown="App.keyDown(event,'${c}')">${c}</button>`;
    return `<div class="kb" id="kb">
      <div class="r">${ROWS[0].split('').map(key).join('')}</div>
      <div class="r">${ROWS[1].split('').map(key).join('')}</div>
      <div class="r">${mode === 'copy' ? `<button class="key wide enter" onpointerdown="event.preventDefault();App.sayWord()">Hear</button>` : `<button class="key wide enter" onpointerdown="App.keyDown(event,'enter')">${this.round.mode === 'placement' || this.round.mode === 'speed' ? 'Go' : 'Check'}</button>`}${ROWS[2].split('').map(key).join('')}<button class="key wide del" onpointerdown="App.keyDown(event,'del')">⌫</button></div></div>`;
  },
  keyDown(e, k) { e.preventDefault(); this.key(k); },

  drawArea() {
    const q = this.q, w = q.w, area = $('area'); if (!area) return;
    if (q.kind === 'pick') {
      area.innerHTML = `<div class="opts">${q.opts.map((o, i) => `<button class="opt ${q.wrong.has(o) ? 'wrong dim' : ''}" onclick="App.pickOpt(${i})">${o}</button>`).join('')}</div>`;
    } else if (q.kind === 'scramble') {
      const n = w.i.length, tw = this.tw(n);
      area.innerHTML = `<div class="tiles" style="--tw:${tw}px">${Array.from({ length: n }, (_, i) => {
        const bi = q.built[i]; return bi == null ? '<span class="tile blank">·</span>' : `<span class="tile fill ${q.diff ? (q.diff[i] === 'ok' ? 'ok' : 'bad') : ''}" onclick="App.unbuild(${i})">${q.bank[bi]}</span>`; }).join('')}</div>
        <div class="bank" style="--tw:${tw}px;margin-top:10px">${q.bank.map((c, i) => `<span class="tile ${q.built.includes(i) ? 'used' : ''}" onclick="App.build(${i})">${c}</span>`).join('')}</div>
        <button class="btn ghost small" style="margin-top:8px" onclick="App.clearBuild()">Clear</button>`;
    } else if (q.kind === 'missing') {
      const n = w.i.length, tw = this.tw(n), cur = q.blanks.find(i => q.fill[i] == null);
      area.innerHTML = `<div class="tiles" style="--tw:${tw}px">${w.i.split('').map((c, i) => {
        if (!q.blanks.includes(i)) return `<span class="tile given">${c}</span>`;
        const f = q.fill[i]; const st = q.diff && q.diff[i] ? q.diff[i] : '';
        return f == null ? `<span class="tile blank ${i === cur ? 'cursor' : ''}">_</span>` : `<span class="tile fill ${st}">${f}</span>`; }).join('')}</div>`;
    } else {
      this.drawTiles();
    }
  },
  drawTiles() {
    const q = this.q, w = q.w, area = $('area'); if (!area || q.kind !== 'type') return;
    const n = w.i.length, tw = this.tw(Math.max(n, q.typed.length + (q.scaf || q.hints.len ? 0 : 1))), slots = q.scaf || q.hints.len;
    let html = '';
    if (q.diff) {
      html = q.diff.map(d => d.s === 'gap' ? '<span class="tile gap">_</span>' : `<span class="tile ${d.s}">${d.c}</span>`).join('');
    } else if (q.final) {                                   // answered: just her letters, no cursor tile
      html = q.typed.split('').map(c => `<span class="tile ok">${c}</span>`).join('');
    } else {
      const len = slots ? Math.max(n, q.typed.length) : q.typed.length + 1;
      for (let i = 0; i < len; i++) {
        const c = q.typed[i];
        if (c) html += `<span class="tile ${i < q.locked ? 'given' : 'fill'}">${c}</span>`;
        else html += `<span class="tile blank ${i === q.typed.length ? 'cursor' : ''}">${slots ? '_' : ''}</span>`;
      }
    }
    area.innerHTML = `<div class="tiles" style="--tw:${tw}px">${html}</div>`;
  },

  // ── input ───────────────────────────────────────────────────────────────
  key(k) {
    const q = this.q, r = this.round; if (!q || !r) return;
    if (q.learn) return this.learnKey(k);
    if (q.settled || q.busy || q.teaching) return;
    const w = q.w;
    if (q.kind === 'type') {
      if (k === 'enter') return this.submitType();
      if (q.diff) { q.diff = null; }
      if (k === 'del') { if (q.typed.length > q.locked) { q.typed = q.typed.slice(0, -1); Sfx.play('del', .4); } }
      else if (q.typed.length < w.i.length + 2) { q.typed += k; Sfx.play('key', .45); }
      this.drawTiles();
      if ((q.scaf || q.hints.len) && q.typed.length === w.i.length) { q.busy = true; setTimeout(() => { q.busy = false; this.submitType(); }, 140); }
    } else if (q.kind === 'missing') {
      if (k === 'enter') return;
      if (k === 'del') { const last = [...q.blanks].reverse().find(i => q.fill[i] != null); if (last != null) { delete q.fill[last]; q.diff = null; Sfx.play('del', .4); } }
      else { const nxt = q.blanks.find(i => q.fill[i] == null); if (nxt != null) { q.fill[nxt] = k; Sfx.play('key', .45); } }
      this.drawArea();
      if (q.blanks.every(i => q.fill[i] != null)) { q.busy = true; setTimeout(() => { q.busy = false; this.submitMissing(); }, 160); }
    }
  },
  submitType() {
    const q = this.q; if (q.settled || !q.typed.length) return;
    if (Engine.same(q.typed, q.w)) return this.settle(true);
    this.wrongTry(q.typed);
  },
  submitMissing() {
    const q = this.q, w = q.w; if (q.settled) return;
    const att = this.attemptOf(q);
    if (att === w.i) return this.settle(true);
    this.wrongTry(att);
  },
  pickOpt(i) {
    const q = this.q; if (q.settled || q.busy || q.teaching) return; const o = q.opts[i];
    if (o === q.w.i) return this.settle(true);
    q.chosen = o; q.wrong.add(o); this.wrongTry(o);
  },
  build(i) { const q = this.q; if (q.settled || q.busy || q.teaching || q.built.includes(i) || q.built.length >= q.bank.length) return; q.built.push(i); q.diff = null; Sfx.play('key', .5); this.drawArea(); if (q.built.length === q.bank.length) { q.busy = true; setTimeout(() => { q.busy = false; this.submitScramble(); }, 200); } },
  unbuild(i) { const q = this.q; if (q.settled || q.busy || q.teaching) return; q.built.splice(i, q.built.length - i); q.diff = null; Sfx.play('del', .4); this.drawArea(); },
  clearBuild() { const q = this.q; if (q.settled || q.busy || q.teaching) return; q.built = []; q.diff = null; Sfx.play('del', .4); this.drawArea(); },
  submitScramble() {
    const q = this.q, w = q.w; if (q.settled) return;
    const att = this.attemptOf(q);
    if (att === w.i) return this.settle(true);
    this.wrongTry(att);
  },

  // What she actually wrote, whatever kind of question it was.
  attemptOf(q) {
    const w = q.w;
    if (q.kind === 'type') return q.typed;
    if (q.kind === 'missing') return w.i.split('').map((c, i) => q.blanks.includes(i) ? (q.fill[i] || '') : c).join('');
    if (q.kind === 'scramble') return q.built.map(i => q.bank[i]).join('');
    return q.chosen || '';
  },
  // Her spelling above the right one, letter by letter, in green / orange / red (see Engine.diff). The tricky
  // letters of the right spelling glow.
  teachHtml(w, attempt) {
    const d = Engine.diff(attempt, w.i), tw = this.tw(Math.max(w.i.length, d.length));
    const mine = d.map(x => x.s === 'gap' ? '<span class="tile gap">_</span>' : `<span class="tile ${x.s}">${x.c}</span>`).join('');
    const right = w.i.split('').map((c, i) => `<span class="tile ${this.inTrap(w, i) ? 'trap' : 'given'}">${c}</span>`).join('');
    return `<div class="teach"><div class="trow"><span class="tlabel">You wrote</span><div class="tiles" style="--tw:${tw}px">${mine}</div></div>
      <div class="trow"><span class="tlabel">Right spelling</span><div class="tiles" style="--tw:${this.tw(w.i.length)}px">${right}</div></div>
      <div class="legend2"><span><i class="g"></i>right place</span><span><i class="o"></i>right order, wrong place</span><span><i class="r"></i>wrong place and order</span><span><i class="u"></i>missing letter</span></div></div>`;
  },

  // A wrong answer. Speed and placement move straight on; everything else TEACHES, and stays on screen
  // until she taps Try again (a correction that vanishes teaches nothing).
  wrongTry(attempt) {
    const q = this.q, r = this.round, card = $('qcard');
    q.attempt = attempt;
    if (r.mode === 'speed' || r.mode === 'placement' || q.tries >= 2) return this.settle(false);
    q.tries = 2; q.teaching = true; q.busy = false;
    Sfx.play('wrong', .5);
    if (card) { card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); }
    const w = q.w, tip = this.trapTip(w);
    const area = $('area'); if (area) area.innerHTML = this.teachHtml(w, attempt);
    const f = $('feed'); if (f) { f.className = 'feed soft'; f.textContent = 'Not quite. Study the right spelling, then try again from memory.'; }
    const tb = $('tipbox'); if (tb) tb.innerHTML = tip ? `<div class="tip">${I('hint')} ${esc(tip)}</div>` : '';
    const kb = $('kb'); if (kb) kb.style.display = 'none';
    const hb = $('hintbar'); if (hb) hb.style.display = 'none'; const hm = $('hintmenu'); if (hm) hm.innerHTML = '';
    const a = $('after'); if (a) a.innerHTML = `<button class="btn go big" onclick="App.retry()">Try again</button>`;
    this.keyHandler = (k) => { if (k === 'enter') this.retry(); };
    Voice.word(w.i);
  },
  retry() {
    const q = this.q; if (!q || !q.teaching || q.settled) return;
    q.teaching = false; q.diff = null; q.busy = false;
    if (q.kind === 'type') { q.typed = q.hints.letter ? q.w.i[0] : ''; q.locked = q.hints.letter ? 1 : 0; }
    if (q.kind === 'missing') q.fill = {};
    if (q.kind === 'scramble') q.built = [];
    if (q.kind === 'pick') { q.opts = Engine.choices(q.w); q.wrong = new Set(); }
    const a = $('after'); if (a) a.innerHTML = ''; const tb = $('tipbox'); if (tb) tb.innerHTML = '';
    const f = $('feed'); if (f) { f.className = 'feed'; f.textContent = 'Last try. Spell it from memory.'; }
    const kb = $('kb'); if (kb) kb.style.display = ''; const hb = $('hintbar'); if (hb) hb.style.display = '';
    this.drawArea(); Sfx.play('tap', .5);
    this.keyHandler = (q.kind === 'type' || q.kind === 'missing') ? (k) => this.key(k) : null;
  },

  // ── hints ───────────────────────────────────────────────────────────────
  hintMenu() {
    const m = $('hintmenu'); if (!m) return;
    if (m.innerHTML) { m.innerHTML = ''; return; }
    const q = this.q, p = this.p, tok = Engine.bal(p, 'hint'), coins = Engine.bal(p, 'coins');
    const cost = (k) => tok > 0 ? `${I('hint')} 1` : `${I('coin')} ${HINT_COST[k]}`;
    const can = (k) => tok > 0 || coins >= HINT_COST[k];
    m.innerHTML = `<div class="hintmenu">
      <button onclick="App.hint('def')" ${q.hints.def ? 'disabled' : ''}><span>Show the meaning</span><span>free</span></button>
      ${q.kind === 'type' ? `<button onclick="App.hint('len')" ${q.hints.len || q.scaf || !can('length') ? 'disabled' : ''}><span>Show how many letters</span><span>${cost('length')}</span></button>
      <button onclick="App.hint('letter')" ${q.hints.letter || !can('letter') ? 'disabled' : ''}><span>Reveal the first letter</span><span>${cost('letter')}</span></button>` : ''}
      <div class="small-note">Tokens: ${tok} · Hints lower the XP and a first-letter hint won't count toward mastery.</div></div>`;
  },
  hint(kind) {
    const q = this.q; if (!q || q.settled) return;
    if (kind === 'def') { q.hints.def = 1; const d = $('def'); if (d) d.style.display = ''; Sfx.play('hint', .5); }
    else {
      const key = kind === 'len' ? 'length' : 'letter';
      if (!Engine.spend(this.p, 'hint', 1) && !Engine.spend(this.p, 'coins', HINT_COST[key])) { this.toast('Not enough coins', '#ffd95e'); return; }
      Sfx.play('hint', .6); q.hints[kind] = 1;
      if (kind === 'letter' && !q.typed.length) { q.typed = q.w.i[0]; q.locked = 1; }
      this.save(); this.drawTiles();
    }
    const m = $('hintmenu'); if (m) m.innerHTML = '';
  },

  // ── an answer is final ──────────────────────────────────────────────────
  settle(ok) {
    const q = this.q, r = this.round; if (!q || !r || q.settled) return;
    const w = q.w, card = $('qcard'), pos = r.mode === 'speed' ? r.asked - 1 : (r.posOf[w.i] != null ? r.posOf[w.i] : r.i);
    q.settled = true; this.keyHandler = null; Voice.stop();
    const combo = ok ? r.combo + 1 : 0;
    const out = Engine.answer(this.p, { i: w.i, kind: q.kind, ok, tries: q.tries, hints: q.hints, mode: r.mode, combo, final: true, fresh: !!q.fresh });
    this.save();
    r.combo = combo; r.bestCombo = Math.max(r.bestCombo, combo); r.xp += out.xp; r.coins += out.coins; r.events.push(...out.events);
    this.banners(out.events);
    const cb = $('combo'); if (cb) { cb.className = 'combo ' + (combo >= 5 ? 'hot' : ''); cb.querySelector('b').textContent = combo; }
    const feed = $('feed');
    if (r.mode === 'placement') {
      r.trail.push({ level: r.level, ok }); r.level = Engine.placementNext(r.level, ok);
      this._adv = setTimeout(() => this.nextItem(), 350); return;
    }
    if (ok) {
      r.okSet.add(w.i); if (q.tries === 1) r.firstTry++;
      r.results[pos] = { ok: true };
      Sfx.play(combo > 0 && combo % 5 === 0 ? 'combo' : 'correct');
      if (card) { card.classList.add('right'); this.burst(card, 8); }
      if (feed) { feed.className = 'feed good'; feed.textContent = combo >= 5 ? HOT[Math.min(2, Math.floor(combo / 5) - 1)] : PRAISE[Math.floor(Math.random() * PRAISE.length)]; }
      this.floatAt(card ? card.querySelector('.qkind') : null, `+${out.xp} XP`, '#c9b6ff');
      if (out.coins) setTimeout(() => { if (this.round === r) { Sfx.play('coin', .35); this.floatAt($('feed'), `${I('coin')}+${out.coins}`, '#ffd95e'); } }, 260);
      const segW = document.querySelectorAll('.seg')[pos]; if (segW && r.mode !== 'speed') { segW.classList.remove('bad'); const si = segW.querySelector('i'); if (si) si.style.width = '100%'; }
      if (q.kind === 'type') { q.final = true; q.diff = null; this.drawTiles(); }
      if (r.mode === 'boss') return this.bossHit(w, out);
      if (r.mode === 'speed') { r.score += 1 + (combo % 5 === 0 ? 2 : 0); r.total++; const s = $('score'); if (s) s.textContent = r.score; }
      this._adv = setTimeout(() => { if (this.round === r) this.nextItem(); }, r.mode === 'speed' ? 450 : 1150);
    } else {
      r.results[pos] = { ok: false };
      r.missed.push(w);
      if (r.mode !== 'boss' && r.mode !== 'speed' && !r.redone) r.redo.push(w);
      Sfx.play(r.mode === 'boss' ? 'hurt' : 'wrong', .55);
      if (card) { card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); }
      const seg = document.querySelectorAll('.seg')[pos]; if (seg && r.mode !== 'speed') { seg.classList.add('bad'); const si = seg.querySelector('i'); if (si) si.style.width = '100%'; }
      if (r.mode === 'speed') { r.total++; this.reveal(w, true); this._adv = setTimeout(() => { if (this.round === r) this.nextItem(); }, 900); return; }
      this.reveal(w, false);
      if (r.mode === 'boss') return this.bossHurt();
    }
  },
  reveal(w, quick) {
    const area = $('area'), feed = $('feed'), tip = this.trapTip(w);
    const att = this.q && this.q.attempt;
    if (area) area.innerHTML = (!quick && att) ? this.teachHtml(w, att) : this.wordTiles(w);
    if (feed) { feed.className = 'feed bad'; feed.textContent = quick ? w.i : 'This one will come back soon. Look at it closely.'; }
    const tb = $('tipbox'); if (tb && tip && !quick) tb.innerHTML = `<div class="tip">${I('hint')} ${esc(tip)}</div>`;
    const sent = $('sent'); if (sent) sent.innerHTML = this.hiSentence(w);
    const hm = $('hintbar'); if (hm) hm.remove(); const hu = $('hintmenu'); if (hu) hu.innerHTML = '';
    const kb = $('kb'); if (kb && !quick) kb.style.display = 'none';
    if (!quick && this.round.mode !== 'boss') { const a = $('after'); if (a) a.innerHTML = `<button class="btn go big" onclick="App.nextItem()">Next</button>`; Voice.word(w.i); }
    if (!quick) this.keyHandler = (k) => { if (k === 'enter') { this.keyHandler = null; this.nextItem(); } };
  },

  // ── boss ────────────────────────────────────────────────────────────────
  bossHit(w, out) {
    const r = this.round, b = $('boss'), hp = $('hp');
    r.hp--; Sfx.play('hit', .7);
    if (b) { b.classList.remove('hit'); void b.offsetWidth; b.classList.add('hit'); this.floatAt(b, '-1', '#ff8da1'); }
    if (hp) hp.style.width = Math.max(0, Math.round(r.hp / r.boss.hp * 100)) + '%';
    if (r.hp <= 0) { this._adv = setTimeout(() => this.finish(), 900); return; }
    this._adv = setTimeout(() => { if (this.round === r) this.nextItem(); }, 1100);
  },
  bossHurt() {
    const r = this.round, b = $('boss'); r.hearts--;
    if (b) { b.classList.remove('atk'); void b.offsetWidth; b.classList.add('atk'); }
    Sfx.play('heart', .6);
    const hs = document.querySelectorAll('#hearts .ico'); if (hs[r.hearts]) hs[r.hearts].classList.add('lost');
    const a = $('after');
    if (r.hearts <= 0) { this._adv = setTimeout(() => this.finish(), 1500); return; }
    if (a) a.innerHTML = `<button class="btn go big" onclick="App.nextItem()">Next</button>`;
  },

  // ── speed round ─────────────────────────────────────────────────────────
  startSpeed() {
    const r = this.round; r.start = Date.now(); this.nextItem();
    clearInterval(this._tick);
    this._tick = setInterval(() => {
      if (this.round !== r) return clearInterval(this._tick);
      r.time = Math.max(0, 60 - (Date.now() - r.start) / 1000); this.updateTimer();
      if (r.time <= 0) { clearInterval(this._tick); const q = this.q; if (q && !q.settled) { q.settled = true; this.keyHandler = null; } setTimeout(() => this.finishSpeed(), 250); }
    }, 200);
  },
  updateTimer() { const t = $('timer'), r = this.round; if (t) t.style.width = Math.max(0, r.time / 60 * 100) + '%'; },

  // ── results ─────────────────────────────────────────────────────────────
  finish() {
    const r = this.round; if (!r) return; this.stopTimers();
    if (r.mode === 'boss') return this.finishBoss();
    const total = r.total, right = r.okSet.size;
    const res = Engine.roundDone(this.p, { right, total, perfect: r.firstTry === total, mode: r.mode });
    let daily = null; if (r.mode === 'daily') daily = Engine.dailyDone(this.p);
    this.save();
    const events = [...r.events, ...res.events];
    const nw = r.learned.size;
    this.render(`<div class="screen center">
      <div class="bigstars">${[0, 1, 2].map(i => `<i class="${i === 1 ? 'mid' : ''}">${Art.icon('xp')}</i>`).join('')}</div>
      <h1>${right} of ${total} spelled!</h1>
      <p class="tag">${res.stars === 3 ? 'Flawless spelling!' : res.stars === 2 ? 'Great round!' : res.stars === 1 ? 'Good practice. Tricky ones come back.' : 'Keep going, they come back soon.'}</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center"><span class="pill">${I('xp')}+${r.xp + res.xp} XP</span><span class="pill">${I('coin')}+${r.coins + res.coins}</span><span class="pill">${I('flame')}best ${r.bestCombo}</span>${nw ? `<span class="pill">${I('book')}${nw} new</span>` : ''}</div>
      ${daily ? `<div class="card" style="width:100%">${I('key')} <b>Daily Challenge complete!</b><div class="small-note">+ Bronze Crate and ${daily.gems} gems</div></div>` : ''}
      ${r.missed.length ? `<div class="card" style="width:100%;text-align:left"><h3>Words to watch</h3><div class="chips">${r.missed.map(w => `<span class="chip t" onclick="Voice.word('${w.i}')">${w.i}</span>`).join('')}</div><div class="small-note" style="text-align:left;margin-top:6px">They'll come back until you own them.</div></div>` : ''}
      <button class="btn go big" onclick="App.again()">${I('bolt')} Play again</button>
      <button class="btn ghost" onclick="App.round=null;App.home()">Home</button></div>${''}`, { view: 'results' });
    const key = r.mode, wd = r.world;
    this._again = { mode: key, world: wd };
    setTimeout(() => { document.querySelectorAll('.bigstars i').forEach((el, i) => setTimeout(() => { el.classList.add(i < res.stars ? 'on' : 'off'); if (i < res.stars) Sfx.play('star', .5); }, 220 + i * 260)); }, 80);
    if (res.stars >= 2) this.confetti(24);
    Sfx.play('fanfare', .5);
    setTimeout(() => this.showMoments(events, null), 1400);
  },
  again() { const a = this._again || { mode: 'quest' }; this.play(a.mode === 'daily' ? 'quest' : a.mode, a.world); },

  finishBoss() {
    const r = this.round, won = r.hp <= 0, w = r.world;
    const res = Engine.bossFought(this.p, w, won); this.save();
    const B = r.boss;
    if (won) {
      const b = $('boss'); if (b) b.classList.add('dead'); Sfx.play('win'); this.confetti(60);
      setTimeout(() => {
        this.render(`<div class="screen center">
          <h1>${esc(B.n)} defeated!</h1>
          <div class="rays"><div class="art">${Art.icon('trophy')}</div></div>
          <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center"><span class="pill">${I('key')}${res.crate} crate</span><span class="pill">${I('gem')}+${res.gems}</span><span class="pill">${I('xp')}+${r.xp}</span></div>
          ${res.first && res.opened ? `<div class="card" style="width:100%"><b>World ${res.opened} unlocked!</b><div class="small-note">${esc(WORLDS[res.opened - 1].name)} is open.</div></div>` : ''}
          <button class="btn go big" onclick="App.crates()">${I('key')} Open your crate</button>
          <button class="btn ghost" onclick="App.round=null;App.home()">Home</button></div>`, { view: 'results' });
        this.showMoments([...r.events, ...res.events], null);
      }, 1000);
    } else {
      Sfx.play('lose');
      this.render(`<div class="screen center">
        <div style="width:200px">${Art.boss(B.k)}</div>
        <h1>${esc(B.n)} survived</h1><p class="tag">You took it to ${Math.max(0, r.hp)} HP. Words to practice:</p>
        <div class="chips" style="justify-content:center">${r.missed.map(x => `<span class="chip t" onclick="Voice.word('${x.i}')">${x.i}</span>`).join('') || '<span class="small-note">none</span>'}</div>
        <button class="btn red big" onclick="App.play('boss', ${w})">${I('sword')} Fight again</button>
        <button class="btn blue big" onclick="App.play('quest', ${w})">Practice this world</button>
        <button class="btn ghost" onclick="App.round=null;App.home()">Home</button></div>`, { view: 'results' });
      this.showMoments(r.events, null);
    }
  },

  finishSpeed() {
    const r = this.round; if (!r) return; this.stopTimers();
    const res = Engine.speedDone(this.p, r.score); const rd = Engine.roundDone(this.p, { right: r.score, total: Math.max(1, r.total), perfect: false, mode: 'speed' }); this.save();
    Sfx.play(res.newBest ? 'win' : 'fanfare', .6); if (res.newBest) this.confetti(40);
    this.render(`<div class="screen center">
      <h1>${r.score} points!</h1><p class="tag">${res.newBest ? 'New personal best!' : `Your best is ${this.p.stats.speedBest}.`}</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;justify-content:center"><span class="pill">${I('xp')}+${res.xp + rd.xp + r.xp} XP</span><span class="pill">${I('coin')}+${res.coins + rd.coins + r.coins}</span><span class="pill">${I('flame')}best ${r.bestCombo}</span></div>
      ${r.missed.length ? `<div class="card" style="width:100%;text-align:left"><h3>Missed</h3><div class="chips">${r.missed.slice(0, 12).map(w => `<span class="chip t" onclick="Voice.word('${w.i}')">${w.i}</span>`).join('')}</div></div>` : ''}
      <button class="btn go big" onclick="App.play('speed')">${I('bolt')} Go again</button>
      <button class="btn ghost" onclick="App.round=null;App.home()">Home</button></div>`, { view: 'results' });
    this.showMoments([...r.events, ...res.events, ...rd.events], null);
  },

  finishPlacement() {
    const r = this.round, p = this.p, placed = Engine.placementResult(r.trail);
    p.placed = true; p.maxWorld = Math.max(p.maxWorld || 1, placed); Engine.earn(p, 'gems', 5);
    this.save(); Sfx.play('win'); this.confetti(50);
    const right = r.trail.filter(t => t.ok).length;
    this.render(`<div class="screen center">
      <h1>You're ready for World ${placed}!</h1>
      <div class="wico" style="--wc:${WORLDS[placed - 1].color};width:120px;height:120px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,color-mix(in srgb,${WORLDS[placed - 1].color} 70%,#fff),${WORLDS[placed - 1].color});box-shadow:0 6px 0 rgba(0,0,0,.25),inset 0 0 0 4px rgba(255,255,255,.35)"><span style="width:68%;display:block">${Art.world(placed)}</span></div>
      <p class="tag"><b>${esc(WORLDS[placed - 1].name)}</b> · ${esc(WORLDS[placed - 1].grade)}<br>You got ${right} of ${r.trail.length} right. Worlds 1 to ${placed} are open.</p>
      <div class="row" style="gap:8px;justify-content:center"><span class="pill">${I('gem')}+5 gems</span></div>
      <button class="btn go big" onclick="App.round=null;App.play('quest', ${placed})">${I('bolt')} Start playing</button>
      <button class="btn ghost" onclick="App.round=null;App.home()">Home</button></div>`, { view: 'results' });
  },
});
