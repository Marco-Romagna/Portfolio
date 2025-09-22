// ==========================================================
// Vocab API (World Milestones)
// - Loads the lexicon JSON
// - Exposes helpers to fetch curated word sets per world
// - Lets you override/curate selections without touching lessons.js
// ==========================================================
(() => {
  const ROOT = (() => {
    // Compute relative root from this file’s typical location:
    // games/2025-09-20/kana-development/js/vocab.js
    // to data/lexicon.json
    const here = document.currentScript?.src || "";
    // Fallback to relative path used in project
    return here.includes("/games/2025-09-20/kana-development/")
      ? "/games/2025-09-20/kana-development/"
      : "./";
  })();

  const LEXICON_URL = `${ROOT}data/lexicon.json`;

  // Local cache
  let _lexicon = null;
  let _indexById = new Map();

  // -----------------------
  // Utilities
  // -----------------------
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function sample(arr, n) {
    return shuffle(arr).slice(0, Math.max(0, Math.min(n, arr.length)));
  }

  function ensureIndex() {
    if (!_lexicon) return;
    if (_indexById.size) return;
    _lexicon.words.forEach(w => _indexById.set(w.id, w));
  }

  // -----------------------
  // Load lexicon (once)
  // -----------------------
  async function loadLexicon() {
    if (_lexicon) return _lexicon;
    const res = await fetch(LEXICON_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`Failed to load lexicon.json: ${res.status}`);
    _lexicon = await res.json();
    ensureIndex();
    return _lexicon;
  }

  // -----------------------
  // Public API
  // -----------------------
  const Vocab = {
    /**
     * Load the full lexicon object.
     */
    async getLexicon() {
      return await loadLexicon();
    },

    /**
     * Return curated IDs for a world (as listed in lexicon.byWorld).
     * @param {string|number} worldCode - e.g. "1", 1, "2"
     * @returns {Promise<string[]>}
     */
    async getCuratedIdsForWorld(worldCode) {
      const lex = await loadLexicon();
      const key = String(worldCode);
      const ids = lex.byWorld?.[key] || [];
      return ids.slice();
    },

    /**
     * Return full word objects for a given world’s curated set.
     * Optionally limit by count (in original order, unless shuffled).
     * @param {string|number} worldCode
     * @param {number} [limit] - optional
     * @param {boolean} [random=false] - sample randomly if true
     * @returns {Promise<object[]>}
     */
    async getWorldMilestone(worldCode, limit = undefined, random = false) {
      const ids = await Vocab.getCuratedIdsForWorld(worldCode);
      ensureIndex();
      let words = ids.map(id => _indexById.get(id)).filter(Boolean);

      if (typeof limit === "number") {
        if (random) words = sample(words, limit);
        else words = words.slice(0, limit);
      }
      return words;
    },

    /**
     * Find a word by ID / kana / romaji (exact match).
     * @param {{id?: string, kana?: string, romaji?: string}} q
     * @returns {Promise<object|null>}
     */
    async find(q) {
      const lex = await loadLexicon();
      ensureIndex();

      if (q.id && _indexById.has(q.id)) return _indexById.get(q.id) || null;

      let out = null;
      if (q.kana) {
        out = lex.words.find(w => w.kana === q.kana) || null;
      } else if (q.romaji) {
        out = lex.words.find(w => w.romaji === q.romaji) || null;
      }
      return out;
    },

    /**
     * Search words by predicate.
     * @param {(w: object) => boolean} fn
     * @returns {Promise<object[]>}
     */
    async filter(fn) {
      const lex = await loadLexicon();
      return lex.words.filter(fn);
    },

    /**
     * For a future “review world”: pull words from many worlds.
     * @param {Array<string|number>} worldCodes
     * @param {number} count
     * @returns {Promise<object[]>}
     */
    async makeReviewSet(worldCodes, count) {
      const pools = await Promise.all(worldCodes.map(w => Vocab.getWorldMilestone(w)));
      const all = pools.flat();
      return sample(all, count);
    }
  };

  // Expose globally
  window.KANA_LEXICON = {
    loadLexicon,
    get data() { return _lexicon; }
  };
  window.Vocab = Vocab;
})();
