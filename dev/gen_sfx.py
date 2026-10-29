#!/usr/bin/env python3
"""Synthesize the game sounds with numpy -> audio/sfx/<name>.m4a

    ../wonder-lab/.venv-tts/bin/python dev/gen_sfx.py

Everything is tuned to C major / A minor so overlapping sounds never clash,
with soft attacks and nothing harsh: this is for a kid with headphones on.
No speech here, ever (see NOTES.md).
"""
import os, subprocess, numpy as np
import wave

SR = 24000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'audio', 'sfx')
os.makedirs(OUT, exist_ok=True)
rng = np.random.default_rng(7)
N = {'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'G4': 392.0, 'A4': 440.0, 'C5': 523.25, 'D5': 587.33, 'E5': 659.25,
     'G5': 783.99, 'A5': 880.0, 'C6': 1046.5, 'E6': 1318.5, 'G6': 1568.0, 'B6': 1975.5}


def t(d):
    return np.arange(int(d * SR)) / SR


def env(n, a=.005, r=.08, curve=2.0):
    e = np.ones(n)
    na, nr = max(1, int(a * SR)), max(1, int(r * SR))
    e[:na] = np.linspace(0, 1, na)
    e[-nr:] *= np.linspace(1, 0, nr) ** curve
    return e


def tone(f, d, a=.005, r=.12, harm=(1, .3, .1), vol=1.0, vib=0):
    x = t(d)
    ph = 2 * np.pi * f * x + (vib * np.sin(2 * np.pi * 6 * x) if vib else 0)
    y = sum(h * np.sin(ph * (i + 1)) for i, h in enumerate(harm))
    return vol * y * env(len(x), a, r) / sum(harm)


def sweep(f0, f1, d, a=.005, r=.1, vol=1.0):
    x = t(d)
    f = f0 + (f1 - f0) * (x / d) ** 1.5
    return vol * np.sin(2 * np.pi * np.cumsum(f) / SR) * env(len(x), a, r)


def noise(d, lo=200, hi=4000, vol=1.0, a=.01, r=.1):
    x = rng.standard_normal(int(d * SR))
    X = np.fft.rfft(x); fr = np.fft.rfftfreq(len(x), 1 / SR)
    X[(fr < lo) | (fr > hi)] = 0
    y = np.fft.irfft(X, len(x)); y /= np.max(np.abs(y)) or 1
    return vol * y * env(len(y), a, r)


def seq(parts, gap=0.0):
    out = np.zeros(0)
    for p in parts:
        out = np.concatenate([out, p, np.zeros(int(gap * SR))])
    return out


def mix(*layers):
    n = max(len(l) for l in layers)
    out = np.zeros(n)
    for l in layers:
        out[:len(l)] += l
    return out


def at(sig, delay, total):
    out = np.zeros(total)
    s = int(delay * SR)
    out[s:s + len(sig)] += sig[:max(0, total - s)]
    return out


def write(name, y, vol=.8):
    y = y / (np.max(np.abs(y)) or 1) * vol
    wav = os.path.join(OUT, name + '.wav')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((y * 32767).astype(np.int16).tobytes())
    out = os.path.join(OUT, name + '.m4a')
    if os.path.exists(out):
        os.unlink(out)
    r = subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac', '-b', '48000', wav, out], capture_output=True, text=True)
    os.unlink(wav)
    if r.returncode:
        raise SystemExit('afconvert failed: ' + r.stderr)
    print(f'{name:12} {len(y) / SR:.2f}s')


def arp(notes, step, d, **kw):
    total = int((step * (len(notes) - 1) + d) * SR) + 10
    return mix(*[at(tone(N[n], d, **kw), i * step, total) for i, n in enumerate(notes)])


write('key', tone(1500, .035, a=.001, r=.03, harm=(1, .2)), .5)
write('tap', tone(760, .05, a=.002, r=.04, harm=(1, .25)), .55)
write('del', tone(520, .05, a=.002, r=.04, harm=(1, .2)), .45)
write('correct', arp(['C5', 'E5', 'G5'], .07, .22, r=.15), .8)
write('wrong', mix(tone(196, .26, a=.01, r=.2, harm=(1, .5, .2)), at(tone(147, .26, a=.01, r=.2, harm=(1, .5, .2)), .09, int(.4 * SR))), .55)
write('retry', tone(330, .16, a=.01, r=.12, harm=(1, .4)), .5)
write('combo', mix(sweep(520, 1320, .22, vol=.8), at(tone(N['G6'], .25, r=.2), .16, int(.45 * SR)) * .6), .7)
write('coin', mix(tone(N['E6'], .12, r=.1, harm=(1, .5, .3)), at(tone(N['B6'], .3, r=.25, harm=(1, .4, .2)), .07, int(.4 * SR))), .65)
write('star', arp(['G5', 'C6', 'E6'], .06, .35, r=.3, harm=(1, .5, .25)), .7)
write('hint', mix(tone(N['A5'], .18, r=.15), at(tone(N['E6'], .2, r=.18), .1, int(.3 * SR))), .6)
write('flip', mix(noise(.38, 500, 6000, .6, a=.08, r=.2), sweep(300, 900, .3, vol=.4)), .6)
write('whoosh', noise(.32, 300, 5000, 1, a=.1, r=.18), .5)
write('levelup', arp(['C5', 'E5', 'G5', 'C6', 'E6', 'G6'], .09, .5, r=.4, harm=(1, .45, .2)), .85)
write('fanfare', mix(arp(['C5', 'G5', 'C6'], .13, .5, r=.4), at(arp(['E5', 'G5', 'E6'], .13, .7, r=.5), .45, int(1.3 * SR))), .85)
write('evolve', mix(sweep(300, 1800, .9, a=.2, r=.2, vol=.7), at(arp(['C6', 'E6', 'G6', 'C6'], .09, .5, r=.4), .75, int(1.5 * SR))), .85)
write('shake', noise(.7, 60, 500, 1, a=.05, r=.15), .6)
write('open', mix(noise(.14, 800, 7000, .7, a=.001, r=.1), at(arp(['C6', 'E6', 'G6', 'C6'], .06, .4, r=.3), .04, int(.6 * SR))), .8)
write('hit', mix(tone(140, .22, a=.002, r=.18, harm=(1, .8, .4)), noise(.1, 800, 6000, .6, a=.001, r=.08)), .8)
write('hurt', mix(sweep(300, 90, .4, a=.005, r=.3, vol=.8), noise(.15, 100, 900, .5)), .7)
write('heart', mix(tone(200, .3, a=.01, r=.25, harm=(1, .6)), at(tone(150, .3, a=.01, r=.25, harm=(1, .6)), .12, int(.5 * SR))), .55)
write('win', mix(arp(['C5', 'E5', 'G5', 'C6'], .1, .6, r=.5), at(arp(['G5', 'C6', 'E6', 'G6'], .1, .9, r=.7), .5, int(1.6 * SR))), .85)
write('lose', seq([tone(N['E4'], .22, r=.2, harm=(1, .5)), tone(N['D4'], .22, r=.2, harm=(1, .5)), tone(N['C4'], .5, r=.4, harm=(1, .5))]), .6)
write('tick', tone(1000, .05, a=.002, r=.04, harm=(1, .2)), .5)
write('go', mix(tone(N['C6'], .35, r=.3), at(tone(N['G6'], .4, r=.35), .05, int(.5 * SR))), .75)
write('unlock', mix(sweep(400, 1600, .4, vol=.6), at(arp(['E5', 'G5', 'C6'], .08, .4, r=.3), .3, int(.9 * SR))), .75)
