// Cloud sync — the same shared homeschool account as Wonder Lab and the other apps.
//
// A child signs in with their name + four-digit PIN (HOMESCHOOL_AUTH in
// firebase-config.js turns that into the one Firebase login every app shares).
// Storage: profiles/{uid}/apps/spell-quest  { name, progress, deviceId, updatedAt }
// Each app owns its own document, so apps share a login and never clobber each other.
//
// LOCAL-FIRST: the game never waits for this. Signed out, offline, or with
// Firebase down, everything still works and is saved on the device.

const Sync = {
  APP: 'spell-quest',
  app: null, auth: null, db: null,
  status: 'off',            // off | loading | ready | error
  uid: null, _loadPromise: null, _unsub: null, _timer: null,

  configured() { return typeof FIREBASE_CONFIG !== 'undefined' && !!FIREBASE_CONFIG && typeof HOMESCHOOL_AUTH !== 'undefined'; },

  deviceId() {
    let id = null;
    try { id = localStorage.getItem('spellquest:deviceId'); } catch (e) { /* private window */ }
    if (!id) { id = 'd' + Math.random().toString(36).slice(2, 12); try { localStorage.setItem('spellquest:deviceId', id); } catch (e) { /* fine */ } }
    return id;
  },

  // The SDK is ~300 KB and most sessions never sign in, so it loads on demand.
  ensureLoaded() {
    if (!this.configured()) return Promise.reject(new Error('not-configured'));
    if (this.status === 'ready') return Promise.resolve();
    if (this._loadPromise) return this._loadPromise;
    this.status = 'loading';
    const base = 'https://www.gstatic.com/firebasejs/10.14.1/';
    const load = (src) => new Promise((res, rej) => { const s = document.createElement('script'); s.src = base + src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
    this._loadPromise = load('firebase-app-compat.js')
      .then(() => Promise.all([load('firebase-auth-compat.js'), load('firebase-firestore-compat.js')]))
      .then(() => {
        this.app = firebase.apps.length ? firebase.app() : firebase.initializeApp(FIREBASE_CONFIG);
        this.auth = firebase.auth(); this.db = firebase.firestore();
        this.db.enablePersistence({ synchronizeTabs: true }).catch(() => {});
        return this.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
      })
      .then(() => { this.status = 'ready'; })
      .catch((e) => { this.status = 'error'; this._loadPromise = null; throw e; });
    return this._loadPromise;
  },

  doc(uid) { return this.db.collection('profiles').doc(uid).collection('apps').doc(this.APP); },

  // Firebase restores the last session asynchronously; wait for its first answer.
  currentUser() {
    return new Promise((res) => { const off = this.auth.onAuthStateChanged((u) => { off(); res(u); }); });
  },

  async signIn(name, pin) {
    await this.ensureLoaded();
    const email = HOMESCHOOL_AUTH.email(name), pass = HOMESCHOOL_AUTH.passwordFromPin(pin);
    if (!pass) throw new Error('Tap four numbers for your PIN.');
    try { this.uid = (await this.auth.signInWithEmailAndPassword(email, pass)).user.uid; }
    catch (e) {
      // First time on this account: the same name + PIN creates it. Any other failure is real.
      if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
        try { this.uid = (await this.auth.createUserWithEmailAndPassword(email, pass)).user.uid; }
        catch (e2) { throw new Error(this.explain(e2)); }
      } else throw new Error(this.explain(e));
    }
    return this.uid;
  },

  async signOut() {
    if (this._unsub) { this._unsub(); this._unsub = null; }
    this.uid = null;
    if (this.auth) await this.auth.signOut().catch(() => {});
  },

  explain(e) {
    const c = (e && e.code) || '';
    if (c.includes('network')) return "Can't reach the cloud. Check the wifi.";
    if (c.includes('email-already-in-use')) return 'That name is taken — check the PIN.';
    if (c.includes('wrong-password') || c.includes('invalid-credential')) return "That PIN doesn't match that name.";
    if (c.includes('weak-password')) return 'Tap four numbers for your PIN.';
    if (c.includes('too-many-requests')) return 'Too many tries — wait a minute.';
    return (e && e.message || 'Something went wrong.').replace(/^Firebase:\s*/, '').replace(/\s*\(auth\/[^)]+\)\.?$/, '');
  },

  async push(profile) {
    if (!profile || !this.uid || this.status !== 'ready') return;
    try {
      await this.doc(this.uid).set({ name: profile.name, progress: JSON.stringify(profile.p), deviceId: this.deviceId(),
                                     updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
    } catch (e) { console.warn('cloud push failed', e); }
  },
  schedulePush(profile) {
    if (!this.uid || this.status !== 'ready') return;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => this.push(profile), 2500);
  },
  async pull() {
    if (!this.uid) return null;
    const snap = await this.doc(this.uid).get();
    if (!snap.exists) return null;
    const d = snap.data();
    // stored as a JSON string so Firestore never deep-merges away a deleted key
    let progress = d.progress;
    if (typeof progress === 'string') { try { progress = JSON.parse(progress); } catch (e) { progress = null; } }
    return progress ? { name: d.name, progress } : null;
  },
  watch(onRemote) {
    if (!this.uid || this._unsub) return;
    this._unsub = this.doc(this.uid).onSnapshot((snap) => {
      if (!snap.exists || snap.metadata.hasPendingWrites) return;
      const d = snap.data();
      if (!d || d.deviceId === this.deviceId()) return;
      let progress = d.progress; if (typeof progress === 'string') { try { progress = JSON.parse(progress); } catch (e) { return; } }
      if (progress) onRemote({ name: d.name, progress });
    }, () => { /* listener dropped; local play continues */ });
  },
};
window.Sync = Sync;
window.addEventListener('pagehide', () => {
  if (Sync._timer) clearTimeout(Sync._timer);
  if (Sync.uid && window.App && App.profile) Sync.push(App.profile);
});
