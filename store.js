// Profiles and local saves. Local-first, always: every change lands in
// localStorage immediately; the cloud (sync.js) is a backup and a second device.
//
// The rules that keep a child's progress safe:
//   * saving re-reads the key first, so a second tab can never be erased
//   * two copies of one profile are combined with Engine.merge (max / union)
//   * nothing is ever deleted without the player choosing it, twice

const Store = {
  KEY: 'spellquest:v1',

  load() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (raw) {
        const root = JSON.parse(raw);
        if (root && root.profiles) {
          for (const id of Object.keys(root.profiles)) root.profiles[id].p = Engine.sanitize(root.profiles[id].p);
          return root;
        }
      }
    } catch (e) { /* unreadable — start clean, the old text stays on disk untouched */ }
    return { profiles: {}, activeId: null };
  },

  save(root) {
    try {
      let disk = null;
      try { disk = JSON.parse(localStorage.getItem(this.KEY) || 'null'); } catch (e) { disk = null; }
      if (disk && disk.profiles) {
        for (const id of Object.keys(disk.profiles)) {
          const mine = root.profiles[id], theirs = disk.profiles[id];
          if (!mine) { if (!(root.removed || []).includes(id)) root.profiles[id] = theirs; continue; }
          if ((theirs.updatedAt || 0) > (mine.updatedAt || 0)) {
            mine.p = Engine.merge(mine.p, theirs.p);
            mine.updatedAt = Math.max(mine.updatedAt || 0, theirs.updatedAt || 0);
          }
        }
      }
      localStorage.setItem(this.KEY, JSON.stringify({ profiles: root.profiles, activeId: root.activeId }));
    } catch (e) { /* storage full or blocked — this session still works */ }
  },

  newProfile(name, hero, skin) {
    const p = Engine.sanitize(Engine.blank());
    if (hero && Engine.HEROBY[hero]) { p.hero = hero; if (!p.heroes.includes(hero)) p.heroes.push(hero); }
    if (skin != null) p.skin = skin;
    return { id: 'p' + Math.random().toString(36).slice(2, 10), name: name || 'Player', cloud: false, uid: null, p, updatedAt: Date.now(), playedAt: 0 };
  },
};
