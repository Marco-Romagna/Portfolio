// ==========================================================
// vocab.js
// Utility for loading and managing vocabulary sets
// ==========================================================
(() => {
  const HIRA_URL = "../data/lexicon_hiragana.json";
  const KATA_URL = "../data/lexicon_katakana.json";

  let cache = { hiragana: null, katakana: null };

  // ---------- Load + Cache ----------
  async function loadLexicon(type = "hiragana") {
    if (cache[type]) return cache[type];
    const url = type === "hiragana" ? HIRA_URL : KATA_URL;
    const res = await fetch(url);
    const data = await res.json();
    cache[type] = data;
    return data;
  }

  // ---------- Get words for a world milestone ----------
  // Example: getWorldMilestone("2-base", "hiragana")
  async function getWorldMilestone(worldKey, type = "hiragana") {
    const data = await loadLexicon(type);
    const ids = (data.byWorld?.[worldKey]) || [];
    return data.words.filter(w => ids.includes(w.id));
  }

  // ---------- Lookup single word ----------
  async function getWord(id, type = "hiragana") {
    const data = await loadLexicon(type);
    return data.words.find(w => w.id === id) || null;
  }

  // ---------- Export ----------
  window.Vocab = {
    loadLexicon,
    getWorldMilestone,
    getWord
  };
})();
