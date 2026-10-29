#!/usr/bin/env python3
"""Build words.js from dev/words/L*.txt.

Source line:   word | part of speech | definition | sentence | tip (optional) | sound-alike twins (optional)

* Brackets inside the word mark the TRAP letters by hand: ne[c]e[ss]ary.
  Without brackets the traps are detected from the spelling (silent letters,
  doubled letters, ie/ei, -ence/-ance ...). A trap is where children actually
  go wrong, and it is what glows after a miss.
* Every word, every wrong spelling and every word of every sentence goes past
  the macOS system spellchecker (dev/spellcheck.swift). A typo in a sentence
  would be SPOKEN wrongly, and a "wrong spelling" that is really a word would
  make Pick-It unfair.
* Run:  python3 dev/build_words.py          (writes words.js, prints a report)
"""
import json, os, re, subprocess, sys, hashlib
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import american
from itertools import product

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'dev', 'words')
CACHE = os.path.join(ROOT, '.work', 'spell-cache.json')
LEVELS = 8

# Words the macOS dictionary does not know but that are right (names, brand
# words, very new words).  Keep this list tiny and honest.
ALLOW = {'minecraft', 'ok', 'okay', 'wifi', 'youtube', 'zoom', 'pixels', 'esports',
         'gps', 'diy', 'tv', 'pc', 'ipad'}

# ── spellcheck (cached) ─────────────────────────────────────────────────────
def load_cache():
    try:
        return json.load(open(CACHE))
    except Exception:
        return {}

def spell(words):
    """word -> True if the system dictionary accepts it (lower-case)."""
    cache = load_cache()
    todo = sorted({w for w in words if w not in cache})
    if todo:
        p = subprocess.run(['swift', os.path.join(ROOT, 'dev', 'spellcheck.swift')],
                           input='\n'.join(todo) + '\n', capture_output=True, text=True)
        if p.returncode != 0:
            sys.exit('spellcheck failed: ' + p.stderr[:400])
        for line in p.stdout.splitlines():
            parts = line.split('\t')
            if len(parts) >= 2:
                cache[parts[0]] = (parts[1] == 'ok')
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        json.dump(cache, open(CACHE, 'w'))
    return {w: cache.get(w, False) or w.lower() in ALLOW for w in words}

# ── traps ───────────────────────────────────────────────────────────────────
VOW = set('aeiou')
# label -> the one-line tip shown with the glowing letters
TRAP_TIP = {
    'silent k': 'The k is silent — it hides at the start: kn-.',
    'silent w': 'The w is silent — it hides at the start: wr-.',
    'silent g': 'The g is silent — it hides at the start: gn-.',
    'silent p': 'The p is silent at the start.',
    'silent b': 'The b is silent — you cannot hear it, so you have to remember it.',
    'silent n': 'The n at the end is silent: -mn.',
    'silent l': 'The l is silent — it hides in the middle.',
    'silent t': 'The t is silent — you do not hear it, but it is there.',
    'silent h': 'The h is silent — it hides after the first letter.',
    'silent u': 'The u is silent — it keeps the g hard.',
    'silent gh': 'The gh is silent — you do not hear it, but it is there.',
    'silent s': 'The s is silent — you cannot hear it.',
    'silent c': 'The c is silent here.',
    'silent d': 'The d is silent — you cannot hear it.',
    'ough': 'Tricky -ough: the same four letters make many different sounds.',
    'eigh': 'eigh says ay, like eight and weigh.',
    'aigh': 'aigh says ay, like straight.',
    'augh': 'Tricky -augh: you have to remember it.',
    'ie': 'i before e, except after c.',
    'ei': 'e before i after c — and a few rebels (weird, seize, neighbor).',
    '-ence': 'Ends in -ence with an e, not -ance.',
    '-ance': 'Ends in -ance with an a, not -ence.',
    '-ent': 'Ends in -ent with an e, not -ant.',
    '-ant': 'Ends in -ant with an a, not -ent.',
    '-able': 'Ends in -able with an a, not -ible.',
    '-ible': 'Ends in -ible with an i, not -able.',
    '-tion': 'The sh sound is spelled -tion here.',
    '-sion': 'The zh or sh sound is spelled -sion here.',
    '-cian': 'A person who does something: -cian.',
    '-ious': 'Ends in -ious.',
    '-eous': 'Ends in -eous.',
    '-ous': 'Ends in -ous — never -us.',
    '-ery': 'Ends in -ery.',
    '-ary': 'Ends in -ary.',
    '-ory': 'Ends in -ory.',
    '-ize': 'Ends in -ize with a z.',
    '-ise': 'Ends in -ise with an s.',
    'ph': 'ph says f.',
    'rh': 'rh says r — the h is silent.',
    'ps': 'ps says s — the p is silent.',
    'sc': 'sc says s — the c is along for the ride.',
    'y vowel': 'The y is working as a vowel here.',
    'ch': 'ch says k here.',
    'tch': 'It is -tch, with a sneaky t.',
    'dge': 'It is -dge, with a sneaky d.',
}

def _doubled_label(c):
    return 'double ' + c

def auto_traps(w):
    """[(start, end, label)] — at most two, strongest first."""
    found = []
    def add(a, b, label, pri):
        if a < b and not any(not (b <= x or a >= y) for x, y, _, _ in found):
            found.append((a, b, label, pri))
    # silent starts
    for pre, lab in (('kn', 'silent k'), ('wr', 'silent w'), ('gn', 'silent g'), ('pn', 'silent p')):
        if w.startswith(pre):
            add(0, 1, lab, 1)
    if w.startswith('ps'): add(0, 2, 'ps', 1)
    if w.startswith('rh'): add(0, 2, 'rh', 1)
    if re.fullmatch(r'wh(o|ole|ose|om)', w): add(1, 2, 'silent h', 1)
    if w == 'island': add(1, 2, 'silent s', 1)
    # silent middles and ends
    if re.search(r'mb(s|ing|ed)?$', w):
        i = w.rfind('mb') + 1
        add(i, i + 1, 'silent b', 1)
    if w.endswith('mn') or w.endswith('mns'):
        i = w.rfind('mn') + 1
        add(i, i + 1, 'silent n', 1)
    for m in re.finditer(r'b(?=t)', w):
        add(m.start(), m.end(), 'silent b', 1)
    for m in re.finditer(r'(?<=[ao])l(?=[kmf]\b|k)', w):
        add(m.start(), m.end(), 'silent l', 2)
    for m in re.finditer(r'(?<=s)t(?=le\b|en\b|ens\b|ened\b|ening\b)|(?<=f)t(?=en\b|ened\b)', w):
        add(m.start(), m.end(), 'silent t', 1)
    for m in re.finditer(r'(?<=[aeiou])t(?=ch)', w):
        add(m.start(), m.end(), 'tch', 2)
    for m in re.finditer(r'(?<=[aeiou])d(?=ge)', w):
        add(m.start(), m.end(), 'dge', 2)
    for m in re.finditer(r'(?<=g)u(?=[aeiy])', w):
        add(m.start(), m.end(), 'silent u', 1)
    for m in re.finditer(r'ough|augh', w):
        add(m.start(), m.end(), 'ough' if m.group() == 'ough' else 'augh', 1)
    for m in re.finditer(r'eigh|aigh', w):
        add(m.start(), m.end(), m.group(), 1)
    for m in re.finditer(r'gh(?=t)', w):
        add(m.start(), m.end(), 'silent gh', 1)
    # ie / ei
    for m in re.finditer(r'ie|ei', w):
        add(m.start(), m.end(), 'ie' if m.group() == 'ie' else 'ei', 1)
    # suffix choices: mark the deciding vowel
    if len(w) > 5:
        for suf, idx, lab in (('ance', 1, '-ance'), ('ence', 1, '-ence'), ('ancy', 1, '-ance'),
                              ('ency', 1, '-ence'), ('ant', 0, '-ant'), ('ent', 0, '-ent'),
                              ('able', 0, '-able'), ('ible', 0, '-ible'), ('ably', 0, '-able'),
                              ('ibly', 0, '-ible')):
            if w.endswith(suf):
                a = len(w) - len(suf) + idx
                add(a, a + 1, lab, 2)
    for suf, off, ln, lab in (('tion', 0, 4, '-tion'), ('sion', 0, 4, '-sion'), ('cian', 0, 4, '-cian'),
                              ('ious', 0, 4, '-ious'), ('eous', 0, 4, '-eous'), ('ery', 0, 1, '-ery'),
                              ('ary', 0, 1, '-ary'), ('ory', 0, 1, '-ory'), ('ize', 1, 1, '-ize')):
        if w.endswith(suf) and len(w) > len(suf) + 2:
            a = len(w) - len(suf) + off
            add(a, a + ln, lab, 3)
    if re.search(r'[^ei]ous$', w) and len(w) > 6:
        add(len(w) - 3, len(w), '-ous', 3)
    # greek / odd digraphs
    for m in re.finditer(r'ph', w):
        add(m.start(), m.end(), 'ph', 2)
    for m in re.finditer(r'(?<=s)c(?=[eiy])', w):
        add(m.start() - 1, m.end(), 'sc', 2)
    for m in re.finditer(r'(?<=[b-df-hj-np-tv-z])y(?=[b-df-hj-np-tv-z])', w):
        if m.start() > 0:
            add(m.start(), m.end(), 'y vowel', 3)
    # doubled consonants (a final ll/ss/ff/zz is so common it ranks last)
    for m in re.finditer(r'([b-df-hj-np-tv-z])\1', w):
        c = m.group(1)
        tail = m.end() == len(w)
        add(m.start(), m.end(), 'double ' + c, 5 if (tail and c in 'lsfz') else 2)
    found.sort(key=lambda t: (t[3], t[0]))
    return [(a, b, lab) for a, b, lab, _ in found[:2]]

def parse_markup(raw):
    """'ne[c]e[ss]ary' -> ('necessary', [(2,3,'trap'), (4,6,'trap')])"""
    word, spans, pos = '', [], 0
    start = None
    for ch in raw:
        if ch == '[':
            start = len(word)
        elif ch == ']':
            spans.append((start, len(word), 'trap'))
            start = None
        else:
            word += ch
    return word, spans

# ── wrong spellings ─────────────────────────────────────────────────────────
# A made-up spelling must never spell something rude (vowel swaps once turned
# "contradict" into "cuntradict"). Any fragment here that the wrong spelling
# GAINS compared with the real word disqualifies it.
RUDE = ['cunt', 'fuck', 'shit', 'dick', 'cock', 'twat', 'slut', 'whor', 'nigg', 'fagg', 'rape', 'porn',
        'penis', 'vagin', 'tits', 'boob', 'cum', 'ass', 'arse', 'tit', 'sex', 'damn', 'crap', 'piss',
        'poo', 'fart', 'butt', 'bum', 'nazi', 'hell', 'anal', 'anus', 'dam', 'hoe', 'pimp', 'gay',
        'kill', 'die', 'hate', 'nude', 'naked', 'drug', 'weed', 'beer', 'wine', 'gun', 'bomb']

def rude_gain(c, w):
    return any(f in c and f not in w for f in RUDE)

SUFFIX_SWAPS = [('ance', 'ence'), ('ence', 'ance'), ('ant', 'ent'), ('ent', 'ant'), ('able', 'ible'),
                ('ible', 'able'), ('ably', 'ibly'), ('ibly', 'ably'), ('tion', 'sion'), ('sion', 'tion'),
                ('cian', 'tion'), ('ous', 'us'), ('eous', 'ious'), ('ious', 'eous'), ('ary', 'ery'),
                ('ery', 'ary'), ('ory', 'ary'), ('ize', 'ise'), ('ise', 'ize'), ('ally', 'aly'),
                ('ful', 'full'), ('tial', 'cial'), ('cial', 'tial'), ('ssion', 'tion'), ('ture', 'cher')]
SUBS = [('ph', 'f'), ('f', 'ph'), ('ck', 'k'), ('k', 'ck'), ('ch', 'sh'), ('sh', 'ch'), ('ee', 'ea'),
        ('ea', 'ee'), ('ai', 'ay'), ('ay', 'ai'), ('oa', 'ow'), ('ow', 'ou'), ('ou', 'ow'),
        ('ge', 'je'), ('ci', 'si'), ('ce', 'se'), ('se', 'ce'), ('ks', 'x'), ('x', 'ks'), ('kw', 'qu'),
        ('qu', 'kw'), ('oo', 'ou'), ('au', 'aw'), ('aw', 'au'), ('oi', 'oy'), ('igh', 'ie'), ('ie', 'y'),
        ('y', 'i'), ('i', 'y'), ('ur', 'er'), ('er', 'ar'), ('ar', 'er'), ('or', 'er'), ('le', 'el'),
        ('el', 'le'), ('al', 'le'), ('s', 'z'), ('z', 's'), ('c', 's'), ('j', 'g'), ('g', 'j'),
        ('or', 'ur'), ('ur', 'or'), ('ir', 'ur'), ('ur', 'ir'), ('er', 'ir'), ('ear', 'er'), ('ar', 'or'),
        ('o', 'u'), ('a', 'o'), ('u', 'o'), ('ight', 'ite'), ('ough', 'uff'), ('ough', 'ow')]

_NGRAMS = None
def ngrams():
    """Letter pair/triple counts from the system word list, with ^ $ edges."""
    global _NGRAMS
    if _NGRAMS is None:
        bi, tri = {}, {}
        for line in open('/usr/share/dict/words', encoding='latin-1'):
            t = line.strip().lower()
            if not t.isalpha():
                continue
            t = '^' + t + '$'
            for i in range(len(t) - 1):
                bi[t[i:i + 2]] = bi.get(t[i:i + 2], 0) + 1
            for i in range(len(t) - 2):
                tri[t[i:i + 3]] = tri.get(t[i:i + 3], 0) + 1
        _NGRAMS = (bi, tri)
    return _NGRAMS

def plausible(c, strict=True):
    """Could an English word look like this? (no 'bsy', 'wtch', 'cknee')"""
    bi, tri = ngrams()
    t = '^' + c + '$'
    if re.search(r'(.)\1\1', t):
        return False
    b_min, t_min = (12, 2) if strict else (5, 1)
    return (all(bi.get(t[i:i + 2], 0) >= b_min for i in range(len(t) - 1)) and
            all(tri.get(t[i:i + 3], 0) >= t_min for i in range(len(t) - 2)))

def candidates(w):
    """[(tier, wrong spelling)] — tier 0 are the mistakes children really make."""
    out = {}
    def add(x, tier):
        if x and x != w and x.isalpha() and (x not in out or out[x] > tier):
            out[x] = tier
    traps = auto_traps(w)
    for a, b, lab in traps:
        seg = w[a:b]
        if lab.startswith('double '):
            add(w[:a] + seg[0] + w[b:], 0)
        elif lab in ('ie', 'ei'):
            add(w[:a] + seg[::-1] + w[b:], 0)
        elif lab.startswith('silent') or lab in ('ps', 'rh', 'tch', 'dge'):
            add(w[:a] + w[b:], 0)
        elif lab.startswith('-') and len(seg) == 1:
            for sw in {'a': 'ei', 'e': 'ai', 'i': 'ae'}.get(seg, ''):
                add(w[:a] + sw + w[b:], 0)
    for m in re.finditer(r'([b-df-hj-np-tv-z])\1', w):
        add(w[:m.start()] + m.group(1) + w[m.end():], 1)
    for i in range(1, len(w) - 1):
        if w[i] in 'bcdfgklmnprstvz' and w[i - 1] in VOW and w[i + 1] in VOW | set('lr'):
            add(w[:i + 1] + w[i] + w[i + 1:], 1)
    for a, b in SUFFIX_SWAPS:
        if w.endswith(a) and len(w) > len(a) + 1:
            add(w[:len(w) - len(a)] + b, 2)
    for a, b in SUBS:
        for m in re.finditer(re.escape(a), w):
            if a in ('le', 'el', 'al') and m.end() != len(w):
                continue          # word-ending swaps only
            if a in ('s', 'c', 'z', 'j', 'g', 'k', 'f', 'o', 'a', 'u', 'i', 'y') and m.start() == 0:
                continue          # leave the first letter alone for single-letter swaps
            add(w[:m.start()] + b + w[m.end():], 3)
    for i in range(1, len(w) - 1):
        if w[i] in VOW:
            for v in 'aeiou':
                if v != w[i]:
                    add(w[:i] + v + w[i + 1:], 4)
    for i in range(1, len(w) - 1):
        add(w[:i] + w[i + 1:], 5)
        add(w[:i] + w[i + 1] + w[i] + w[i + 2:], 5)
    return sorted(((t, c) for c, t in out.items()), key=lambda x: x[0])

def make_distractors(w, ok, want=5):
    """Wrong spellings that are NOT words, look like English, varied, most
    believable first. Sloppy edits (tier 5) only fill a shortfall."""
    cands = [(t, c) for t, c in candidates(w) if not ok.get(c, False) and not rude_gain(c, w)]
    pool = [(t, c) for t, c in cands if plausible(c)]
    if len({c for t, c in pool if t < 5}) < 3:
        pool = [(t, c) for t, c in cands if plausible(c, strict=False)]
    out, shapes = [], set()
    for tier_limit in (4, 5):
        for t, c in pool:
            if t > tier_limit or c in out:
                continue
            diff = next((i for i in range(min(len(c), len(w))) if c[i] != w[i]), min(len(c), len(w)))
            key = (diff, len(c) - len(w))
            if key in shapes:
                continue
            shapes.add(key)
            out.append(c)
            if len(out) >= want:
                return out
        if len(out) >= 3:
            break
    # variety is nice, but three honest wrong spellings are required
    for t, c in pool:
        if len(out) >= 3:
            break
        if t <= 4 and c not in out:
            out.append(c)
    return out

# ── parse ───────────────────────────────────────────────────────────────────
def read_levels():
    entries = []
    for lv in range(1, LEVELS + 1):
        p = os.path.join(SRC, f'L{lv}.txt')
        if not os.path.exists(p):
            continue
        for n, line in enumerate(open(p, encoding='utf-8'), 1):
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            f = [x.strip() for x in line.split('|')]
            if len(f) < 4:
                sys.exit(f'{p}:{n}: need word | pos | definition | sentence  ({line[:60]})')
            if len(f) == 5 and re.fullmatch(r'[a-z]+(\s*,\s*[a-z]+)*', f[4]):
                f = f[:4] + ['', f[4]]          # "...| sentence | cent" = twins, no tip
            word, spans = parse_markup(f[0])
            entries.append(dict(lv=lv, line=n, raw=f[0], w=word.lower(), spans=spans, pos=f[1], d=f[2],
                                s=f[3], tip=f[4] if len(f) > 4 else '',
                                twins=[x.strip() for x in f[5].split(',') if x.strip()] if len(f) > 5 else []))
    return entries

def main():
    entries = read_levels()
    problems = []
    seen = {}
    for e in entries:
        w = e['w']
        if not re.fullmatch(r'[a-z]+', w):
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: letters a-z only")
        if w in seen:
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: duplicate of L{seen[w]}")
        seen[w] = e['lv']
        if not re.search(r'\b' + re.escape(w) + r'\b', e['s'], re.I):
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: sentence does not contain the word: {e['s']}")
        elif len(re.findall(r'\b' + re.escape(w) + r'\b', e['s'], re.I)) > 1:
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: word appears twice in the sentence")
        if len(e['s'].split()) > 24:
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: sentence is long ({len(e['s'].split())} words)")
        if e['d'].lower().startswith(w + ' '):
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: definition starts with the word")
        for field in (e['w'], e['d'], e['s'], e['tip'], ' '.join(e['twins'])):
            for h in american.british_hits(field, vocab=True):
                problems.append(f"L{e['lv']}:{e['line']} {e['w']!r}: not American English: {h}")
        if re.search(r'\d', e['s']):
            problems.append(f"L{e['lv']}:{e['line']} {e['w']!r}: digits in a sentence (spell the number out)")
        if e['s'] and e['s'][-1] not in '.!?':
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: sentence needs end punctuation")

    # spellcheck: words + every token of every sentence/definition/tip
    tokens, raw_tokens = set(), set()
    for e in entries:
        for t in re.findall(r"[A-Za-z']+", e['s'] + ' ' + e['d']):
            t = t.strip("'")
            if t: raw_tokens.add(t); tokens.add(t); tokens.add(t.lower())
    okmap = spell([e['w'] for e in entries] + sorted(tokens))
    for e in entries:
        if not okmap[e['w']]:
            problems.append(f"L{e['lv']}:{e['line']} {e['w']!r}: NOT a word per the system dictionary")
    bad_tokens = sorted({t.lower() for t in raw_tokens if not okmap.get(t, False)
                         and not okmap.get(t.lower(), False) and not t.endswith("'s")})
    # tokens like "don't" are fine; ask separately about the stem
    stems = [t.split("'")[0] for t in bad_tokens if "'" in t]
    if stems:
        sm = spell(stems)
        bad_tokens = [t for t in bad_tokens if "'" not in t or not sm.get(t.split("'")[0], False)]
    for t in bad_tokens:
        problems.append(f'sentence/definition word not in dictionary: {t!r}')

    # distractors
    cand_all = set()
    for e in entries:
        cand_all.update(c for _, c in candidates(e['w']))
    okc = spell(sorted(cand_all))
    ok_all = dict(okc); ok_all.update(okmap)
    out = []
    for e in entries:
        w = e['w']
        auto = auto_traps(w)
        if not e['spans']:
            labelled = [(a, b, l) for a, b, l in auto]
        else:
            # Hand-marked brackets win, but a LABEL (which picks the tip shown) is kept only when it is true of
            # the glowing letters: a bracket inside a detected pattern grows to the whole pattern ("mil[l]ion" ->
            # the double l), a bracket around a pattern keeps its label, anything else loses the label.
            labelled = []
            for a, b, _ in e['spans']:
                m = next((x for x in auto if not (x[1] <= a or x[0] >= b)), None)
                lab = ''
                if m and not m[2].startswith('-'):
                    if m[0] <= a and b <= m[1]: a, b, lab = m[0], m[1], m[2]          # bracket inside the pattern: grow
                    elif a <= m[0] and m[1] <= b: lab = m[2]                          # pattern inside the bracket
                elif m and m[2].startswith('-') and (a, b) == (m[0], m[1]): lab = m[2]
                labelled.append((a, b, lab))
        x = make_distractors(w, ok_all)
        for tw in e['twins']:
            if not okmap.get(tw, False) and not spell([tw])[tw]:
                problems.append(f"L{e['lv']}:{e['line']} {w!r}: twin {tw!r} is not a word")
        if len(x) < 3:
            problems.append(f"L{e['lv']}:{e['line']} {w!r}: only {len(x)} wrong spellings")
        rec = {'i': w, 'l': e['lv'], 'p': e['pos'], 'd': e['d'], 's': e['s'], 'x': x}
        if labelled:
            rec['tr'] = [[a, b, lab] for a, b, lab in labelled]
        if e['tip']:
            rec['t'] = e['tip']
        if e['twins']:
            rec['h'] = e['twins']      # sound-alike words: the clue is always shown
        out.append(rec)

    counts = {lv: sum(1 for e in entries if e['lv'] == lv) for lv in range(1, LEVELS + 1)}
    print('words per level:', counts, 'total', len(entries))
    trapped = sum(1 for r in out if r.get('tr'))
    print(f'with trap letters: {trapped}/{len(out)}')
    if problems:
        print('\nPROBLEMS (%d):' % len(problems))
        for p in problems[:80]:
            print('  -', p)
        if len(problems) > 80:
            print('  ... and', len(problems) - 80, 'more')
        if '--force' not in sys.argv:
            return 1
    tips = json.dumps(TRAP_TIP, ensure_ascii=False, separators=(',', ':'))
    js = ('// Spell Quest word list — generated by dev/build_words.py, do not hand-edit.\n'
          '// i word · l world · p part of speech · d meaning · s sentence · x wrong spellings\n'
          '// tr [start,end,label] trap letters · t memory tip\n'
          'const WORDS = ' + json.dumps(out, ensure_ascii=False, separators=(',', ':')) + ';\n'
          '// label -> one-line tip for the glowing trap letters\n'
          'const TRAPTIP = ' + tips + ';\n')
    open(os.path.join(ROOT, 'words.js'), 'w', encoding='utf-8').write(js)
    os.makedirs(os.path.join(ROOT, '.work'), exist_ok=True)
    json.dump(out, open(os.path.join(ROOT, '.work', 'words.json'), 'w'), ensure_ascii=False)
    print('wrote words.js', len(js) // 1024, 'KB')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
