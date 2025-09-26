// ==========================================================
// vocab.js
// Unified loader for hiragana / katakana vocab JSON
// ==========================================================
window.Vocab = (() => {
  // cache per lexicon so we don’t keep fetching
  const cache = { hiragana: null, katakana: null };

  // Load full JSON once
  async function loadLexicon(script) {
    if (cache[script]) return cache[script];
    const res = await fetch(`../data/vocab-${script}.json`);
    const data = await res.json();
    cache[script] = data;
    return data;
  }

  // Get all words for a world milestone key
  async function getWorldMilestone(key, script = "hiragana") {
    const data = await loadLexicon(script);
    const ids = data.byWorld[key] || [];
    return data.words.filter(w => ids.includes(w.id));
  }

  // Lookup one word by ID
  async function getWord(id, script = "hiragana") {
    const data = await loadLexicon(script);
    return data.words.find(w => w.id === id) || null;
  }

  return { loadLexicon, getWorldMilestone, getWord };
})();
