// node dev/peek.js [level] [stride]  — print words with their traps and wrong spellings
const fs = require('fs');
const WORDS = new Function(fs.readFileSync(__dirname + '/../words.js', 'utf8') + '; return WORDS;')();
const lv = +process.argv[2] || 0, stride = +process.argv[3] || 1;
WORDS.filter(w => !lv || w.l === lv).filter((_, i) => i % stride === 0).forEach(w => {
  const m = w.i.split('').map((c, k) => (w.tr || []).some(t => k >= t[0] && k < t[1]) ? c.toUpperCase() : c).join('');
  console.log(m.padEnd(16), (w.tr || []).map(t => t[2] || '·').join('/').padEnd(22), w.x.join(', '));
});
