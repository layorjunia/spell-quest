// Sound. Two jobs and no third:
//   Voice  — plays the recorded Kokoro clips for a word and its sentence.
//   Sfx    — short synthesized effects.
//
// There is NO device voice anywhere in this app (no speechSynthesis, ever). A word
// with no recording is silent and logged, never read by the iPad's robot voice.
//
// iOS rules learned the hard way: ONE <audio> element for speech whose src is
// swapped (a fresh element per clip is never gesture-unlocked), unlocked inside the
// first tap; sound effects get a small pool of elements primed in that same tap.

const Voice = {
  el: null, _unlocked: false, _token: 0, _timer: null, missing: new Set(),

  unlock() {
    if (this._unlocked) return;
    this._unlocked = true;
    document.removeEventListener('pointerdown', this._unlockFn, true);
    document.removeEventListener('touchend', this._unlockFn, true);
    document.removeEventListener('keydown', this._unlockFn, true);
    try {
      this.el = new Audio();
      this.el.preload = 'auto';
      this.el.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YQAAAAA=';
      const p = this.el.play(); if (p && p.catch) p.catch(() => {});
    } catch (e) { /* no audio on this device */ }
    Sfx.unlock();
  },

  url(kind, word) { return `audio/${kind}/${word}.m4a`; },

  stop() { this._token++; clearTimeout(this._timer); if (this.el) { try { this.el.pause(); } catch (e) { /* fine */ } } },

  // Play clips one after another; resolves when the last one ends (or is skipped).
  say(urls, gap = 380) {
    this.stop();
    const tok = this._token;
    return new Promise((resolve) => {
      let i = 0;
      const next = () => {
        if (tok !== this._token || i >= urls.length) return resolve();
        const u = urls[i++];
        this._play(u, tok).then(() => { if (tok !== this._token) return resolve(); this._timer = setTimeout(next, i < urls.length ? gap : 0); });
      };
      next();
    });
  },

  _play(url, tok) {
    return new Promise((resolve) => {
      const a = this.el;
      if (!a || !App.data().settings.sound) return resolve();
      let done = false;
      const fin = () => { if (done) return; done = true; a.onended = a.onerror = null; resolve(); };
      a.onended = fin;
      a.onerror = () => {
        // a null error means a load was aborted by something re-pointing the element: not the end of this clip
        if (!a.error) return;
        if (!this.missing.has(url)) { this.missing.add(url); console.warn('no recording for', url); }
        fin();
      };
      try {
        a.src = url;
        const p = a.play();
        if (p && p.catch) p.catch((e) => { if (tok === this._token && e && e.name !== 'AbortError') { console.warn('could not play', url, e && e.name); } fin(); });
      } catch (e) { fin(); }
      setTimeout(fin, 9000);               // never hang a round on one clip
    });
  },

  word(w) { return this.say([this.url('w', w)]); },
  sentence(w) { return this.say([this.url('s', w)]); },
  both(w) { return this.say([this.url('w', w), this.url('s', w), this.url('w', w)], 420); },
};
Voice._unlockFn = () => Voice.unlock();
['pointerdown', 'touchend', 'keydown'].forEach(ev => document.addEventListener(ev, Voice._unlockFn, true));

const Sfx = {
  NAMES: ['key', 'tap', 'del', 'correct', 'wrong', 'retry', 'combo', 'coin', 'star', 'hint', 'flip', 'whoosh', 'levelup', 'fanfare',
          'evolve', 'shake', 'open', 'hit', 'hurt', 'heart', 'win', 'lose', 'tick', 'go', 'unlock'],
  POOL: { key: 3, tap: 2, correct: 2, coin: 2, star: 3, tick: 2, del: 2 },
  _pool: {}, _ready: false, _i: {},
  unlock() {
    if (this._ready) return; this._ready = true;
    for (const n of this.NAMES) {
      this._pool[n] = [];
      for (let k = 0; k < (this.POOL[n] || 1); k++) {
        try {
          const a = new Audio('audio/sfx/' + n + '.m4a'); a.preload = 'auto'; a.muted = true;
          a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; }).catch(() => { a.muted = false; });
          this._pool[n].push(a);
        } catch (e) { /* no audio */ }
      }
    }
  },
  play(name, vol = .7) {
    try {
      if (!App.data().settings.sound) return;
      const pool = this._pool[name];
      if (!pool || !pool.length) { const a = new Audio('audio/sfx/' + name + '.m4a'); a.volume = vol; a.play().catch(() => {}); return; }
      const i = (this._i[name] = ((this._i[name] || 0) + 1) % pool.length), a = pool[i];
      a.volume = vol; a.currentTime = 0; a.play().catch(() => {});
    } catch (e) { /* too early */ }
  },
};
