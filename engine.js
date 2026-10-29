// Spell Quest — the rules. No DOM in here, so Node can test all of it.
//
// Two promises shape everything:
//   1. A word is "mastered" only when it has been TYPED right from memory on two
//      different days. Recognition (pick it, unscramble it) can lift a word to
//      box 2 and no further, so a streak of easy taps can never fake mastery.
//   2. Nothing she has earned is ever taken away. Totals only grow (coins, gems
//      and items are ledgers of "earned" and "spent"), owned things only join,
//      and merging two devices takes the higher number or the union.

const Engine = (() => {
  const DAY = 86400000;
  const INTERVAL = [0, 1, 2, 4, 8, 16];            // days until a word is due again, by box
  const BY = {}; for (const w of WORDS) BY[w.i] = w;
  const BYWORLD = {}; for (const w of WORDS) (BYWORLD[w.l] = BYWORLD[w.l] || []).push(w);
  const ALLYBY = {}; for (const a of ALLIES) ALLYBY[a.k] = a;
  const HEROBY = {}; for (const h of Art.HEROES) HEROBY[h.k] = h;
  const GEARBY = {}; for (const g of GEAR) GEARBY[g.id] = g;
  const THEMEBY = {}; for (const t of THEMES) THEMEBY[t.id] = t;

  const dayNum = (t = Date.now()) => { const d = new Date(t); return Math.floor((t - d.getTimezoneOffset() * 60000) / DAY); };
  function seeded(seed) {
    let a = seed | 0;
    return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  const pickOne = (arr, r) => arr[Math.floor(r() * arr.length)];
  function shuffle(arr, r = Math.random) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

  // ── the profile ────────────────────────────────────────────────────────────
  const LEDGERS = ['coins', 'gems', 'hint', 'shield', 'bronze', 'silver', 'gold'];
  function blank() {
    const led = {}; for (const k of LEDGERS) led[k] = { e: 0, s: 0 };
    led.coins.e = 100; led.hint.e = 5; led.bronze.e = 1;           // the welcome gift
    return {
      v: 1, xp: 0, hero: 'kai', skin: 1, ally: 'cinder',
      heroes: ['kai', 'mira', 'dax', 'zoe'], allies: { cinder: { bond: 0 } },
      gearOwned: [], equip: {}, themesOwned: ['night'], theme: 'night',
      led, words: {}, bosses: {}, placed: false, maxWorld: 1,
      streak: { n: 0, best: 0, last: -1 }, days: {}, quests: { day: -1, list: [] }, cal: { day: -1 },
      ach: {}, crateProg: 0, pity: 0, dailyDone: -1,
      stats: { right: 0, wrong: 0, typed: 0, typedNH: 0, rounds: 0, perfect: 0, bossWins: 0, bossFights: 0, speedBest: 0,
               comboBest: 0, crates: 0, opened: 0, daily: 0, evolutions: 0, fixed: 0, traps: {} },
      settings: { autoplay: true, sound: true },
    };
  }
  // Fill in anything an older save or a cloud copy is missing, and drop things we no longer have.
  function sanitize(p) {
    const b = blank();
    p = p || {};
    for (const k of Object.keys(b)) if (p[k] == null) p[k] = b[k];
    for (const k of LEDGERS) if (!p.led[k]) p.led[k] = { e: 0, s: 0 };
    for (const k of Object.keys(b.stats)) if (p.stats[k] == null) p.stats[k] = b.stats[k];
    for (const k of Object.keys(b.settings)) if (p.settings[k] == null) p.settings[k] = b.settings[k];
    p.heroes = [...new Set(p.heroes.filter(k => HEROBY[k]))];
    if (!p.heroes.length) p.heroes = ['kai'];
    if (!HEROBY[p.hero] || !p.heroes.includes(p.hero)) p.hero = p.heroes[0];
    for (const k of Object.keys(p.allies)) if (!ALLYBY[k]) delete p.allies[k];
    if (!Object.keys(p.allies).length) p.allies = { cinder: { bond: 0 } };
    if (!p.allies[p.ally]) p.ally = Object.keys(p.allies)[0];
    p.gearOwned = [...new Set(p.gearOwned.filter(g => GEARBY[g]))];
    p.themesOwned = [...new Set(['night', ...p.themesOwned.filter(t => THEMEBY[t])])];
    if (!p.themesOwned.includes(p.theme)) p.theme = 'night';
    for (const k of Object.keys(p.equip)) if (!p.allies[k]) delete p.equip[k];
    // Words stay even if this build no longer lists them: a newer copy may know words an older app does not,
    // and dropping them here would erase real progress on the next sync.
    for (const k of Object.keys(p.words)) {
      const r = p.words[k];
      r.b = Math.max(0, Math.min(5, r.b | 0)); r.r = r.r | 0; r.w = r.w | 0; r.t = r.t == null ? -1 : r.t; r.due = r.due | 0;
      r.d = [...new Set(r.d || [])].sort((x, y) => x - y).slice(-4);
    }
    return p;
  }

  // ledgers: balance = earned - spent, both only ever grow
  const bal = (p, k) => Math.max(0, p.led[k].e - p.led[k].s);
  const earn = (p, k, n) => { p.led[k].e += Math.max(0, Math.floor(n)); };
  function spend(p, k, n) { if (bal(p, k) < n) return false; p.led[k].s += n; return true; }

  // ── words ──────────────────────────────────────────────────────────────────
  const rec = (p, w) => p.words[w] || (p.words[w] = { b: 0, r: 0, w: 0, t: -1, due: 0, d: [] });
  const isMastered = (r) => !!r && r.b >= 4 && r.d.length >= 2;
  const isKnown = (r) => !!r && r.b >= 2;
  const isSeen = (r) => !!r && (r.r + r.w) > 0;

  function worldProgress(p, n) {
    const ws = BYWORLD[n] || [];
    let seen = 0, known = 0, mastered = 0;
    for (const w of ws) { const r = p.words[w.i]; if (isSeen(r)) seen++; if (isKnown(r)) known++; if (isMastered(r)) mastered++; }
    return { total: ws.length, seen, known, mastered, ready: ws.length ? known / ws.length >= BOSS_READY : false };
  }
  const unlocked = (p, n) => n === 1 || n <= (p.maxWorld || 1) || !!p.bosses[n - 1];
  function focusWorld(p) {            // where the next quest round goes: the highest open world whose boss still stands
    let f = 0;
    for (const w of WORLDS) if (unlocked(p, w.n) && !p.bosses[w.n]) f = w.n;
    return f || WORLDS.length;                   // every boss beaten: she lives in the last world
  }
  const masteredCount = (p) => Object.values(p.words).filter(isMastered).length;

  // How a word is asked, by how well she knows it. Every type shows up on the way up the ladder; only a TYPED
  // answer can lift a word past box 2, so the typed steps are where mastery is earned.
  const canScramble = (w) => w.i.length >= 4 && w.i.length <= 9;
  function kindFor(p, w, rnd = Math.random) {
    const r = p.words[w.i], b = r ? r.b : 0, x = rnd();
    if (b >= 3) return { kind: 'type', scaf: false };
    if (b === 2) return { kind: 'type', scaf: true };            // slots show how long it is
    if (b === 1) {                                               // mix it up: build it, fill the gaps, or spot it
      if (canScramble(w) && x < .4) return { kind: 'scramble', scaf: false };
      return x < .75 ? { kind: 'missing', scaf: false } : { kind: 'pick', scaf: false };
    }
    return { kind: (canScramble(w) && x < .5) ? 'scramble' : 'pick', scaf: false };
  }
  // The quiz on the screen right after the learn card (she has just typed the word while looking at it).
  // It asks again, a different way each time: typed with slots, filling the gaps, or unscrambling.
  function freshKind(w, rnd = Math.random) {
    const x = rnd();
    if (canScramble(w) && x < .3) return { kind: 'scramble', scaf: false };
    if (x < .55) return { kind: 'missing', scaf: false };
    return { kind: 'type', scaf: true };
  }

  // Wrong spellings for Pick-It: three of the stored ones, plus the sound-alike twin when there is one.
  function choices(w, rnd = Math.random) {
    const wrong = shuffle(w.x, rnd).slice(0, 3);
    if (w.h && w.h.length && rnd() < .8) wrong[0] = pickOne(w.h, rnd);
    return shuffle([w.i, ...wrong], rnd);
  }
  function scramble(w, rnd = Math.random) {
    const a = w.i.split('');
    let s = a;
    for (let k = 0; k < 20; k++) { s = shuffle(a, rnd); if (s.join('') !== w.i) break; }
    return s;
  }
  // Missing Letters: blank the trap letters first, then others, so the blanks are where mistakes happen.
  function blanks(w, rnd = Math.random) {
    const n = w.i.length, want = n >= 9 ? 3 : 2, set = new Set();
    for (const [a, b] of (w.tr || [])) for (let i = a; i < b && set.size < want; i++) if (i > 0 || n < 5) set.add(i);
    let guard = 0;
    while (set.size < want && guard++ < 40) { const i = 1 + Math.floor(rnd() * (n - 2)); set.add(i); }
    return [...set].sort((a, b) => a - b);
  }

  // Per-letter feedback on an attempt, in the three states Jacob defined (2026-10-29):
  //   ok   green  — the right letter in the right place
  //   near orange — the right letter in the right ORDER, but in the wrong place (shifted by an extra or
  //                 missing letter: the e and n of "lisent" for "listen")
  //   bad  red    — wrong place AND wrong order (a wrong, extra or out-of-order letter: the final t of "lisent")
  //   gap         — a letter the word needs here and the attempt left out (shown as a blank to fill)
  // "Right order" = it belongs to the longest run of letters the attempt shares with the answer, in sequence.
  function diff(attempt, answer) {
    const a = attempt, b = answer, n = a.length, m = b.length;
    const L = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
    const out = []; let i = 0, j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push({ c: a[i], s: i === j ? 'ok' : 'near' }); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push({ c: a[i], s: 'bad' }); i++; }
      else { out.push({ c: '', s: 'gap' }); j++; }
    }
    while (i < n) { out.push({ c: a[i++], s: 'bad' }); }
    while (j < m) { out.push({ c: '', s: 'gap' }); j++; }
    // A wrong letter standing where another belonged is ONE mistake, not a wrong letter plus a missing one:
    // within a stretch of red letters and gaps, pair them off and keep just the red letter in place.
    const res = []; let k = 0;
    while (k < out.length) {
      if (out[k].s === 'ok' || out[k].s === 'near') { res.push(out[k++]); continue; }
      const run = []; while (k < out.length && (out[k].s === 'bad' || out[k].s === 'gap')) run.push(out[k++]);
      let spare = Math.min(run.filter(x => x.s === 'bad').length, run.filter(x => x.s === 'gap').length);
      for (const x of run.slice().reverse()) { if (x.s === 'gap' && spare > 0) { spare--; x.drop = true; } }
      for (const x of run) if (!x.drop) res.push(x);
    }
    return res;
  }
  const same = (attempt, w) => String(attempt || '').trim().toLowerCase() === w.i;

  // ── rounds ─────────────────────────────────────────────────────────────────
  const known = (p) => Object.keys(p.words).filter(k => BY[k] && isSeen(p.words[k]));
  function dueWords(p, day, maxWorld) {
    return WORDS.filter(w => w.l <= maxWorld).filter(w => {
      const r = p.words[w.i]; return isSeen(r) && !isMastered(r) && r.due <= day;
    }).sort((a, b) => p.words[a.i].due - p.words[b.i].due || p.words[a.i].b - p.words[b.i].b);
  }
  function trickyWords(p) {
    return WORDS.filter(w => { const r = p.words[w.i]; return r && r.w > 0 && r.b <= 2; })
      .sort((a, b) => p.words[b.i].w - p.words[a.i].w);
  }

  // A quest round: a few new words, the ones that are due, then fill from the world.
  function questRound(p, world, size = 10, rnd = Math.random, day = dayNum()) {
    const pool = BYWORLD[world] || [];
    const unseen = pool.filter(w => !isSeen(p.words[w.i]));
    const due = dueWords(p, day, world);
    const take = [], used = new Set();
    const add = (arr, n) => { for (const w of arr) { if (take.length >= size || n <= 0) break; if (!used.has(w.i)) { used.add(w.i); take.push(w); n--; } } };
    add(due.filter(w => w.l === world), 4);
    add(due, 2);
    add(shuffle(unseen.slice(0, 24), rnd), size - take.length > 4 ? 4 : 3);
    add(due, size);
    add(shuffle(unseen.slice(0, 40), rnd), size);
    add(shuffle(pool.filter(w => !isMastered(p.words[w.i])), rnd), size);
    add(shuffle(pool, rnd), size);                       // everything mastered: keep it fun, review
    return shuffle(take, rnd);
  }
  function rematchRound(p, size = 10, rnd = Math.random) { return shuffle(trickyWords(p).slice(0, 24), rnd).slice(0, size); }
  function dailyRound(p, rnd = Math.random, day = dayNum()) {
    const top = Math.max(1, Math.min(8, focusWorld(p)));
    const pool = WORDS.filter(w => w.l <= top && w.l >= Math.max(1, top - 2));
    const due = dueWords(p, day, top);
    const take = [], used = new Set();
    for (const w of [...due.slice(0, 5), ...shuffle(pool, rnd)]) { if (take.length >= 10) break; if (!used.has(w.i)) { used.add(w.i); take.push(w); } }
    return shuffle(take, rnd);
  }
  function bossRound(p, world, rnd = Math.random) {
    const hp = Art.BOSSES[world - 1].hp, pool = BYWORLD[world] || [];
    const seen = pool.filter(w => isSeen(p.words[w.i]));
    const rest = pool.filter(w => !isSeen(p.words[w.i]));
    return shuffle(seen, rnd).concat(shuffle(rest, rnd)).slice(0, hp + 4);
  }
  function speedPool(p, rnd = Math.random) {
    const top = Math.max(1, focusWorld(p));
    const k = shuffle(known(p).map(i => BY[i]).filter(w => w.l <= top), rnd);
    const fill = shuffle(WORDS.filter(w => w.l <= top), rnd);
    return k.concat(fill).slice(0, 80);
  }
  // Placement: a staircase through the worlds. Right goes up a world, wrong goes down one.
  function placementWord(level, usedIds, rnd = Math.random) {
    const pool = (BYWORLD[level] || []).filter(w => !usedIds.has(w.i) && w.i.length >= 5);
    return pickOne(pool.length ? pool : BYWORLD[level], rnd);
  }
  function placementNext(level, ok) { return Math.max(1, Math.min(8, level + (ok ? 1 : -1))); }
  function placementResult(trail) {          // trail: [{level, ok}]
    const tail = trail.slice(-8);
    const right = tail.filter(t => t.ok).map(t => t.level);
    const best = right.length ? Math.max(...right) : 1;
    const avg = tail.reduce((s, t) => s + t.level, 0) / Math.max(1, tail.length);
    return Math.max(1, Math.min(8, Math.round((best + avg) / 2) - 0));
  }

  // ── streak, quests, calendar ───────────────────────────────────────────────
  function touchStreak(p, day) {
    const s = p.streak;
    if (s.last === day) return false;
    if (s.last === day - 1) s.n++;
    else if (s.last === day - 2 && bal(p, 'shield') > 0 && s.n > 0) { spend(p, 'shield', 1); s.n++; }
    else s.n = 1;
    s.last = day; s.best = Math.max(s.best, s.n);
    return true;
  }
  const dayRec = (p, day) => p.days[day] || (p.days[day] = { right: 0, wrong: 0, typedNH: 0, rounds: 0, fixed: 0, hard: 0, combo: 0, bossFights: 0, speed: 0 });
  function pruneDays(p, day) { for (const k of Object.keys(p.days)) if (+k < day - 40) delete p.days[k]; }

  function ensureQuests(p, day = dayNum()) {
    if (p.quests.day === day && p.quests.list.length) return p.quests;
    const r = seeded(day * 7919 + 13), lv = levelFromXp(p.xp), size = lv < 8 ? 0 : lv < 20 ? 1 : 2;
    const fw = focusWorld(p), bp = worldProgress(p, fw);
    const can = (q) => q.id === 'boss' ? (bp.ready && !p.bosses[fw]) : q.id === 'tricky' ? trickyWords(p).length >= 3 : q.id === 'hard' ? fw >= 2 : true;
    const pool = QUESTS.map((q, i) => i).filter(i => can(QUESTS[i]));
    const ids = shuffle(pool, r).slice(0, 3);
    p.quests = { day, list: ids.map(i => ({ id: QUESTS[i].id, need: QUESTS[i].need[size], claimed: false })), bonus: false };
    return p.quests;
  }
  function questState(p, day = dayNum()) {
    ensureQuests(p, day);
    const d = p.days[day] || {};
    return p.quests.list.map(q => {
      const t = QUESTS.find(x => x.id === q.id), have = d[t.metric] || 0;
      return { ...q, text: t.text(q.need), have: Math.min(have, q.need), done: have >= q.need };
    });
  }
  function claimQuest(p, idx, day = dayNum()) {
    const st = questState(p, day), q = st[idx];
    if (!q || !q.done || p.quests.list[idx].claimed) return null;
    p.quests.list[idx].claimed = true;
    earn(p, 'gems', QUEST_REWARD.gems); earn(p, 'coins', QUEST_REWARD.coins);
    const out = { gems: QUEST_REWARD.gems, coins: QUEST_REWARD.coins };
    if (!p.quests.bonus && p.quests.list.every(x => x.claimed)) {
      p.quests.bonus = true; earn(p, QUEST_ALL_BONUS.crate, 1); earn(p, 'gems', QUEST_ALL_BONUS.gems);
      out.bonus = QUEST_ALL_BONUS;
    }
    return out;
  }
  const calendarReady = (p, day = dayNum()) => p.streak.last === day && p.cal.day !== day;
  function claimCalendar(p, day = dayNum()) {
    if (!calendarReady(p, day)) return null;
    const i = (Math.max(1, p.streak.n) - 1) % 7, r = CALENDAR[i];
    p.cal.day = day;
    if (r.coins) earn(p, 'coins', r.coins); if (r.gems) earn(p, 'gems', r.gems); if (r.crate) earn(p, r.crate, 1);
    return { index: i, ...r };
  }

  // ── scoring ────────────────────────────────────────────────────────────────
  const BASE_XP = { pick: 4, missing: 6, scramble: 6, type: 10 };
  const MODE_XP = { quest: 1, daily: 1.25, boss: 1.5, speed: .6, rematch: 1.1, placement: 0 };
  const formFromBond = (bond) => bond >= FORM_AT[2] ? 3 : bond >= FORM_AT[1] ? 2 : 1;
  function levelUpRewards(lv) {
    const r = { gems: 2, coins: 25 + lv * 5 };
    if (lv % 10 === 0) r.crate = 'silver'; else if (lv % 5 === 0) r.crate = 'bronze';
    return r;
  }

  // One finished word. ev: { i, kind, ok, tries, hints:{len,letter}, mode, combo, final }
  // Returns what happened so the screen can celebrate it: { xp, coins, events:[...] }.
  function answer(p, ev, now = Date.now()) {
    const day = dayNum(now), w = BY[ev.i], mode = ev.mode || 'quest', hints = ev.hints || {};
    const out = { xp: 0, coins: 0, events: [] };
    if (!w) return out;
    touchStreak(p, day); pruneDays(p, day);
    const d = dayRec(p, day), r = rec(p, w.i);
    const before = { lv: levelFromXp(p.xp), had: r.w > 0 && r.b <= 2 };
    const typed = ev.kind === 'type', clean = !hints.len && !hints.letter;
    p.playedAt = now;

    if (mode === 'placement') {
      if (ev.ok) { r.r++; r.b = Math.max(r.b, 2); r.t = day; r.due = day + INTERVAL[r.b]; } else { r.w++; }
      return out;
    }
    if (ev.ok) {
      r.r++; p.stats.right++; d.right++;
      const first = (ev.tries || 1) === 1;
      if (ev.fresh) {
        // typed straight after copying it off the learn card: it counts and lifts the word to box 1,
        // but it is not memory yet, so no mastery-day credit
        if (first && r.b < 1) r.b = 1;
      } else if (first && typed && !hints.letter) {
        r.b = Math.min(5, r.b + 1);
        if (!r.d.includes(day)) { r.d.push(day); r.d = r.d.slice(-4); }
        p.stats.typed++;
        if (clean) { d.typedNH++; p.stats.typedNH++; }
        if (before.had) { d.fixed++; p.stats.fixed++; }
        if (first) for (const [g, test] of Object.entries(TRAP_GROUPS)) if ((w.tr || []).some(t => test(t[2] || ''))) p.stats.traps[g] = (p.stats.traps[g] || 0) + 1;
      } else if (first && !typed) { if (r.b < 2) r.b++; }
      // a second try, or a hint that gave the letter away, learns the word but does not advance its box
      r.t = day; r.due = day + INTERVAL[r.b];
      if (w.l >= focusWorld(p)) d.hard++;           // a word from the world she is working on, or higher
      const combo = ev.combo || 1;
      d.combo = Math.max(d.combo, combo); p.stats.comboBest = Math.max(p.stats.comboBest, combo);
      let mult = (MODE_XP[mode] != null ? MODE_XP[mode] : 1) * (1 + .12 * (w.l - 1));
      if (typed && clean && first) mult *= 1.2;
      if (hints.letter) mult *= .5; else if (hints.len) mult *= .8;
      if (!first) mult *= .5;
      if (ev.fresh) mult *= .6;
      out.xp = Math.max(1, Math.round(BASE_XP[ev.kind] * mult)) + (first ? Math.min(10, combo - 1) : 0);
      out.coins = Math.round((typed ? 3 : 1) * (1 + .1 * (w.l - 1)) * (first ? 1 : .5));
      p.xp += out.xp; earn(p, 'coins', out.coins);
      // the partner grows
      const a = p.allies[p.ally];
      if (a) {
        const f0 = formFromBond(a.bond); a.bond += typed ? 2 : 1;
        const f1 = formFromBond(a.bond);
        if (f1 > f0) { p.stats.evolutions++; out.events.push({ t: 'evolve', k: p.ally, from: f0, to: f1 }); }
      }
      // the crate meter
      p.crateProg++;
      if (p.crateProg >= WORDS_PER_CRATE) { p.crateProg -= WORDS_PER_CRATE; earn(p, 'bronze', 1); p.stats.crates++; out.events.push({ t: 'crate', tier: 'bronze' }); }
      const lv = levelFromXp(p.xp);
      for (let L = before.lv + 1; L <= lv; L++) {
        const rw = levelUpRewards(L);
        earn(p, 'gems', rw.gems); earn(p, 'coins', rw.coins); if (rw.crate) earn(p, rw.crate, 1);
        out.events.push({ t: 'levelup', level: L, title: rankTitle(L), rewards: rw, newRank: rankTitle(L) !== rankTitle(L - 1) });
      }
    } else if (ev.final !== false) {
      r.w++; p.stats.wrong++; d.wrong++;
      r.b = Math.max(0, r.b - 2); r.t = day; r.due = day;
    }
    for (const a of checkAch(p, day)) out.events.push({ t: 'ach', id: a.id, name: a.name, reward: a.reward });
    return out;
  }

  function roundDone(p, info, now = Date.now()) {          // info: { right, total, perfect, mode }
    const day = dayNum(now), d = dayRec(p, day);
    d.rounds++; p.stats.rounds++;
    const acc = info.total ? info.right / info.total : 0;
    const stars = info.right === 0 ? 0 : acc >= .9 ? 3 : acc >= .7 ? 2 : 1;
    if (info.perfect && info.total >= 8) p.stats.perfect++;
    const xp = info.mode === 'placement' ? 0 : 10 + stars * 6, coins = stars * 6;
    const before = levelFromXp(p.xp);
    p.xp += xp; earn(p, 'coins', coins);
    const events = [];
    for (let L = before + 1; L <= levelFromXp(p.xp); L++) {
      const rw = levelUpRewards(L); earn(p, 'gems', rw.gems); earn(p, 'coins', rw.coins); if (rw.crate) earn(p, rw.crate, 1);
      events.push({ t: 'levelup', level: L, title: rankTitle(L), rewards: rw, newRank: rankTitle(L) !== rankTitle(L - 1) });
    }
    const a = p.allies[p.ally]; if (a) a.bond += 5;
    for (const x of checkAch(p, day)) events.push({ t: 'ach', id: x.id, name: x.name, reward: x.reward });
    return { stars, xp, coins, events };
  }

  function bossFought(p, world, won, now = Date.now()) {
    const day = dayNum(now), d = dayRec(p, day);
    d.bossFights++; p.stats.bossFights++;
    const out = { first: false, crate: null, gems: 0 };
    if (won) {
      p.stats.bossWins++;
      out.first = !p.bosses[world];
      p.bosses[world] = (p.bosses[world] || 0) + 1;
      out.crate = out.first ? 'gold' : 'silver';
      out.gems = out.first ? 15 : 8;
      earn(p, out.crate, 1); earn(p, 'gems', out.gems);
      if (world < 8) out.opened = world + 1;
    }
    out.events = checkAch(p, day).map(a => ({ t: 'ach', id: a.id, name: a.name, reward: a.reward }));
    return out;
  }
  function speedDone(p, score, now = Date.now()) {
    const day = dayNum(now), d = dayRec(p, day);
    d.speed = Math.max(d.speed, score);
    const newBest = score > p.stats.speedBest; p.stats.speedBest = Math.max(p.stats.speedBest, score);
    const xp = score * 5, coins = score * 2; p.xp += xp; earn(p, 'coins', coins);
    return { xp, coins, newBest, events: checkAch(p, day).map(a => ({ t: 'ach', id: a.id, name: a.name, reward: a.reward })) };
  }
  function dailyDone(p, now = Date.now()) {
    const day = dayNum(now);
    if (p.dailyDone === day) return null;
    p.dailyDone = day; p.stats.daily++;
    earn(p, 'bronze', 1); earn(p, 'gems', 3);
    return { crate: 'bronze', gems: 3 };
  }

  // ── crates ─────────────────────────────────────────────────────────────────
  const ALLY_ODDS = { bronze: { C: 70, R: 25, E: 5, L: 0 }, silver: { C: 35, R: 45, E: 17, L: 3 }, gold: { C: 0, R: 50, E: 40, L: 10 } };
  const MAIN_ODDS = { bronze: [['ally', 55], ['gear', 25], ['hero', 10], ['coins', 10]], silver: [['ally', 60], ['gear', 20], ['hero', 10], ['gems', 10]], gold: [['ally', 70], ['gear', 15], ['hero', 10], ['gems', 5]] };
  function weighted(pairs, r) { const tot = pairs.reduce((s, x) => s + x[1], 0); let x = r() * tot; for (const [k, w] of pairs) { if ((x -= w) < 0) return k; } return pairs[0][0]; }
  function openCrate(p, tier, rnd = Math.random) {
    if (!spend(p, tier, 1)) return null;
    const items = [];
    let main = weighted(MAIN_ODDS[tier], rnd);
    if (main === 'gear' && GEAR.every(g => p.gearOwned.includes(g.id))) main = 'coins';
    if (main === 'hero' && Art.HEROES.every(h => p.heroes.includes(h.k))) main = 'coins';
    if (main === 'ally') {
      let odds = Object.assign({}, ALLY_ODDS[tier]);
      if (p.pity >= 8) { odds = { C: 0, R: 0, E: 80, L: 20 }; }
      const rar = weighted(Object.entries(odds), rnd);
      let pool = ALLIES.filter(a => a.r === rar);
      // prefer one she does not own yet; if she owns the whole rarity, a duplicate pays out in bond
      const fresh = pool.filter(a => !p.allies[a.k]);
      const a = pickOne(fresh.length ? fresh : pool, rnd);
      if (rar === 'E' || rar === 'L') p.pity = 0; else p.pity++;
      if (p.allies[a.k]) { p.allies[a.k].bond += 40; earn(p, 'coins', 25); items.push({ t: 'ally', k: a.k, dup: true, bond: 40, coins: 25 }); }
      else { p.allies[a.k] = { bond: 0 }; items.push({ t: 'ally', k: a.k, dup: false }); }
    } else if (main === 'gear') {
      const g = pickOne(GEAR.filter(x => !p.gearOwned.includes(x.id)), rnd);
      p.gearOwned.push(g.id); items.push({ t: 'gear', id: g.id });
    } else if (main === 'hero') {
      const h = pickOne(Art.HEROES.filter(x => !p.heroes.includes(x.k)), rnd);
      p.heroes.push(h.k); items.push({ t: 'hero', k: h.k });
    } else if (main === 'gems') { const n = tier === 'gold' ? 12 : 6; earn(p, 'gems', n); items.push({ t: 'gems', n }); }
    else { const n = 100 + Math.floor(rnd() * 100); earn(p, 'coins', n); items.push({ t: 'coins', n }); }
    // a little extra in every crate
    const bonus = { bronze: [20, 40], silver: [40, 80], gold: [80, 160] }[tier];
    const c = bonus[0] + Math.floor(rnd() * (bonus[1] - bonus[0])); earn(p, 'coins', c); items.push({ t: 'coins', n: c });
    if (tier !== 'bronze') { earn(p, 'hint', tier === 'gold' ? 3 : 1); items.push({ t: 'hint', n: tier === 'gold' ? 3 : 1 }); }
    p.stats.opened = (p.stats.opened || 0) + 1;
    return items;
  }

  // ── the shop ───────────────────────────────────────────────────────────────
  function buy(p, what, id) {
    if (what === 'theme') { const t = THEMEBY[id]; if (!t || p.themesOwned.includes(id) || !spend(p, 'coins', t.price)) return false; p.themesOwned.push(id); return true; }
    if (what === 'gear') { const g = GEARBY[id]; if (!g || p.gearOwned.includes(id) || !spend(p, 'coins', g.price)) return false; p.gearOwned.push(id); return true; }
    if (what === 'hero') { if (!HEROBY[id] || p.heroes.includes(id) || !spend(p, 'coins', HERO_PRICE)) return false; p.heroes.push(id); return true; }
    if (what === 'hint') { if (!spend(p, 'coins', HINT_PACK.coin)) return false; earn(p, 'hint', HINT_PACK.amount); return true; }
    if (what === 'shield') { if (!spend(p, 'coins', SHIELD.coin)) return false; earn(p, 'shield', 1); return true; }
    if (what === 'crate') { const c = CRATES[id]; if (!c) return false; if (c.coin ? !spend(p, 'coins', c.coin) : !spend(p, 'gems', c.gem)) return false; earn(p, id, 1); return true; }
    return false;
  }
  function equipGear(p, allyKey, id) {
    const g = GEARBY[id]; if (!g || !p.gearOwned.includes(id) || !p.allies[allyKey]) return false;
    const e = p.equip[allyKey] || (p.equip[allyKey] = {});
    e[g.slot] = e[g.slot] === id ? null : id; return true;
  }
  const gearFor = (p, k) => { const e = p.equip[k] || {}; return { hat: e.hat || null, eyes: e.eyes || null, back: e.back || null }; };

  // ── achievements ───────────────────────────────────────────────────────────
  const N = (n) => (p) => p.stats.right >= n;
  const ACH = [];
  const add = (id, name, desc, test, gems = 5, coins = 0) => ACH.push({ id, name, desc, test, reward: { gems, coins } });
  [[1, 'First Word', 2], [25, 'Warming Up', 3], [100, 'Century', 5], [500, 'Word Machine', 8], [1000, 'Thousand Club', 12], [2500, 'Spelling Legend', 20]]
    .forEach(([n, name, g]) => add('right' + n, name, `Spell ${n} word${n > 1 ? 's' : ''} right`, N(n), g));
  [[3, '3-Day Streak', 3], [7, 'Week Warrior', 8], [14, 'Two-Week Titan', 12], [30, 'Month of Mastery', 25]]
    .forEach(([n, name, g]) => add('streak' + n, name, `Play ${n} days in a row`, p => p.streak.best >= n, g));
  [[10, 'On Fire', 3], [20, 'Unstoppable', 6], [30, 'Perfect Run', 10]]
    .forEach(([n, name, g]) => add('combo' + n, name, `Get ${n} right in a row`, p => p.stats.comboBest >= n, g));
  [[10, 'Memory Spark', 4], [50, 'Brain Gains', 8], [100, 'Walking Dictionary', 12], [250, 'Lexicon Keeper', 20], [500, 'Word Wizard', 30]]
    .forEach(([n, name, g]) => add('mast' + n, name, `Master ${n} words`, p => masteredCount(p) >= n, g));
  [[1, 'Boss Slayer', 8], [4, 'Boss Hunter', 12], [8, 'Dragon Conqueror', 25]]
    .forEach(([n, name, g]) => add('boss' + n, name, `Defeat ${n} boss${n > 1 ? 'es' : ''}`, p => Object.keys(p.bosses).filter(k => p.bosses[k]).length >= n, g));
  [[1, 'Flawless', 5], [5, 'Five Flawless', 10], [15, 'Mr. Perfect', 20]]
    .forEach(([n, name, g]) => add('perfect' + n, name, `Finish ${n} perfect round${n > 1 ? 's' : ''}`, p => p.stats.perfect >= n, g));
  [[25, 'No Peeking', 4], [100, 'Iron Memory', 10], [250, 'Typing Titan', 18]]
    .forEach(([n, name, g]) => add('nh' + n, name, `Type ${n} words with no hints`, p => p.stats.typedNH >= n, g));
  [[5, 'Squad Up', 4], [10, 'Team Builder', 10], [20, 'Collector', 20], [24, 'Gotta Have Them All', 40]]
    .forEach(([n, name, g]) => add('allies' + n, name, `Collect ${n} allies`, p => Object.keys(p.allies).length >= n, g));
  add('evolve1', 'Level Up!', 'Evolve an ally', p => p.stats.evolutions >= 1, 8);
  add('evolve3', 'Final Form', 'Take an ally to Form 3', p => Object.values(p.allies).some(a => formFromBond(a.bond) === 3), 25);
  [[15, 'Quick Fingers', 5], [25, 'Speed Demon', 10], [40, 'Lightning Brain', 20]]
    .forEach(([n, name, g]) => add('speed' + n, name, `Score ${n} in a Speed Round`, p => p.stats.speedBest >= n, g));
  add('silent20', 'Silent Hunter', 'Spell 20 silent-letter words', p => (p.stats.traps.silent || 0) >= 20, 10);
  add('double25', 'Double Trouble', 'Spell 25 double-letter words', p => (p.stats.traps.double || 0) >= 25, 10);
  add('ieei15', 'Rule Breaker', 'Spell 15 ie/ei words', p => (p.stats.traps.ieei || 0) >= 15, 10);
  add('ending25', 'Ending Expert', 'Spell 25 words with tricky endings', p => (p.stats.traps.ending || 0) >= 25, 10);
  add('ough10', 'Tough Cookie', 'Spell 10 -ough/-augh words', p => (p.stats.traps.ough || 0) >= 10, 10);
  add('daily5', 'Daily Grind', 'Finish 5 Daily Challenges', p => p.stats.daily >= 5, 10);
  add('level10', 'Scribe', 'Reach level 10', p => levelFromXp(p.xp) >= 10, 8);
  add('level25', 'Sage', 'Reach level 25', p => levelFromXp(p.xp) >= 25, 20);
  add('crates10', 'Crate Crazy', 'Open 10 crates', p => (p.stats.opened || 0) >= 10, 12);
  for (const w of WORLDS) add('world' + w.n, 'Master of ' + w.name, `Master 80% of ${w.name}`, p => { const q = worldProgress(p, w.n); return q.total > 0 && q.mastered / q.total >= .8; }, 15 + w.n * 3);

  function checkAch(p, day = dayNum()) {
    const got = [];
    for (const a of ACH) {
      if (p.ach[a.id] != null) continue;
      let ok = false; try { ok = a.test(p); } catch (e) { ok = false; }
      if (!ok) continue;
      p.ach[a.id] = day; earn(p, 'gems', a.reward.gems); if (a.reward.coins) earn(p, 'coins', a.reward.coins);
      got.push(a);
    }
    return got;
  }

  // ── merging two copies of one child's progress ─────────────────────────────
  // Totals take the higher number, owned things take the union, and for things that
  // can legitimately go backwards (a word's box) the more recently played copy wins.
  function merge(a, b) {
    if (!a) return sanitize(b); if (!b) return sanitize(a);
    a = sanitize(JSON.parse(JSON.stringify(a))); b = sanitize(JSON.parse(JSON.stringify(b)));
    const A = (a.playedAt || 0) >= (b.playedAt || 0) ? a : b, B = A === a ? b : a;       // A = newer
    const out = JSON.parse(JSON.stringify(A));
    out.xp = Math.max(a.xp, b.xp);
    for (const k of LEDGERS) out.led[k] = { e: Math.max(a.led[k].e, b.led[k].e), s: Math.max(a.led[k].s, b.led[k].s) };
    out.heroes = [...new Set([...a.heroes, ...b.heroes])];
    out.gearOwned = [...new Set([...a.gearOwned, ...b.gearOwned])];
    out.themesOwned = [...new Set([...a.themesOwned, ...b.themesOwned])];
    out.allies = {};
    for (const k of new Set([...Object.keys(a.allies), ...Object.keys(b.allies)]))
      out.allies[k] = { bond: Math.max((a.allies[k] || {}).bond || 0, (b.allies[k] || {}).bond || 0) };
    out.equip = Object.assign({}, B.equip, A.equip);
    out.words = {};
    for (const k of new Set([...Object.keys(a.words), ...Object.keys(b.words)])) {
      const x = a.words[k], y = b.words[k];
      if (!x || !y) { out.words[k] = JSON.parse(JSON.stringify(x || y)); continue; }
      const n = (x.t >= y.t ? x : y);
      out.words[k] = { b: n.b, r: Math.max(x.r, y.r), w: Math.max(x.w, y.w), t: Math.max(x.t, y.t), due: n.due,
                       d: [...new Set([...x.d, ...y.d])].sort((p1, p2) => p1 - p2).slice(-4) };
    }
    out.bosses = {}; for (const k of new Set([...Object.keys(a.bosses), ...Object.keys(b.bosses)])) out.bosses[k] = Math.max(a.bosses[k] || 0, b.bosses[k] || 0);
    out.maxWorld = Math.max(a.maxWorld || 1, b.maxWorld || 1); out.placed = a.placed || b.placed;
    out.streak = { n: A.streak.n, last: A.streak.last, best: Math.max(a.streak.best, b.streak.best) };
    out.ach = {}; for (const k of new Set([...Object.keys(a.ach), ...Object.keys(b.ach)])) out.ach[k] = Math.min(a.ach[k] == null ? 1e9 : a.ach[k], b.ach[k] == null ? 1e9 : b.ach[k]);
    out.stats = {};
    for (const k of Object.keys(a.stats)) {
      if (k === 'traps') { out.stats.traps = {}; for (const g of new Set([...Object.keys(a.stats.traps), ...Object.keys(b.stats.traps)])) out.stats.traps[g] = Math.max(a.stats.traps[g] || 0, b.stats.traps[g] || 0); }
      else out.stats[k] = Math.max(a.stats[k] || 0, b.stats[k] || 0);
    }
    out.days = Object.assign({}, B.days, A.days);
    out.cal = { day: Math.max(a.cal.day, b.cal.day) };
    out.dailyDone = Math.max(a.dailyDone, b.dailyDone);
    out.crateProg = A.crateProg; out.pity = Math.max(a.pity, b.pity);
    out.playedAt = Math.max(a.playedAt || 0, b.playedAt || 0);
    // keep an equipped partner / hero that still exists after the union
    return sanitize(out);
  }

  return {
    dayNum, seeded, shuffle, blank, sanitize, bal, earn, spend, rec, isMastered, isKnown, isSeen, worldProgress, unlocked, focusWorld,
    masteredCount, kindFor, freshKind, choices, scramble, blanks, diff, same, dueWords, trickyWords, questRound, rematchRound, dailyRound, bossRound,
    speedPool, placementWord, placementNext, placementResult, touchStreak, dayRec, ensureQuests, questState, claimQuest, calendarReady,
    claimCalendar, formFromBond, levelUpRewards, answer, roundDone, bossFought, speedDone, dailyDone, openCrate, buy, equipGear, gearFor,
    ACH, checkAch, merge, BY, BYWORLD, ALLYBY, HEROBY, GEARBY, THEMEBY, INTERVAL, LEDGERS,
  };
})();
if (typeof module !== 'undefined') module.exports = Engine;
