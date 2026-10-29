// Spell Quest — heroes, bosses, reward icons, crates, world emblems.
// Extends the Art object from art.js (load that first).
(() => {
  const { shade, K, st, both, lin, rad, sparkle } = Art;

  // ── Heroes: twelve kids you can play as (head-and-shoulders portraits) ─────
  const SKIN = ['#ffdcb8', '#f2bf94', '#d99a6c', '#b97a4c', '#8d5a36', '#5e3a22'];

  const HAIR = {
    short:  { back: () => '', front: c => `<path d="M38 46C34 28 46 17 60 17C75 17 86 28 82 46C78 36 70 31 60 32C50 31 42 36 38 46Z" fill="${c}" ${st()}/>` },
    spiky:  { back: () => '', front: c => `<path d="M38 46C34 30 44 19 60 19C76 19 86 30 82 46C78 38 71 34 60 35C49 34 42 38 38 46Z" fill="${c}" ${st()}/><path d="M42 25L37 11L51 21ZM54 20L57 5L65 19ZM66 19L75 7L77 22ZM78 26L89 15L85 33Z" fill="${c}" ${st(2.4)}/>` },
    long:   { back: c => `<path d="M33 46C28 72 32 90 40 95L52 82L68 82L80 95C88 90 92 72 87 46Z" fill="${c}" ${st()}/>`, front: c => `<path d="M37 48C33 26 47 17 60 17C74 17 87 26 83 48C79 36 69 31 60 33C51 31 41 36 37 48Z" fill="${c}" ${st()}/>` },
    bob:    { back: c => `<path d="M34 46C31 66 33 78 42 80L78 80C87 78 89 66 86 46Z" fill="${c}" ${st()}/>`, front: c => `<path d="M36 50C33 26 47 16 60 16C74 16 88 26 84 50C80 38 70 32 60 33C50 32 40 38 36 50Z" fill="${c}" ${st()}/>` },
    curly:  { back: c => `<circle cx="60" cy="40" r="32" fill="${c}" ${st()}/><circle cx="34" cy="52" r="9" fill="${c}" ${st()}/><circle cx="86" cy="52" r="9" fill="${c}" ${st()}/>`, front: c => `<path d="M40 44C42 34 50 30 60 30C70 30 78 34 80 44C74 38 68 36 60 36C52 36 46 38 40 44Z" fill="${c}"/>` },
    braids: { back: c => `<path d="M36 48C31 62 31 76 34 88M84 48C89 62 89 76 86 88" fill="none" stroke="${K}" stroke-width="13" stroke-linecap="round"/><path d="M36 48C31 62 31 76 34 88M84 48C89 62 89 76 86 88" fill="none" stroke="${c}" stroke-width="8.6" stroke-linecap="round"/><path d="M33 64l6 4M33 74l6 4M87 64l-6 4M87 74l-6 4" stroke="${K}" stroke-width="1.6"/>`, front: c => `<path d="M37 48C33 26 47 17 60 17C74 17 87 26 83 48C79 36 69 31 60 33C51 31 41 36 37 48Z" fill="${c}" ${st()}/>` },
    mohawk: { back: () => '', front: c => `<path d="M38 44C37 34 44 28 52 26L68 26C76 28 83 34 82 44C78 38 70 35 60 35C50 35 42 38 38 44Z" fill="${c}" ${st(2.4)}/><path d="M52 26C50 14 56 6 60 4C64 6 70 14 68 26Z" fill="${c}" ${st()}/>` },
    pony:   { back: c => `<path d="M80 30C100 26 106 50 98 66C96 54 90 46 80 44Z" fill="${c}" ${st()}/>`, front: c => `<path d="M37 48C33 26 47 17 60 17C74 17 87 26 83 48C79 36 69 31 60 33C51 31 41 36 37 48Z" fill="${c}" ${st()}/><circle cx="80" cy="36" r="4" fill="#ff4fa0" ${st(1.6)}/>` },
  };

  const ACC = {
    none: () => '',
    cap: c => `<path d="M36 40C36 20 84 20 84 40Z" fill="${c}" ${st()}/><path d="M36 40L22 44L36 46Z" fill="${shade(c, -.2)}" ${st(2.4)}/><path d="M36 40L84 40" stroke="${K}" stroke-width="3"/>`,
    wizard: c => `<path d="M32 38L60 3L88 38Z" fill="${c}" ${st()}/><ellipse cx="60" cy="38" rx="33" ry="6" fill="${shade(c, -.2)}" ${st()}/><path d="M60 19l2 5l5 .6l-4 3.6l1.2 5l-4.2-2.6l-4.2 2.6l1.2-5l-4-3.6l5-.6z" fill="#ffd93d"/>`,
    ninja: c => `<path d="M37 44C36 24 84 24 83 44L83 50L37 50Z" fill="#1d1440" ${st()}/><path d="M37 38H83V46H37Z" fill="${c}" ${st(2)}/><path d="M83 40L98 34L94 46Z" fill="${c}" ${st(2)}/>`,
    helmet: c => `<circle cx="60" cy="48" r="31" fill="#cfe9ff" opacity=".35" ${st(3.4)}/><path d="M40 28C46 22 56 20 62 20" fill="none" stroke="#fff" stroke-width="3" opacity=".8" stroke-linecap="round"/><rect x="48" y="80" width="24" height="10" rx="5" fill="${c}" ${st(2.4)}/>`,
    knight: c => `<path d="M34 48C32 22 88 22 86 48L86 60L34 60Z" fill="${shade(c, .1)}" ${st()}/><rect x="40" y="42" width="40" height="9" rx="3" fill="#14102c" ${st(2)}/><path d="M60 20C66 6 76 6 82 14C74 12 68 18 66 22Z" fill="#e5384d" ${st(2.4)}/>`,
    goggles: c => `<path d="M38 36C38 18 82 18 82 36" fill="none" stroke="${K}" stroke-width="5"/><circle cx="50" cy="30" r="8.4" fill="${c}" ${st(2.4)}/><circle cx="70" cy="30" r="8.4" fill="${c}" ${st(2.4)}/><circle cx="50" cy="30" r="5.4" fill="#9be8ff"/><circle cx="70" cy="30" r="5.4" fill="#9be8ff"/><circle cx="48" cy="28" r="1.8" fill="#fff"/><circle cx="68" cy="28" r="1.8" fill="#fff"/>`,
    fedora: c => `<ellipse cx="60" cy="34" rx="33" ry="7" fill="${shade(c, -.1)}" ${st()}/><path d="M42 34C42 14 78 14 78 34Z" fill="${c}" ${st()}/><path d="M42 31H78" stroke="#ffc83d" stroke-width="3.4"/>`,
    explorer: c => `<ellipse cx="60" cy="33" rx="34" ry="7" fill="${shade(c, -.1)}" ${st()}/><path d="M42 33C40 12 80 12 78 33Z" fill="${c}" ${st()}/><path d="M42 29H78" stroke="${K}" stroke-width="3.4"/>`,
    headset: c => `<path d="M36 52C32 22 88 22 84 52" fill="none" stroke="${K}" stroke-width="6.4"/><path d="M36 52C32 22 88 22 84 52" fill="none" stroke="${c}" stroke-width="3"/><rect x="29" y="44" width="11" height="18" rx="5" fill="${c}" ${st()}/><rect x="80" y="44" width="11" height="18" rx="5" fill="${c}" ${st()}/><path d="M33 62C33 72 44 70 50 68" fill="none" stroke="${K}" stroke-width="2.6"/><circle cx="51" cy="68" r="3" fill="${c}" ${st(1.6)}/>`,
    headband: c => `<path d="M38 40C44 34 76 34 82 40L82 46C76 40 44 40 38 46Z" fill="${c}" ${st(2.4)}/>`,
    hood: c => `<path d="M30 56C24 20 44 8 60 8C76 8 96 20 90 56C88 40 78 34 60 34C42 34 32 40 30 56Z" fill="${c}" ${st()}/>`,
    pilot: c => `<path d="M34 46C32 18 88 18 86 46C80 34 40 34 34 46Z" fill="${c}" ${st()}/><path d="M34 44L28 54M86 44L92 54" stroke="${K}" stroke-width="3" stroke-linecap="round"/><rect x="40" y="26" width="40" height="10" rx="5" fill="#ffb13d" ${st(2.4)}/><rect x="44" y="28" width="32" height="5" rx="2.5" fill="#9be8ff"/>`,
    glasses: c => `<circle cx="50" cy="50" r="8.6" fill="#fff" fill-opacity=".25" stroke="${c}" stroke-width="3"/><circle cx="70" cy="50" r="8.6" fill="#fff" fill-opacity=".25" stroke="${c}" stroke-width="3"/><path d="M58.6 49h2.8" stroke="${c}" stroke-width="3"/>`,
  };

  const FIT = {   // torso / collar by outfit
    hoodie: (c, t) => `<path d="M20 120C20 94 36 80 60 80C84 80 100 94 100 120Z" fill="${c}" ${st()}/><path d="M44 82C50 92 70 92 76 82" fill="none" stroke="${shade(c, -.3)}" stroke-width="5" stroke-linecap="round"/><path d="M54 90v12M66 90v12" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/>`,
    robe:   (c, t) => `<path d="M18 120C18 94 36 80 60 80C84 80 102 94 102 120Z" fill="${c}" ${st()}/><path d="M44 82L60 106L76 82" fill="${shade(c, .45)}" ${st(2.4)}/><circle cx="60" cy="100" r="3.6" fill="${t}" ${st(1.6)}/>`,
    armor:  (c, t) => `<path d="M20 120C20 94 36 80 60 80C84 80 100 94 100 120Z" fill="${c}" ${st()}/><path d="M24 92C30 84 40 82 46 84M96 92C90 84 80 82 74 84" fill="none" stroke="${K}" stroke-width="2.4"/><path d="M60 88L52 104L68 104Z" fill="${t}" ${st(2)}/>`,
    suit:   (c, t) => `<path d="M20 120C20 94 36 80 60 80C84 80 100 94 100 120Z" fill="${c}" ${st()}/><circle cx="60" cy="100" r="6" fill="${t}" ${st(2)}/><path d="M26 96h14M80 96h14" stroke="${t}" stroke-width="3" stroke-linecap="round"/>`,
    jersey: (c, t) => `<path d="M20 120C20 94 36 80 60 80C84 80 100 94 100 120Z" fill="${c}" ${st()}/><path d="M44 82C50 90 70 90 76 82" fill="none" stroke="${t}" stroke-width="4"/><text x="60" y="112" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="20" fill="${t}">7</text>`,
    overalls: (c, t) => `<path d="M20 120C20 94 36 80 60 80C84 80 100 94 100 120Z" fill="${t}" ${st()}/><path d="M42 84L46 120M78 84L74 120" stroke="${K}" stroke-width="2.4"/><path d="M40 88h10v14H40zM70 88h10v14H70z" fill="${c}" ${st(2)}/><circle cx="46" cy="96" r="2.4" fill="#ffc83d"/><circle cx="74" cy="96" r="2.4" fill="#ffc83d"/>`,
    trench: (c, t) => `<path d="M18 120C18 94 36 80 60 80C84 80 102 94 102 120Z" fill="${c}" ${st()}/><path d="M46 82L56 100L60 82M74 82L64 100L60 82" fill="${shade(c, .3)}" ${st(2.2)}/><path d="M60 100v20" stroke="${K}" stroke-width="2.4"/><circle cx="56" cy="108" r="2" fill="${t}"/><circle cx="64" cy="108" r="2" fill="${t}"/>`,
    vest:   (c, t) => `<path d="M20 120C20 94 36 80 60 80C84 80 100 94 100 120Z" fill="${t}" ${st()}/><path d="M38 84L50 120H70L82 84L70 80H50Z" fill="${c}" ${st(2.4)}/><path d="M60 82v38" stroke="${K}" stroke-width="2"/>`,
  };

  const HEROES = [
    { k: 'kai',  n: 'Kai',  cls: 'Skater',      skin: 2, hair: 'spiky',  hc: '#2b1b17', top: '#ff6a3d', trim: '#ffd93d', fit: 'hoodie',   acc: 'cap',      ac: '#3a8bff' },
    { k: 'mira', n: 'Mira', cls: 'Spellcaster', skin: 1, hair: 'long',   hc: '#7a3b9e', top: '#6f4de0', trim: '#ffd93d', fit: 'robe',     acc: 'wizard',   ac: '#5b3fd1' },
    { k: 'dax',  n: 'Dax',  cls: 'Shadow Ninja', skin: 3, hair: 'short', hc: '#14102c', top: '#2c2a4a', trim: '#e5384d', fit: 'suit',     acc: 'ninja',    ac: '#e5384d' },
    { k: 'zoe',  n: 'Zoe',  cls: 'Astronaut',   skin: 4, hair: 'curly',  hc: '#1c1410', top: '#e8eef8', trim: '#ff6a3d', fit: 'suit',     acc: 'helmet',   ac: '#9aa7c4' },
    { k: 'leo',  n: 'Leo',  cls: 'Knight',      skin: 0, hair: 'short',  hc: '#a8682e', top: '#9aa7c4', trim: '#ffc83d', fit: 'armor',    acc: 'knight',   ac: '#b8c4de' },
    { k: 'ava',  n: 'Ava',  cls: 'Inventor',    skin: 2, hair: 'curly',  hc: '#3a2216', top: '#3ee6d3', trim: '#ff8a3d', fit: 'overalls', acc: 'goggles',  ac: '#ffb13d' },
    { k: 'max',  n: 'Max',  cls: 'Detective',   skin: 1, hair: 'short',  hc: '#5c3a1e', top: '#a3835a', trim: '#3a2a1a', fit: 'trench',   acc: 'fedora',   ac: '#6b4f2e' },
    { k: 'nia',  n: 'Nia',  cls: 'Explorer',    skin: 5, hair: 'braids', hc: '#14102c', top: '#8bb34a', trim: '#ffd93d', fit: 'vest',     acc: 'explorer', ac: '#c9a24a' },
    { k: 'eli',  n: 'Eli',  cls: 'Gamer',       skin: 3, hair: 'mohawk', hc: '#3ee6d3', top: '#4a3fa8', trim: '#3ee6d3', fit: 'hoodie',   acc: 'headset',  ac: '#ff4fa0' },
    { k: 'sam',  n: 'Sam',  cls: 'Athlete',     skin: 4, hair: 'bob',    hc: '#1c1410', top: '#e5384d', trim: '#ffffff', fit: 'jersey',   acc: 'headband', ac: '#ffffff' },
    { k: 'ivy',  n: 'Ivy',  cls: 'Ranger',      skin: 0, hair: 'pony',   hc: '#d98a2b', top: '#3f8a4a', trim: '#b6e36a', fit: 'vest',     acc: 'hood',     ac: '#3f8a4a' },
    { k: 'jett', n: 'Jett', cls: 'Sky Pilot',   skin: 2, hair: 'short',  hc: '#2b1b17', top: '#5b7fd1', trim: '#ffb13d', fit: 'suit',     acc: 'pilot',    ac: '#8a5a2e' },
  ];

  function hero(h, opt = {}) {
    const si = opt.skin != null ? opt.skin : h.skin, skin = SKIN[si], gid = 'h' + h.k + si;
    const hs = HAIR[h.hair], sh = shade(skin, -.16);
    const hood = h.acc === 'hood', helm = h.acc === 'helmet';
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${lin(gid, shade(skin, .12), shade(skin, -.08))}</defs>`;
    s += hs.back(h.hc);
    s += FIT[h.fit](h.top, h.trim);
    s += `<rect x="51" y="64" width="18" height="18" rx="6" fill="${sh}" ${st(2.6)}/>`;
    s += `<ellipse cx="60" cy="49" rx="22" ry="24" fill="url(#${gid})" ${st()}/>`;
    s += both(`<circle cx="38.5" cy="52" r="4.6" fill="${skin}" ${st(2.2)}/>`);
    if (!(hood || helm)) s += hs.front(h.hc);
    else if (hood) s += `<path d="M39 46C40 34 50 30 60 30C70 30 80 34 81 46C74 38 68 36 60 36C52 36 46 38 39 46Z" fill="${h.hc}"/>`;
    else s += hs.front(h.hc);
    // face
    s += both(`<ellipse cx="51" cy="52" rx="3.4" ry="4.4" fill="${K}"/><circle cx="49.8" cy="50.2" r="1.4" fill="#fff"/><path d="M44.5 44.5Q51 41.5 56 44.5" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`);
    s += `<path d="M60 54Q57.5 58 60.5 59" fill="none" stroke="${shade(skin, -.3)}" stroke-width="2" stroke-linecap="round"/>` +
      `<path d="M52 63Q60 70 68 63" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/>` +
      both(`<ellipse cx="45" cy="60" rx="4" ry="2.6" fill="#ff7a8e" opacity=".3"/>`);
    s += ACC[h.acc](h.ac);
    return s + '</svg>';
  }

  // ── Bosses (160 x 140): the guardian at the end of each world ───────────────
  const BOSS = {
    grumble: () => `<g>
      <g transform="rotate(24 128 70)"><rect x="118" y="2" width="18" height="86" rx="4" fill="#ffd23d" ${st()}/><path d="M118 88L136 88L127 108Z" fill="#f5deb3" ${st()}/><path d="M127 98l0 6" stroke="${K}" stroke-width="3"/><rect x="118" y="2" width="18" height="14" rx="4" fill="#ff8fb3" ${st()}/><path d="M123 20v60M131 20v60" stroke="#e0a800" stroke-width="2"/></g>
      <ellipse cx="80" cy="104" rx="50" ry="34" fill="#5fbf4a" ${st()}/><ellipse cx="80" cy="110" rx="32" ry="24" fill="#a8e07c" ${st(2.4)}/>
      <path d="M62 100l16 14M78 100l-16 14" stroke="#e5384d" stroke-width="5" stroke-linecap="round"/><path d="M88 108l10 10M98 108l-10 10" stroke="#e5384d" stroke-width="4" stroke-linecap="round"/>
      <ellipse cx="38" cy="96" rx="12" ry="22" fill="#5fbf4a" ${st()} transform="rotate(20 38 96)"/><circle cx="28" cy="116" r="11" fill="#5fbf4a" ${st()}/>
      <ellipse cx="122" cy="94" rx="12" ry="22" fill="#5fbf4a" ${st()} transform="rotate(-20 122 94)"/><circle cx="130" cy="112" r="11" fill="#5fbf4a" ${st()}/>
      <path d="M50 38L38 26L52 30ZM110 38L122 26L108 30Z" fill="#5fbf4a" ${st(2.4)}/>
      <ellipse cx="80" cy="54" rx="36" ry="32" fill="#5fbf4a" ${st()}/><path d="M64 26c4-8 8-10 12-4c4-8 8-6 12 4" fill="#2b6a2a" ${st(2.4)}/>
      <ellipse cx="66" cy="52" rx="8" ry="9" fill="#fff" ${st(2.4)}/><ellipse cx="94" cy="52" rx="8" ry="9" fill="#fff" ${st(2.4)}/><circle cx="68" cy="54" r="3.6" fill="${K}"/><circle cx="92" cy="54" r="3.6" fill="${K}"/>
      <path d="M56 40L76 46M104 40L84 46" stroke="${K}" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="80" cy="64" rx="8" ry="6" fill="#4aa83c" ${st(2.2)}/><path d="M62 76Q80 88 98 76" fill="#7a1f2a" ${st(2.6)}/><path d="M66 77l-3 -10l8 6ZM94 77l3 -10l-8 6Z" fill="#fff" ${st(2)}/></g>`,
    madame: () => `<g transform="translate(4 14) scale(.9)">
      <path d="M40 130L52 78L108 78L120 130Z" fill="#6a2fb8" ${st()}/><path d="M80 78L80 130" stroke="${K}" stroke-width="2.4" opacity=".5"/>
      <rect x="130" y="40" width="6" height="86" rx="3" fill="#a06a2a" ${st(2.4)}/><path d="M133 42C121 34 123 12 141 2C146 18 144 34 133 42Z" fill="#fff" ${st(2.4)}/><path d="M133 42C137 28 139 16 141 2M135 30l6 -2M134 24l7 -3" fill="none" stroke="#c9b6ff" stroke-width="2" stroke-linecap="round"/><path d="M133 42l-1 6" stroke="${K}" stroke-width="3" stroke-linecap="round"/><circle cx="132" cy="52" r="2.6" fill="#3a1d8a"/>
      <ellipse cx="80" cy="56" rx="26" ry="25" fill="#cfe3ff" ${st()}/>
      <path d="M44 48C44 34 112 34 116 48Z" fill="#4a1d8a" ${st()}/><path d="M60 40C62 14 84 -2 108 -4C96 6 92 16 92 40Z" fill="#4a1d8a" ${st()}/><path d="M94 12c10-8 24-6 30 4c-10-2-18 0-24 8Z" fill="#ff4fa0" ${st(2.2)}/>
      <ellipse cx="70" cy="56" rx="5" ry="6.4" fill="#fff" ${st(2)}/><ellipse cx="92" cy="56" rx="5" ry="6.4" fill="#fff" ${st(2)}/><circle cx="71" cy="57" r="3" fill="#ff4fa0"/><circle cx="93" cy="57" r="3" fill="#ff4fa0"/>
      <path d="M60 46L76 50M104 46L88 50" stroke="${K}" stroke-width="3.4" stroke-linecap="round"/><path d="M72 70Q82 78 94 68" fill="none" stroke="${K}" stroke-width="3" stroke-linecap="round"/>
      <g font-family="Baloo 2,system-ui" font-weight="800" font-size="14" fill="#ff7ad9" stroke="${K}" stroke-width="2.6" paint-order="stroke"><text x="10" y="40" transform="rotate(-12 10 40)">teh</text><text x="6" y="96" transform="rotate(8 6 96)">recieve</text><text x="24" y="122" transform="rotate(-6 24 122)">wierd</text></g></g>`,
    specter: () => `<g>
      <path d="M80 4C116 4 132 34 128 66C126 88 140 108 126 126C116 116 108 132 98 122C90 132 80 120 80 120C80 120 70 132 62 122C52 132 44 116 34 126C20 108 34 88 32 66C28 34 44 4 80 4Z" fill="#dff1ff" ${st()}/>
      <path d="M44 24C54 14 68 10 80 10C62 20 54 36 52 52C44 46 42 34 44 24Z" fill="#fff" opacity=".7"/>
      <ellipse cx="62" cy="52" rx="12" ry="15" fill="#14102c" ${st(2.4)}/><ellipse cx="98" cy="52" rx="12" ry="15" fill="#14102c" ${st(2.4)}/>
      <circle cx="62" cy="54" r="5" fill="#8bd3ff"/><circle cx="98" cy="54" r="5" fill="#8bd3ff"/>
      <path d="M46 36L72 44M114 36L88 44" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
      <path d="M58 82H102" stroke="${K}" stroke-width="4.4" stroke-linecap="round"/><path d="M62 82v6M70 82v6M78 82v6M86 82v6M94 82v6" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/><circle cx="104" cy="86" r="4" fill="#ffc83d" ${st(2)}/>
      <path d="M18 76C6 78 4 96 12 102C14 94 20 90 28 90Z" fill="#dff1ff" ${st()}/><path d="M142 76C154 78 156 96 148 102C146 94 140 90 132 90Z" fill="#dff1ff" ${st()}/>
      <g font-family="Baloo 2,system-ui" font-weight="800" font-size="20" fill="#9fb4d8" opacity=".85"><text x="36" y="108">k</text><text x="74" y="112">w</text><text x="102" y="104">b</text></g></g>`,
    twins: () => `<g>
      <ellipse cx="80" cy="108" rx="50" ry="30" fill="#ff8a3d" ${st()}/><ellipse cx="80" cy="112" rx="32" ry="22" fill="#ffc07a" ${st(2.4)}/>
      <text x="80" y="122" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="34" fill="#e5384d" stroke="${K}" stroke-width="3" paint-order="stroke">ss ll</text>
      <ellipse cx="30" cy="100" rx="10" ry="20" fill="#ff8a3d" ${st()} transform="rotate(16 30 100)"/><circle cx="22" cy="118" r="10" fill="#ff8a3d" ${st()}/>
      <ellipse cx="130" cy="100" rx="10" ry="20" fill="#ff8a3d" ${st()} transform="rotate(-16 130 100)"/><circle cx="138" cy="118" r="10" fill="#ff8a3d" ${st()}/>
      <g><ellipse cx="52" cy="54" rx="28" ry="26" fill="#ff8a3d" ${st()}/><path d="M34 34L28 18L46 28ZM66 30L72 14L74 34Z" fill="#ffd93d" ${st(2.4)}/><ellipse cx="42" cy="52" rx="6" ry="7" fill="#fff" ${st(2)}/><ellipse cx="62" cy="52" rx="6" ry="7" fill="#fff" ${st(2)}/><circle cx="43" cy="53" r="3" fill="${K}"/><circle cx="63" cy="53" r="3" fill="${K}"/><path d="M34 42L48 47M70 42L56 47" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/><path d="M42 68Q52 76 64 68" fill="#7a1f2a" ${st(2.4)}/></g>
      <g><ellipse cx="110" cy="54" rx="28" ry="26" fill="#ff8a3d" ${st()}/><path d="M92 34L86 18L104 28ZM124 30L130 14L132 34Z" fill="#ffd93d" ${st(2.4)}/><ellipse cx="100" cy="52" rx="6" ry="7" fill="#fff" ${st(2)}/><ellipse cx="120" cy="52" rx="6" ry="7" fill="#fff" ${st(2)}/><circle cx="101" cy="53" r="3" fill="${K}"/><circle cx="121" cy="53" r="3" fill="${K}"/><path d="M92 42L106 47M128 42L114 47" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/><path d="M100 68Q110 76 122 68" fill="#7a1f2a" ${st(2.4)}/></g></g>`,
    glitch: () => `<g>
      <rect x="24" y="68" width="112" height="60" rx="8" fill="#9aa7c4" ${st()}/><rect x="32" y="76" width="96" height="30" rx="6" fill="#14102c" ${st(2.4)}/>
      <rect x="36" y="82" width="22" height="6" fill="#3ee6d3"/><rect x="62" y="82" width="40" height="6" fill="#ff4fa0"/><rect x="40" y="94" width="50" height="6" fill="#ffe14d"/><rect x="96" y="94" width="26" height="6" fill="#3ee6d3"/>
      <rect x="30" y="112" width="100" height="10" fill="#6c7896" ${st(2)}/><path d="M42 112v10M62 112v10M82 112v10M102 112v10" stroke="${K}" stroke-width="2"/>
      <rect x="36" y="18" width="88" height="52" rx="10" fill="#9aa7c4" ${st()}/><rect x="42" y="26" width="76" height="30" rx="8" fill="#14102c" ${st(2.4)}/>
      <rect x="50" y="34" width="22" height="14" fill="#ff2e4d"/><rect x="88" y="34" width="22" height="14" fill="#ff2e4d"/><rect x="54" y="38" width="6" height="4" fill="#fff"/><rect x="92" y="38" width="6" height="4" fill="#fff"/>
      <rect x="46" y="30" width="26" height="6" fill="#3ee6d3" opacity=".85" transform="translate(5 14)"/><rect x="92" y="22" width="22" height="5" fill="#ff4fa0" opacity=".9"/>
      <path d="M52 60h56" stroke="${K}" stroke-width="3" stroke-dasharray="6 4"/>
      <path d="M60 18L52 4M100 18L108 2" stroke="${K}" stroke-width="3.4"/><circle cx="52" cy="4" r="5" fill="#ffe14d" ${st(2)}/><circle cx="108" cy="2" r="5" fill="#ff4fa0" ${st(2)}/>
      <path d="M26 82L8 96L18 124M134 82L152 96L142 124" fill="none" stroke="${K}" stroke-width="7" stroke-linecap="round"/><path d="M26 82L8 96L18 124M134 82L152 96L142 124" fill="none" stroke="#6c7896" stroke-width="3.6" stroke-linecap="round"/>
      <rect x="6" y="34" width="14" height="8" fill="#3ee6d3" opacity=".8"/><rect x="140" y="52" width="14" height="8" fill="#ff4fa0" opacity=".8"/><rect x="2" y="70" width="10" height="6" fill="#ffe14d" opacity=".8"/></g>`,
    homophonix: () => `<g>
      <path d="M80 70C52 40 14 44 8 82C20 70 32 76 38 90C44 80 54 82 60 92Z" fill="#7a4cd8" ${st()}/><path d="M80 70C108 40 146 44 152 82C140 70 128 76 122 90C116 80 106 82 100 92Z" fill="#7a4cd8" ${st()}/>
      <ellipse cx="80" cy="104" rx="38" ry="30" fill="#5b3fd1" ${st()}/><ellipse cx="80" cy="110" rx="22" ry="20" fill="#cdb8ff" ${st(2.4)}/>
      <path d="M60 28C52 20 52 12 58 6C62 16 70 22 70 32Z" fill="#ffd93d" ${st(2.4)}/><path d="M100 28C108 20 108 12 102 6C98 16 90 22 90 32Z" fill="#ffd93d" ${st(2.4)}/>
      <g><ellipse cx="56" cy="52" rx="24" ry="22" fill="#5b3fd1" ${st()}/><ellipse cx="44" cy="62" rx="14" ry="9" fill="#cdb8ff" ${st(2.2)}/><ellipse cx="46" cy="46" rx="5" ry="6" fill="#fff" ${st(2)}/><circle cx="47" cy="47" r="2.6" fill="#ffe14d"/><path d="M38 40L52 44" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/><path d="M42 68l2 5l3-4Z" fill="#fff" ${st(1.4)}/></g>
      <g><ellipse cx="104" cy="52" rx="24" ry="22" fill="#5b3fd1" ${st()}/><ellipse cx="116" cy="62" rx="14" ry="9" fill="#cdb8ff" ${st(2.2)}/><ellipse cx="114" cy="46" rx="5" ry="6" fill="#fff" ${st(2)}/><circle cx="113" cy="47" r="2.6" fill="#ffe14d"/><path d="M122 40L108 44" stroke="${K}" stroke-width="3.6" stroke-linecap="round"/><path d="M118 68l-2 5l-3-4Z" fill="#fff" ${st(1.4)}/></g>
      <path d="M80 6L70 28L80 26L72 50L92 22L82 24Z" fill="#ffe14d" ${st(2.4)}/>
      <g font-family="Baloo 2,system-ui" font-weight="800" font-size="16" fill="#fff" stroke="${K}" stroke-width="3" paint-order="stroke"><text x="14" y="30">their</text><text x="104" y="30">there</text></g></g>`,
    latinus: () => `<g>
      <path d="M26 138L46 70L114 70L134 138Z" fill="#3a1d6e" ${st()}/><path d="M80 72V138" stroke="#7a4cd8" stroke-width="3"/><path d="M46 70L80 96L114 70" fill="#5a30a8" ${st(2.4)}/>
      <g transform="rotate(-18 28 96)"><rect x="12" y="78" width="34" height="46" rx="4" fill="#f5deb3" ${st()}/><path d="M18 90h22M18 98h22M18 106h16" stroke="#a06a2a" stroke-width="2.4" stroke-linecap="round"/></g>
      <path d="M130 130V40" stroke="#a06a2a" stroke-width="6" stroke-linecap="round"/><circle cx="130" cy="34" r="10" fill="#b58cff" ${st()}/><circle cx="130" cy="34" r="4" fill="#fff" opacity=".8"/>
      <ellipse cx="80" cy="48" rx="26" ry="28" fill="#f3eee0" ${st()}/><path d="M60 70L60 80L72 80L72 72M88 70L88 80L100 80L100 72" fill="#f3eee0" ${st(2.4)} transform="translate(-8 0)"/>
      <path d="M54 22L58 4L68 16L80 0L92 16L102 4L106 22Z" fill="#ffc83d" ${st()}/><circle cx="80" cy="6" r="3" fill="#ff4fa0" ${st(1.4)}/>
      <ellipse cx="68" cy="50" rx="9" ry="10" fill="#14102c" ${st(2.2)}/><ellipse cx="92" cy="50" rx="9" ry="10" fill="#14102c" ${st(2.2)}/><circle cx="68" cy="52" r="3.6" fill="#b58cff"/><circle cx="92" cy="52" r="3.6" fill="#b58cff"/>
      <path d="M76 62L80 70L84 62Z" fill="#14102c"/><path d="M64 78Q80 86 96 78" fill="none" stroke="${K}" stroke-width="3"/><path d="M70 78v6M78 80v7M86 80v7M94 78v6" stroke="${K}" stroke-width="2.4"/></g>`,
    lexicon: () => `<g>
      <path d="M80 70C50 30 8 30 4 74C16 62 30 66 36 84C44 72 56 74 62 90Z" fill="#fff6d8" ${st()}/><path d="M80 70C110 30 152 30 156 74C144 62 130 66 124 84C116 72 104 74 98 90Z" fill="#fff6d8" ${st()}/>
      <g font-family="Georgia,serif" font-weight="700" font-size="8" fill="#a06a2a"><text x="16" y="60">Aa Bb</text><text x="12" y="72">the quick</text><text x="116" y="62">Zz Yy</text><text x="114" y="74">spell it</text></g>
      <path d="M98 100C124 100 142 112 144 128C128 122 112 124 98 132Z" fill="#2b2160" ${st()}/><path d="M98 100C100 112 98 122 98 132" fill="none" stroke="#ffc83d" stroke-width="2"/>
      <ellipse cx="80" cy="102" rx="36" ry="32" fill="#2b2160" ${st()}/><ellipse cx="80" cy="108" rx="22" ry="22" fill="#ffc83d" ${st(2.4)}/>
      <text x="80" y="118" text-anchor="middle" font-family="Baloo 2,system-ui" font-weight="800" font-size="30" fill="#2b2160">Az</text>
      <path d="M50 38L40 18L58 30ZM110 38L120 18L102 30Z" fill="#ffc83d" ${st(2.4)}/>
      <ellipse cx="80" cy="52" rx="32" ry="28" fill="#2b2160" ${st()}/><ellipse cx="80" cy="64" rx="18" ry="12" fill="#4a3d9a" ${st(2.2)}/>
      <ellipse cx="64" cy="48" rx="7" ry="8" fill="#fff" ${st(2)}/><ellipse cx="96" cy="48" rx="7" ry="8" fill="#fff" ${st(2)}/><circle cx="65" cy="50" r="3.4" fill="#ff4fa0"/><circle cx="95" cy="50" r="3.4" fill="#ff4fa0"/>
      <path d="M54 36L72 43M106 36L88 43" stroke="#ffc83d" stroke-width="4.4" stroke-linecap="round"/>
      <path d="M68 70Q80 78 92 70" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/><path d="M72 71l2 5l3-4ZM88 71l-2 5l-3-4Z" fill="#fff" ${st(1.4)}/>
      <path d="M58 22L66 8L74 20L80 4L86 20L94 8L102 22Z" fill="#ffc83d" ${st()}/><circle cx="80" cy="6" r="3.4" fill="#3ee6d3" ${st(1.4)}/></g>`,
  };
  const BOSSES = [
    { k: 'grumble',    n: 'Grumbleguts',        sub: 'the Typo Troll',            hp: 10 },
    { k: 'madame',     n: 'Madame Misspell',    sub: 'Queen of the Wrong Letters', hp: 11 },
    { k: 'specter',    n: 'The Silent Specter', sub: 'keeper of hidden letters',    hp: 12 },
    { k: 'twins',      n: 'Double Trouble',     sub: 'the two-headed twins',        hp: 12 },
    { k: 'glitch',     n: 'Glitch',             sub: 'the corrupted robot',         hp: 13 },
    { k: 'homophonix', n: 'Homophonix',         sub: 'the storm that sounds alike', hp: 14 },
    { k: 'latinus',    n: 'Lord Latinus',       sub: 'king of the old roots',       hp: 15 },
    { k: 'lexicon',    n: 'The Lexicon Dragon', sub: 'guardian of every word',      hp: 16 },
  ];
  const boss = (k) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 140">${BOSS[k] ? BOSS[k]() : ''}</svg>`;

  // ── icons (32 x 32) ───────────────────────────────────────────────────────
  const ICON = {
    coin: () => `<circle cx="16" cy="16" r="13" fill="#ffc83d" ${st(2.4)}/><circle cx="16" cy="16" r="9" fill="#ffe27a" ${st(1.6)}/><path d="M16 9l2.2 4.6l5 .7l-3.6 3.5l.9 5l-4.5-2.4l-4.5 2.4l.9-5l-3.6-3.5l5-.7z" fill="#e0a000"/>`,
    gem: () => `<path d="M16 3L27 11L16 29L5 11Z" fill="#3ee6d3" ${st(2.4)}/><path d="M5 11L27 11M16 3L11 11L16 29L21 11Z" fill="none" stroke="${K}" stroke-width="1.6"/><path d="M11 11L16 3L21 11Z" fill="#b9fff4"/>`,
    flame: () => `<path d="M16 2C20 10 27 13 26 21C25 27 21 30 16 30C11 30 7 27 6 21C5 16 9 13 10 8C12 11 14 11 14 8C15 6 15 4 16 2Z" fill="#ff7a2e" ${st(2.4)}/><path d="M16 14C19 18 22 20 21 24C20 27 18 28 16 28C14 28 12 27 11 24C10 21 14 18 16 14Z" fill="#ffd93d"/>`,
    xp: () => `<path d="M16 2l4.2 9l9.8 1.2l-7.2 6.8l1.9 9.7L16 23.8l-8.7 4.9l1.9-9.7L2 12.2l9.8-1.2z" fill="#8b5cf6" ${st(2.4)}/><path d="M16 8l2 4.6l5 .6l-3.7 3.4l1 4.9L16 19l-4.3 2.5l1-4.9L9 13.2l5-.6z" fill="#c9b6ff"/>`,
    heart: () => `<path d="M16 28C5 20 3 12 8 7C12 4 16 7 16 10C16 7 20 4 24 7C29 12 27 20 16 28Z" fill="#ff4f6a" ${st(2.4)}/><path d="M9 11C10 9 12 9 13 10" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>`,
    key: () => `<circle cx="10" cy="12" r="7" fill="#ffc83d" ${st(2.4)}/><circle cx="10" cy="12" r="2.6" fill="#14102c"/><path d="M16 15L28 27M23 22L27 18M26 25L29 22" fill="none" stroke="${K}" stroke-width="6" stroke-linecap="round"/><path d="M16 15L28 27M23 22L27 18M26 25L29 22" fill="none" stroke="#ffc83d" stroke-width="2.6" stroke-linecap="round"/>`,
    lock: () => `<path d="M9 14V10C9 5 23 5 23 10V14" fill="none" stroke="${K}" stroke-width="3.2"/><rect x="6" y="14" width="20" height="14" rx="4" fill="#9aa7c4" ${st(2.4)}/><circle cx="16" cy="21" r="2.6" fill="#14102c"/>`,
    trophy: () => `<path d="M9 4H23V13C23 19 20 21 16 21C12 21 9 19 9 13Z" fill="#ffc83d" ${st(2.4)}/><path d="M9 7H4C4 14 7 15 10 15M23 7H28C28 14 25 15 22 15" fill="none" stroke="${K}" stroke-width="2.6"/><rect x="13" y="21" width="6" height="5" fill="#e0a000" ${st(2)}/><rect x="9" y="26" width="14" height="4" rx="2" fill="#ffc83d" ${st(2)}/>`,
    shield: () => `<path d="M16 3L27 7V15C27 22 22 27 16 30C10 27 5 22 5 15V7Z" fill="#5b7fd1" ${st(2.4)}/><path d="M16 8L22 10.4V15C22 19 19.6 22 16 24C12.4 22 10 19 10 15V10.4Z" fill="#9bb7ff"/>`,
    book: () => `<path d="M3 6C8 4 13 5 16 8C19 5 24 4 29 6V26C24 24 19 25 16 28C13 25 8 24 3 26Z" fill="#fff6d8" ${st(2.4)}/><path d="M16 8V28" stroke="${K}" stroke-width="2"/><path d="M7 11h6M7 15h6M19 11h6M19 15h6" stroke="#a06a2a" stroke-width="1.6" stroke-linecap="round"/>`,
    bolt: () => `<path d="M18 2L6 18H14L12 30L26 12H17Z" fill="#ffe14d" ${st(2.4)}/>`,
    check: () => `<circle cx="16" cy="16" r="13" fill="#3ee6a0" ${st(2.4)}/><path d="M9 16.5L14 21.5L23 11" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/>`,
    speaker: () => `<path d="M4 12H10L17 6V26L10 20H4Z" fill="#fff" ${st(2.2)}/><path d="M21 11C24 14 24 18 21 21M24 8C29 13 29 19 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>`,
    hint: () => `<path d="M16 3C10 3 7 8 7 12C7 16 10 18 11 21H21C22 18 25 16 25 12C25 8 22 3 16 3Z" fill="#ffe14d" ${st(2.4)}/><rect x="11" y="22" width="10" height="5" rx="2" fill="#9aa7c4" ${st(2)}/>`,
    sword: () => `<path d="M24 3L29 8L13 24L8 19Z" fill="#cfe0ff" ${st(2.2)}/><path d="M6 21L11 26M9 28L4 23L7 20L12 25Z" fill="#ffc83d" ${st(2.2)}/>`,
  };
  const icon = (n) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">${ICON[n] ? ICON[n]() : ''}</svg>`;

  // ── crates: the lid is its own group so CSS can pop it open ─────────────────
  const CRATE = { bronze: ['#c98642', '#8a5420', '#ffd9a0'], silver: ['#cfd8ea', '#7d89a6', '#ffffff'], gold: ['#ffc83d', '#c98c00', '#fff1a8'] };
  function crate(tier = 'bronze') {
    const [a, b, hi] = CRATE[tier] || CRATE.bronze, id = 'cr' + tier;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${lin(id, a, b)}${rad(id + 'g', hi, hi, 0)}</defs>
      <circle class="crate-glow" cx="60" cy="62" r="52" fill="url(#${id}g)" opacity="0"/>
      <ellipse cx="60" cy="108" rx="40" ry="6" fill="#000" opacity=".22"/>
      <rect x="18" y="56" width="84" height="50" rx="8" fill="url(#${id})" ${st()}/>
      <path d="M18 74H102M50 56V106M70 56V106" stroke="${K}" stroke-width="3" opacity=".55"/>
      <rect x="46" y="70" width="28" height="22" rx="5" fill="${hi}" ${st(2.6)}/><circle cx="60" cy="79" r="4" fill="${K}"/><path d="M60 82v6" stroke="${K}" stroke-width="3"/>
      <g class="lid"><path d="M14 58L22 34H98L106 58Z" fill="url(#${id})" ${st()}/><path d="M14 58H106" stroke="${K}" stroke-width="3"/><path d="M50 34V58M70 34V58" stroke="${K}" stroke-width="3" opacity=".55"/><path d="M26 42H44" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".6"/></g></svg>`;
  }

  // ── world emblems (48 x 48) ────────────────────────────────────────────────
  const WORLD = {
    1: () => `<path d="M6 40L24 8L42 40Z" fill="#ff9a3d" ${st(2.6)}/><path d="M24 40V24L32 40Z" fill="#7a3b1e"/><path d="M24 8V4" stroke="${K}" stroke-width="3"/><path d="M24 4l8 3l-8 3Z" fill="#e5384d" ${st(1.6)}/>`,
    2: () => `<path d="M24 42C10 36 8 18 24 6C40 18 38 36 24 42Z" fill="#5fd17a" ${st(2.6)}/><path d="M24 40V14M24 24L16 18M24 30L32 22" fill="none" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/>`,
    3: () => `<path d="M4 38L16 14L24 26L32 10L44 38Z" fill="#d9894a" ${st(2.6)}/><path d="M14 40C18 34 18 28 14 22M24 40C30 34 30 26 24 20" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>`,
    4: () => `<path d="M4 40L20 8L28 24L34 14L44 40Z" fill="#cfe8ff" ${st(2.6)}/><path d="M16 18L20 8L24 16L20 20ZM30 20L34 14L38 22L33 24Z" fill="#fff"/><path d="M12 40V30" stroke="${K}" stroke-width="2"/>`,
    5: () => `<rect x="6" y="20" width="10" height="22" fill="#4a3fa8" ${st(2.4)}/><rect x="18" y="8" width="12" height="34" fill="#6f4de0" ${st(2.4)}/><rect x="32" y="16" width="10" height="26" fill="#3ee6d3" ${st(2.4)}/><path d="M21 14h6M21 22h6M21 30h6M9 26h4M35 24h4M35 32h4" stroke="#ffe14d" stroke-width="2.4" stroke-linecap="round"/>`,
    6: () => `<path d="M10 28C2 28 2 16 12 16C14 8 28 8 30 16C40 14 44 26 34 28Z" fill="#8c9cc4" ${st(2.6)}/><path d="M26 28L18 40L24 40L20 48L32 34L25 34Z" fill="#ffe14d" ${st(2)}/>`,
    7: () => `<path d="M30 6C18 6 10 14 10 24C10 36 22 42 34 40C24 36 22 22 30 6Z" fill="#b58cff" ${st(2.6)}/><circle cx="34" cy="14" r="1.8" fill="#fff"/><circle cx="38" cy="26" r="1.4" fill="#fff"/><circle cx="30" cy="32" r="1.6" fill="#fff"/>`,
    8: () => `<path d="M6 40V16L16 26L24 8L32 26L42 16V40Z" fill="#ffc83d" ${st(2.6)}/><circle cx="6" cy="14" r="3" fill="#ff4fa0" ${st(1.6)}/><circle cx="24" cy="6" r="3" fill="#3ee6d3" ${st(1.6)}/><circle cx="42" cy="14" r="3" fill="#ff4fa0" ${st(1.6)}/><path d="M12 34H36" stroke="${K}" stroke-width="2.4"/>`,
  };
  const world = (n) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">${WORLD[n] ? WORLD[n]() : ''}</svg>`;

  Object.assign(Art, { hero, HEROES, SKIN, boss, BOSSES, icon, crate, world });
})();
if (typeof module !== 'undefined') module.exports = Art;
