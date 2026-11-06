// Persistent local library using IndexedDB. Images are stored as Blobs.
// Nothing here is synced anywhere: it lives only in this browser on this computer.
const DB_NAME = 'margination';
const STORE = 'illustrations';
const VERSION = 1;

let dbPromise = null;

function open() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) return reject(new Error('IndexedDB is not available'));
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt');
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('Database is blocked by another tab'));
    });
    dbPromise.catch(() => {
      dbPromise = null;
    });
  }
  return dbPromise;
}

function run(mode, fn) {
  return open().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const store = tx.objectStore(STORE);
        let result;
        const req = fn(store);
        if (req) req.onsuccess = () => (result = req.result);
        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
      })
  );
}

export const addIllustration = (record) => run('readwrite', (s) => s.add(record)).then(() => record);
export const getIllustration = (id) => run('readonly', (s) => s.get(id));
export const getAllIllustrations = () => run('readonly', (s) => s.getAll()).then((r) => r || []);
export const deleteIllustration = (id) => run('readwrite', (s) => s.delete(id));
export const clearIllustrations = () => run('readwrite', (s) => s.clear());
export const countIllustrations = () => run('readonly', (s) => s.count()).then((n) => n || 0);
