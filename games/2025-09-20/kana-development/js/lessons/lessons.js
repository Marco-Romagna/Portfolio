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

  // Global sticky CTA (used for Next/Finish on parts >= 2)
  const cta = $('.lesson-cta [data-action="advance"]');
  const showCTA = (label) => {
    if (!cta) return;
    cta.textContent = label;
    cta.closest('.lesson-cta')?.classList.remove('is-hidden');
  };
  const hideCTA = () => {
    cta?.closest('.lesson-cta')?.classList.add('is-hidden');
  };

  // Part 1 local Start button (moved into Part 1 actions)
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

    // CTA rules: hide on Part 1 (local Start), show as needed for later parts
    if (current === 1) {
      hideCTA();
    } else if (current === 2) {
      part2Done ? showCTA('Next') : hideCTA();
    } else if (current === 3) {
      part3Done ? showCTA('Next') : hideCTA();
    } else if (current === 4) {
      showCTA(part4Done ? 'Finish' : 'Next');
    }
  }

  // Global CTA click (Next / Finish)
  cta?.addEventListener('click', () => {
    if (current < totalParts) {
      showPart(current + 1);
    } else {
      // Finished lesson — go back to stage index
      window.location.href = '../index.html';
    }
  });

  // Part 1 local Start → go to Part 2
  startBtn?.addEventListener('click', () => {
    showPart(2);
  });

  // ==========================================================
  // Part 2: Identify — Pick the Correct Vowel
  // ==========================================================
  const part2 = $('#part-2');
  if (part2) {
    const grid      = $('.quiz-options', part2);
    const feedback  = $('.quiz-feedback .feedback-text', part2);
    const counterEl = $('.quiz-meta .counter', part2);
    const streakEl  = $('.quiz-meta .streak', part2);

    let needed       = Number(counterEl?.dataset.needed || 5);
    let correctSoFar = 0;
    let streak       = 0;

    const sample = (arr, n) => {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, n);
    };

    function updateMeta() {
      if (counterEl) counterEl.textContent = `${correctSoFar} / ${needed} correct`;
      if (streakEl)  streakEl.textContent  = `Streak: ${streak}`;
    }

    function setFeedback(t) { if (feedback) feedback.textContent = t; }

    function clearStates() {
      $$('.option', part2).forEach(b => b.classList.remove('is-correct', 'is-wrong'));
    }

    // rotate high-readability themes across options
    const THEMES = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-high'];

    function setRound() {
      const correctKana  = KANA[Math.floor(Math.random() * KANA.length)];
      const targetRomaji = ROMA[correctKana];
      const prompt       = $('.prompt-text .prompt-target', part2);

      // ask "Which kana is “x”?"
      if (prompt) { prompt.dataset.type = 'romaji'; prompt.textContent = `“${targetRomaji}”`; }

      // choose options, guarantee the correct one is included, shuffle
      const opts = sample(KANA, Math.min(4, KANA.length));
      if (!opts.includes(correctKana)) opts[Math.floor(Math.random() * opts.length)] = correctKana;
      const shuffled = sample(opts, opts.length);

      // build option buttons with themed classes
      grid.innerHTML = '';
      shuffled.forEach((k, i) => {
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
      clearStates();
      if (choice === correctKana) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');
        streak += 1; correctSoFar += 1; updateMeta();

        setTimeout(() => {
          if (correctSoFar >= needed) {
            part2Done = true;
            showCTA('Next');
            setFeedback('Part complete! Tap Next to continue.');
          } else {
            setRound();
          }
        }, 400);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');
        streak = 0; updateMeta();
      }
    }

    // "New Options" is optional; CSS hides it for this lesson. Keep null-safe.
    const reshuffleBtn = $('[data-action="reshuffle"]', part2);
    reshuffleBtn?.addEventListener('click', () => {
      clearStates();
      setRound();
      setFeedback('Options reshuffled…');
    });

    // init
    correctSoFar = 0; streak = 0; updateMeta(); setRound();
  }

  // ==========================================================
  // Part 3: Typing — Enter the Phonetic
  // ==========================================================
  const part3 = $('#part-3');
  if (part3) {
    const glyph     = $('.type-glyph', part3);
    const input     = $('#type-input', part3);
    const checkBtn  = $('[data-action="check-typing"]', part3);
    const counterEl = $('.type-meta .counter', part3);

    let needed       = Number(counterEl?.dataset.needed || 5);
    let correctSoFar = 0;

    function updateMeta() {
      if (counterEl) counterEl.textContent = `${correctSoFar} / ${needed}`;
    }

    function newRound() {
      glyph.classList.remove('state-correct', 'state-wrong');
      input.value = '';
      const kana = KANA[Math.floor(Math.random() * KANA.length)];
      glyph.dataset.currentKana = kana;
      glyph.textContent = kana;
      input.focus();
    }

    function evaluate() {
      const kana     = glyph.dataset.currentKana;
      const expected = ROMA[kana];
      const val      = (input.value || '').trim().toLowerCase();

      glyph.classList.remove('state-correct', 'state-wrong');
      if (!val) return;

      if (val === expected) {
        glyph.classList.add('state-correct');
        correctSoFar += 1; updateMeta();

        setTimeout(() => {
          if (correctSoFar >= needed) {
            part3Done = true;
            showCTA('Next');
          } else {
            newRound();
          }
        }, 300);
      } else {
        glyph.classList.add('state-wrong');
      }
    }

    checkBtn?.addEventListener('click', evaluate);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); evaluate(); }
      });
      input.addEventListener('input', () => glyph.classList.remove('state-correct', 'state-wrong'));
    }

    correctSoFar = 0; updateMeta(); newRound();
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
