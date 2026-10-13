/*
 * Capa de datos compartida entre la landing y el panel administrativo.
 * - SITE_CONFIG (site-config.js) es la versión publicada.
 * - El borrador del administrador se guarda en IndexedDB de este navegador
 *   (soporta imágenes pesadas, a diferencia de localStorage).
 * - Los inscritos también se guardan como copia local de respaldo.
 */
(function () {
  const DB_NAME = "bm-landing";
  const STORE = "kv";

  function openDB() {
    return new Promise((resolve, reject) => {
      if (!("indexedDB" in window)) return reject(new Error("IndexedDB no disponible"));
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function idbGet(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const r = db.transaction(STORE, "readonly").objectStore(STORE).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (e) {
      return undefined;
    }
  }

  async function idbSet(key, value) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbDel(key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function isObj(v) {
    return v && typeof v === "object" && !Array.isArray(v);
  }

  function deepMerge(base, extra) {
    const out = Array.isArray(base) ? base.slice() : { ...base };
    if (!isObj(extra)) return out;
    for (const k of Object.keys(extra)) {
      if (isObj(base?.[k]) && isObj(extra[k])) out[k] = deepMerge(base[k], extra[k]);
      else out[k] = extra[k];
    }
    return out;
  }

  const clone = (o) => JSON.parse(JSON.stringify(o));

  window.BMStore = {
    published() {
      return clone(window.SITE_CONFIG || {});
    },
    async load() {
      const draft = await idbGet("draft");
      return deepMerge(this.published(), draft || {});
    },
    async hasDraft() {
      return !!(await idbGet("draft"));
    },
    saveDraft(cfg) {
      return idbSet("draft", clone(cfg));
    },
    clearDraft() {
      return idbDel("draft");
    },
    async leads() {
      return (await idbGet("leads")) || [];
    },
    async addLead(lead) {
      const all = await this.leads();
      all.push(lead);
      try {
        await idbSet("leads", all);
      } catch (e) {}
    },
    setLeads(list) {
      return idbSet("leads", list);
    },
    deepMerge
  };
})();
