// Allies: 24 collectible companions on 8 body plans, 3 forms each.
// r = rarity (C common, R rare, E epic, L legendary). el = element.
const ALLIES = [
  { k: 'cinder',  n: 'Cinder',  t: 'drake',   r: 'C', el: 'Fire',   say: 'Light it up!',            pal: { m: '#f2603a', x: '#ffc83d', e: '#ffe14d' } },
  { k: 'glacia',  n: 'Glacia',  t: 'drake',   r: 'R', el: 'Ice',    say: 'Stay cool. Spell it right.', pal: { m: '#5cc8f0', x: '#e8f8ff', e: '#b9fbff', b: '#e8fbff' } },
  { k: 'voltix',  n: 'Voltix',  t: 'drake',   r: 'E', el: 'Storm',  say: 'Lightning never misses.', pal: { m: '#8b5cf6', x: '#ffd93d', e: '#f4ff6b' } },
  { k: 'bolt',    n: 'Bolt',    t: 'mech',    r: 'C', el: 'Tech',   say: 'Systems online!',         pal: { m: '#ffcb2e', x: '#3b3b5c', e: '#3ee6d3' } },
  { k: 'pixel',   n: 'Pixel',   t: 'mech',    r: 'C', el: 'Tech',   say: 'Loading your next win…',  pal: { m: '#38d4e8', x: '#ff4fa0', e: '#ff7ad9' } },
  { k: 'titan',   n: 'Titan',   t: 'mech',    r: 'R', el: 'Steel',  say: 'Built for big words.',    pal: { m: '#9aa7c4', x: '#ff8a3d', e: '#ffb13d' } },
  { k: 'shade',   n: 'Shade',   t: 'wolf',    r: 'C', el: 'Shadow', say: 'I move quiet. I spell loud.', pal: { m: '#5b5584', x: '#8b5cf6', e: '#d3a8ff', t: '#c18bff' } },
  { k: 'kitsu',   n: 'Kitsu',   t: 'wolf',    r: 'R', el: 'Ice',    say: 'One tail, two tails, three!', pal: { m: '#e6f4ff', x: '#5cc8f0', e: '#3aa7ff', t: '#5cc8f0', v: 'fox' } },
  { k: 'blaze',   n: 'Blaze',   t: 'wolf',    r: 'C', el: 'Fire',   say: 'Burning through the list!', pal: { m: '#ff8a3d', x: '#ffd93d', e: '#fff08a', t: '#ffffff', v: 'fox' } },
  { k: 'wisp',    n: 'Wisp',    t: 'specter', r: 'C', el: 'Spirit', say: 'Boo-tiful spelling!',     pal: { m: '#7df0e0', x: '#3ee6d3', e: '#c9fff7' } },
  { k: 'phantom', n: 'Phantom', t: 'specter', r: 'R', el: 'Shadow', say: 'You cannot misspell what you remember.', pal: { m: '#9b6bff', x: '#ff7ad9', e: '#ff7ad9', v: 'hood' } },
  { k: 'lumen',   n: 'Lumen',   t: 'specter', r: 'E', el: 'Light',  say: 'Follow the glow.',        pal: { m: '#ffb347', x: '#fff08a', e: '#fff08a', v: 'flame' } },
  { k: 'quartz',  n: 'Quartz',  t: 'golem',   r: 'C', el: 'Earth',  say: 'Solid. Sharp. Spelled.',  pal: { m: '#b58cff', x: '#e0c9ff', e: '#ff7ad9' } },
  { k: 'magma',   n: 'Magma',   t: 'golem',   r: 'R', el: 'Fire',   say: 'Pressure makes diamonds.', pal: { m: '#5a4a52', x: '#ff6b3d', e: '#ffb13d' } },
  { k: 'moss',    n: 'Moss',    t: 'golem',   r: 'C', el: 'Nature', say: 'Slow and steady wins.',   pal: { m: '#6cae5a', x: '#b6e36a', e: '#fff08a' } },
  { k: 'neon',    n: 'Neon',    t: 'cat',     r: 'C', el: 'Tech',   say: 'Too fast to misspell.',   pal: { m: '#2d2a55', x: '#3ee6d3', e: '#3ee6d3', v: 'visor' } },
  { k: 'onyx',    n: 'Onyx',    t: 'cat',     r: 'R', el: 'Shadow', say: 'Hunt the tricky ones.',   pal: { m: '#3a3350', x: '#ff4fa0', e: '#ffe14d' } },
  { k: 'striker', n: 'Striker', t: 'cat',     r: 'C', el: 'Wild',   say: 'Pounce on every word!',   pal: { m: '#ff9a3d', x: '#7a3b1e', e: '#a3ff6b' } },
  { k: 'hoot',    n: 'Hoot',    t: 'bird',    r: 'C', el: 'Wisdom', say: 'Whooo knows how to spell it?', pal: { m: '#a07850', x: '#ffb13d', e: '#ffd93d', p: '#f5e6c8' } },
  { k: 'phoenix', n: 'Phoenix', t: 'bird',    r: 'E', el: 'Fire',   say: 'Every miss is a rebirth.', pal: { m: '#ff5a3d', x: '#ffb13d', e: '#fff08a', p: '#ffe9b0', v: 'phoenix' } },
  { k: 'cipher',  n: 'Cipher',  t: 'bird',    r: 'R', el: 'Shadow', say: 'Crack the code, spell the word.', pal: { m: '#2f2b55', x: '#8b5cf6', e: '#9be8ff', p: '#4a4580' } },
  { k: 'zorb',    n: 'Zorb',    t: 'alien',   r: 'C', el: 'Cosmic', say: 'Greetings, Earth speller.', pal: { m: '#7ae85a', x: '#4b6fe0', e: '#7df9ff' } },
  { k: 'nebula',  n: 'Nebula',  t: 'alien',   r: 'L', el: 'Cosmic', say: 'The stars spell your name.', pal: { m: '#7a4cd8', x: '#ff7ad9', e: '#ffe14d', v: 'octo' } },
  { k: 'void',    n: 'Void',    t: 'alien',   r: 'L', el: 'Void',   say: 'Nothing escapes my notice.', pal: { m: '#2a2150', x: '#8b5cf6', e: '#ff4fa0', v: 'void' } },
];
if (typeof module !== 'undefined') module.exports = ALLIES;
