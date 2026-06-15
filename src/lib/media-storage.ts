const DB_NAME = "vibecoding-video-db";
const DB_VERSION = 1;
const STORE = "media-blobs";

interface StoredBlob {
  key: string;
  projectId: string;
  assetId: string;
  name: string;
  type: string;
  blob: Blob;
  savedAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "key" });
      }
    };
  });
}

export function storageKey(projectId: string, assetId: string): string {
  return `${projectId}::${assetId}`;
}

export async function saveMediaBlob(
  projectId: string,
  assetId: string,
  file: Blob,
  name: string,
  mimeType: string
): Promise<void> {
  const db = await openDb();
  const key = storageKey(projectId, assetId);
  const entry: StoredBlob = {
    key,
    projectId,
    assetId,
    name,
    type: mimeType,
    blob: file,
    savedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getMediaBlob(
  projectId: string,
  assetId: string
): Promise<Blob | null> {
  const db = await openDb();
  const key = storageKey(projectId, assetId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as StoredBlob | undefined)?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteMediaBlob(
  projectId: string,
  assetId: string
): Promise<void> {
  const db = await openDb();
  const key = storageKey(projectId, assetId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteProjectMedia(projectId: string): Promise<void> {
  const db = await openDb();
  const all = await listProjectBlobs(projectId);
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    for (const item of all) {
      store.delete(item.key);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function listProjectBlobs(projectId: string): Promise<StoredBlob[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = (req.result as StoredBlob[]).filter(
        (e) => e.projectId === projectId
      );
      resolve(all);
    };
    req.onerror = () => reject(req.error);
  });
}