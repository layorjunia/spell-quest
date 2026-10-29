// Spell Quest — the game tables: worlds, ranks, shop, themes, crates, quests.
// (Allies are in data-allies.js; the art for everything is in art*.js.)

const WORLDS = [
  { n: 1, name: 'Rookie Camp',     grade: 'Grade 3',       blurb: 'Everyday words with sneaky spots',  color: '#ff9a3d', boss: 'grumble' },
  { n: 2, name: 'Sprout Valley',   grade: 'Grade 4',       blurb: 'Endings, sound-alikes, tricky vowels', color: '#5fd17a', boss: 'madame' },
  { n: 3, name: 'Echo Canyon',     grade: 'Grade 5',       blurb: '-tion, -ous and silent letters',     color: '#d9894a', boss: 'specter' },
  { n: 4, name: 'Frostpeak',       grade: 'Grade 6',       blurb: 'The classic spelling demons',        color: '#6ec6ff', boss: 'twins' },
  { n: 5, name: 'Neon City',       grade: 'Grade 7',       blurb: 'Look-alike pairs, roots and tech',   color: '#a78bff', boss: 'glitch' },
  { n: 6, name: 'Storm Citadel',   grade: 'Grade 8',       blurb: 'Hard words from real life',          color: '#8c9cc4', boss: 'homophonix' },
  { n: 7, name: 'Shadow Realm',    grade: 'Bee level',     blurb: 'Spelling-bee words',                 color: '#b58cff', boss: 'latinus' },
  { n: 8, name: 'Lexicon Throne',  grade: 'Champion',      blurb: 'Words of the champions',             color: '#ffc83d', boss: 'lexicon' },
];

// Level n starts at 40*(n-1)^2 XP. Titles change every few levels.
const RANKS = [
  [1, 'Rookie'], [4, 'Apprentice'], [8, 'Scribe'], [13, 'Adept'], [18, 'Wordsmith'], [24, 'Sage'],
  [30, 'Lexicologist'], [38, 'Archmage'], [46, 'Grandmaster'], [60, 'Legend'],
];
const xpForLevel = (n) => 40 * (n - 1) * (n - 1);
const levelFromXp = (xp) => Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 40)) + 1);
const rankTitle = (lv) => { let t = RANKS[0][1]; for (const [l, n] of RANKS) if (lv >= l) t = n; return t; };

// Ally evolution: bond points while an ally is your partner.
const FORM_AT = [0, 60, 220];
const RARITY = {
  C: { name: 'Common',    color: '#9bb0d0', glow: '#9bb0d0' },
  R: { name: 'Rare',      color: '#4aa8ff', glow: '#4aa8ff' },
  E: { name: 'Epic',      color: '#b66bff', glow: '#b66bff' },
  L: { name: 'Legendary', color: '#ffc83d', glow: '#ffc83d' },
};

// Gear drawn on any ally. slot says where it goes; only one item per slot.
const GEAR = [
  { id: 'cap',        n: 'Red Cap',         slot: 'hat',  price: 150 },
  { id: 'headphones', n: 'Beat Phones',     slot: 'hat',  price: 250 },
  { id: 'wizard',     n: 'Wizard Hat',      slot: 'hat',  price: 600 },
  { id: 'crown',      n: 'Golden Crown',    slot: 'hat',  price: 1000 },
  { id: 'shades',     n: 'Cool Shades',     slot: 'eyes', price: 300 },
  { id: 'goggles',    n: 'Ace Goggles',     slot: 'eyes', price: 300 },
  { id: 'cape',       n: 'Hero Cape',       slot: 'back', price: 500 },
];

const THEMES = [
  { id: 'night',   n: 'Night Academy', price: 0,    sw: ['#2a1f6e', '#5b3fd1'] },
  { id: 'aurora',  n: 'Aurora',        price: 500,  sw: ['#0f3d4a', '#3ee6a0'] },
  { id: 'volcano', n: 'Volcano Forge', price: 800,  sw: ['#4a1414', '#ff6a3d'] },
  { id: 'ocean',   n: 'Deep Ocean',    price: 800,  sw: ['#0c2a5c', '#3aa7ff'] },
  { id: 'neon',    n: 'Neon City',     price: 1200, sw: ['#1a0a3a', '#ff4fa0'] },
  { id: 'dawn',    n: 'Sunny Dawn',    price: 1500, sw: ['#ffd9a8', '#ff8a5c'] },
];

const CRATES = {
  bronze: { n: 'Bronze Crate', coin: 150, gem: 0,  blurb: 'Allies, gear, heroes and coins' },
  silver: { n: 'Silver Crate', coin: 0,   gem: 20, blurb: 'Better odds for Rare and Epic allies' },
  gold:   { n: 'Gold Crate',   coin: 0,   gem: 50, blurb: 'Rare or better, every time' },
};

// Words right in a row of the whole game fill the crate meter.
const WORDS_PER_CRATE = 25;
const HINT_PACK = { n: 'Hint Pack (10)', coin: 80, amount: 10 };
const SHIELD = { n: 'Streak Shield', coin: 300 };
const HERO_PRICE = 700;

const HINT_COST = { definition: 0, length: 5, letter: 10 };   // coins, per use

// Boss fights: three hearts, spell the word to hit.
const BOSS_HEARTS = 3;
const BOSS_READY = 0.35;           // share of a world's words at box 2+ before its boss wakes

// Daily quest templates. need[] picks a size by day; metric is a p.stats day counter.
const QUESTS = [
  { id: 'right',  text: n => `Spell ${n} words right`,                 metric: 'right',    need: [12, 16, 20] },
  { id: 'typed',  text: n => `Type ${n} words with no hints`,          metric: 'typedNH',  need: [6, 8, 10] },
  { id: 'combo',  text: n => `Get ${n} right in a row`,                metric: 'combo',    need: [5, 7, 9],  max: true },
  { id: 'rounds', text: n => `Finish ${n} rounds`,                     metric: 'rounds',   need: [2, 3, 3] },
  { id: 'tricky', text: n => `Fix ${n} tricky words`,                  metric: 'fixed',    need: [3, 4, 5] },
  { id: 'hard',   text: n => `Spell ${n} words from your current world`, metric: 'hard',     need: [4, 6, 8] },
  { id: 'boss',   text: () => 'Fight a boss',                          metric: 'bossFights', need: [1, 1, 1] },
  { id: 'speed',  text: n => `Score ${n} in a Speed Round`,            metric: 'speed',    need: [8, 10, 12], max: true },
];
const QUEST_REWARD = { gems: 3, coins: 30 };
const QUEST_ALL_BONUS = { crate: 'bronze', gems: 2 };

// 7-day streak calendar: reward for day 1..7 of a run (7 = a silver crate).
const CALENDAR = [
  { coins: 20 }, { coins: 30 }, { gems: 2 }, { coins: 50 }, { gems: 3 }, { coins: 80 }, { crate: 'silver', gems: 5 },
];

// Letter-trap families, for the achievements and the "My Spelling" screen.
const TRAP_GROUPS = {
  silent: l => /^silent|^ps$|^rh$|^tch$|^dge$/.test(l),
  double: l => /^double /.test(l),
  ieei:   l => l === 'ie' || l === 'ei',
  ending: l => /^-/.test(l),
  ough:   l => l === 'ough' || l === 'augh',
};

if (typeof module !== 'undefined') module.exports = { WORLDS, RANKS, xpForLevel, levelFromXp, rankTitle, FORM_AT, RARITY, GEAR, THEMES, CRATES, WORDS_PER_CRATE, HINT_PACK, SHIELD, HERO_PRICE, HINT_COST, BOSS_HEARTS, BOSS_READY, QUESTS, QUEST_REWARD, QUEST_ALL_BONUS, CALENDAR, TRAP_GROUPS };
