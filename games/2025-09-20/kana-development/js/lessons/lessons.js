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

  // Sticky CTA exists but we hide it on parts using local buttons
  const cta = $('.lesson-cta [data-action="advance"]');
  const showCTA = (label) => { if (cta) { cta.textContent = label; cta.closest('.lesson-cta')?.classList.remove('is-hidden'); } };
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  // Part 1 local Start
  const startBtn = $('#part-1 .actions [data-action="advance"]');

  // ------- lesson data sets -------
  const H = ['あ','い','う','え','お'];
  const K = ['ア','イ','ウ','エ','オ'];
  const ROMA_ALL = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o'
  };
  const PAIR = { 'あ':'ア','い':'イ','う':'ウ','え':'エ','お':'オ', 'ア':'あ','イ':'い','ウ':'う','エ':'え','オ':'お' };

  // ------- per-lesson selection -------
  let KANA = H;
  let ROMA = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' };

  if (lessonId === '1-2') {
    KANA = K;
    ROMA = { 'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o' };
  } else if (lessonId === '1-3') {
    KANA = [...H, ...K]; // mixed
    ROMA = ROMA_ALL;
  }

  // ------- state -------
  let current   = 1;
  let part2Done = false;
  let part3Done = false;

  // ------- nav / progress -------
  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);

    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));

    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));

    // We use local buttons at the bottom for all parts
    hideCTA();
  }

  // Sticky CTA click (fallback)
  cta?.addEventListener('click', () => {
    if (current < totalParts) showPart(current + 1);
    else window.location.href = '../index.html';
  });

  // --------------------------------------------
  // Part 1 — Preview
  // For 1-3, render paired cards (H + K + romaji)
  // --------------------------------------------
  (function initPart1() {
    if (lessonId !== '1-3') return;
    const part1 = $('#part-1');
    if (!part1) return;

    const grid = $('.kana-grid', part1);
    if (!grid) return;

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

    // Update title
    const title = $('#part-1 .part-title');
    if (title) title.textContent = 'Mixed Vowels — Preview';
  })();

  // Part 1 → Part 2
  startBtn?.addEventListener('click', () => showPart(2));

  // ==========================================================
  // Part 2 — Identify
  // 1-1/1-2: same-script identify to 15
  // 1-3: cross-script identify to 20 (match counterpart)
  // Anti-repeat: no same prompt twice, no per-slot option repeats
  // ==========================================================
  const part2 = $('#part-2');
  if (part2) {
    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const promptText = $('.prompt-text', part2);
    const meter      = $('.quiz-progress .meter', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);
    const nextBtn    = $('[data-action="next-part"]', part2);

    const GOAL = (lessonId === '1-3') ? 20 : 15;
    let progressPts = 0;

    const THEMES = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-high'];

    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    let lastPromptGlyph = null;
    let prevOptionAtIndex = [null, null, null, null];
    let roundLocked = false;

    function pickWeighted(map, avoid=null, tries=10) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let best = entries[entries.length - 1][0];
      for (let t = 0; t < tries; t++) {
        let r = Math.random() * total;
        for (const [key, w] of entries) { r -= w; if (r <= 0) { best = key; break; } }
        if (!avoid || best !== avoid) return best;
      }
      return best;
    }

    function sample(arr, n) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, n);
    }

    function setFeedback(t) { if (feedback) feedback.textContent = t; }

    function updateMeter() {
      const clamped = Math.max(0, Math.min(GOAL, progressPts));
      const pct = Math.round((clamped / GOAL) * 100);
      meter?.setAttribute('aria-valuenow', String(clamped));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${clamped} / ${GOAL}`;
    }

    function arrangeOptionsNoSlotRepeat(opts) {
      const attempts = 50;
      for (let t = 0; t < attempts; t++) {
        const perm = sample(opts, opts.length);
        let ok = true;
        for (let i = 0; i < perm.length; i++) {
          if (prevOptionAtIndex[i] === perm[i]) { ok = false; break; }
        }
        if (ok) return perm;
      }
      // fallback: minimal swaps to break conflicts
      const perm = [...opts];
      for (let i = 0; i < perm.length; i++) {
        if (perm[i] === prevOptionAtIndex[i]) {
          for (let j = i + 1; j < perm.length; j++) {
            if (perm[j] !== prevOptionAtIndex[i] && perm[i] !== prevOptionAtIndex[j]) {
              [perm[i], perm[j]] = [perm[j], perm[i]];
              break;
            }
          }
        }
      }
      return perm;
    }

    function pickPromptGlyph() {
      if (lessonId !== '1-3') {
        if (unseen.size > 0) {
          let choices = Array.from(unseen);
          if (choices.length > 1) choices = choices.filter(k => k !== lastPromptGlyph);
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return pickWeighted(weights, lastPromptGlyph);
      }
      // mixed: pick from one script, answer from the other
      const pool = Math.random() < 0.5 ? H : K;
      const poolWeights = Object.fromEntries(pool.map(g => [g, weights[g] || 1]));
      const unseenPool = pool.filter(g => unseen.has(g));
      if (unseenPool.length) {
        let choices = unseenPool;
        if (choices.length > 1) choices = choices.filter(k => k !== lastPromptGlyph);
        return choices[Math.floor(Math.random()*choices.length)];
      }
      return pickWeighted(poolWeights, lastPromptGlyph);
    }

    function nextQuestion() {
      roundLocked = false;
      grid.innerHTML = '';

      const promptGlyph = pickPromptGlyph();
      lastPromptGlyph = promptGlyph;

      if (lessonId === '1-3') {
        const isH = H.includes(promptGlyph);
        const otherLabel = isH ? 'katakana' : 'hiragana';
        if (promptText) {
          promptText.innerHTML = `Which <strong>${otherLabel}</strong> matches <strong class="prompt-target">“${promptGlyph}”</strong>?`;
        }
      } else {
        if (promptEl) {
          promptEl.dataset.type = 'romaji';
          promptEl.textContent = `“${ROMA[promptGlyph]}”`;
        }
      }

      // Build options
      let options = [];
      if (lessonId === '1-3') {
        // options from the counterpart script
        const isH = H.includes(promptGlyph);
        const correct = PAIR[promptGlyph];
        const pool = isH ? K : H;
        const distractors = sample(pool.filter(g => g !== correct), 3);
        options = [correct, ...distractors];
      } else {
        const correct = promptGlyph;
        const others  = sample(KANA.filter(k => k !== correct), 3);
        options = [correct, ...others];
      }

      const orderedOptions = arrangeOptionsNoSlotRepeat(options);
      const shuffledThemes = ['theme-dark','theme-light','theme-sepia','theme-high'].sort(() => Math.random() - 0.5);

      orderedOptions.forEach((glyph, i) => {
        const b = document.createElement('button');
        b.className = `option ${shuffledThemes[i % shuffledThemes.length]}`;
        b.dataset.value = glyph;
        b.textContent = glyph;
        b.addEventListener('click', () => onPick(glyph, promptGlyph, b));
        grid.appendChild(b);
      });

      prevOptionAtIndex = orderedOptions.slice();

      setFeedback('Pick the right one to continue…');
    }

    function onPick(choice, promptGlyph, btn) {
      if (roundLocked) return;
      roundLocked = true;

      const all = $$('.option', part2);
      all.forEach(b => { b.classList.add('is-disabled'); b.disabled = true; });

      let isCorrect = false;
      if (lessonId === '1-3') {
        const expected = PAIR[promptGlyph];
        isCorrect = (choice === expected);
      } else {
        isCorrect = (choice === promptGlyph);
      }

      if (isCorrect) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');

        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(promptGlyph);

        if (lessonId === '1-3') {
          const counterpart = PAIR[promptGlyph];
          if (weights[promptGlyph]  !== undefined) weights[promptGlyph]  = Math.max(1, weights[promptGlyph]  - 1);
          if (weights[counterpart]  !== undefined) weights[counterpart]  = Math.max(1, weights[counterpart]  - 1);
        } else {
          weights[promptGlyph] = Math.max(1, weights[promptGlyph] - 1);
        }

        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part2Done = true;
            nextBtn?.classList.remove('is-hidden'); // show local Next
            setFeedback('Part complete! Tap Next to continue.');
          } else {
            nextQuestion();
          }
        }, 360);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');

        progressPts = Math.max(0, progressPts - 1);
        if (lessonId === '1-3') {
          const counterpart = PAIR[promptGlyph];
          if (weights[promptGlyph]  !== undefined) weights[promptGlyph]  = (weights[promptGlyph]  || 1) + 2;
          if (weights[counterpart]  !== undefined) weights[counterpart]  = (weights[counterpart]  || 1) + 2;
        } else {
          weights[promptGlyph] = (weights[promptGlyph] || 1) + 2;
        }
        updateMeter();

        setTimeout(() => { nextQuestion(); }, 480);
      }
    }

    nextBtn?.addEventListener('click', () => showPart(3));

    progressPts = 0; updateMeter(); nextQuestion();
  }

  // ==========================================================
  // Part 3 — Type (romaji)
  // 1-1/1-2 target 15; 1-3 target 20
  // Weighted random; no same glyph twice in a row
  // Local Next/Finish at the bottom (like Part 2)
  // ==========================================================
  const part3 = $('#part-3');
  if (part3) {
    const wrapper    = $('.type-glyph-wrapper', part3);  // render glyph here
    const input      = $('#type-input', part3);
    const meter      = $('.quiz-progress .meter', part3);
    const meterFill  = $('.quiz-progress .meter-fill', part3);
    const meterLabel = $('.quiz-progress .meter-label', part3);

    // Ensure local Next/Finish at bottom
    let actionBtn = $('[data-action="next-part"]', part3);
    if (!actionBtn) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      actionBtn = document.createElement('button');
      actionBtn.className = 'btn primary is-hidden';
      actionBtn.dataset.action = (lessonId === '1-3') ? 'finish-lesson' : 'next-part';
      actionBtn.textContent = (lessonId === '1-3') ? 'Finish' : 'Next';
      actions.appendChild(actionBtn);
      part3.appendChild(actions);
    } else {
      actionBtn.dataset.action = (lessonId === '1-3') ? 'finish-lesson' : 'next-part';
      actionBtn.textContent = (lessonId === '1-3') ? 'Finish' : 'Next';
      actionBtn.classList.add('is-hidden');
    }

    const GOAL = (lessonId === '1-3') ? 20 : 15;
    let progressPts = 0;
    let roundLocked = false;
    let lastKana = null;

    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

    function pickWeighted(map, avoid=null, tries=10) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [,w]) => s + w, 0);
      let best = entries[entries.length - 1][0];
      for (let t = 0; t < tries; t++) {
        let r = Math.random() * total;
        for (const [key, w] of entries) { r -= w; if (r <= 0) { best = key; break; } }
        if (!avoid || best !== avoid) return best;
      }
      return best;
    }

    function updateMeter() {
      const clamped = Math.max(0, Math.min(GOAL, progressPts));
      const pct = Math.round((clamped / GOAL) * 100);
      meter?.setAttribute('aria-valuenow', String(clamped));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${clamped} / ${GOAL}`;
    }

    function setThemeRandom() {
      if (!wrapper) return;
      wrapper.classList.remove('theme-dark','theme-light','theme-sepia','theme-high');
      const pick = THEMES[Math.floor(Math.random() * THEMES.length)];
      wrapper.classList.add(pick);
    }

    function renderGlyph(kana) {
      wrapper.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'kana-glyph type-glyph';
      span.dataset.currentKana = kana;
      span.textContent = kana;
      wrapper.appendChild(span);
    }

    function pickNextKana() {
      const unseenArr = Array.from(unseen);
      if (unseenArr.length) {
        let choices = unseenArr;
        if (choices.length > 1) choices = choices.filter(k => k !== lastKana);
        return choices[Math.floor(Math.random()*choices.length)];
      }
      return pickWeighted(weights, lastKana);
    }

    function newRound() {
      roundLocked = false;
      input.classList.remove('is-locked');
      input.value = '';

      const kana = pickNextKana();
      setThemeRandom();
      renderGlyph(kana);
      lastKana = kana;

      input.focus();
    }

    function evaluate() {
      if (roundLocked) return;
      const val = (input.value || '').trim().toLowerCase();
      if (!val) return;

      roundLocked = true;
      input.classList.add('is-locked');

      const currentSpan = wrapper.querySelector('.type-glyph');
      const kana = currentSpan?.dataset.currentKana || currentSpan?.textContent || '';
      const expected = ROMA[kana];

      if (val === expected) {
        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(kana);
        weights[kana] = Math.max(1, (weights[kana] || 1) - 1);
        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part3Done = true;
            actionBtn?.classList.remove('is-hidden'); // reveal Next/Finish
          } else {
            newRound();
          }
        }, 200);
      } else {
        progressPts = Math.max(0, progressPts - 1);
        weights[kana] = (weights[kana] || 1) + 2;
        updateMeter();

        setTimeout(() => { newRound(); }, 320);
      }
    }

    // Enter submits; no other buttons
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        evaluate();
      }
    });

    // Button action
    actionBtn?.addEventListener('click', () => {
      if (lessonId === '1-3') {
        window.location.href = '../index.html'; // finish
      } else {
        showPart(4);
      }
    });

    progressPts = 0; updateMeter(); newRound();
  }

  // ==========================================================
  // Part 4 — Speak (placeholder for 1-1 / 1-2 only)
  // 1-3 has only 3 parts, so Part 4 can be absent.
  // ==========================================================
  const part4 = $('#part-4');
  if (part4) {
    const panel = $('.speak-panel', part4);
    if (panel) {
      const sampleGlyph = (lessonId === '1-2') ? 'ア' : 'あ';
      panel.innerHTML = `
        <div class="speak-placeholder" style="
          display:grid;
          place-items:center;
          gap:10px;
          min-height:220px;
          padding:16px;
          text-align:center;
        ">
          <div class="kana-glyph speak-glyph" aria-hidden="true">${sampleGlyph}</div>
          <p class="muted" style="margin:0;">
            Speaking practice is <strong>in progress</strong>.
          </p>
          <p class="muted" style="margin:0;">
            Thanks for testing! You can finish the lesson for now.
          </p>
        </div>
      `;
    }

    // Local Finish button at bottom
    let finishBtn = $('[data-action="finish-lesson"]', part4);
    if (!finishBtn) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      finishBtn = document.createElement('button');
      finishBtn.className = 'btn primary';
      finishBtn.dataset.action = 'finish-lesson';
      finishBtn.textContent = 'Finish';
      actions.appendChild(finishBtn);
      part4.appendChild(actions);
    }

    finishBtn?.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }

  // Boot on Part 1
  showPart(1);
})();
