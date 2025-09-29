// ==========================================================
// vocab.js
// Utility for loading and managing vocabulary sets + summaries
// ==========================================================
(() => {
  const HIRA_URL = "../data/lexicon_hiragana.json";
  const KATA_URL = "../data/lexicon_katakana.json";
  const SUM_URL  = "../data/lexicon_summaries.json";

  let cache = { hiragana: null, katakana: null };
  let summariesCache = null;

  // ---------- Load + Cache ----------
  async function loadLexicon(type = "hiragana") {
    if (cache[type]) return cache[type];
    const url = type === "hiragana" ? HIRA_URL : KATA_URL;
    const res = await fetch(url);
    const data = await res.json();
    cache[type] = data;
    return data;
  }

  async function loadSummaries() {
    if (summariesCache) return summariesCache;
    const res = await fetch(SUM_URL);
    const data = await res.json();
    summariesCache = data.summaries || [];
    return summariesCache;
  }

  // ---------- Get words for a world milestone ----------
  // Example: getWorldMilestone("2-base", "hiragana")
  async function getWorldMilestone(worldKey, type = "hiragana") {
    const data = await loadLexicon(type);
    const summaries = await loadSummaries();

    const ids = (data.byWorld?.[worldKey]) || [];
    let words = data.words.filter(w => ids.includes(w.id));

    // prepend any summaries for this world
    const extras = summaries.filter(s => s.worlds.includes(worldKey));
    return [...extras, ...words];
  }

  // ---------- Lookup single word ----------
  async function getWord(id, type = "hiragana") {
    const data = await loadLexicon(type);
    return data.words.find(w => w.id === id) || null;
  }

  // ---------- Export ----------
  window.Vocab = {
    loadLexicon,
    loadSummaries,
    getWorldMilestone,
    getWord
  };
})();
