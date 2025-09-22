// ==========================================================
// vocab.js — small helper for loading and slicing vocab by world/level
// Attach to window.VOCAB so any page can use it.
// Paths are relative to a file in /lessons/ or /index.html using "../data/*"
// ==========================================================
(() => {
  const DATA_BASE = '../data';
  const LEXICON_URL = `${DATA_BASE}/lexicon.json`;
  const WORLDS_URL  = `${DATA_BASE}/worlds.json`;

  // Lightweight cache
  let _lexiconArr = null;          // array of word objects
  let _lexById    = null;          // { id -> word }
  let _worlds     = null;          // parsed worlds.json
  let _sets       = null;          // shortcut to worlds.json.sets

  // --- script converters (don’t store duplicates) ---
  function toKatakana(s='') {
    return s.replace(/[\u3041-\u3096]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) + 0x60)
    );
  }
  function toHiragana(s='') {
    return s.replace(/[\u30A1-\u30F6]/g, ch =>
      String.fromCharCode(ch.charCodeAt(0) - 0x60)
    );
  }

  // --- fetchers ---
  async function loadLexicon() {
    if (_lexiconArr) return _lexiconArr;
    const res = await fetch(LEXICON_URL);
    _lexiconArr = await res.json();
    _lexById = Object.fromEntries(_lexiconArr.map(w => [w.id, w]));
    return _lexiconArr;
  }

  async function loadWorlds() {
    if (_worlds) return _worlds;
    const res = await fetch(WORLDS_URL);
    const data = await res.json();
    _worlds = data.worlds || {};
    _sets   = data.sets   || {};
    return _worlds;
  }

  // --- tiny utils ---
  function uniqueById(arr) {
    const seen = new Set();
    const out = [];
    for (const it of arr) {
      if (!it || !it.id || seen.has(it.id)) continue;
      seen.add(it.id); out.push(it);
    }
    return out;
  }

  function ensureArray(x) { return Array.isArray(x) ? x : (x ? [x] : []); }

  // Expand a set (list of word IDs) into word objects
  function expandSetIdsToWords(setId) {
    if (!_sets || !_lexById) return [];
    const ids = _sets[setId] || [];
    return ids.map(id => _lexById[id]).filter(Boolean);
  }

  // Build a single array of word objects from multiple set IDs
  function mergeSets(setIds=[]) {
    const words = setIds.flatMap(sid => expandSetIdsToWords(sid));
    return uniqueById(words);
  }

  // For a given level code like "2-4", return the configured set IDs
  function getSetIdsForLevel(levelCode) {
    if (!_worlds) return [];
    const [worldPrefix] = String(levelCode).split('-');
    const world = _worlds[worldPrefix];
    if (!world) return [];
    const mapping = world.levels || {};
    return mapping[levelCode] || [];
  }

  // Public: get words for a level (after loading)
  async function getWordsForLevel(levelCode, opts = {}) {
    await Promise.all([loadLexicon(), loadWorlds()]);
    const setIds = getSetIdsForLevel(levelCode);
    let words = mergeSets(setIds);

    // Optional filtering by tags
    const { includeTags, excludeTags } = opts;
    if (includeTags?.length) {
      words = words.filter(w => (w.tags||[]).some(t => includeTags.includes(t)));
    }
    if (excludeTags?.length) {
      words = words.filter(w => !(w.tags||[]).some(t => excludeTags.includes(t)));
    }

    // Script mode transformation for display
    const mode = opts.scriptMode || 'hira'; // 'hira' | 'kata' | 'mixed'
    return words.map(w => {
      const hira = toHiragana(w.kana);
      const kata = toKatakana(hira);
      let display = hira;
      if (mode === 'kata') display = kata;
      if (mode === 'mixed') {
        // simple mixed: alternate characters H/K to create visual switch
        display = [...hira].map((ch, i) => (i % 2 ? toKatakana(ch) : ch)).join('');
      }
      return {
        id: w.id,
        kanaHira: hira,
        kanaKata: kata,
        kanaDisplay: display,
        romaji: w.romaji,
        gloss: w.gloss,
        tags: w.tags || []
      };
    });
  }

  // Public: get a custom "review" list by set IDs directly
  async function getWordsFromSets(setIds, opts = {}) {
    await Promise.all([loadLexicon(), loadWorlds()]);
    let words = mergeSets(ensureArray(setIds));

    const { includeTags, excludeTags } = opts;
    if (includeTags?.length) {
      words = words.filter(w => (w.tags||[]).some(t => includeTags.includes(t)));
    }
    if (excludeTags?.length) {
      words = words.filter(w => !(w.tags||[]).some(t => excludeTags.includes(t)));
    }

    const mode = opts.scriptMode || 'hira';
    return words.map(w => {
      const hira = toHiragana(w.kana);
      const kata = toKatakana(hira);
      let display = hira;
      if (mode === 'kata') display = kata;
      if (mode === 'mixed') {
        display = [...hira].map((ch, i) => (i % 2 ? toKatakana(ch) : ch)).join('');
      }
      return {
        id: w.id,
        kanaHira: hira,
        kanaKata: kata,
        kanaDisplay: display,
        romaji: w.romaji,
        gloss: w.gloss,
        tags: w.tags || []
      };
    });
  }

  // Public: convenience getters
  async function getWorldMeta(worldCode) {
    await loadWorlds();
    return _worlds[String(worldCode)] || null;
  }
  async function getSetIdsForWorldLevel(levelCode) {
    await loadWorlds();
    return getSetIdsForLevel(levelCode);
  }
  async function getAllSets() {
    await loadWorlds();
    return Object.keys(_sets);
  }

  // Expose public API
  window.VOCAB = {
    // loaders
    loadLexicon, loadWorlds,
    // selection
    getWordsForLevel, getWordsFromSets,
    // metadata
    getWorldMeta, getSetIdsForWorldLevel, getAllSets,
    // utils
    toKatakana, toHiragana
  };
})();
