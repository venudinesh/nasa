// Simple IndexedDB-backed cache for GLB model blobs.
// Provides getCachedModelUrl(slug, remoteUrl) which returns a blob: URL, fetching and caching as needed.

const DB_NAME = 'exo-model-cache-v1';
const STORE = 'models';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'slug' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null as any);
  });
}

async function getRecord(db: IDBDatabase, slug: string): Promise<{ slug: string; blob: Blob } | null> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const r = store.get(slug);
      r.onsuccess = () => resolve(r.result || null);
      r.onerror = () => resolve(null);
    } catch (e) {
      resolve(null);
    }
  });
}

async function putRecord(db: IDBDatabase, slug: string, blob: Blob): Promise<void> {
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.put({ slug, blob });
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    } catch (e) {
      resolve();
    }
  });
}

export async function getCachedModelUrl(slug: string, remoteUrl: string): Promise<string> {
  try {
    const db = await openDB();
    const rec = await getRecord(db, slug);
    if (rec && rec.blob) {
      return URL.createObjectURL(rec.blob);
    }

    // not cached, fetch remote
    const resp = await fetch(remoteUrl, { cache: 'no-store' });
    if (!resp.ok) throw new Error('fetch failed');
    const blob = await resp.blob();
    try { await putRecord(db, slug, blob); } catch (e) { /* ignore cache errors */ }
    return URL.createObjectURL(blob);
  } catch (err) {
    // fallback to remote URL if something goes wrong
    return remoteUrl;
  }
}

export async function clearModelCache(): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch (e) {
    return Promise.resolve();
  }
}
