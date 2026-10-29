#!/usr/bin/env python3
"""Whisper round trip over every clip: does the voice say what the app shows?

    ../wonder-lab/.venv-tts/bin/python dev/verify_audio.py [--kind w|s] [--only 1,2]

A wrong word clip teaches a wrong spelling, so every WORD clip must come back
as the word (or a sound-alike twin). Sentence clips must match >= 88% of their
words. Failures land in .work/verify-<kind>.txt; fix them with dev/pron.json
(respelling) and re-run dev/record.sh.
"""
import argparse, difflib, json, os, re, subprocess, sys, tempfile, wave
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'audio')

def padded(src):
    """16 kHz wav with silence either side. Whisper drops the LAST word of a clip that ends right on it
    (it reported "The word is" for 13 perfectly good clips), so every clip gets a second of trailing silence."""
    wav = tempfile.mktemp(suffix='.wav')
    subprocess.run(['afconvert', '-f', 'WAVE', '-d', 'LEI16@16000', src, wav], capture_output=True)
    with wave.open(wav) as f:
        a = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16)
    a = np.concatenate([np.zeros(8000, dtype=np.int16), a, np.zeros(16000, dtype=np.int16)])
    out = wav + 'p.wav'
    with wave.open(out, 'wb') as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(16000); f.writeframes(a.tobytes())
    os.unlink(wav)
    return out

def norm(t):
    return re.findall(r"[a-z']+", t.lower().replace('-', ' '))

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--kind', default='w', help="w word clip, s sentence clip, c uncut carrier")
    ap.add_argument('--only')
    a = ap.parse_args()
    from faster_whisper import WhisperModel
    m = WhisperModel('small.en', device='cpu', compute_type='int8', cpu_threads=4)
    words = json.load(open(os.path.join(ROOT, '.work', 'words.json')))
    if a.only:
        words = [w for w in words if str(w['l']) in a.only.split(',')]
    bad, n = [], 0
    for e in words:
        w = e['i']
        p = os.path.join(ROOT, '.work', 'carrier', w + '.m4a') if a.kind == 'c' else os.path.join(AUDIO, a.kind, w + '.m4a')
        if not os.path.exists(p):
            continue
        pp = padded(p)
        segs, _ = m.transcribe(pp, language='en', beam_size=5, condition_on_previous_text=False,
                               initial_prompt='A spelling bee word.' if a.kind == 'w' else ('The word is' if a.kind == 'c' else None))
        heard = ' '.join(s.text for s in segs).strip()
        os.unlink(pp)
        n += 1
        if a.kind == 'c':                      # the uncut carrier: "The word is <word>."
            ok_set = {w} | set(e.get('h', []))
            toks = norm(heard)
            good = len(toks) >= 4 and toks[-1] in ok_set or ' '.join(toks[-2:]) == w
        elif a.kind == 'w':
            ok_set = {w} | set(e.get('h', []))
            toks = norm(heard)
            good = any(t in ok_set for t in toks) and len(toks) <= 2
        else:
            exp, got = norm(e['s']), norm(heard)
            good = difflib.SequenceMatcher(None, exp, got).ratio() >= 0.88
        if not good:
            bad.append((w, heard))
        if n % 200 == 0:
            print(n, 'checked,', len(bad), 'bad', flush=True)
    out = os.path.join(ROOT, '.work', f'verify-{a.kind}.txt')
    open(out, 'w').write('\n'.join(f'{w}\t{h}' for w, h in bad) + '\n')
    print(f'{n} checked, {len(bad)} suspicious -> {out}')
    for w, h in bad[:60]:
        print(f'  {w:16} heard: {h}')

if __name__ == '__main__':
    main()
