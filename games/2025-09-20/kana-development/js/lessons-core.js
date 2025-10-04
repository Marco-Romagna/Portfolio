// ==========================================================
// lessons-core.js
// Shared utilities + role detection for all lesson types
// ==========================================================
window.DEBUG_SKIP_ENABLED = true; // set false for production

(() => {
  // ---------- DOM Helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Lesson Setup ----------
  const lesson = $('.lesson');
  if (!lesson) return;

  const params = new URLSearchParams(window.location.search);
  const qId = params.get('id') || '1-1'; // direct lesson ID from URL
  lesson.dataset.lessonId = qId;

  const [, suffixStr] = qId.split('-');
  const SUFFIX = Number(suffixStr);
  const [WORLD] = qId.split('-').map(Number);

  // Decide total parts (vocab lessons use 5)
  const HIRA_VOCAB_SUFFIXES = [4, 9, 14];
  const KATA_VOCAB_SUFFIXES = [5, 10, 15];
  const IS_VOCAB = [...HIRA_VOCAB_SUFFIXES, ...KATA_VOCAB_SUFFIXES].includes(SUFFIX);

  // ---------- Lexicon Detection ----------
  let LEXICON = "hiragana";
  if (KATA_VOCAB_SUFFIXES.includes(SUFFIX)) {
    LEXICON = "katakana";
  }

  // ---------- Summary Detection ----------
  let SUMMARY_DATA = null;

  (async () => {
    try {
      const summaries = await window.Vocab.loadSummaries();
      // find level definition
      const levelDef = window.KANA_STAGES.levels.find(l => l.code === qId);
      // prefer vocabKey if it exists
      const lookupId = levelDef?.vocabKey || qId;
      
      SUMMARY_DATA = summaries.find(s => s.worlds.includes(lookupId));
      if (SUMMARY_DATA) {
        initSummary();
      } else {
        showPart(1); // no summary, jump straight in
      }
    } catch (e) {
      console.warn("No summaries loaded", e);
      showPart(1);
    }
  })();

  // Decide total parts (summary is not counted)
  const baseParts = IS_VOCAB ? 5 : 4;
  lesson.dataset.totalParts = baseParts;
  const totalParts = baseParts;

  const parts      = $$('.lesson-part');
  const stepsList  = $('.steps');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  const ctaWrap = $('.lesson-cta');
  const nextBtn = $('.lesson-cta [data-action="advance"]');
  const hideCTA = () => { ctaWrap?.classList.add('is-hidden'); };

  // Add back button
  let backBtn = document.createElement('button');
  backBtn.textContent = "← Back";
  backBtn.className = "btn primary is-hidden";
  backBtn.dataset.action = "back";
  ctaWrap?.insertBefore(backBtn, nextBtn);

  let currentPart = 1;

  function showPart(idx) {
    currentPart = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p =>
      p.classList.toggle('is-visible', Number(p.dataset.partIndex) === currentPart)
    );
    $$('.steps .step').forEach(s =>
      s.classList.toggle('is-active', Number(s.dataset.part) === currentPart)
    );

    const pct = totalParts > 1 ? Math.round((currentPart - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));

    if (!window.DEBUG_SKIP_ENABLED) {
      hideCTA();
    } else {
      ctaWrap?.classList.remove('is-hidden');
    }

    if (currentPart > 1) {
      backBtn.classList.remove('is-hidden');
    } else {
      backBtn.classList.add('is-hidden');
    }

    // Lazy-init vocab parts
    if (window.LessonCore.IS_VOCAB) {
      if (currentPart === 2 && typeof window.initPart2 === "function") {
        window.initPart2(); window.initPart2 = null;
      }
      if (currentPart === 3 && typeof window.initPart3 === "function") {
        window.initPart3(); window.initPart3 = null;
      }
      if (currentPart === 4 && typeof window.initPart4 === "function") {
        window.initPart4(); window.initPart4 = null;
      }
      if (currentPart === 5 && typeof window.initPart5 === "function") {
        window.initPart5(); window.initPart5 = null;
      }
    }
  }

  nextBtn?.addEventListener('click', () => { if (window.DEBUG_SKIP_ENABLED) showPart(currentPart + 1); });
  backBtn?.addEventListener('click', () => { if (window.DEBUG_SKIP_ENABLED) showPart(currentPart - 1); });

  // ---------- Summary Renderer ----------
  function initSummary() {
    const container = document.querySelector('#lesson-summary');
    if (!container || !SUMMARY_DATA) return;

    // Hide normal lesson UI while summary is active
    document.querySelector('.lesson-progress')?.classList.add('is-hidden');
    $$('.lesson-part').forEach(p => p.classList.add('is-hidden'));
    document.querySelector('.lesson-cta')?.classList.add('is-hidden');

    // Render summary panel
    container.classList.remove('is-hidden');
    container.innerHTML = `
      <div class="summary-panel">
        ${SUMMARY_DATA.kana ? `<div class="summary-kana">${SUMMARY_DATA.kana}</div>` : ""}
        <h2>${SUMMARY_DATA.gloss_en}</h2>
        <p>${SUMMARY_DATA.note}</p>
        <button class="btn primary" id="start-lesson">Start Lesson</button>
      </div>
    `;

    // Restore UI on start
    document.querySelector('#start-lesson')
      .addEventListener('click', () => {
        container.classList.add('is-hidden');
        document.querySelector('.lesson-progress')?.classList.remove('is-hidden');
        document.querySelector('.lesson-cta')?.classList.remove('is-hidden');
        $$('.lesson-part').forEach(p => p.classList.remove('is-hidden', 'is-visible'));
        showPart(1);
        if (typeof window.initPart1 === "function") {
          window.initPart1();
          window.initPart1 = null;
        }
      });
  }

  // ---------- Kana Sets ----------
  const H_VOW = ['あ','い','う','え','お'];
  const K_VOW = ['ア','イ','ウ','エ','オ'];
  const H_KA  = ['か','き','く','け','こ'];
  const K_KA  = ['カ','キ','ク','ケ','コ'];
  const H_GA  = ['が','ぎ','ぐ','げ','ご'];
  const K_GA  = ['ガ','ギ','グ','ゲ','ゴ'];
  const H_SA  = ['さ','し','す','せ','そ'];
  const K_SA  = ['サ','シ','ス','セ','ソ'];
  const H_ZA  = ['ざ','じ','ず','ぜ','ぞ'];
  const K_ZA  = ['ザ','ジ','ズ','ゼ','ゾ'];
  const H_TA  = ['た','ち','つ','て','と'];
  const K_TA  = ['タ','チ','ツ','テ','ト'];
  const H_DA  = ['だ','ぢ','づ','で','ど'];
  const K_DA  = ['ダ','ヂ','ヅ','デ','ド'];
  const H_NA  = ['な','に','ぬ','ね','の'];
  const K_NA  = ['ナ','ニ','ヌ','ネ','ノ'];
  const H_HA  = ['は','ひ','ふ','へ','ほ'];
  const K_HA  = ['ハ','ヒ','フ','ヘ','ホ'];
  const H_BA  = ['ば','び','ぶ','べ','ぼ'];
  const K_BA  = ['バ','ビ','ブ','ベ','ボ'];
  const H_PA  = ['ぱ','ぴ','ぷ','ぺ','ぽ'];
  const K_PA  = ['パ','ピ','プ','ペ','ポ'];
  const H_MA  = ['ま','み','む','め','も'];
  const K_MA  = ['マ','ミ','ム','メ','モ'];
  const H_YA  = ['や','ゆ','よ'];
  const K_YA  = ['ヤ','ユ','ヨ'];
  const H_RA  = ['ら','り','る','れ','ろ'];
  const K_RA  = ['ラ','リ','ル','レ','ロ'];
  const H_WA  = ['わ','を','ん'];
  const K_WA  = ['ワ','ヲ','ン'];

  // ---------- Romaji Map ----------
  const ROMA = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
    'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so',
    'サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
    'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo',
    'ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
    'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to',
    'タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
    'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do',
    'ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
    'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no',
    'ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
    'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho',
    'ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
    'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo',
    'バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
    'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po',
    'パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
    'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo',
    'マ':'ma','ミ':'mi','ム':'mu','メ':'モ','モ':'mo',
    'や':'ya','ゆ':'yu','よ':'yo',
    'ヤ':'ya','ユ':'yu','ヨ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
    'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
    'わ':'wa','を':'wo','ん':'n',
    'ワ':'wa','ヲ':'wo','ン':'n'
  };

  // ---------- Cross-script mapping ----------
  const PAIR = {};
  function addPairs(hRow, kRow) {
    hRow.forEach((h,i)=>{ PAIR[h] = kRow[i]; PAIR[kRow[i]] = h; });
  }
  addPairs(H_VOW, K_VOW);
  addPairs(H_KA, K_KA); addPairs(H_GA, K_GA);
  addPairs(H_SA, K_SA); addPairs(H_ZA, K_ZA);
  addPairs(H_TA, K_TA); addPairs(H_DA, K_DA);
  addPairs(H_NA, K_NA);
  addPairs(H_HA, K_HA); addPairs(H_BA, K_BA); addPairs(H_PA, K_PA);
  addPairs(H_MA, K_MA);
  addPairs(H_YA, K_YA);
  addPairs(H_RA, K_RA);
  addPairs(H_WA, K_WA);

  // ---------- World Sets ----------
  function getWorldSets(world) {
    if (world === 1) return { H_BASE: H_VOW, K_BASE: K_VOW, H_DAKU: [], K_DAKU: [] };
    if (world === 2) return { H_BASE: H_KA, K_BASE: K_KA, H_DAKU: H_GA, K_DAKU: K_GA };
    if (world === 3) return { H_BASE: H_SA, K_BASE: K_SA, H_DAKU: H_ZA, K_DAKU: K_ZA };
    if (world === 4) return { H_BASE: H_TA, K_BASE: K_TA, H_DAKU: H_DA, K_DAKU: K_DA };
    if (world === 5) return { H_BASE: H_NA, K_BASE: K_NA, H_DAKU: [], K_DAKU: [] };
    if (world === 6) return { H_BASE: H_HA, K_BASE: K_HA, H_DAKU: H_BA, K_DAKU: K_BA, H_HANDA: H_PA, K_HANDA: K_PA };
    if (world === 7) return { H_BASE: H_MA, K_BASE: K_MA, H_DAKU: [], K_DAKU: [] };
    if (world === 8) return { H_BASE: H_YA, K_BASE: K_YA, H_DAKU: [], K_DAKU: [] };
    if (world === 9) return { H_BASE: H_RA, K_BASE: K_RA, H_DAKU: [], K_DAKU: [] };
    if (world === 10) return { H_BASE: H_WA, K_BASE: K_WA, H_DAKU: [], K_DAKU: [] };
    return { H_BASE: [], K_BASE: [], H_DAKU: [], K_DAKU: [] };
  }

  // ---------- KANA selection (base/daku/handaku) ----------
  function getKanaSet(world, suffix, lexicon) {
    const sets = getWorldSets(world);
    const isHira = (lexicon === "hiragana");

    // Base row (suffix < 6)
    if (suffix < 6) {
      return isHira ? [...sets.H_BASE] : [...sets.K_BASE];
    }
    // Dakuten row (suffix 6–10)
    else if (suffix >= 6 && suffix < 11) {
      return isHira ? [...sets.H_DAKU] : [...sets.K_DAKU];
    }
    // Handakuten row (suffix >= 11, world 6 only)
    else if (suffix >= 11 && world === 6) {
      return isHira ? [...sets.H_HANDA] : [...sets.K_HANDA];
    }
    return [];
  }

  let KANA = [];
  if (!IS_VOCAB) {
    KANA = getKanaSet(WORLD, SUFFIX, LEXICON);
  }

  // ---------- Pacing ----------
  const GOAL_IDENT = (false) ? 20 : 15;
  const GOAL_TYPE  = (false) ? 20 : 15;
  const COMBO_LAST = (false) ? 10 : 5;

  // ---------- Step Labels ----------
  (function initSteps() {
    if (!stepsList) return;
    stepsList.innerHTML = '';
    let labels;

    if (IS_VOCAB) {
      labels = ['Explorer','Hunt','Identify','Typing','Audio'];
    } else if (false) {
      labels = ['Preview','Typing','Finish'];
    } else {
      labels = ['Preview','Identify','Typing','Speak'];
    }

    labels.forEach((label, idx) => {
      const li = document.createElement('li');
      li.className = `step ${idx===0 ? 'is-active' : ''}`;
      li.dataset.part = (idx+1);
      li.innerHTML = `<span class="step-label">Part ${idx+1}</span><span class="step-sub">${label}</span>`;
      stepsList.appendChild(li);
    });
  })();

  // ---------- Export ----------
  window.LessonCore = {
    $,$$,
    WORLD, SUFFIX, IS_VOCAB,
    KANA, ROMA, PAIR,
    GOAL_IDENT, GOAL_TYPE, COMBO_LAST,
    showPart,
    LEXICON
  };

  // ---------- Bootstrapping ----------
  document.addEventListener("DOMContentLoaded", () => {
    if (IS_VOCAB) {
      if (typeof window.initVocabParts === "function") {
        window.initVocabParts();
      }
    } else {
      if (typeof window.initKanaParts === "function") {
        window.initKanaParts();
      }
    }
  });

})();
