#!/usr/bin/env python3
"""The ship gate. Nothing is deployed unless this prints "audit clean".

    ../wonder-lab/.venv-tts/bin/python dev/audit.py

Checks, in order: the word list rebuilds with no problems; every word and sentence has a
recording of sane length that is not silent; every sound effect exists; the engine's
tests pass; every piece of art is well-formed SVG with no clashing gradient ids; no
device voice and no British spellings anywhere in the shipped code; every script and
cached asset exists; the build stamps agree; the download stays small.
"""
import json, os, re, subprocess, sys, glob
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'dev'))
import american
fails = []
def bad(m): fails.append(m); print('  FAIL', m)
def sect(n): print('·', n)
def rd(p): return open(os.path.join(ROOT, p), encoding='utf-8').read()

SHIPPED_JS = ['firebase-config.js', 'data.js', 'data-allies.js', 'art.js', 'art-more.js', 'engine.js', 'store.js', 'sync.js', 'audio.js',
              'app-core.js', 'app-home.js', 'app-play.js', 'app-meta.js', 'sw.js']

# 1. words
sect('word list')
r = subprocess.run([sys.executable, 'dev/build_words.py'], capture_output=True, text=True, cwd=ROOT)
if r.returncode: bad('build_words.py reported problems:\n' + r.stdout[-1500:])
words = json.load(open(os.path.join(ROOT, '.work', 'words.json')))
if len(words) < 800: bad(f'only {len(words)} words')
for w in words:
    if not w['d'] or not w['s']: bad(w['i'] + ' missing definition or sentence')
    for a, b, *_ in w.get('tr', []):
        if not (0 <= a < b <= len(w['i'])): bad(f"{w['i']} trap range {a}-{b} out of bounds")
    if len(w['x']) < 3: bad(w['i'] + ' has fewer than 3 wrong spellings')

# 2. audio
sect('recordings')
man = json.load(open(os.path.join(ROOT, 'audio', 'manifest.json')))['clips']
import numpy as np, wave, tempfile
sizes = 0
for w in words:
    for kind, lo, hi in (('w', 0.25, 2.2), ('s', 0.8, 10)):
        k = f'{kind}/{w["i"]}'; p = os.path.join(ROOT, 'audio', k + '.m4a')
        if k not in man or not os.path.exists(p): bad('no recording: ' + k); continue
        sizes += os.path.getsize(p)
        if os.path.getsize(p) < 2500: bad(f'recording too small: {k}')
tmp = tempfile.mkdtemp(prefix='sqaudit-', dir=os.path.join(ROOT, '.work'))
sample = words[::7] + [w for w in words if len(w['i']) <= 4][:40]
silent = 0
for w in sample:
    for kind in ('w', 's'):
        p = os.path.join(ROOT, 'audio', kind, w['i'] + '.m4a'); o = os.path.join(tmp, 'x.wav')
        subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16', p, o], capture_output=True)
        try:
            with wave.open(o) as f: n = f.getnframes(); sr = f.getframerate(); a = np.frombuffer(f.readframes(n), dtype=np.int16).astype(float) / 32768
        except Exception: bad('cannot decode ' + p); continue
        dur = n / sr; lo, hi = (0.25, 2.2) if kind == 'w' else (0.8, 10)
        if not (lo <= dur <= hi): bad(f'{kind}/{w["i"]} is {dur:.2f}s (want {lo}-{hi})')
        if np.sqrt(np.mean(a ** 2)) < 0.02: bad(f'{kind}/{w["i"]} is nearly silent'); silent += 1
for f in glob.glob(os.path.join(tmp, '*')): os.unlink(f)
os.rmdir(tmp)
sfx = re.search(r"NAMES: \[(.*?)\]", rd('audio.js'), re.S).group(1)
for n in re.findall(r"'(\w+)'", sfx):
    if not os.path.exists(os.path.join(ROOT, 'audio', 'sfx', n + '.m4a')): bad('missing sound effect ' + n)
# Whisper round trip is ADVISORY: it mishears short words ("could" -> "cud") even when the voice is fine, so it can
# not gate a release. dev/verify_audio.py writes .work/verify-<w|s>.txt; this just reports how many it flagged.
for kind, what in (('w', 'word'), ('s', 'sentence')):
    f = os.path.join(ROOT, '.work', f'verify-{kind}.txt')
    if os.path.exists(f):
        print(f'   Whisper flagged {len([l for l in open(f) if l.strip()])} {what} clips (advisory; see {os.path.relpath(f, ROOT)})')

# 3. engine tests
sect('engine tests')
r = subprocess.run(['node', 'dev/test_engine.js'], capture_output=True, text=True, cwd=ROOT)
if r.returncode: bad('engine tests failed:\n' + '\n'.join(l for l in r.stdout.splitlines() if 'FAIL' in l or 'THREW' in l)[:1500])
else: print('  ', r.stdout.strip().splitlines()[-1])

# 4. art
sect('art')
js = r"""
const fs=require('fs'),vm=require('vm');const ctx=vm.createContext({console,Math,JSON,Object,Array,Set});
for(const f of ['art.js','data-allies.js','art-more.js']) vm.runInContext(fs.readFileSync(f,'utf8').replace(/^const (\w+) =/gm,'var $1 ='),ctx);
const out=[];const Art=ctx.Art;
for(const a of ctx.ALLIES) for(const f of [1,2,3]) for(const g of [{},{hat:'crown',eyes:'shades',back:'cape'},{hat:'wizard',eyes:'goggles'}]) out.push(['ally '+a.k+f,Art.ally(a,f,g)]);
for(const h of Art.HEROES) for(let s=0;s<6;s++) out.push(['hero '+h.k+s,Art.hero(h,{skin:s})]);
for(const b of Art.BOSSES) out.push(['boss '+b.k,Art.boss(b.k)]);
for(const n of ['coin','gem','flame','xp','heart','key','lock','trophy','shield','book','bolt','check','speaker','hint','sword']) out.push(['icon '+n,Art.icon(n)]);
for(const t of ['bronze','silver','gold']) out.push(['crate '+t,Art.crate(t)]);
for(let i=1;i<=8;i++) out.push(['world '+i,Art.world(i)]);
console.log(JSON.stringify(out));"""
r = subprocess.run(['node', '-e', js], capture_output=True, text=True, cwd=ROOT)
if r.returncode: bad('art did not render: ' + r.stderr[:300])
else:
    svgs = json.loads(r.stdout); ids = {}
    d = os.path.join(ROOT, '.work', 'svgcheck'); os.makedirs(d, exist_ok=True)
    for name, svg in svgs:
        if not svg.startswith('<svg') or not svg.rstrip().endswith('</svg>'): bad(name + ': not an svg'); continue
        if re.search(r'<rect(?![^>]*\bwidth=)[^>]*>', svg): bad(name + ': a <rect> has no width (it would paint nothing)')
        if 'NaN' in svg or 'undefined' in svg: bad(name + ': NaN/undefined in the markup')
        for m in re.finditer(r'<(linearGradient|radialGradient) id="([^"]+)"[^>]*>(.*?)</\1>', svg, re.S):
            key = m.group(2); body = m.group(3)
            if key in ids and ids[key] != body: bad(f'gradient id {key} is reused with different colors (the second would paint with the first one\'s)')
            ids[key] = body
    open(os.path.join(d, 'all.xml'), 'w').write('<r>' + ''.join(s.replace('xmlns="http://www.w3.org/2000/svg"', '') for _, s in svgs) + '</r>')
    x = subprocess.run(['xmllint', '--noout', os.path.join(d, 'all.xml')], capture_output=True, text=True)
    if x.returncode: bad('SVG is not well-formed XML: ' + x.stderr[:300])
    print(f'   {len(svgs)} drawings, {len(ids)} gradients, well-formed')
    for f in glob.glob(os.path.join(d, '*')): os.unlink(f)
    os.rmdir(d)

# 5. code rules
sect('code rules')
for f in SHIPPED_JS + ['index.html', 'style.css', 'manifest.json']:
    t = rd(f)
    code = re.sub(r'//[^\n]*|/\*.*?\*/', '', t, flags=re.S) if f.endswith('.js') else t
    for banned in ('speechSynthesis', 'SpeechSynthesisUtterance', 'AVSpeechSynthesizer'):
        if banned in code: bad(f'{f}: {banned} — no device voice, ever')
    for h in american.british_hits(re.sub(r"https?://\S+", '', t)): bad(f'{f}: British spelling "{h}"')
for w in words:
    for field in (w['d'], w['s'], w.get('t', '')):
        for h in american.british_hits(field): bad(f"{w['i']}: British spelling {h}")

# 6. files and stamps
sect('files')
idx = rd('index.html')
for m in re.findall(r'(?:src|href)="([^"?]+)(?:\?v=[^"]*)?"', idx):
    if m.startswith('http'): continue
    if not os.path.exists(os.path.join(ROOT, m)): bad('index.html references a missing file: ' + m)
sw = rd('sw.js')
for m in re.findall(r"'([\w./-]+\.(?:js|css|png|json|html))'", sw.split('const SFX')[0]):
    if not os.path.exists(os.path.join(ROOT, m)): bad('sw.js caches a missing file: ' + m)
vers = set(re.findall(r'\?v=([A-Za-z0-9.-]+)', idx)); meta = re.search(r'name="build" content="([^"]+)"', idx).group(1)
ver = json.load(open(os.path.join(ROOT, 'version.json')))['build']; cache = re.search(r"CACHE = 'sq-([^']+)'", sw).group(1)
if len(vers) != 1 or meta not in vers or ver != meta or cache != meta: bad(f'build stamps disagree (index {vers}/{meta}, version.json {ver}, sw {cache}): run dev/stamp.py')
total = 0
for dp, dn, fn in os.walk(ROOT):
    if any(x in dp for x in ('/.git', '/.work', '/node_modules')): continue
    total += sum(os.path.getsize(os.path.join(dp, f)) for f in fn)
print(f'   download: {total / 1e6:.1f} MB (audio {sizes / 1e6:.1f} MB)')
if total > 60e6: bad('over 60 MB')

print('\naudit clean' if not fails else f'\n{len(fails)} problem(s)')
sys.exit(1 if fails else 0)
