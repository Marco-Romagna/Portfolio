(() => {
  // ------- helpers -------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const lesson = $('.lesson');
  if (!lesson) return;

  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts      = $$('.lesson-part');
  const steps      = $$('.steps .step');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  // Global sticky CTA (Next/Finish for parts except Part 2)
  const cta = $('.lesson-cta [data-action="advance"]');
  const showCTA = (label) => {
    if (!cta) return;
    cta.textContent = label;
    cta.closest('.lesson-cta')?.classList.remove('is-hidden');
  };
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  // Part 1 local Start button
  const startBtn = $('#part-1 .actions [data-action="advance"]');

  // ------- lesson data (for 1-1) -------
  const KANA = ['あ','い','う','え','お'];
  const ROMA = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' };

  // ------- state -------
  let current   = 1;
  let part2Done = false;
  let part3Done = false;
  let part4Done = false;

  // ------- nav / progress -------
  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);

    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));

    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));

    // CTA rules
    if (current === 1) {
      hideCTA();                    // Part 1 uses local Start
    } else if (current === 2) {
      hideCTA();                    // Part 2 uses local Next (under panel)
    } else if (current === 3) {
      part3Done ? showCTA('Next') : hideCTA();
    } else if (current === 4) {
      showCTA(part4Done ? 'Finish' : 'Next');
    }
  }

  // Global CTA click (Next / Finish)
  cta?.addEventListener('click', () => {
    if (current < totalParts) showPart(current + 1);
    else window.location.href = '../index.html';
  });

  // Part 1 local Start → go to Part 2
  startBtn?.addEventListener('click', () => showPart(2));

  // ==========================================================
  // Part 2: Identify — Adaptive, ±1 meter to 15, lock per round
  //   + no same target twice in a row
  //   + no option repeats in the same slot as previous round
  // ==========================================================
  const part2 = $('#part-2');
  if (part2) {
    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const prompt     = $('.prompt-text .prompt-target', part2);
    const meter      = $('.quiz-progress .meter', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);
    const nextBtn    = $('[data-action="next-part"]', part2);

    const GOAL = 15;
    let progressPts = 0;

    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    let roundLocked = false;

    // NEW: remember last target and last options by slot index
    let lastCorrectKana = null;
    let prevOptionAtIndex = [null, null, null, null];

    function pickWeighted(map) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [key, w] of entries) { r -= w; if (r <= 0) return key; }
      return entries[entries.length - 1][0];
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

    function clearStates() { $$('.option', part2).forEach(b => b.classList.remove('is-correct','is-wrong')); }

    const THEMES = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-high'];

    // Ensure next correct kana is not the same as last round (when possible)
    function pickNextCorrect() {
      if (unseen.size > 0) {
        // Prefer unseen first, avoid repeating last if >1 unseen left
        let choices = Array.from(unseen);
        if (choices.length > 1) choices = choices.filter(k => k !== lastCorrectKana);
        return choices[Math.floor(Math.random() * choices.length)];
      }
      // Weighted with a few attempts to avoid lastCorrectKana
      let cand = pickWeighted(weights);
      let tries = 0;
      while (cand === lastCorrectKana && tries < 10) {
        cand = pickWeighted(weights);
        tries++;
      }
      return cand;
    }

    // Arrange options so that options[i] !== prevOptionAtIndex[i]
    function arrangeOptionsNoSlotRepeat(opts) {
      const attempts = 50;
      for (let t = 0; t < attempts; t++) {
        const perm = sample(opts, opts.length); // shuffled copy
        let ok = true;
        for (let i = 0; i < perm.length; i++) {
          if (prevOptionAtIndex[i] === perm[i]) { ok = false; break; }
        }
        if (ok) return perm;
      }
      // Fallback: do minimal swaps to break conflicts
      const perm = [...opts];
      for (let i = 0; i < perm.length; i++) {
        if (perm[i] === prevOptionAtIndex[i]) {
          // find a j to swap that also doesn't create a conflict
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

    function nextQuestion() {
      roundLocked = false;
      grid.innerHTML = '';

      // choose the correct kana with no immediate repeat
      const correctKana = pickNextCorrect();

      if (prompt) { prompt.dataset.type = 'romaji'; prompt.textContent = `“${ROMA[correctKana]}”`; }

      // 4 options (1 correct + 3 others)
      const others  = sample(KANA.filter(k => k !== correctKana), 3);
      const rawOptions = [correctKana, ...others];

      // NEW: prevent same kana in same slot as previous round
      const orderedOptions = arrangeOptionsNoSlotRepeat(rawOptions);

      // Shuffle themes so we see all 4 over time
      const shuffledThemes = [...THEMES].sort(() => Math.random() - 0.5);

      orderedOptions.forEach((k, i) => {
        const theme = shuffledThemes[i % shuffledThemes.length];
        const b = document.createElement('button');
        b.className = `option ${theme}`;
        b.dataset.value = k;
        b.textContent = k;
        b.addEventListener('click', () => onPick(k, correctKana, b));
        grid.appendChild(b);
      });

      // Update trackers for next round comparisons
      prevOptionAtIndex = orderedOptions.slice();
      lastCorrectKana = correctKana;

      setFeedback('Pick the right one to continue…');
    }

    function onPick(choice, correctKana, btn) {
      if (roundLocked) return;
      roundLocked = true;

      // disable all options so they can't correct this round
      const all = $$('.option', part2);
      all.forEach(b => { b.classList.add('is-disabled'); b.disabled = true; });

      clearStates();
      if (choice === correctKana) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');

        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(correctKana);
        weights[correctKana] = Math.max(1, weights[correctKana] - 1);

        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part2Done = true;
            nextBtn?.classList.remove('is-hidden'); // show local Next
            setFeedback('Part complete! Tap Next to continue.');
          } else {
            nextQuestion();
          }
        }, 400);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');

        progressPts = Math.max(0, progressPts - 1);
        weights[correctKana] = (weights[correctKana] || 1) + 2;
        updateMeter();

        setTimeout(() => { nextQuestion(); }, 500);
      }
    }

    nextBtn?.addEventListener('click', () => showPart(3));

    progressPts = 0; updateMeter(); nextQuestion();
  }

  // ==========================================================
  // Part 3: Typing — Enter the Phonetic (adaptive + meter, neutral glyph)
  // ==========================================================
  const part3 = $('#part-3');
  if (part3) {
    const glyph      = $('.type-glyph', part3);
    const wrapper    = $('.type-glyph-wrapper', part3);
    const input      = $('#type-input', part3);
    const meter      = $('.quiz-progress .meter', part3);
    const meterFill  = $('.quiz-progress .meter-fill', part3);
    const meterLabel = $('.quiz-progress .meter-label', part3);

    const GOAL = 15;
    let progressPts = 0;
    let roundLocked = false;

    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

    function pickWeighted(map) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [,w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [key, w] of entries) { r -= w; if (r <= 0) return key; }
      return entries[entries.length - 1][0];
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
      wrapper.classList.remove(...THEMES);
      const pick = THEMES[Math.floor(Math.random() * THEMES.length)];
      wrapper.classList.add(pick);
    }

    function newRound() {
      roundLocked = false;
      input.classList.remove('is-locked');
      input.value = '';

      let kana;
      if (unseen.size) {
        const arr = Array.from(unseen);
        kana = arr[Math.floor(Math.random()*arr.length)];
      } else {
        kana = pickWeighted(weights);
      }

      glyph.dataset.currentKana = kana;
      glyph.textContent = kana;

      setThemeRandom();
      input.focus();
    }

    function evaluate() {
      if (roundLocked) return;

      const kana     = glyph.dataset.currentKana;
      const expected = ROMA[kana];
      const val      = (input.value || '').trim().toLowerCase();
      if (!val) return;

      roundLocked = true;
      input.classList.add('is-locked');

      if (val === expected) {
        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(kana);
        weights[kana] = Math.max(1, weights[kana] - 1);
        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part3Done = true;
            showCTA('Next');
          } else {
            newRound();
          }
        }, 280);
      } else {
        progressPts = Math.max(0, progressPts - 1);
        weights[kana] = (weights[kana] || 1) + 2;
        updateMeter();

        setTimeout(() => { newRound(); }, 380);
      }
    }

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluate();
        }
      });
    }

    progressPts = 0; updateMeter(); newRound();
  }

  // ==========================================================
  // Part 4: Speak — Say the Vowel
  // ==========================================================
  const part4 = $('#part-4');
  if (part4) {
    const status   = $('.status-line', part4);
    const micBtn   = $('[data-action="mic-toggle"]', part4);
    const tryAgain = $('[data-action="try-again"]', part4);

    micBtn?.addEventListener('click', () => {
      const pressed = micBtn.getAttribute('aria-pressed') === 'true';
      micBtn.setAttribute('aria-pressed', String(!pressed));
      if (status) status.textContent = !pressed ? 'Mic: listening…' : 'Mic: off';
      part4Done = true;
      showCTA('Finish');
    });

    tryAgain?.addEventListener('click', () => {
      if (status) status.textContent = 'Try again queued.';
      part4Done = true;
      showCTA('Finish');
    });

    // Allow Next immediately on Part 4
    showCTA('Next');
  }

  // Boot on Part 1
  showPart(1);
})();
