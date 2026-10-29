#!/usr/bin/env python3
"""Render every word and sentence as a Kokoro "Heart" clip.

Run with Wonder Lab's Kokoro environment (it already has kokoro + torch):

    ../wonder-lab/.venv-tts/bin/python dev/render_audio.py --shards 4 --shard 0
    ../wonder-lab/.venv-tts/bin/python dev/render_audio.py --finish

or just:  bash dev/record.sh

Clips:   audio/w/<word>.m4a   the word on its own
         audio/s/<word>.m4a   the word used in a sentence
WORD clips are rendered inside a carrier sentence ("The word is: judge.") and cut out
on Kokoro's own word timestamps. Isolated one-word input is far outside what the model
was trained on: "judge" came out as "giant", "caught" as "cut", "knee" as "nay" (Whisper
round trip, 70 of 848 clips). The uncut carrier lands in .work/carrier/ so
dev/verify_audio.py --kind c can check it.

A clip is re-rendered only when its text, speed or voice changed (hash kept in
audio/manifest.json). dev/pron.json can respell a word for the voice:
    {"colonel": "kernel", "quay": "[quay](/kˈiː/)"}
The app NEVER falls back to a device voice: a missing clip is simply silent.
"""
import argparse, hashlib, json, os, re, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'audio')
WORK = os.path.join(ROOT, '.work')
CARRIER_DIR = os.path.join(WORK, 'carrier')
VOICE = os.environ.get('KOKORO_VOICE', 'af_heart')
SPEEDS = {'w': 0.92, 's': 0.95}      # the carrier is read a little slower than a sentence
CARRIER = 'The word is: {}.'      # the colon makes a real pause, so the cut never catches the tail of "is"
METHOD = {'w': 'carrier-cut-v2', 's': 'plain'}
SR = 24000


def load_words():
    p = os.path.join(WORK, 'words.json')
    return json.load(open(p))


def pron():
    p = os.path.join(ROOT, 'dev', 'pron.json')
    return json.load(open(p)) if os.path.exists(p) else {}


def expected():
    """{ 'w/necessary': (text, speed, hash) ... }"""
    pr = pron()
    out = {}
    for e in load_words():
        w = e['i']
        wt = pr.get(w, w)
        st = e['s']
        if w in pr:                                   # the same respelling inside the sentence
            st = re.sub(r'\b' + re.escape(w) + r'\b', lambda m: pr[w], st, count=1, flags=re.I)
        for kind, text in (('w', wt), ('s', st)):
            h = hashlib.sha1(f'{VOICE}|{SPEEDS[kind]}|{METHOD[kind]}|{text}'.encode()).hexdigest()[:10]
            out[f'{kind}/{w}'] = (text, SPEEDS[kind], h)
    return out


def manifest():
    p = os.path.join(AUDIO, 'manifest.json')
    return json.load(open(p)) if os.path.exists(p) else {'voice': VOICE, 'clips': {}}


class Voice:
    def __init__(self, device):
        os.environ.setdefault('PYTORCH_ENABLE_MPS_FALLBACK', '1')
        import torch
        from kokoro import KModel, KPipeline
        threads = int(os.environ.get('KOKORO_THREADS', '0'))
        if threads:
            torch.set_num_threads(threads)
        model = KModel(repo_id='hexgrad/Kokoro-82M').to(device).eval()
        self.pipe = KPipeline(lang_code='a', repo_id='hexgrad/Kokoro-82M', model=model)

    def _encode(self, a, out_path):
        import numpy as np, soundfile as sf
        a = trim(a)
        peak = float(np.max(np.abs(a))) or 1.0
        a = a * (0.89 / peak)                       # even loudness, word to sentence
        wav = out_path + '.wav'
        sf.write(wav, a, SR, subtype='PCM_16')
        try:
            r = subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '40000', wav, out_path],
                               capture_output=True, text=True)
        finally:
            os.unlink(wav)
        if r.returncode:
            raise RuntimeError('afconvert: ' + r.stderr[:200])
        return len(a) / SR

    def speak(self, text, speed, out_path):
        """A whole sentence, as one utterance."""
        import numpy as np
        t = text.strip()
        if t[-1:] not in '.!?':
            t += '.'
        chunks = [np.asarray(a) for _, _, a in self.pipe(t, voice=VOICE, speed=speed)]
        if not chunks:
            raise RuntimeError('no audio for ' + text)
        gap = np.zeros(int(0.12 * SR), dtype=np.float32)
        a = np.concatenate([x for c in chunks for x in (trim(c), gap)][:-1])
        return self._encode(a, out_path)

    def speak_word(self, word, speed, out_path, carrier_path=None):
        """One word, cut out of "The word is <word>." on the model's own word timestamps."""
        import numpy as np
        res = list(self.pipe(CARRIER.format(word), voice=VOICE, speed=speed))
        if not res:
            raise RuntimeError('no audio for ' + word)
        x = res[0]
        a = np.asarray(x.audio, dtype=np.float32)
        toks = [t for t in x.tokens if t.text.strip() and t.text.strip() not in '.,!?:;']
        if not toks or toks[-1].start_ts is None:
            raise RuntimeError('no word timestamps for ' + word)
        t = toks[-1]
        if carrier_path:
            self._encode(a, carrier_path)
        lo = max(0, int((t.start_ts - 0.012) * SR)); hi = min(len(a), int((t.end_ts + 0.13) * SR))
        seg = a[lo:hi].copy()
        f = min(len(seg) // 4, int(.012 * SR)); seg[:f] *= np.linspace(0, 1, f); g = min(len(seg) // 3, int(.04 * SR)); seg[-g:] *= np.linspace(1, 0, g)
        return self._encode(seg, out_path)


def trim(a, pad=0.04):
    import numpy as np
    idx = np.where(np.abs(a) > 0.012)[0]
    if not len(idx):
        return a
    p = int(pad * SR)
    return a[max(0, idx[0] - p): idx[-1] + p]


def render(args):
    exp = expected()
    man = manifest()['clips']
    keys = sorted(exp)
    if args.only:
        lv = {e['i'] for e in load_words() if str(e['l']) in args.only.split(',')}
        keys = [k for k in keys if k.split('/', 1)[1] in lv]
    todo = [k for k in keys[args.shard::args.shards]
            if man.get(k) != exp[k][2] or not os.path.exists(os.path.join(AUDIO, k + '.m4a'))]
    print(f'shard {args.shard}/{args.shards}: {len(todo)} clips to render', flush=True)
    if not todo:
        return 0
    os.makedirs(WORK, exist_ok=True)
    side = os.path.join(WORK, f'render-{args.shard}.json')
    done = json.load(open(side)) if os.path.exists(side) else {}
    v = Voice(os.environ.get('KOKORO_DEVICE', 'cpu'))
    for n, k in enumerate(todo, 1):
        text, speed, h = exp[k]
        out = os.path.join(AUDIO, k + '.m4a')
        os.makedirs(os.path.dirname(out), exist_ok=True)
        try:
            if k.startswith('w/'):
                os.makedirs(CARRIER_DIR, exist_ok=True)
                secs = v.speak_word(text, speed, out, os.path.join(CARRIER_DIR, k[2:] + '.m4a'))
            else:
                secs = v.speak(text, speed, out)
        except Exception as ex:                       # keep going; --finish reports gaps
            print('FAILED', k, ex, flush=True)
            continue
        done[k] = h
        if n % 10 == 0 or n == len(todo):
            json.dump(done, open(side, 'w'))
            print(f'  {n}/{len(todo)} {k} {secs:.1f}s', flush=True)
    json.dump(done, open(side, 'w'))
    return 0


def finish():
    exp = expected()
    man = manifest()
    clips = {k: h for k, h in man['clips'].items() if k in exp}
    # Sidecars left by earlier runs (a different shard count, older text) must never override a
    # newer one: take only records that match the CURRENT text, oldest file first.
    side = [os.path.join(WORK, f) for f in os.listdir(WORK) if f.startswith('render-') and f.endswith('.json')]
    for f in sorted(side, key=os.path.getmtime):
        for k, h in json.load(open(f)).items():
            if k in exp and exp[k][2] == h:
                clips[k] = h
    clips = {k: h for k, h in clips.items() if k in exp and os.path.exists(os.path.join(AUDIO, k + '.m4a'))}
    missing = [k for k in exp if clips.get(k) != exp[k][2]]
    stale = []
    for kind in ('w', 's'):
        d = os.path.join(AUDIO, kind)
        for f in os.listdir(d) if os.path.isdir(d) else []:
            if f.endswith('.m4a') and f'{kind}/{f[:-4]}' not in exp:
                stale.append(os.path.join(d, f))
    for s in stale:
        os.unlink(s)
    json.dump({'voice': VOICE, 'clips': clips}, open(os.path.join(AUDIO, 'manifest.json'), 'w'),
              separators=(',', ':'))
    size = sum(os.path.getsize(os.path.join(AUDIO, k + '.m4a')) for k in clips)
    print(f'manifest: {len(clips)}/{len(exp)} clips, {size / 1e6:.1f} MB, {len(missing)} missing, '
          f'{len(stale)} stale removed')
    if missing:
        print('missing:', missing[:20])
    return 1 if missing else 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--shards', type=int, default=1)
    ap.add_argument('--shard', type=int, default=0)
    ap.add_argument('--only', help='comma list of world numbers, e.g. 1,2')
    ap.add_argument('--finish', action='store_true')
    a = ap.parse_args()
    sys.exit(finish() if a.finish else render(a))
