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
  // Part 2: Identify — Adaptive, ±1 meter to 15
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

    // progress target
    const GOAL = 15;
    let progressPts = 0;

    // Per-kana weights (start at 1), and a set of unseen kana to guarantee first pass
    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    // utility: weighted random pick
    function pickWeighted(map) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let r = Math.random() * total;
      for (const [key, w] of entries) {
        r -= w;
        if (r <= 0) return key;
      }
      return entries[entries.length - 1][0]; // fallback
    }

    // shuffle copy and slice n
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
      const pct = Math.max(0, Math.min(100, Math.round((progressPts / GOAL) * 100)));
      meter?.setAttribute('aria-valuenow', String(Math.max(0, Math.min(GOAL, progressPts))));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${Math.max(0, Math.min(GOAL, progressPts))} / ${GOAL}`;
    }

    function clearStates() { $$('.option', part2).forEach(b => b.classList.remove('is-correct','is-wrong')); }

    // rotate high-readability themes
    const THEMES = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-high'];

    function nextQuestion() {
      grid.innerHTML = '';

      // choose the correct kana
      let correctKana;
      if (unseen.size > 0) {
        const arr = Array.from(unseen);
        correctKana = arr[Math.floor(Math.random() * arr.length)];
      } else {
        correctKana = pickWeighted(weights);
      }

      // ensure prompt shows romaji
      if (prompt) { prompt.dataset.type = 'romaji'; prompt.textContent = `“${ROMA[correctKana]}”`; }

      // 4 options: include correct + 3 others
      const others = sample(KANA.filter(k => k !== correctKana), 3);
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
      clearStates();
      if (choice === correctKana) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');

        // progress + weighting
        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(correctKana);
        weights[correctKana] = Math.max(1, weights[correctKana] - 1); // right → less frequent

        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part2Done = true;
            nextBtn?.classList.remove('is-hidden'); // show local Next
            setFeedback('Part complete! Tap Next to continue.');
          } else {
            nextQuestion();
          }
        }, 350);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');
        progressPts = Math.max(0, progressPts - 1);       // wrong → -1
        weights[correctKana] = (weights[correctKana] || 1) + 2; // wrong → more frequent
        updateMeter();
      }
    }

    // local Next → go to Part 3
    nextBtn?.addEventListener('click', () => showPart(3));

    // init
    progressPts = 0; updateMeter(); nextQuestion();
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

    function updateMeta() { if (counterEl) counterEl.textContent = `${correctSoFar} / ${needed}`; }

    function newRound() {
      glyph.classList.remove('state-correct','state-wrong');
      input.value = '';
      const kana = ['あ','い','う','え','お'][Math.floor(Math.random()*5)];
      glyph.dataset.currentKana = kana;
      glyph.textContent = kana;
      input.focus();
    }

    function evaluate() {
      const kana     = glyph.dataset.currentKana;
      const expected = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' }[kana];
      const val      = (input.value || '').trim().toLowerCase();

      glyph.classList.remove('state-correct','state-wrong');
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
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); evaluate(); } });
      input.addEventListener('input', () => glyph.classList.remove('state-correct','state-wrong'));
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
