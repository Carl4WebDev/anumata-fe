/**
 * IndexedDB-based file storage for interview media.
 * Replaces sessionStorage for large binary data (frames + audio).
 * sessionStorage has a ~5MB limit; IndexedDB allows 50MB+.
 */

const DB_NAME = "amumata_files";
const DB_VERSION = 1;
const STORE_NAME = "interview_files";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
  });
}

/**
 * Store files for an interview token.
 * Files are stored as Blobs (not base64) for efficiency.
 */
export async function storeFiles(token: string, files: { name: string; type: string; blob: Blob }[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.put(files, token);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

/**
 * Retrieve files for an interview token.
 * Returns array of { name, type, blob } or null if not found.
 */
export async function getFiles(token: string): Promise<{ name: string; type: string; blob: Blob }[] | null> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const store = tx.objectStore(STORE_NAME);
  const request = store.get(token);
  return new Promise((resolve, reject) => {
    request.onsuccess = () => { db.close(); resolve(request.result || null); };
    request.onerror = () => { db.close(); reject(request.error); };
  });
}

/**
 * Delete files for an interview token (cleanup after processing).
 */
export async function deleteFiles(token: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);
  store.delete(token);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
