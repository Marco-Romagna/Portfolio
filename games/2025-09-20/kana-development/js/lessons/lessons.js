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
  const KANA = ['あ', 'い', 'う', 'え', 'お'];
  const ROMA = { 'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o' };

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

    function pickWeighted(map) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [key, w] of entries) {
        r -= w;
        if (r <= 0) return key;
      }
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

    function nextQuestion() {
      roundLocked = false;
      grid.innerHTML = '';

      // choose the correct kana (ensure each appears at least once)
      let correctKana;
      if (unseen.size > 0) {
        const arr = Array.from(unseen);
        correctKana = arr[Math.floor(Math.random() * arr.length)];
      } else {
        correctKana = pickWeighted(weights);
      }

      if (prompt) { prompt.dataset.type = 'romaji'; prompt.textContent = `“${ROMA[correctKana]}”`; }

      const others  = sample(KANA.filter(k => k !== correctKana), 3);
      const options = sample([correctKana, ...others], 4);

      options.forEach((k, i) => {
        const b = document.createElement('button');
        b.className = `option ${THEMES[i % THEMES.length]}`;
        b.dataset.value = k;
        b.textContent = k;
        b.addEventListener('click', () => onPick(k, correctKana, b));
        grid.appendChild(b);
      });

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

    // weights + unseen (same behavior as Part 2)
    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

    function pickWeighted(map) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [,w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [key, w] of entries) {
        r -= w; if (r <= 0) return key;
      }
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

      // pick next kana (guarantee first pass, then weighted)
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

      // keep glyph neutral: no success/error classes at all

      if (val === expected) {
        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(kana);
        weights[kana] = Math.max(1, weights[kana] - 1);
        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part3Done = true;
            showCTA('Next');            // reveal top CTA to continue
          } else {
            newRound();
          }
        }, 280);
      } else {
        progressPts = Math.max(0, progressPts - 1);
        weights[kana] = (weights[kana] || 1) + 2;  // wrong → more frequent
        updateMeter();

        setTimeout(() => { newRound(); }, 380);    // auto-advance; no correction
      }
    }

    // Enter submits; no other buttons
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          evaluate();
        }
      });
      // keep glyph neutral (no state clearing needed)
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
