// ==========================================================
// lessons-core.js
// Shared utilities + role detection for all lesson types
// ==========================================================

(() => {
  // ---------- DOM Helpers ----------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- Lesson Setup ----------
  const lesson = $('.lesson');
  if (!lesson) return;

  const params = new URLSearchParams(window.location.search);
  const qId = params.get('id') || '1-1';
  lesson.dataset.lessonId = qId;

  const [, suffixStr] = qId.split('-');
  const SUFFIX = Number(suffixStr);
  const [WORLD] = qId.split('-').map(Number);

  // Decide total parts (vocab lessons use 5)
  const IS_VOCAB = (SUFFIX === 4 || SUFFIX === 8 || SUFFIX === 12);
  lesson.dataset.totalParts = IS_VOCAB ? 5 : 4;
  const totalParts = Number(lesson.dataset.totalParts);

  const parts      = $$('.lesson-part');
  const stepsList  = $('.steps');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  const cta = $('.lesson-cta [data-action="advance"]');
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  function showPart(idx) {
    const current = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    $$('.steps .step').forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));
    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
    hideCTA();
    // Lazy-init vocab parts
    if (window.LessonCore.IS_VOCAB) {
      if (idx === 2 && typeof window.initPart2 === "function") {
        window.initPart2();
        window.initPart2 = null; // prevent re-init
      }
      if (idx === 3 && typeof window.initPart3 === "function") {
        window.initPart3();
        window.initPart3 = null;
      }
      if (idx === 4 && typeof window.initPart4 === "function") {
        window.initPart4();
        window.initPart4 = null;
      }
      if (idx === 5 && typeof window.initPart5 === "function") {
        window.initPart5();
        window.initPart5 = null;
      }
    }
  }

  // ---------- Kana Sets ----------
  const H_VOW = ['あ','い','う','え','お'];
  const K_VOW = ['ア','イ','ウ','エ','オ'];
  const H_KA  = ['か','き','く','け','こ'];
  const K_KA  = ['カ','キ','ク','ケ','コ'];
  const H_GA  = ['が','ぎ','ぐ','げ','ご'];
  const K_GA  = ['ガ','ギ','グ','ゲ','ゴ'];

  const ROMA = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go'
  };

  // Cross-script mapping
  const PAIR = {};
  [...H_VOW].forEach((h,i)=>{ PAIR[h] = K_VOW[i]; PAIR[K_VOW[i]] = h; });
  [...H_KA ].forEach((h,i)=>{ PAIR[h] = K_KA [i]; PAIR[K_KA [i]] = h; });
  [...H_GA ].forEach((h,i)=>{ PAIR[h] = K_GA [i]; PAIR[K_GA [i]] = h; });

  // ---------- Role Detection ----------
  const ROLE = (() => {
    const map = {
      1:'hira-base',
      2:'kata-base',
      3:'mixed-base',
      4:'vocab-base',
      5:'hira-daku',
      6:'kata-daku',
      7:'mixed-daku',
      8:'vocab-daku',
      12:'vocab-handaku'
    };
    return map[SUFFIX] || 'hira-base';
  })();

  let MIXED_TYPE = false;
  let IS_TYPING_ONLY = false;

  function getWorldSets(world) {
    if (world === 1) return { H_BASE: H_VOW, K_BASE: K_VOW, H_DAKU: [], K_DAKU: [] };
    if (world === 2) return { H_BASE: H_KA, K_BASE: K_KA, H_DAKU: H_GA, K_DAKU: K_GA };
    return { H_BASE: [], K_BASE: [], H_DAKU: [], K_DAKU: [] };
  }

  const { H_BASE, K_BASE, H_DAKU, K_DAKU } = getWorldSets(WORLD);
  let KANA = [];

  if (!IS_VOCAB) {
    if (ROLE === 'hira-base')         KANA = [...H_BASE];
    else if (ROLE === 'kata-base')    KANA = [...K_BASE];
    else if (ROLE === 'mixed-base') { KANA = [...H_BASE, ...K_BASE]; MIXED_TYPE = true; }
    else if (ROLE === 'type-base')  { KANA = [...H_BASE, ...K_BASE]; IS_TYPING_ONLY = true; }
    else if (ROLE === 'hira-daku')    KANA = [...H_DAKU];
    else if (ROLE === 'kata-daku')    KANA = [...K_DAKU];
    else if (ROLE === 'mixed-daku') { KANA = [...H_DAKU, ...K_DAKU]; MIXED_TYPE = true; }
    else if (ROLE === 'type-daku')  { KANA = [...H_DAKU, ...K_DAKU]; IS_TYPING_ONLY = true; }
  }

  // ---------- Pacing ----------
  const GOAL_IDENT = (MIXED_TYPE || IS_TYPING_ONLY) ? 20 : 15;
  const GOAL_TYPE  = (MIXED_TYPE || IS_TYPING_ONLY) ? 20 : 15;
  const COMBO_LAST = (MIXED_TYPE || IS_TYPING_ONLY) ? 10 : 5;

  // ---------- Step Labels ----------
  (function initSteps() {
    if (!stepsList) return;
    stepsList.innerHTML = '';
    let labels;

    if (IS_VOCAB) {
      labels = ['Explorer','Hunt','Identify','Typing','Audio'];
    } else if (IS_TYPING_ONLY) {
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

  // ---------- Helper: RoleKey for vocab ----------
  function getRoleKey(world, suffix) {
    if (suffix === 4) return `${world}-base`;
    if (suffix === 8) return `${world}-daku`;
    if (suffix === 12) return `${world}-handaku`;
    return `${world}-base`;
  }

  // ---------- Export ----------
  window.LessonCore = {
    $,$$,
    WORLD, SUFFIX, ROLE, IS_VOCAB, IS_TYPING_ONLY, MIXED_TYPE,
    KANA, ROMA, PAIR,
    GOAL_IDENT, GOAL_TYPE, COMBO_LAST,
    showPart,
    getRoleKey
  };
})();
