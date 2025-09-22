// ==========================================================
// vocab.js
// Utility for loading and managing vocabulary sets
// ==========================================================

(() => {
  const LEXICON_URL = "../js/lexicon.json";
  let _lexicon = null;

  // ---------- Load + Cache ----------
  async function loadLexicon() {
    if (_lexicon) return _lexicon;
    const res = await fetch(LEXICON_URL);
    _lexicon = await res.json();
    return _lexicon;
  }

  // ---------- Get full lexicon ----------
  async function getLexicon() {
    const data = await loadLexicon();
    return data.words || [];
  }

  // ---------- Lookup ----------
  async function findById(id) {
    const words = await getLexicon();
    return words.find(w => w.id === id) || null;
  }

  async function findByKana(kana) {
    const words = await getLexicon();
    return words.find(w => w.kana === kana) || null;
  }

  async function findByRomaji(romaji) {
    const words = await getLexicon();
    return words.find(w => w.romaji === romaji) || null;
  }

  // ---------- Helpers ----------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, n);
  }

  // ---------- Get set by IDs ----------
  async function getSet(ids) {
    const words = await getLexicon();
    return words.filter(w => ids.includes(w.id));
  }

  // ---------- Get words by tag ----------
  async function getByTag(tag) {
    const words = await getLexicon();
    return words.filter(w => (w.tags || []).includes(tag));
  }

  // ---------- Get words by JLPT ----------
  async function getByJLPT(level) {
    const words = await getLexicon();
    return words.filter(w => w.jlpt === level);
  }

  // ---------- Get random subset ----------
  async function getRandom(n) {
    const words = await getLexicon();
    return sample(words, n);
  }

  // ======================================================
  // NEW: Get words for a specific world milestone
  // roleKey examples: "1-base", "2-daku", "2-handaku"
  // ======================================================
  async function getWorldMilestone(roleKey) {
    const data = await loadLexicon();
    const ids = data.byWorld[roleKey] || [];
    return data.words.filter(w => ids.includes(w.id));
  }

  // ======================================================
  // UPDATED: Get all words for a world (all its stages)
  // e.g. worldCode = "2" → returns words from 2-base, 2-daku, 2-handaku
  // ======================================================
  async function getWorld(worldCode) {
    const data = await loadLexicon();
    const keys = Object.keys(data.byWorld).filter(k => k.startsWith(worldCode + "-"));
    const ids = keys.flatMap(k => data.byWorld[k]);
    return data.words.filter(w => ids.includes(w.id));
  }

  // ---------- Expose ----------
  window.Vocab = {
    loadLexicon,
    getLexicon,
    findById,
    findByKana,
    findByRomaji,
    getSet,
    getByTag,
    getByJLPT,
    getRandom,
    getWorldMilestone, // NEW
    getWorld           // UPDATED
  };
})();
