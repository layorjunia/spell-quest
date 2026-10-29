// node dev/test_engine.js — the rules, tested. Exit code 1 on any failure.
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, Date, JSON, Object, Array, Set, Map, Number, String, module: undefined });
for (const f of ['words.js', 'data.js', 'data-allies.js', 'art.js', 'art-more.js', 'engine.js']) {
  vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8').replace(/^const (\w+) =/gm, 'var $1 ='), ctx, { filename: f });
}
const E = ctx.Engine, WORDS = ctx.WORDS, WORLDS = ctx.WORLDS, ALLIES = ctx.ALLIES, Art = ctx.Art;
let fails = 0, passes = 0;
const ok = (c, m) => { if (c) passes++; else { fails++; console.log('  FAIL:', m); } };
const eq = (a, b, m) => ok(JSON.stringify(a) === JSON.stringify(b), `${m}: got ${JSON.stringify(a)} want ${JSON.stringify(b)}`);
const T = (name, fn) => { console.log('·', name); try { fn(); } catch (e) { fails++; console.log('  THREW:', e.stack.split('\n').slice(0, 3).join(' | ')); } };
const DAY = 86400000, t0 = Date.UTC(2026, 9, 1, 15);        // 1 Oct 2026, mid-afternoon: safe from tz edges
const at = (d) => t0 + d * DAY;
const mkp = () => E.sanitize(E.blank());
let seed = 7; const rnd = E.seeded(seed);

T('data is sound', () => {
  ok(WORDS.length > 800, 'word count ' + WORDS.length);
  ok(ALLIES.length === 24, '24 allies'); ok(Art.HEROES.length === 12, '12 heroes'); ok(Art.BOSSES.length === 8, '8 bosses');
  for (const w of WORDS) { ok(w.x.length >= 3, w.i + ' has 3+ wrong spellings'); ok(w.x.every(x => x !== w.i), w.i + ' wrong spellings differ'); ok(w.s.toLowerCase().includes(w.i), w.i + ' in sentence'); }
  const seen = new Set(); for (const w of WORDS) { ok(!seen.has(w.i), 'dup ' + w.i); seen.add(w.i); }
  for (const a of ALLIES) for (const f of [1, 2, 3]) { const svg = Art.ally(a, f); ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), a.k + f + ' svg'); }
  const rar = {}; ALLIES.forEach(a => rar[a.r] = (rar[a.r] || 0) + 1); eq(rar, { C: 12, R: 7, E: 3, L: 2 }, 'rarity counts');
});

T('diff and grading', () => {
  eq(E.diff('necessary', 'necessary').map(x => x.s).join(''), 'ok'.repeat(9), 'exact');
  const d = E.diff('neccessary', 'necessary'); ok(d.filter(x => x.s === 'bad').length === 1, 'one extra letter'); ok(d.filter(x => x.s === 'ok').length === 9, 'nine right');
  const g = E.diff('definately', 'definitely'); ok(g.some(x => x.s === 'bad'), 'wrong a flagged');
  const m = E.diff('seperate', 'separate'); ok(m.filter(x => x.s === 'bad').length === 1, 'seperate: one wrong letter');
  const miss = E.diff('wierd', 'weird'); ok(miss.filter(x => x.s !== 'ok').length >= 1, 'transposition flagged');
  const short = E.diff('nec', 'necessary'); eq(short.filter(x => x.s === 'gap').length, 6, 'short answer shows 6 gaps');
  ok(E.same(' Friend ', E.BY.friend), 'trim+case'); ok(!E.same('frend', E.BY.friend), 'wrong');
});

T('question builders', () => {
  for (const w of WORDS) {
    const c = E.choices(w, rnd); ok(c.length === 4 && new Set(c).size === 4 && c.filter(x => x === w.i).length === 1, w.i + ' choices');
    const s = E.scramble(w, rnd); ok(s.join('') !== w.i && s.slice().sort().join('') === w.i.split('').sort().join(''), w.i + ' scramble');
    const b = E.blanks(w, rnd); ok(b.length >= 2 && b.every(i => i >= 0 && i < w.i.length) && new Set(b).size === b.length, w.i + ' blanks ' + b);
  }
  const tw = E.BY.weather; let hit = 0; for (let i = 0; i < 50; i++) if (E.choices(tw, rnd).includes('whether')) hit++; ok(hit > 25, 'sound-alike twin appears as a choice');
});

T('spaced repetition: recognition never masters', () => {
  const p = mkp(); const w = 'friend';
  for (let i = 0; i < 12; i++) E.answer(p, { i: w, kind: 'pick', ok: true, tries: 1, combo: 1 }, at(i));
  ok(p.words[w].b === 2, 'pick/missing/scramble cap at box 2, got ' + p.words[w].b);
  ok(!E.isMastered(p.words[w]), 'not mastered by taps');
});
T('spaced repetition: typed on two days masters', () => {
  const p = mkp(); const w = 'friend';
  for (let i = 0; i < 3; i++) E.answer(p, { i: w, kind: 'pick', ok: true, tries: 1, combo: 1 }, at(0));
  for (let i = 0; i < 4; i++) E.answer(p, { i: w, kind: 'type', ok: true, tries: 1, combo: 1 }, at(0));
  ok(p.words[w].b >= 4 && !E.isMastered(p.words[w]), 'box 4+ but one day only is not mastered (b=' + p.words[w].b + ')');
  E.answer(p, { i: w, kind: 'type', ok: true, tries: 1, combo: 1 }, at(2));
  ok(E.isMastered(p.words[w]), 'second day of typed recall masters it');
});
T('spaced repetition: misses, hints, second tries', () => {
  const p = mkp(); const w = 'island';
  for (let i = 0; i < 5; i++) E.answer(p, { i: w, kind: 'type', ok: true, tries: 1, combo: 1 }, at(i));
  ok(p.words[w].b === 5, 'box 5'); const before = p.words[w].r;
  E.answer(p, { i: w, kind: 'type', ok: false, tries: 2, final: true }, at(6));
  ok(p.words[w].b === 3 && p.words[w].w === 1 && p.words[w].due === E.dayNum(at(6)), 'miss drops two boxes and is due now');
  E.answer(p, { i: w, kind: 'type', ok: true, tries: 1, hints: { letter: 1 }, combo: 1 }, at(7));
  ok(p.words[w].b === 3, 'a letter hint does not advance the box');
  E.answer(p, { i: w, kind: 'type', ok: true, tries: 2, combo: 1 }, at(8));
  ok(p.words[w].b === 3, 'second try does not advance the box');
  E.answer(p, { i: w, kind: 'type', ok: true, tries: 1, hints: { len: 1 }, combo: 1 }, at(9));
  ok(p.words[w].b === 4, 'a length hint still counts');
  const p2 = mkp(); const xp1 = E.answer(p2, { i: 'knee', kind: 'type', ok: true, tries: 1, combo: 1 }, at(0)).xp;
  const p3 = mkp(); const xp2 = E.answer(p3, { i: 'knee', kind: 'type', ok: true, tries: 1, hints: { letter: 1 }, combo: 1 }, at(0)).xp;
  ok(xp1 > xp2, 'hints lower the XP: ' + xp1 + ' vs ' + xp2);
  const p4 = mkp(); E.answer(p4, { i: 'knee', kind: 'type', ok: false, tries: 1, final: false }, at(0));
  ok(!p4.words.knee || p4.words.knee.w === 0, 'a first miss with a retry coming is not recorded yet');
});
T('placement answers never punish', () => {
  const p = mkp(); E.answer(p, { i: 'necessary', kind: 'type', ok: false, mode: 'placement' }, at(0));
  ok(p.xp === 0 && E.bal(p, 'coins') === 100, 'no xp or coins');
  E.answer(p, { i: 'island', kind: 'type', ok: true, mode: 'placement' }, at(0)); ok(p.words.island.b === 2, 'right answer = known');
});

T('xp, levels, rewards', () => {
  ok(ctx.levelFromXp(0) === 1 && ctx.levelFromXp(39) === 1 && ctx.levelFromXp(40) === 2 && ctx.levelFromXp(160) === 3, 'level curve');
  ok(ctx.rankTitle(1) === 'Rookie' && ctx.rankTitle(4) === 'Apprentice' && ctx.rankTitle(99) === 'Legend', 'rank titles');
  const p = mkp(); let lv = 1, evs = [];
  for (let i = 0; i < 400; i++) { const o = E.answer(p, { i: WORDS[i % 300].i, kind: 'type', ok: true, tries: 1, combo: (i % 12) + 1 }, at(i % 3)); evs.push(...o.events); }
  const ups = evs.filter(e => e.t === 'levelup').map(e => e.level);
  eq(ups, Array.from({ length: ups.length }, (_, i) => i + 2), 'every level announced once, in order');
  ok(ctx.levelFromXp(p.xp) === ups.length + 1, 'level matches xp');
  ok(E.bal(p, 'gems') >= 2 * ups.length, 'level-up gems paid');
  ok(p.stats.right === 400 && p.streak.n >= 1, 'stats and streak');
});

T('partner bond and evolution', () => {
  const p = mkp(); let evo = [];
  for (let i = 0; i < 80; i++) evo.push(...E.answer(p, { i: 'friend', kind: 'type', ok: true, tries: 1, combo: 1 }, at(0)).events.filter(e => e.t === 'evolve'));
  ok(evo.length >= 1 && evo[0].to === 2, 'evolves to form 2'); ok(E.formFromBond(p.allies.cinder.bond) >= 2, 'bond>=60');
  ok(E.formFromBond(59) === 1 && E.formFromBond(60) === 2 && E.formFromBond(219) === 2 && E.formFromBond(220) === 3, 'thresholds');
});

T('crates', () => {
  const p = mkp(); ok(E.bal(p, 'bronze') === 1, 'welcome crate');
  const items = E.openCrate(p, 'bronze', rnd); ok(items && items.length >= 2, 'opens'); ok(E.bal(p, 'bronze') === 0, 'consumed');
  ok(E.openCrate(p, 'bronze', rnd) === null, 'cannot open an empty crate');
  // soak: lots of crates, everything stays valid
  const q = mkp(); q.led.gold.e = 400; q.led.silver.e = 400; q.led.bronze.e = 400; const got = { ally: 0, gear: 0, hero: 0, coins: 0, gems: 0, dup: 0 }; const rar = { C: 0, R: 0, E: 0, L: 0 };
  for (const tier of ['bronze', 'silver', 'gold']) for (let i = 0; i < 400; i++) {
    const r = E.openCrate(q, tier, rnd); ok(r, 'opened ' + tier);
    for (const it of r) { if (it.t === 'ally') { got.ally++; if (it.dup) got.dup++; rar[E.ALLYBY[it.k].r]++; ok(E.ALLYBY[it.k], 'real ally'); } else if (it.t === 'gear') { got.gear++; ok(E.GEARBY[it.id], 'real gear'); } else if (it.t === 'hero') { got.hero++; ok(E.HEROBY[it.k], 'real hero'); } else got[it.t] = (got[it.t] || 0) + 1; }
  }
  ok(got.ally > 300 && got.gear > 0 && got.hero > 0, 'variety: ' + JSON.stringify(got));
  ok(Object.keys(q.allies).length === 24, 'all 24 allies reachable (' + Object.keys(q.allies).length + ')');
  ok(new Set(q.heroes).size === q.heroes.length && q.heroes.length === 12, 'heroes never duplicate, all 12 reachable');
  ok(new Set(q.gearOwned).size === q.gearOwned.length, 'gear never duplicates');
  const g = mkp(); g.led.gold.e = 200; let rarity = { C: 0, R: 0, E: 0, L: 0 };
  for (let i = 0; i < 200; i++) for (const it of E.openCrate(g, 'gold', rnd)) if (it.t === 'ally' && !it.dup) rarity[E.ALLYBY[it.k].r]++;
  ok(rarity.C === 0, 'gold crates never give Common');
  const pt = mkp(); pt.led.bronze.e = 200; let sinceEpic = 0, worst = 0;
  for (let i = 0; i < 200; i++) { const r = E.openCrate(pt, 'bronze', rnd); const ally = r.find(x => x.t === 'ally'); if (ally) { const R = E.ALLYBY[ally.k].r; if (R === 'E' || R === 'L') sinceEpic = 0; else sinceEpic++; worst = Math.max(worst, sinceEpic); } }
  ok(worst <= 25, 'pity timer keeps epic droughts short (worst ' + worst + ')');
});

T('rounds', () => {
  const p = mkp();
  const r = E.questRound(p, 1, 10, rnd, E.dayNum(at(0))); ok(r.length === 10 && new Set(r.map(w => w.i)).size === 10, 'ten distinct words');
  ok(r.every(w => w.l === 1), 'world 1 words');
  // seen+due words are prioritised
  for (const w of E.BYWORLD[1].slice(0, 30)) E.answer(p, { i: w.i, kind: 'pick', ok: true, tries: 1, combo: 1 }, at(0));
  const r2 = E.questRound(p, 1, 10, rnd, E.dayNum(at(3))); ok(r2.some(w => E.isSeen(p.words[w.i])), 'due words come back');
  ok(r2.filter(w => !E.isSeen(p.words[w.i])).length <= 5, 'not a wall of new words');
  const t = E.rematchRound(p); ok(Array.isArray(t), 'rematch');
  E.answer(p, { i: 'island', kind: 'type', ok: false, tries: 2, final: true }, at(1)); ok(E.rematchRound(p).some(w => w.i === 'island'), 'a miss shows up in rematch');
  const d = E.dailyRound(p, rnd, E.dayNum(at(4))); ok(d.length === 10, 'daily 10');
  for (let n = 1; n <= 8; n++) { const b = E.bossRound(p, n, rnd); ok(b.length === Art.BOSSES[n - 1].hp + 4 && b.every(w => w.l === n), 'boss pool ' + n); }
  const s = E.speedPool(p, rnd); ok(s.length >= 40, 'speed pool'); 
  // everything mastered: still a full round
  const m = mkp(); for (const w of E.BYWORLD[1]) m.words[w.i] = { b: 5, r: 9, w: 0, t: 0, due: 99999, d: [1, 2] };
  ok(E.questRound(m, 1, 10, rnd, 5).length === 10, 'full round even when the world is mastered');
});

T('worlds, bosses, placement', () => {
  const p = mkp(); ok(E.unlocked(p, 1) && !E.unlocked(p, 2), 'only world 1 open'); ok(E.focusWorld(p) === 1, 'focus 1');
  const wp = E.worldProgress(p, 1); ok(!wp.ready, 'boss asleep');
  for (const w of E.BYWORLD[1].slice(0, Math.ceil(E.BYWORLD[1].length * .4))) p.words[w.i] = { b: 2, r: 2, w: 0, t: 0, due: 0, d: [] };
  ok(E.worldProgress(p, 1).ready, 'boss wakes at 35% known');
  const r = E.bossFought(p, 1, true, at(0)); ok(r.first && r.crate === 'gold' && E.bal(p, 'gold') === 1, 'first boss win: gold crate');
  ok(E.unlocked(p, 2) && E.focusWorld(p) === 2, 'world 2 opens'); ok(E.bossFought(p, 1, true, at(0)).crate === 'silver', 'rematch win: silver');
  ok(!E.bossFought(p, 2, false, at(0)).crate, 'a loss pays nothing extra');
  const champ = mkp(); for (let n = 1; n <= 8; n++) champ.bosses[n] = 1;
  ok(E.focusWorld(champ) === 8, 'with every boss beaten the focus stays in world 8, not world 1 (got ' + E.focusWorld(champ) + ')');
  ok(E.questRound(champ, E.focusWorld(champ), 10, rnd, 5).length === 10, 'a champion still gets full rounds');
  let lv = 3, trail = []; for (let i = 0; i < 14; i++) { const okk = lv <= 5; trail.push({ level: lv, ok: okk }); lv = E.placementNext(lv, okk); }
  const placed = E.placementResult(trail); ok(placed >= 4 && placed <= 6, 'placement lands near the true level (' + placed + ')');
  const weak = []; let l2 = 3; for (let i = 0; i < 14; i++) { const okk = l2 <= 1; weak.push({ level: l2, ok: okk }); l2 = E.placementNext(l2, okk); }
  ok(E.placementResult(weak) <= 2, 'a beginner is placed low');
  const strong = []; let l3 = 3; for (let i = 0; i < 14; i++) { strong.push({ level: l3, ok: true }); l3 = E.placementNext(l3, true); }
  ok(E.placementResult(strong) >= 7, 'a champion is placed high');
});

T('streaks, quests, calendar', () => {
  const p = mkp();
  E.touchStreak(p, 100); E.touchStreak(p, 100); eq(p.streak.n, 1, 'same day twice is one');
  E.touchStreak(p, 101); E.touchStreak(p, 102); eq(p.streak.n, 3, 'consecutive days');
  E.touchStreak(p, 105); eq(p.streak.n, 1, 'a gap resets'); ok(p.streak.best === 3, 'best kept');
  E.earn(p, 'shield', 1); E.touchStreak(p, 106); E.touchStreak(p, 108); eq(p.streak.n, 3, 'a shield saves one missed day'); ok(E.bal(p, 'shield') === 0, 'shield used');
  const a = E.ensureQuests(mkp(), 50), b = E.ensureQuests(mkp(), 50); eq(a.list, b.list, 'same quests for the same day'); eq(a.list.length, 3, 'three quests');
  ok(new Set(a.list.map(q => q.id)).size === 3, 'distinct');
  const q = mkp(); const day = E.dayNum(at(0)); E.ensureQuests(q, day);
  const st0 = E.questState(q, day); ok(st0.every(x => !x.done), 'nothing done yet');
  q.days[day] = { right: 99, wrong: 0, typedNH: 99, rounds: 99, fixed: 99, hard: 99, combo: 99, bossFights: 9, speed: 99 };
  ok(E.questState(q, day).every(x => x.done), 'all done with big counters');
  const c0 = E.bal(q, 'gems'); const r1 = E.claimQuest(q, 0, day); ok(r1 && E.bal(q, 'gems') === c0 + 3, 'claim pays'); ok(E.claimQuest(q, 0, day) === null, 'cannot double-claim');
  E.claimQuest(q, 1, day); const r3 = E.claimQuest(q, 2, day); ok(r3 && r3.bonus, 'all three: bonus crate');
  const cal = mkp(); E.touchStreak(cal, day); ok(E.calendarReady(cal, day), 'ready'); ok(E.claimCalendar(cal, day) && !E.calendarReady(cal, day), 'claimed once a day');
  const k = mkp(); k.streak = { n: 7, best: 7, last: day }; ok(E.claimCalendar(k, day).crate === 'silver', 'day 7 = silver crate');
  const dd = mkp(); ok(E.dailyDone(dd, at(0)) && E.dailyDone(dd, at(0)) === null, 'daily challenge pays once a day');
});

T('shop', () => {
  const p = mkp(); E.earn(p, 'coins', 5000); E.earn(p, 'gems', 100);
  ok(E.buy(p, 'gear', 'cap') && p.gearOwned.includes('cap'), 'buy cap'); ok(!E.buy(p, 'gear', 'cap'), 'no double buy');
  ok(E.equipGear(p, 'cinder', 'cap') && E.gearFor(p, 'cinder').hat === 'cap', 'equip'); E.equipGear(p, 'cinder', 'cap'); ok(E.gearFor(p, 'cinder').hat === null, 'toggle off');
  const c = E.bal(p, 'coins'); ok(E.buy(p, 'theme', 'aurora') && E.bal(p, 'coins') === c - 500, 'theme costs 500');
  ok(E.buy(p, 'crate', 'silver') && E.bal(p, 'silver') === 1 && E.bal(p, 'gems') === 80, 'silver crate for gems');
  const poor = mkp(); ok(!E.buy(poor, 'gear', 'crown'), 'cannot afford the crown'); ok(E.bal(poor, 'coins') === 100, 'no charge on failure');
  ok(E.buy(p, 'hint', null) && E.bal(p, 'hint') === 15, 'hint pack');
});

T('achievements', () => {
  const p = mkp(); ok(E.checkAch(p).length === 0, 'none at start');
  E.answer(p, { i: 'friend', kind: 'pick', ok: true, tries: 1, combo: 1 }, at(0)); ok(p.ach.right1 != null, 'First Word');
  const g = E.bal(p, 'gems'); ok(g >= 2, 'reward paid'); ok(E.checkAch(p).length === 0, 'not twice');
  ok(E.ACH.length >= 50, 'achievement count ' + E.ACH.length); ok(new Set(E.ACH.map(a => a.id)).size === E.ACH.length, 'unique ids');
});

T('merge: never lose, any order', () => {
  const R = E.seeded(99);
  const mk = (n) => { const p = mkp(); p.playedAt = Math.floor(R() * 1e6);
    for (let i = 0; i < n; i++) E.answer(p, { i: WORDS[Math.floor(R() * 200)].i, kind: R() < .6 ? 'type' : 'pick', ok: R() < .8, tries: 1, final: true, combo: 1 + Math.floor(R() * 6) }, at(Math.floor(R() * 9)));
    p.playedAt = Math.floor(R() * 1e6);
    if (R() < .5) E.earn(p, 'coins', 200); if (R() < .5) E.spend(p, 'coins', 50);
    if (R() < .5) { p.gearOwned.push('cap'); } if (R() < .3) p.heroes.push('leo'); if (R() < .5) p.allies.glacia = { bond: Math.floor(R() * 90) };
    return E.sanitize(p); };
  for (let t = 0; t < 400; t++) {
    const a = mk(Math.floor(R() * 80)), b = mk(Math.floor(R() * 80)), m = E.merge(a, b), m2 = E.merge(b, a);
    ok(m.xp >= a.xp && m.xp >= b.xp, 'xp never drops');
    for (const k of E.LEDGERS) ok(m.led[k].e >= a.led[k].e && m.led[k].e >= b.led[k].e && m.led[k].s >= a.led[k].s && m.led[k].s >= b.led[k].s, 'ledger ' + k);
    for (const s of ['heroes', 'gearOwned', 'themesOwned']) ok([...a[s], ...b[s]].every(x => m[s].includes(x)), 'union ' + s);
    for (const k of Object.keys(a.allies)) ok(m.allies[k] && m.allies[k].bond >= a.allies[k].bond, 'ally kept ' + k);
    for (const k of Object.keys(b.allies)) ok(m.allies[k] && m.allies[k].bond >= b.allies[k].bond, 'ally kept ' + k);
    for (const k of new Set([...Object.keys(a.words), ...Object.keys(b.words)])) { const r = m.words[k]; ok(r && r.r >= ((a.words[k] || {}).r || 0) && r.r >= ((b.words[k] || {}).r || 0) && r.w >= ((a.words[k] || {}).w || 0), 'word ' + k); }
    for (const k of Object.keys(a.ach).concat(Object.keys(b.ach))) ok(m.ach[k] != null, 'achievement kept');
    ok(m.streak.best >= a.streak.best && m.streak.best >= b.streak.best, 'best streak');
    for (const k of Object.keys(a.stats)) if (k !== 'traps') ok(m.stats[k] >= a.stats[k] && m.stats[k] >= b.stats[k], 'stat ' + k);
    eq([m.xp, m.led, m.heroes.slice().sort(), m.gearOwned.slice().sort(), Object.keys(m.allies).sort()], [m2.xp, m2.led, m2.heroes.slice().sort(), m2.gearOwned.slice().sort(), Object.keys(m2.allies).sort()], 'commutative on totals and sets');
    eq(E.merge(m, m).xp, m.xp, 'idempotent xp'); eq(E.merge(m, m).words, m.words, 'idempotent words');
    ok(m.heroes.includes(m.hero) && m.allies[m.ally], 'equipped hero and ally exist');
  }
  const fresh = mkp(); const played = mkp(); for (let i = 0; i < 30; i++) E.answer(played, { i: WORDS[i].i, kind: 'type', ok: true, tries: 1, combo: 1 }, at(0));
  played.playedAt = 5000; fresh.playedAt = 0;
  const m = E.merge(fresh, played); ok(m.stats.right === 30 && m.xp === played.xp, 'a fresh install never out-ranks real progress');
  const dirty = { xp: 50, heroes: ['nobody'], allies: { ghost: { bond: 9 } }, gearOwned: ['laser'], theme: 'lava' }; const s = E.sanitize(dirty);
  ok(s.heroes.length && s.heroes.every(h => E.HEROBY[h]) && !s.allies.ghost && !s.gearOwned.length && s.theme === 'night', 'sanitize drops unknown things and keeps a valid hero/ally');
});

console.log(`\n${passes} checks passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
