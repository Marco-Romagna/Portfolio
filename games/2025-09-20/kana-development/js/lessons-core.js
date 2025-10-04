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
      const levelDef = window.KANA_STAGES.levels.find(l => l.code === qId);
      const lookupId = levelDef?.vocabKey || qId;
      SUMMARY_DATA = summaries.find(s => s.worlds.includes(lookupId));

      if (SUMMARY_DATA) initSummary();
      else showPart(1);
    } catch (e) {
      console.warn("No summaries loaded", e);
      showPart(1);
    }
  })();

  // ---------- Base setup ----------
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
  const backBtn = document.createElement('button');
  backBtn.textContent = "← Back";
  backBtn.className = "btn primary is-hidden";
  backBtn.dataset.action = "back";
  ctaWrap?.insertBefore(backBtn, nextBtn);

  let currentPart = 1;

  function showPart(idx) {
    currentPart = Math.min(Math.max(idx, 1), totalParts);

    if (!window.LessonCore.IS_VOCAB) {
      if (currentPart === 1 && typeof window.initPart1 === "function") window.initPart1();
      if (currentPart === 2 && typeof window.initPart2 === "function") window.initPart2();
      if (currentPart === 3 && typeof window.initPart3 === "function") window.initPart3();
      if (currentPart === 4 && typeof window.initPart4 === "function") window.initPart4();
    } else {
      if (currentPart === 1 && typeof window.initPart1 === "function") window.initPart1();
      if (currentPart === 2 && typeof window.initPart2 === "function") window.initPart2();
      if (currentPart === 3 && typeof window.initPart3 === "function") window.initPart3();
      if (currentPart === 4 && typeof window.initPart4 === "function") window.initPart4();
      if (currentPart === 5 && typeof window.initPart5 === "function") window.initPart5();
    }

    // Visibility and step state
    parts.forEach(p =>
      p.classList.toggle('is-visible', Number(p.dataset.partIndex) === currentPart)
    );
    $$('.steps .step').forEach(s =>
      s.classList.toggle('is-active', Number(s.dataset.part) === currentPart)
    );

    const pct = totalParts > 1 ? Math.round((currentPart - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));

    if (window.DEBUG_SKIP_ENABLED) ctaWrap?.classList.remove('is-hidden');
    else hideCTA();

    backBtn.classList.toggle('is-hidden', currentPart <= 1);
  }

  // ---------- Summary Renderer ----------
  function initSummary() {
    const container = document.querySelector('#lesson-summary');
    if (!container || !SUMMARY_DATA) return;

    document.querySelector('.lesson-progress')?.classList.add('is-hidden');
    $$('.lesson-part').forEach(p => p.classList.add('is-hidden'));
    document.querySelector('.lesson-cta')?.classList.add('is-hidden');

    container.classList.remove('is-hidden');
    container.innerHTML = `
      <div class="summary-panel">
        ${SUMMARY_DATA.kana ? `<div class="summary-kana">${SUMMARY_DATA.kana}</div>` : ""}
        <h2>${SUMMARY_DATA.gloss_en}</h2>
        <p>${SUMMARY_DATA.note}</p>
        <button class="btn primary" id="start-lesson">Start Lesson</button>
      </div>
    `;

    document.querySelector('#start-lesson')
      .addEventListener('click', () => {
        container.classList.add('is-hidden');
        document.querySelector('.lesson-progress')?.classList.remove('is-hidden');
        document.querySelector('.lesson-cta')?.classList.remove('is-hidden');
        $$('.lesson-part').forEach(p => p.classList.remove('is-hidden', 'is-visible'));
        showPart(1);
        if (typeof window.initPart1 === "function") window.initPart1();
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
    'マ':'ma','ミ':'mi','ム':'mu','メ':'mo','モ':'mo',
    'や':'ya','ゆ':'yu','よ':'yo',
    'ヤ':'ya','ユ':'yu','ヨ':'yo',
    'ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
    'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro',
    'わ':'wa','を':'wo','ん':'n',
    'ワ':'wa','ヲ':'wo','ン':'n'
  };

  // ---------- Export ----------
  window.LessonCore = {
    $,$$,
    WORLD, SUFFIX, IS_VOCAB,
    KANA, ROMA,
    showPart,
    LEXICON
  };

  // ---------- Bootstrapping ----------
  document.addEventListener("DOMContentLoaded", () => {
    if (IS_VOCAB && typeof window.initVocabParts === "function") {
      console.log("[DEBUG] Starting vocab lesson");
      window.initVocabParts();
    } else if (!IS_VOCAB && typeof window.initKanaParts === "function") {
      console.log("[DEBUG] Starting kana lesson");
      window.initKanaParts();
    }
  });

  // ---------- Debug Helper ----------
  if (window.DEBUG_SKIP_ENABLED) {
    window.forceInitAllKanaParts = function () {
      console.log("[DEBUG] Manually initializing all Kana parts...");
      try {
        if (typeof window.initPart1 === "function") window.initPart1();
        if (typeof window.initPart2 === "function") window.initPart2();
        if (typeof window.initPart3 === "function") window.initPart3();
        if (typeof window.initPart4 === "function") window.initPart4();
        console.log("[DEBUG] ✅ All Kana parts manually initialized.");
      } catch (err) {
        console.error("[DEBUG] ❌ Failed to init all parts:", err);
      }
    };

    // Debug next/back bindings
    nextBtn?.addEventListener('click', () => showPart(currentPart + 1));
    backBtn?.addEventListener('click', () => showPart(currentPart - 1));
  }
})();
