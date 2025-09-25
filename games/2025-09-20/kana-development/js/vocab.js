// ==========================================================
// vocab.js
// Utility for loading and managing vocabulary sets
// ==========================================================

(() => {
  const HIRA_URL = "../data/lexicon_hiragana.json";
  const KATA_URL = "../data/lexicon_katakana.json";
  const WORLDS_URL = "../data/worlds.json";

  let _hiragana = null;
  let _katakana = null;
  let _worlds = null;

  // ---------- Load + Cache ----------
  async function loadLexicon(type = "hiragana") {
    if (type === "hiragana") {
      if (_hiragana) return _hiragana;
      const res = await fetch(HIRA_URL);
      _hiragana = await res.json();
      return _hiragana;
    } else {
      if (_katakana) return _katakana;
      const res = await fetch(KATA_URL);
      _katakana = await res.json();
      return _katakana;
    }
  }

  async function loadWorlds() {
    if (_worlds) return _worlds;
    const res = await fetch(WORLDS_URL);
    _worlds = await res.json();
    return _worlds;
  }

  // ---------- Get full lexicon ----------
  async function getLexicon(type = "hiragana") {
    const data = await loadLexicon(type);
    return data.words || [];
  }

  // ---------- Lookup ----------
  async function findById(id, type = "hiragana") {
    const words = await getLexicon(type);
    return words.find(w => w.id === id) || null;
  }

  async function findByKana(kana, type = "hiragana") {
    const words = await getLexicon(type);
    return words.find(w => w.kana === kana) || null;
  }

  async function findByRomaji(romaji, type = "hiragana") {
    const words = await getLexicon(type);
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
  async function getSet(ids, type = "hiragana") {
    const words = await getLexicon(type);
    return words.filter(w => ids.includes(w.id));
  }

  // ---------- Get words by tag ----------
  async function getByTag(tag, type = "hiragana") {
    const words = await getLexicon(type);
    return words.filter(w => (w.tags || []).includes(tag));
  }

  // ---------- Get words by JLPT ----------
  async function getByJLPT(level, type = "hiragana") {
    const words = await getLexicon(type);
    return words.filter(w => w.jlpt === level);
  }

  // ---------- Get random subset ----------
  async function getRandom(n, type = "hiragana") {
    const words = await getLexicon(type);
    return sample(words, n);
  }

  // ======================================================
  // Get words for a specific world milestone
  // e.g. getWorldMilestone("2-base", "hiragana")
  // ======================================================
  async function getWorldMilestone(worldKey, type = "hiragana") {
    const data = await loadWorlds();
    const ids = data[worldKey] || [];
    const lexicon = await loadLexicon(type);
    return lexicon.words.filter(w => ids.includes(w.id));
  }

  // ======================================================
  // Get all words for a world (all its milestones)
  // e.g. getWorld("2", "katakana")
  // ======================================================
  async function getWorld(worldCode, type = "hiragana") {
    const data = await loadWorlds();
    const keys = Object.keys(data).filter(k => k.startsWith(worldCode + "-"));
    const lexicon = await loadLexicon(type);

    let results = [];
    keys.forEach(k => {
      const ids = data[k] || [];
      results = results.concat(lexicon.words.filter(w => ids.includes(w.id)));
    });
    return results;
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
    getWorldMilestone,
    getWorld
  };
})();
