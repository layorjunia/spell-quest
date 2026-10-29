// Spell Quest — procedural character art.
//
// Everything on screen that is a character is drawn here as inline SVG, so a
// handful of well-drawn body plans become dozens of distinct allies and each
// ally evolves through three forms. No emoji, no stock images.
//
// Conventions: viewBox 0 0 120 120, feet on y=108, outline #1d1440, cel shading
// (light top, dark bottom, one glossy highlight). Every <defs> id carries the
// character+form prefix so two characters in one document never share a gradient.
// Parts are drawn on the LEFT and mirrored with both() so faces stay symmetric.

const Art = (() => {
  const K = '#1d1440';
  const st = (w = 3) => `stroke="${K}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  function shade(hex, amt) {            // amt -1 (black) .. +1 (white)
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, a = Math.abs(amt);
    r = Math.round(r + (t - r) * a); g = Math.round(g + (t - g) * a); b = Math.round(b + (t - b) * a);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  const lin = (id, c1, c2) => `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`;
  const rad = (id, c1, c2, o2 = 0) => `<radialGradient id="${id}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}" stop-opacity="${o2}"/></radialGradient>`;
  const both = (s) => `${s}<g transform="translate(120 0) scale(-1 1)">${s}</g>`;
  const sparkle = (x, y, s, c = '#fff') => `<path d="M${x} ${y - s}Q${x + s * .22} ${y - s * .22} ${x + s} ${y}Q${x + s * .22} ${y + s * .22} ${x} ${y + s}Q${x - s * .22} ${y + s * .22} ${x - s} ${y}Q${x - s * .22} ${y - s * .22} ${x} ${y - s}Z" fill="${c}"/>`;

  // a glossy cool eye: white almond, colored iris, slit pupil, two highlights
  function eye(cx, cy, w, h, col, slit = true) {
    return `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="#fff" ${st(2)}/>` +
      `<ellipse cx="${cx + 1}" cy="${cy + 1}" rx="${w * .62}" ry="${h * .82}" fill="${col}"/>` +
      `<ellipse cx="${cx + 1}" cy="${cy + 1}" rx="${slit ? w * .22 : w * .34}" ry="${h * .74}" fill="${K}"/>` +
      `<circle cx="${cx - w * .28}" cy="${cy - h * .38}" r="${w * .26}" fill="#fff"/>` +
      `<circle cx="${cx + w * .36}" cy="${cy + h * .42}" r="${w * .11}" fill="#fff" opacity=".85"/>`;
  }
  const brow = (x1, y1, x2, y2, w = 3.4) => `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${K}" stroke-width="${w}" stroke-linecap="round"/>`;

  // per-body-plan anchors for gear: hat top, eye line, half head width
  const ANCH = {
    drake: { top: 22, eyeY: 46, gap: 12, hw: 28 }, mech: { top: 20, eyeY: 40, gap: 13, hw: 26 },
    wolf: { top: 26, eyeY: 46, gap: 12, hw: 28 }, specter: { top: 16, eyeY: 48, gap: 13, hw: 30 },
    golem: { top: 24, eyeY: 40, gap: 12, hw: 26 }, cat: { top: 28, eyeY: 46, gap: 13, hw: 29 },
    bird: { top: 28, eyeY: 50, gap: 12, hw: 28 }, alien: { top: 14, eyeY: 48, gap: 14, hw: 30 },
  };

  // ── the body plans ───────────────────────────────────────────────────────
  const PLAN = {};

  PLAN.drake = (p, f, id) => {
    const hl = [1, 1.28, 1.6][f - 1], ws = [.72, .95, 1.2][f - 1];
    let back = '', s = '';
    back += `<path d="M74 92C98 98 112 82 104 62C102 78 92 84 76 84Z" fill="url(#${id}m)" ${st()}/>` +
      `<path d="M104 62L113 51L110 69Z" fill="${p.x}" ${st(2.2)}/>`;
    back += both(`<g transform="translate(46 64) scale(${ws}) translate(-46 -64)">` +
      `<path d="M46 62C26 34 3 36 3 68C11 57 19 61 24 71C28 63 34 63 38 73C41 67 44 67 46 74Z" fill="${p.x}" ${st()}/>` +
      `<path d="M46 62C32 52 20 50 10 56M24 71C24 62 20 58 14 56" fill="none" stroke="${K}" stroke-width="2"/></g>`);
    back += both(`<path d="M${44} 30C${40 - hl * 2} ${22 - hl * 6} ${41 - hl * 2} ${12 - hl * 5} ${47 - hl} ${8 - hl * 5}C${50} ${16 - hl * 2} ${53} ${24} ${54} 30Z" fill="${p.x}" ${st()}/>`);
    s += `<ellipse cx="60" cy="80" rx="25" ry="27" fill="url(#${id}m)" ${st()}/>` +
      `<ellipse cx="60" cy="86" rx="15" ry="19" fill="url(#${id}b)" ${st(2)}/>` +
      `<path d="M49 77h22M48 85h24M50 93h20" stroke="${p.d}" stroke-width="1.6" opacity=".35" fill="none"/>`;
    s += both(`<ellipse cx="38" cy="84" rx="6.5" ry="9.5" fill="url(#${id}m)" ${st()} transform="rotate(14 38 84)"/>` +
      `<ellipse cx="47" cy="106" rx="11" ry="5.5" fill="url(#${id}m)" ${st()}/><path d="M40 106v-3M45 107v-3M50 107v-3" stroke="${K}" stroke-width="1.6"/>`);
    if (f >= 2) s += [53, 60, 67].map((x, i) => `<path d="M${x - 4} 25L${x} ${10 - i % 2 * -3 - f * 2}L${x + 4} 25Z" fill="${p.x}" ${st(2.2)}/>`).join('');
    s += `<path d="M60 22C80 22 91 36 89 52C87 66 75 73 60 73C45 73 33 66 31 52C29 36 40 22 60 22Z" fill="url(#${id}m)" ${st()}/>` +
      both(`<path d="M32 55L21 58L33 64Z" fill="${p.x}" ${st(2.2)}/>`) +
      `<path d="M47 60C47 54 73 54 73 60C74 68 68 74 60 74C52 74 46 68 47 60Z" fill="url(#${id}b)" ${st(2.2)}/>` +
      both(`<path d="M52.5 58.6l2.6 1.2" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`) +
      `<path d="M51 67Q60 72 69 67" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/><path d="M54.5 68.6l1.6 4.2 2.2-3.4z" fill="#fff" ${st(1.2)}/>` +
      both(`${eye(48, 46, 6.4, 7.4, p.e)}${brow(39, 36, 56, 41)}`);
    return { back, front: s };
  };

  PLAN.mech = (p, f, id) => {
    let back = '', s = '';
    if (f >= 3) back += both(`<path d="M38 66L14 54L10 74L30 80Z" fill="${p.x}" ${st()}/><path d="M12 62L4 66L11 72Z" fill="${p.e}" opacity=".9"/>`);
    s += both(`<rect x="43" y="92" width="13" height="14" rx="4" fill="${p.d}" ${st()}/><rect x="38" y="102" width="21" height="8" rx="4" fill="url(#${id}m)" ${st()}/>`);
    s += both(`<rect x="24" y="64" width="12" height="26" rx="6" fill="url(#${id}m)" ${st()}/><circle cx="30" cy="94" r="8" fill="${p.x}" ${st()}/>`);
    s += `<rect x="36" y="60" width="48" height="38" rx="11" fill="url(#${id}m)" ${st()}/>` +
      `<rect x="45" y="67" width="30" height="22" rx="7" fill="#14102c" ${st(2)}/>` +
      `<circle cx="60" cy="78" r="${6 + f}" fill="${p.e}"/><circle cx="60" cy="78" r="${2.6 + f * .6}" fill="#fff" opacity=".85"/>` +
      `<path d="M49 93h22" stroke="${K}" stroke-width="2.2" opacity=".5"/>`;
    if (f >= 2) s += both(`<path d="M33 64Q27 56 38 55L43 66Z" fill="${p.x}" ${st()}/>`);
    s += `<rect x="34" y="19" width="52" height="42" rx="13" fill="url(#${id}m)" ${st()}/>` +
      both(`<circle cx="33" cy="40" r="6.5" fill="${p.d}" ${st()}/><path d="M${f >= 2 ? 44 : 46} 19L${f >= 2 ? 36 : 40} ${f >= 3 ? 3 : 7}" stroke="${K}" stroke-width="2.6"/><circle cx="${f >= 2 ? 36 : 40}" cy="${f >= 3 ? 3 : 7}" r="3.6" fill="${p.x}" ${st(2)}/>`) +
      `<rect x="40" y="28" width="40" height="23" rx="9" fill="#14102c" ${st(2)}/>` +
      both(`<rect x="44" y="35" width="13" height="8.5" rx="4.2" fill="${p.e}"/><rect x="46" y="36.5" width="5" height="2.6" rx="1.3" fill="#fff" opacity=".85"/>`) +
      `<path d="M52 55h16" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`;
    if (f >= 3) s += `<ellipse cx="60" cy="12" rx="22" ry="5" fill="none" stroke="${p.e}" stroke-width="3" opacity=".85"/>`;
    return { back, front: s };
  };

  PLAN.wolf = (p, f, id) => {
    const tails = p.v === 'fox' ? f : 1;
    let back = '', s = '';
    for (let i = 0; i < tails; i++) {
      const a = tails === 1 ? 0 : -26 + i * (52 / (tails - 1));
      back += `<g transform="rotate(${a} 70 88)"><path d="M70 92C102 98 116 70 102 48C102 70 88 80 72 82Z" fill="url(#${id}m)" ${st()}/><path d="M102 48C97 56 95 64 93 70C100 66 106 58 102 48Z" fill="${p.t || '#fff'}" ${st(2)}/></g>`;
    }
    back += both(`<path d="M38 42L30 10L55 29Z" fill="url(#${id}m)" ${st()}/><path d="M39 37L35 20L48 30Z" fill="${p.x}" opacity=".9"/>`);
    s += both(`<ellipse cx="47" cy="106" rx="11" ry="5.5" fill="url(#${id}m)" ${st()}/><ellipse cx="38" cy="84" rx="6" ry="10" fill="url(#${id}m)" ${st()} transform="rotate(12 38 84)"/>`);
    s += `<ellipse cx="60" cy="82" rx="23" ry="25" fill="url(#${id}m)" ${st()}/>` +
      `<path d="M47 68L60 96L73 68Q60 62 47 68Z" fill="url(#${id}b)" ${st(2)}/>` +
      `<path d="M38 66Q60 78 82 66L84 75Q60 88 36 75Z" fill="${p.x}" ${st()}/><path d="M74 76l9 18l-9-5Z" fill="${p.x}" ${st(2.4)}/>`;
    s += `<path d="M60 26C78 26 91 39 89 52C87 65 75 71 60 71C45 71 33 65 31 52C29 39 42 26 60 26Z" fill="url(#${id}m)" ${st()}/>` +
      both(`<path d="M33 56L22 60L34 66Z" fill="url(#${id}m)" ${st(2.4)}/>`) +
      `<path d="M60 51C73 51 77 60 72 67C67 73 53 73 48 67C43 60 47 51 60 51Z" fill="url(#${id}b)" ${st(2.2)}/>` +
      `<ellipse cx="60" cy="54.5" rx="4.6" ry="3.4" fill="${K}"/><path d="M60 58v4M52 65Q60 70 68 65" fill="none" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/>` +
      both(`${eye(48, 46, 6.2, 6.6, p.e)}${brow(40, 38, 56, 42.5)}<path d="M42 56L37 52M43 59L36 58" stroke="${p.x}" stroke-width="2.2" stroke-linecap="round"/>`);
    if (f >= 2) s += `<path d="M60 27L55 36L60 40L65 36Z" fill="${p.x}" ${st(1.8)}/>`;
    return { back, front: s };
  };

  PLAN.specter = (p, f, id) => {
    let back = '', s = '';
    back += `<circle cx="60" cy="58" r="${44 + f * 2}" fill="url(#${id}g)" opacity=".55"/>`;
    back += both(`<path d="M30 62C14 62 8 78 15 88C19 79 25 76 33 76Z" fill="url(#${id}m)" ${st()} opacity=".96"/>`);
    s += `<path d="M60 14C85 14 95 36 93 60C92 76 100 92 91 105C85 98 80 108 73 100C67 108 60 100 60 100C60 100 53 108 47 100C40 108 35 98 29 105C20 92 28 76 27 60C25 36 35 14 60 14Z" fill="url(#${id}m)" ${st()}/>` +
      `<path d="M42 26C48 20 56 18 62 18C52 24 46 34 44 44C40 40 40 32 42 26Z" fill="#fff" opacity=".35"/>` +
      `<ellipse cx="60" cy="80" rx="17" ry="14" fill="url(#${id}b)" opacity=".5"/>`;
    s += both(`<ellipse cx="47" cy="49" rx="9" ry="12" fill="#14102c" ${st(2)}/><ellipse cx="48" cy="51" rx="5" ry="8" fill="${p.e}"/><ellipse cx="48" cy="51" rx="1.8" ry="6" fill="#fff" opacity=".85"/><circle cx="45" cy="45" r="2.4" fill="#fff"/>${brow(36, 36, 55, 41)}`);
    s += `<path d="M48 68Q54 73 60 68Q66 73 72 68" fill="none" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/>`;
    if (p.v === 'hood') s += `<path d="M60 8C88 8 102 34 98 56C90 36 76 28 60 28C44 28 30 36 22 56C18 34 32 8 60 8Z" fill="${p.d}" ${st()}/>`;
    if (p.v === 'flame') s += `<path d="M60 4C70 14 68 22 62 24C66 18 60 14 60 4ZM54 16C58 22 54 26 52 26C50 22 54 20 54 16Z" fill="${p.e}" ${st(2)}/><circle cx="60" cy="14" r="2" fill="#fff"/>`;
    if (f >= 2) s += [[20, 30], [100, 40], [14, 78]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${3 + i % 2}" fill="${p.e}" opacity=".85"/>`).join('');
    return { back, front: s };
  };

  PLAN.golem = (p, f, id) => {
    let back = '', s = '';
    if (f >= 3) back += [[14, 40, 8], [106, 34, 7], [10, 78, 6], [110, 82, 8]].map(([x, y, r]) => `<polygon points="${x},${y - r} ${x + r * .8},${y} ${x},${y + r} ${x - r * .8},${y}" fill="${p.e}" ${st(2)}/>`).join('');
    s += both(`<rect x="38" y="92" width="19" height="17" rx="6" fill="${p.d}" ${st()}/>`);
    s += both(`<path d="M32 62L17 70L12 92L30 98L37 78Z" fill="url(#${id}m)" ${st()}/><rect x="9" y="88" width="24" height="17" rx="7" fill="url(#${id}m)" ${st()}/><path d="M16 94h12" stroke="${K}" stroke-width="1.8" opacity=".5"/>`);
    s += `<path d="M31 58L89 58L94 78L85 99L35 99L26 78Z" fill="url(#${id}m)" ${st()}/>` +
      `<polygon points="60,64 71,78 60,93 49,78" fill="${p.e}" ${st(2.4)}/><polygon points="60,68 66,78 60,86 54,78" fill="#fff" opacity=".6"/>` +
      `<path d="M36 70l8 6l-5 8M84 66l-7 7l6 6" fill="none" stroke="${p.e}" stroke-width="2" opacity=".9"/>`;
    if (f >= 2) s += both(`<polygon points="34,58 24,40 42,52" fill="${p.x}" ${st(2.2)}/>`);
    s += `<path d="M40 22L80 22L87 40L83 58L37 58L33 40Z" fill="url(#${id}m)" ${st()}/>` +
      both(`<polygon points="45,22 41,${f >= 3 ? 3 : 8} 53,20" fill="${p.x}" ${st(2.2)}/>`) +
      `<polygon points="60,22 56,12 64,12" fill="${p.x}" ${st(2)}/>` +
      both(`<rect x="44" y="35" width="14" height="8" rx="2.4" fill="${p.e}" ${st(1.8)}/><rect x="46" y="36.6" width="5" height="2.4" fill="#fff" opacity=".8"/>${brow(41, 31, 58, 36, 3.2)}`) +
      `<path d="M50 51h20M53 51v4M60 51v5M67 51v4" stroke="${K}" stroke-width="2.2" stroke-linecap="round"/>`;
    return { back, front: s };
  };

  PLAN.cat = (p, f, id) => {
    let back = '', s = '';
    back += `<path d="M72 96C104 102 108 66 88 58C98 76 90 86 74 86Z" fill="url(#${id}m)" ${st()}/><path d="M97 70l-8 5M100 82l-9 2" stroke="${p.x}" stroke-width="3.2" stroke-linecap="round"/>`;
    back += both(`<path d="M37 44L32 8L56 29Z" fill="url(#${id}m)" ${st()}/><path d="M38 38L36 18L48 29Z" fill="${p.x}" opacity=".9"/>${f >= 3 ? '<path d="M33 22L24 10L30 28Z" fill="' + p.x + '" ' + st(2) + '/>' : ''}`);
    s += both(`<ellipse cx="47" cy="106" rx="10" ry="5" fill="url(#${id}m)" ${st()}/><ellipse cx="39" cy="86" rx="5.4" ry="10" fill="url(#${id}m)" ${st()} transform="rotate(10 39 86)"/>`);
    s += `<ellipse cx="60" cy="84" rx="21" ry="24" fill="url(#${id}m)" ${st()}/><ellipse cx="60" cy="90" rx="12" ry="16" fill="url(#${id}b)" ${st(2)}/>` +
      `<path d="M42 84h-4M42 92h-4M78 84h4M78 92h4" stroke="${p.x}" stroke-width="3" stroke-linecap="round"/>`;
    if (f >= 2) s += `<path d="M44 68Q60 78 76 68" fill="none" stroke="${p.e}" stroke-width="3.4" stroke-linecap="round"/>`;
    s += `<path d="M60 28C83 28 93 40 91 54C89 66 77 72 60 72C43 72 31 66 29 54C27 40 37 28 60 28Z" fill="url(#${id}m)" ${st()}/>` +
      `<path d="M60 30L57 40M52 31L51 38M68 31L69 38" stroke="${p.x}" stroke-width="3" stroke-linecap="round"/>`;
    if (p.v === 'visor') s += `<rect x="31" y="38" width="58" height="17" rx="8.5" fill="#14102c" ${st(2.4)}/>` + both(`<rect x="38" y="43" width="15" height="7" rx="3.5" fill="${p.e}"/><rect x="40" y="44" width="5" height="2.4" rx="1.2" fill="#fff" opacity=".8"/>`);
    else s += both(`${eye(47, 46, 6.8, 6.6, p.e)}${brow(38, 38, 55, 42)}`);
    s += `<ellipse cx="60" cy="58" rx="3.6" ry="2.7" fill="${p.x}" ${st(1.6)}/><path d="M60 60.5v3M54 66Q57 68 60 64Q63 68 66 66" fill="none" stroke="${K}" stroke-width="2" stroke-linecap="round"/>` +
      both(`<path d="M44 62L28 58M44 65L29 68" stroke="${K}" stroke-width="1.5" stroke-linecap="round"/>`);
    return { back, front: s };
  };

  PLAN.bird = (p, f, id) => {
    let back = '', s = '';
    const flame = p.v === 'phoenix';
    if (flame) {
      back += [[-18, 1], [0, 1.2], [18, 1]].map(([a, k]) => `<g transform="rotate(${a} 60 96) translate(60 96) scale(${k}) translate(-60 -96)"><path d="M60 96C48 106 50 118 60 120C70 118 72 106 60 96Z" fill="${p.x}" ${st(2.2)}/></g>`).join('');
    }
    back += both(`<path d="M34 60C16 62 10 82 20 98C30 94 38 84 38 72Z" fill="url(#${id}m)" ${st()}/><path d="M24 80l8 4M22 88l9 2" stroke="${p.x}" stroke-width="2.6" stroke-linecap="round"/>`);
    s += both(`<path d="M46 104v6M42 110h8" stroke="${p.x}" stroke-width="3.4" stroke-linecap="round"/>`);
    s += `<ellipse cx="60" cy="68" rx="30" ry="36" fill="url(#${id}m)" ${st()}/><ellipse cx="60" cy="84" rx="17" ry="20" fill="url(#${id}b)" ${st(2)}/>` +
      `<path d="M50 78Q55 82 60 78Q65 82 70 78M48 88Q54 92 60 88Q66 92 72 88M52 98Q60 103 68 98" fill="none" stroke="${p.d}" stroke-width="1.8" opacity=".5"/>`;
    s += both(`<path d="M40 38L30 ${f >= 2 ? 10 : 16}L${flame ? 40 : 48} 30Z" fill="${p.x}" ${st(2.4)}/>`);
    if (flame) s += `<path d="M60 28C54 18 58 10 60 4C62 10 66 18 60 28Z" fill="${p.x}" ${st(2)}/>`;
    s += both(`<circle cx="47" cy="51" r="13.5" fill="${p.p || '#fff'}" ${st(2.2)}/>${eye(47, 51, 8.4, 8.8, p.e, false)}${brow(36, 38, 56, 44, 3.4)}`);
    s += `<path d="M54 58L66 58L60 72Z" fill="${p.x}" ${st(2.4)}/><path d="M57 63h6" stroke="${K}" stroke-width="1.4" opacity=".5"/>`;
    return { back, front: s };
  };

  PLAN.alien = (p, f, id) => {
    let back = '', s = '';
    if (p.v === 'octo') {
      back += [0, 1, 2, 3, 4].map(i => { const x = 34 + i * 13, d = i % 2 ? 6 : -6; return `<path d="M${x} 78C${x + d} 90 ${x - d} 98 ${x + d} 108C${x + d * 2} 110 ${x} 112 ${x - 2} 106C${x - d} 98 ${x + d} 90 ${x} 78Z" fill="url(#${id}m)" ${st(2.6)}/>`; }).join('');
    } else {
      back += both(`<ellipse cx="37" cy="94" rx="5" ry="12" fill="url(#${id}m)" ${st()} transform="rotate(16 37 94)"/>`);
      s += `<ellipse cx="60" cy="98" rx="14" ry="11" fill="${p.x}" ${st()}/><path d="M52 98h16M54 103h12" stroke="${K}" stroke-width="1.8" opacity=".5"/>`;
      s += both(`<ellipse cx="50" cy="108" rx="8" ry="4" fill="url(#${id}m)" ${st()}/>`);
    }
    if (p.v === 'void') back += `<ellipse cx="60" cy="52" rx="${50 + f * 2}" ry="14" fill="none" stroke="${p.x}" stroke-width="3" opacity=".75" transform="rotate(-14 60 52)"/>`;
    s += both(`<path d="M48 18L${f >= 2 ? 38 : 40} ${f >= 3 ? 1 : 5}" stroke="${K}" stroke-width="2.6" stroke-linecap="round"/><circle cx="${f >= 2 ? 38 : 40}" cy="${f >= 3 ? 1 : 5}" r="4" fill="${p.e}" ${st(2)}/>`);
    s += `<path d="M60 14C85 14 97 36 93 58C89 76 75 86 60 86C45 86 31 76 27 58C23 36 35 14 60 14Z" fill="url(#${id}m)" ${st()}/>` +
      `<path d="M38 26C44 20 54 17 62 17C50 24 44 34 42 44C38 40 36 32 38 26Z" fill="#fff" opacity=".3"/>`;
    if (p.v === 'octo') s += [[40, 30, 3], [74, 26, 2.4], [80, 56, 3], [36, 62, 2.4], [60, 22, 2]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${p.x}" opacity=".85"/>`).join('');
    if (p.v === 'void') s += [[44, 28], [76, 28], [60, 24]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="${p.e}" ${st(1.4)}/><circle cx="${x}" cy="${y}" r="1.2" fill="${K}"/>`).join('');
    s += both(`<path d="M${p.v === 'void' ? 30 : 30} 54C32 40 52 38 58 54C50 66 36 66 30 54Z" fill="#14102c" ${st(2)}/><ellipse cx="45" cy="53" rx="9" ry="6.5" fill="${p.e}" opacity=".95" transform="rotate(-12 45 53)"/><ellipse cx="45" cy="53" rx="2.4" ry="5" fill="${K}"/><circle cx="41" cy="49.5" r="2.6" fill="#fff"/>`) +
      `<path d="M54 72Q60 76 66 72" fill="none" stroke="${K}" stroke-width="2.4" stroke-linecap="round"/>`;
    return { back, front: s };
  };

  // ── evolution glow, gem, rays ─────────────────────────────────────────────
  function aura(p, f, id) {
    if (f === 1) return '';
    let s = `<circle cx="60" cy="62" r="${f === 2 ? 50 : 58}" fill="url(#${id}g)" opacity="${f === 2 ? .5 : .75}"/>`;
    if (f === 3) {
      let rays = '';
      for (let i = 0; i < 12; i++) rays += `<path d="M60 62L${60 + 55 * Math.cos(i * Math.PI / 6 - .1)} ${62 + 55 * Math.sin(i * Math.PI / 6 - .1)}L${60 + 55 * Math.cos(i * Math.PI / 6 + .1)} ${62 + 55 * Math.sin(i * Math.PI / 6 + .1)}Z"/>`;
      s += `<g fill="${p.e}" opacity=".25">${rays}</g>`;
    }
    const sp = f === 2 ? [[14, 28, 4], [108, 40, 3.4], [100, 96, 3]] : [[12, 24, 5], [108, 30, 4.4], [104, 96, 4], [14, 88, 3.6], [60, 4, 3.6]];
    return s + sp.map(([x, y, r]) => sparkle(x, y, r, '#fff')).join('');
  }
  function gem(tpl, p, f) {
    if (f < 2) return '';
    const a = ANCH[tpl]; if (tpl === 'mech' || tpl === 'golem') return '';
    const y = a.top + (tpl === 'specter' ? 18 : 12);
    return `<polygon points="60,${y - 5} 64.5,${y} 60,${y + 6} 55.5,${y}" fill="${p.e}" ${st(1.6)}/><polygon points="60,${y - 3} 62,${y} 60,${y + 1}" fill="#fff" opacity=".9"/>`;
  }

  // ── gear (shop items drawn on the anchors above) ───────────────────────────
  const GEAR = {
    cap: (a) => `<path d="M${60 - a.hw + 4} ${a.top + 14}C${60 - a.hw + 4} ${a.top - 6} ${60 + a.hw - 4} ${a.top - 6} ${60 + a.hw - 4} ${a.top + 14}Z" fill="#e5384d" ${st()}/><path d="M${60 - a.hw + 4} ${a.top + 14}L${60 + a.hw + 8} ${a.top + 14}" stroke="${K}" stroke-width="3.4"/><circle cx="60" cy="${a.top - 2}" r="2.6" fill="#fff" ${st(1.4)}/>`,
    crown: (a) => `<path d="M${60 - 18} ${a.top + 8}L${60 - 20} ${a.top - 9}L${60 - 9} ${a.top - 1}L60 ${a.top - 12}L${60 + 9} ${a.top - 1}L${60 + 20} ${a.top - 9}L${60 + 18} ${a.top + 8}Z" fill="#ffc83d" ${st()}/><circle cx="60" cy="${a.top - 12}" r="2.6" fill="#ff4fa0" ${st(1.4)}/><circle cx="40" cy="${a.top - 9}" r="2.2" fill="#3ee6d3" ${st(1.4)}/><circle cx="80" cy="${a.top - 9}" r="2.2" fill="#3ee6d3" ${st(1.4)}/>`,
    wizard: (a) => `<path d="M${60 - 26} ${a.top + 10}L60 ${a.top - 36}L${60 + 26} ${a.top + 10}Z" fill="#5b3fd1" ${st()}/><ellipse cx="60" cy="${a.top + 10}" rx="32" ry="5.5" fill="#4630ad" ${st()}/><path d="M60 ${a.top - 12}l2 5l5 .6l-4 3.6l1.2 5l-4.2-2.6l-4.2 2.6l1.2-5l-4-3.6l5-.6z" fill="#ffd93d"/>`,
    headphones: (a) => `<path d="M${60 - a.hw - 1} ${a.eyeY - 2}C${60 - a.hw - 4} ${a.top - 12} ${60 + a.hw + 4} ${a.top - 12} ${60 + a.hw + 1} ${a.eyeY - 2}" fill="none" stroke="${K}" stroke-width="7"/><path d="M${60 - a.hw - 1} ${a.eyeY - 2}C${60 - a.hw - 4} ${a.top - 12} ${60 + a.hw + 4} ${a.top - 12} ${60 + a.hw + 1} ${a.eyeY - 2}" fill="none" stroke="#3ee6d3" stroke-width="3.4"/><rect x="${60 - a.hw - 8}" y="${a.eyeY - 8}" width="12" height="20" rx="5" fill="#3ee6d3" ${st()}/><rect x="${60 + a.hw - 4}" y="${a.eyeY - 8}" width="12" height="20" rx="5" fill="#3ee6d3" ${st()}/>`,
    shades: (a) => `<path d="M${60 - a.gap - 13} ${a.eyeY - 6}H${60 + a.gap + 13}V${a.eyeY + 3}Q${60 + a.gap + 9} ${a.eyeY + 10} ${60 + a.gap + 2} ${a.eyeY + 8}L60 ${a.eyeY + 3}L${60 - a.gap - 2} ${a.eyeY + 8}Q${60 - a.gap - 9} ${a.eyeY + 10} ${60 - a.gap - 13} ${a.eyeY + 3}Z" fill="#14102c" ${st(2.4)}/><path d="M${60 - a.gap - 9} ${a.eyeY - 3}l6 0M${60 + a.gap + 3} ${a.eyeY - 3}l6 0" stroke="#fff" stroke-width="2" opacity=".7" stroke-linecap="round"/>`,
    goggles: (a) => `<path d="M${60 - a.hw + 2} ${a.eyeY}H${60 + a.hw - 2}" stroke="${K}" stroke-width="5"/><circle cx="${60 - a.gap}" cy="${a.eyeY}" r="9.5" fill="#ffb13d" ${st(2.6)}/><circle cx="${60 + a.gap}" cy="${a.eyeY}" r="9.5" fill="#ffb13d" ${st(2.6)}/><circle cx="${60 - a.gap}" cy="${a.eyeY}" r="6.4" fill="#9be8ff" opacity=".9"/><circle cx="${60 + a.gap}" cy="${a.eyeY}" r="6.4" fill="#9be8ff" opacity=".9"/><circle cx="${60 - a.gap - 2}" cy="${a.eyeY - 2}" r="2" fill="#fff"/><circle cx="${60 + a.gap - 2}" cy="${a.eyeY - 2}" r="2" fill="#fff"/>`,
    cape: () => '',                          // drawn behind the body (see capeBack)
  };
  const capeBack = () => `<path d="M34 54L16 108L60 100L104 108L86 54Z" fill="#d3263f" ${st()}/><path d="M34 54L60 66L86 54" fill="none" stroke="${K}" stroke-width="2.6"/><path d="M26 92L60 88L94 92" stroke="#ff7a8e" stroke-width="2" opacity=".6" fill="none"/>`;
  const capeFront = () => `<path d="M42 62Q60 72 78 62L76 70Q60 80 44 70Z" fill="#b01f35" ${st(2.2)}/><circle cx="60" cy="72" r="3" fill="#ffc83d" ${st(1.4)}/>`;

  // The public entry: a character, one form, optional gear {hat, eyes, back, aura}.
  function ally(def, form = 1, gear = {}) {
    const plan = PLAN[def.t];
    if (!plan) return '';
    const p = Object.assign({}, def.pal);
    p.d = p.d || shade(p.m, -.38);
    p.l = p.l || shade(p.m, .3);
    p.b = p.b || shade(p.m, .62);
    p.e = p.e || '#ffe14d';
    const id = `a${def.k}${form}`;
    const a = ANCH[def.t];
    const body = plan(p, form, id);
    const defs = `<defs>${lin(id + 'm', shade(p.m, .26), shade(p.m, -.22))}${lin(id + 'b', shade(p.b, .1), shade(p.b, -.12))}${rad(id + 'g', p.e, p.e, 0)}</defs>`;
    const shadow = `<ellipse cx="60" cy="110" rx="${28 + form * 2}" ry="4.5" fill="#000" opacity=".2"/>`;
    const sparkle3 = '';
    let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">${defs}${aura(p, form, id)}${shadow}`;
    if (gear.back === 'cape') out += capeBack();
    out += body.back + body.front + gem(def.t, p, form);
    if (gear.back === 'cape') out += capeFront();
    if (gear.eyes && GEAR[gear.eyes]) out += GEAR[gear.eyes](a);
    if (gear.hat && GEAR[gear.hat]) out += GEAR[gear.hat](a);
    return out + sparkle3 + '</svg>';
  }

  return { ally, shade, sparkle, K, st, lin, rad, both, eye, brow, PLAN, ANCH, GEAR };
})();
if (typeof module !== 'undefined') module.exports = Art;
