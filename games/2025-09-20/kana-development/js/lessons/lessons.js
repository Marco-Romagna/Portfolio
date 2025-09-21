(() => {
  // ------- helpers -------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const lesson = $('.lesson');
  if (!lesson) return;

  const lessonId   = lesson.dataset.lessonId || '1-1';
  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts      = $$('.lesson-part');
  const steps      = $$('.steps .step');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  const cta = $('.lesson-cta [data-action="advance"]');
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  const startBtn = $('#part-1 .actions [data-action="advance"]');

  // ------- kana sets -------
  const H = ['あ','い','う','え','お'];
  const K = ['ア','イ','ウ','エ','オ'];
  const ROMA_ALL = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o'
  };
  const PAIR = { 'あ':'ア','い':'イ','う':'ウ','え':'エ','お':'オ',
                 'ア':'あ','イ':'い','ウ':'う','エ':'え','オ':'お' };

  let KANA = H;
  let ROMA = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' };

  if (lessonId.endsWith('-2')) {
    KANA = K;
    ROMA = { 'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o' };
  } else if (lessonId.endsWith('-3')) {
    KANA = [...H, ...K];
    ROMA = ROMA_ALL;
  } else if (lessonId.endsWith('-4')) {
    KANA = [...H, ...K]; // typing practice uses both
    ROMA = ROMA_ALL;
  }

  // ------- state -------
  let current   = 1;

  // ------- nav / progress -------
  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));
    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
    hideCTA();
  }

  // ==========================================================
  // Part 1 — Preview
  // ==========================================================
  (function initPart1() {
    const part1 = $('#part-1');
    if (!part1) return;
    const grid = $('.kana-grid', part1);
    if (!grid) return;

    if (lessonId.endsWith('-1') || lessonId.endsWith('-2')) {
      grid.innerHTML = '';
      KANA.forEach(k => {
        const card = document.createElement('article');
        card.className = 'kana-card';
        card.innerHTML = `
          <span class="kana-glyph">${k}</span>
          <span class="kana-sub">${ROMA[k]}</span>
        `;
        grid.appendChild(card);
      });
    }

    if (lessonId.endsWith('-3')) {
      const PAIRS = [
        { h:'あ', k:'ア', r:'a' },
        { h:'い', k:'イ', r:'i' },
        { h:'う', k:'ウ', r:'u' },
        { h:'え', k:'エ', r:'e' },
        { h:'お', k:'オ', r:'o' },
      ];
      grid.innerHTML = '';
      PAIRS.forEach(p => {
        const card = document.createElement('article');
        card.className = 'pair-card';
        card.innerHTML = `
          <div class="pair-row">
            <span class="glyph h">${p.h}</span>
            <span class="link">⇄</span>
            <span class="glyph k">${p.k}</span>
          </div>
          <div class="pair-romaji">${p.r}</div>
        `;
        grid.appendChild(card);
      });
    }
  })();

  startBtn?.addEventListener('click', () => showPart(2));

  // ==========================================================
  // Part 2 — Identify / Typing
  // ==========================================================
  (function initPart2() {
    const part2 = $('#part-2');
    if (!part2) return;

    // -4 is romaji typing instead of identify
    if (lessonId.endsWith('-4')) {
      const wrapper   = $('.type-glyph-wrapper', part2);
      const input     = $('#type-input', part2);
      const meter     = $('.quiz-progress .meter', part2);
      const meterFill = $('.quiz-progress .meter-fill', part2);
      const meterLbl  = $('.quiz-progress .meter-label', part2);
      const nextBtn   = $('[data-action="next-part"]', part2);

      const GOAL = 15;
      let progressPts = 0;
      let lastKana = null;

      const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];
      function setThemeRandom() {
        wrapper.classList.remove(...THEMES);
        wrapper.classList.add(THEMES[Math.floor(Math.random()*THEMES.length)]);
      }
      function updateMeter() {
        const pct = Math.round((progressPts / GOAL) * 100);
        meter?.setAttribute('aria-valuenow', String(progressPts));
        if (meterFill) meterFill.style.width = `${pct}%`;
        if (meterLbl) meterLbl.textContent = `Progress: ${progressPts} / ${GOAL}`;
      }
      function newRound() {
        const pool = [...KANA];
        const next = pool[Math.floor(Math.random()*pool.length)];
        if (next === lastKana) return newRound();
        lastKana = next;
        wrapper.textContent = next;
        wrapper.dataset.kana = next;
        setThemeRandom();
        input.value = '';
        input.focus();
      }
      function evaluate() {
        const val = (input.value || '').trim().toLowerCase();
        const kana = wrapper.dataset.kana;
        const expected = ROMA[kana];
        if (val === expected) {
          progressPts++;
          updateMeter();
          if (progressPts >= GOAL) {
            nextBtn?.classList.remove('is-hidden');
          } else {
            newRound();
          }
        }
      }
      input?.addEventListener('keydown', e => { if (e.key === 'Enter') evaluate(); });
      nextBtn?.addEventListener('click', () => showPart(3));
      updateMeter(); newRound();
      return;
    }

    // Default multiple-choice identify (for -1, -2, -3)
    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const meter      = $('.quiz-progress .meter', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);
    const nextBtn    = $('[data-action="next-part"]', part2);

    const GOAL = lessonId.endsWith('-3') ? 20 : 15;
    let progressPts = 0;

    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meter?.setAttribute('aria-valuenow', String(progressPts));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }

    function sample(arr, n) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, n);
    }

    function nextQuestion() {
      grid.innerHTML = '';
      let promptGlyph;
      if (lessonId.endsWith('-3')) {
        promptGlyph = (Math.random() < 0.5 ? H : K)[Math.floor(Math.random()*5)];
        const isH = H.includes(promptGlyph);
        const correct = PAIR[promptGlyph];
        const pool = isH ? K : H;
        const distractors = sample(pool.filter(k => k !== correct), 3);
        const options = [correct, ...distractors].sort(() => Math.random()-0.5);
        $('.prompt-text', part2).innerHTML =
          `Which <strong>${isH ? 'katakana' : 'hiragana'}</strong> matches <strong class="prompt-target">“${promptGlyph}”</strong>?`;
        options.forEach(opt => {
          const b = document.createElement('button');
          b.className = 'option';
          b.textContent = opt;
          b.onclick = () => handlePick(opt, correct);
          grid.appendChild(b);
        });
      } else {
        promptGlyph = KANA[Math.floor(Math.random()*KANA.length)];
        const correct = promptGlyph;
        const others = sample(KANA.filter(k => k !== correct), 3);
        const options = [correct, ...others].sort(() => Math.random()-0.5);
        if (promptEl) promptEl.textContent = `“${ROMA[promptGlyph]}”`;
        options.forEach(opt => {
          const b = document.createElement('button');
          b.className = 'option';
          b.textContent = opt;
          b.onclick = () => handlePick(opt, correct);
          grid.appendChild(b);
        });
      }
    }

    function handlePick(choice, correct) {
      if (choice === correct) {
        progressPts++;
        feedback.textContent = 'Correct!';
        updateMeter();
        if (progressPts >= GOAL) {
          nextBtn?.classList.remove('is-hidden');
        } else nextQuestion();
      } else {
        feedback.textContent = 'Try again…';
      }
    }

    nextBtn?.addEventListener('click', () => showPart(3));
    updateMeter(); nextQuestion();
  })();

  // ==========================================================
  // Part 3 — Typing (combo mode for mixed lessons, singles otherwise)
  // ==========================================================
  (function initPart3() {
    const part3 = $('#part-3');
    if (!part3) return;

    const wrapper    = $('.type-glyph-wrapper', part3);
    const input      = $('#type-input', part3);
    const meter      = $('.quiz-progress .meter', part3);
    const meterFill  = $('.quiz-progress .meter-fill', part3);
    const meterLabel = $('.quiz-progress .meter-label', part3);
    const nextBtn    = $('[data-action="next-part"]', part3);

    const GOAL = lessonId.endsWith('-3') ? 20 : 15;
    const COMBO_LAST = lessonId.endsWith('-3') ? 10 : 5;
    const COMBO_THRESHOLD = GOAL - COMBO_LAST;

    let progressPts = 0;
    let lastKana = null;
    let comboActive = false;
    let comboSeq = [];
    let comboIdx = 0;

    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];
    function setThemeRandom() {
      wrapper.classList.remove(...THEMES);
      wrapper.classList.add(THEMES[Math.floor(Math.random()*THEMES.length)]);
    }
    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meter?.setAttribute('aria-valuenow', String(progressPts));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }
    function pickNextKana() {
      let pick = KANA[Math.floor(Math.random()*KANA.length)];
      if (pick === lastKana) return pickNextKana();
      lastKana = pick;
      return pick;
    }
    function renderGlyph(k) {
      wrapper.textContent = k;
      wrapper.dataset.kana = k;
    }
    function renderCombo(seq) {
      wrapper.innerHTML = seq.map(k => `<span class="kana-glyph">${k}</span>`).join(' ');
    }
    function startRound() {
      input.value = '';
      input.focus();
      setThemeRandom();
      if (progressPts >= COMBO_THRESHOLD) {
        comboActive = true;
        comboSeq = [pickNextKana(), pickNextKana(), pickNextKana()];
        comboIdx = 0;
        renderCombo(comboSeq);
      } else {
        comboActive = false;
        renderGlyph(pickNextKana());
      }
    }
    function evaluate() {
      const val = (input.value || '').trim().toLowerCase();
      if (!comboActive) {
        const k = wrapper.dataset.kana;
        if (val === ROMA[k]) {
          progressPts++;
          updateMeter();
          if (progressPts >= GOAL) nextBtn?.classList.remove('is-hidden');
          else startRound();
        }
      } else {
        const expected = ROMA[comboSeq[comboIdx]];
        if (val === expected) {
          comboIdx++;
          if (comboIdx >= comboSeq.length) {
            progressPts++;
            updateMeter();
            if (progressPts >= GOAL) nextBtn?.classList.remove('is-hidden');
            else startRound();
          } else {
            input.value = '';
            input.focus();
          }
        }
      }
    }
    input?.addEventListener('keydown', e => { if (e.key === 'Enter') evaluate(); });
    nextBtn?.addEventListener('click', () => showPart(4));
    updateMeter(); startRound();
  })();

  // ==========================================================
  // Part 4 — Speak (placeholder)
  // ==========================================================
  (function initPart4() {
    const part4 = $('#part-4');
    if (!part4) return;
    const panel = $('.speak-panel', part4);
    if (panel) {
      panel.innerHTML = `
        <div style="padding:20px;text-align:center;">
          <div class="kana-glyph speak-glyph">あ</div>
          <p class="muted">Speaking practice is <strong>in progress</strong>.</p>
        </div>`;
    }
    let finishBtn = $('[data-action="finish-lesson"]', part4);
    if (!finishBtn) {
      finishBtn = document.createElement('button');
      finishBtn.className = 'btn primary';
      finishBtn.dataset.action = 'finish-lesson';
      finishBtn.textContent = 'Finish';
      part4.appendChild(finishBtn);
    }
    finishBtn.addEventListener('click', () => { window.location.href = '../index.html'; });
  })();

  // Boot on Part 1
  showPart(1);
})();
