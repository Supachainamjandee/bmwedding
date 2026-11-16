// คิวอัปโหลด: เก็บคลิปใน IndexedDB ก่อน แล้วส่งเบื้องหลังทีละไฟล์ (ข้อ 15, 42)
(function () {
  const DB = 'bmwedding', STORE = 'queue';
  let busy = false, lastError = '';
  const listeners = [];

  function open() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'token' });
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(STORE, mode);
      const out = fn(t.objectStore(STORE));
      t.oncomplete = () => res(out && out.result !== undefined ? out.result : out);
      t.onerror = () => rej(t.error);
    });
  }
  const add = item => tx('readwrite', s => s.put(item));
  const remove = token => tx('readwrite', s => s.delete(token));
  const all = () => tx('readonly', s => s.getAll());

  function toBase64(blob) {
    return new Promise((res, rej) => {
      const fr = new FileReader();
      // mime อาจมี comma เช่น "codecs=avc1,opus" จึงตัดหลัง "base64," แทน split(',')
      fr.onload = () => { const s = String(fr.result); res(s.slice(s.indexOf('base64,') + 7)); };
      fr.onerror = () => rej(fr.error);
      fr.readAsDataURL(blob);
    });
  }

  async function notify() {
    const items = await all();
    listeners.forEach(fn => fn(items.length, lastError));
  }

  async function pump() {
    if (busy || !navigator.onLine) return;
    busy = true;
    try {
      const items = (await all()).sort((a, b) => a.createdAt - b.createdAt);
      for (const it of items) {
        const data = await toBase64(it.blob);
        const r = await App.apiPost({
          action: 'upload', token: it.token, mime: it.mime, duration: it.duration,
          retakeUsed: it.retakeUsed, createdAt: it.createdAt, data
        });
        if (r && r.ok) { await remove(it.token); lastError = ''; }
        else { lastError = (r && r.error) || 'upload_failed'; break; }
        await notify();
      }
    } catch (e) {
      lastError = String(e && e.message || e);
    } finally {
      busy = false;
      notify();
    }
  }

  setInterval(pump, 8000);
  window.addEventListener('online', pump);

  window.UploadQueue = {
    async enqueue(item) { await add(item); notify(); pump(); },
    count: async () => (await all()).length,
    onChange(fn) { listeners.push(fn); notify(); },
    pump
  };
})();
