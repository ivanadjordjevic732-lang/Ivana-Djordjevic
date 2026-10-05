/* ═══════════════════════════════════════════════════════════════════════
   MODULE: STORAGE — IndexedDB (projects, media meta, blobs, key/value)
   Local-first: nothing leaves the device unless the user enables AI/cloud.
   ═══════════════════════════════════════════════════════════════════════ */
const DB = {
  name: 'mindea-creative-studio', version: 1, db: null,
  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((res, rej) => {
      if (!('indexedDB' in window)) return rej(new Error('IndexedDB nicht verfügbar'));
      const r = indexedDB.open(this.name, this.version);
      r.onupgradeneeded = () => {
        const d = r.result;
        if (!d.objectStoreNames.contains('projects')) d.createObjectStore('projects', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('media')) d.createObjectStore('media', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('blobs')) d.createObjectStore('blobs', { keyPath: 'id' });
        if (!d.objectStoreNames.contains('kv')) d.createObjectStore('kv', { keyPath: 'k' });
      };
      r.onsuccess = () => { this.db = r.result; this.db.onversionchange = () => { this.db.close(); this.db = null; }; res(this.db); };
      r.onerror = () => rej(r.error);
      r.onblocked = () => rej(new Error('Datenbank blockiert – bitte andere Mindéa-Tabs schließen.'));
    });
  },
  async tx(store, mode, fn) {
    const d = await this.open();
    return new Promise((res, rej) => {
      let result;
      const t = d.transaction(store, mode);
      const s = t.objectStore(store);
      const req = fn(s);
      if (req) req.onsuccess = () => { result = req.result; };
      t.oncomplete = () => res(result);
      t.onerror = () => rej(t.error || (req && req.error));
      t.onabort = () => rej(t.error || new Error('Transaktion abgebrochen'));
    });
  },
  get(store, key) { return this.tx(store, 'readonly', s => s.get(key)); },
  put(store, val) { return this.tx(store, 'readwrite', s => s.put(val)); },
  del(store, key) { return this.tx(store, 'readwrite', s => s.delete(key)); },
  all(store) { return this.tx(store, 'readonly', s => s.getAll()); },
  async kvGet(k, fb) { try { const r = await this.get('kv', k); return r ? r.v : fb; } catch (e) { return fb; } },
  kvSet(k, v) { return this.put('kv', { k, v }); },
};

/** Ask the browser to keep our data (prevents eviction on iOS/Chrome when granted). */
async function requestPersistentStorage() {
  try { if (navigator.storage && navigator.storage.persist && !(await navigator.storage.persisted())) await navigator.storage.persist(); } catch (e) { }
}
async function storageEstimate() {
  try { if (navigator.storage && navigator.storage.estimate) return await navigator.storage.estimate(); } catch (e) { }
  return null;
}
