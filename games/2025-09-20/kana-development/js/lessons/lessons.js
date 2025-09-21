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

  // Sticky CTA still exists but we hide it on parts using local buttons
  const cta = $('.lesson-cta [data-action="advance"]');
  const showCTA = (label) => { if (cta) { cta.textContent = label; cta.closest('.lesson-cta')?.classList.remove('is-hidden'); } };
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  // Part 1 local Start
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

    // Hide sticky CTA on parts with local buttons
    if (current === 1 || current === 2 || current === 3 || current === 4) hideCTA();
  }

  // Sticky CTA click (fallback)
  cta?.addEventListener('click', () => {
    if (current < totalParts) showPart(current + 1);
    else window.location.href = '../index.html';
  });

  // Part 1 → Part 2
  startBtn?.addEventListener('click', () => showPart(2));

  // ==========================================================
  // Part 2: Identify — adaptive ±1 meter to 15, lock per round
  //  + no same target twice in a row
  //  + no option repeats in the same slot as previous round
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

    // Track last correct kana and per-slot previous options
    let lastCorrectKana = null;
    let prevOptionAtIndex = [null, null, null, null];

    const THEMES = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-high'];

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

    function pickNextCorrect() {
      if (unseen.size > 0) {
        let choices = Array.from(unseen);
        if (choices.length > 1) choices = choices.filter(k => k !== lastCorrectKana);
        return choices[Math.floor(Math.random() * choices.length)];
      }
      let cand = pickWeighted(weights);
      let tries = 0;
      while (cand === lastCorrectKana && tries < 10) {
        cand = pickWeighted(weights);
        tries++;
      }
      return cand;
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
      // fallback: try to break conflicts by swapping
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

    function nextQuestion() {
      roundLocked = false;
      grid.innerHTML = '';

      const correctKana = pickNextCorrect();
      if (prompt) { prompt.dataset.type = 'romaji'; prompt.textContent = `“${ROMA[correctKana]}”`; }

      const others  = sample(KANA.filter(k => k !== correctKana), 3);
      const rawOptions = [correctKana, ...others];

      const orderedOptions = arrangeOptionsNoSlotRepeat(rawOptions);
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

      prevOptionAtIndex = orderedOptions.slice();
      lastCorrectKana = correctKana;

      setFeedback('Pick the right one to continue…');
    }

    function onPick(choice, correctKana, btn) {
      if (roundLocked) return;
      roundLocked = true;

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
            nextBtn?.classList.remove('is-hidden');
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
  // Part 3: Typing — adaptive + meter + local Next (bottom)
  //   + no same kana twice in a row
  //   + FINAL-5 MODE: each point requires a 3-kana combo in a row
  //     (combo never equals the exact previous combo)
  // ==========================================================
  const part3 = $('#part-3');
  if (part3) {
    const glyph      = $('.type-glyph', part3);
    const wrapper    = $('.type-glyph-wrapper', part3);
    const input      = $('#type-input', part3);
    const meter      = $('.quiz-progress .meter', part3);
    const meterFill  = $('.quiz-progress .meter-fill', part3);
    const meterLabel = $('.quiz-progress .meter-label', part3);

    // local Next at bottom (like Part 2)
    let nextBtn = $('[data-action="next-part"]', part3);
    if (!nextBtn) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      nextBtn = document.createElement('button');
      nextBtn.className = 'btn primary is-hidden';
      nextBtn.dataset.action = 'next-part';
      nextBtn.textContent = 'Next';
      actions.appendChild(nextBtn);
      part3.appendChild(actions);
    }

    const GOAL = 15;
    const COMBO_THRESHOLD = GOAL - 5; // last 5 points use 3-kana combos

    let progressPts = 0;
    let roundLocked = false;

    // Track last kana to avoid immediate repeat
    let lastKanaP3 = null;

    // Combo state
    let comboActive = false;
    let comboSeq = [];   // array of 3 kana
    let comboIdx = 0;    // 0..2
    let lastComboKey = null; // prevent repeat of exact previous combo

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
      const THEMES_ALL = [...THEMES];
      wrapper.classList.remove(...THEMES_ALL);
      const pick = THEMES_ALL[Math.floor(Math.random() * THEMES_ALL.length)];
      wrapper.classList.add(pick);
    }

    function pickNextKanaAvoidRepeat() {
      if (unseen.size) {
        let choices = Array.from(unseen);
        if (choices.length > 1) choices = choices.filter(k => k !== lastKanaP3);
        return choices[Math.floor(Math.random() * choices.length)];
      }
      let cand = pickWeighted(weights);
      let tries = 0;
      while (cand === lastKanaP3 && tries < 10) {
        cand = pickWeighted(weights);
        tries++;
      }
      return cand;
    }

    // --- COMBO GENERATION ---
    function makeCombo() {
      // generate a 3-kana sequence: no consecutive duplicates,
      // first element also avoids lastKanaP3; and not equal to lastComboKey
      for (let attempt = 0; attempt < 50; attempt++) {
        const seq = [];
        // first
        let first = pickNextKanaAvoidRepeat();
        seq.push(first);
        // second
        let second = pickWeighted(weights);
        let tries = 0;
        while ((second === seq[seq.length - 1]) && tries < 10) {
          second = pickWeighted(weights); tries++;
        }
        seq.push(second);
        // third
        let third = pickWeighted(weights);
        tries = 0;
        while ((third === seq[seq.length - 1]) && tries < 10) {
          third = pickWeighted(weights); tries++;
        }
        seq.push(third);

        const key = seq.join('');
        if (key !== lastComboKey) return { seq, key };
      }
      // fallback: just return something
      const seq = [pickNextKanaAvoidRepeat(), pickWeighted(weights), pickWeighted(weights)];
      return { seq, key: seq.join('') };
    }

    function startComboRound() {
      const { seq, key } = makeCombo();
      comboActive = true;
      comboSeq = seq;
      comboIdx = 0;
      lastComboKey = key;

      // display first kana of combo
      glyph.dataset.currentKana = comboSeq[0];
      glyph.textContent = comboSeq[0];
      lastKanaP3 = comboSeq[0];

      setThemeRandom();
      input.focus();
    }

    function startSingleRound() {
      comboActive = false;
      input.classList.remove('is-locked');
      input.value = '';

      const kana = pickNextKanaAvoidRepeat();
      glyph.dataset.currentKana = kana;
      glyph.textContent = kana;
      lastKanaP3 = kana;

      setThemeRandom();
      input.focus();
    }

    function newRound() {
      roundLocked = false;
      input.classList.remove('is-locked');
      input.value = '';

      if (progressPts >= COMBO_THRESHOLD) {
        startComboRound();
      } else {
        startSingleRound();
      }
    }

    function evaluate() {
      if (roundLocked) return;

      const val = (input.value || '').trim().toLowerCase();
      if (!val) return;

      roundLocked = true;
      input.classList.add('is-locked');

      if (!comboActive) {
        // --- normal single-kana round ---
        const kana     = glyph.dataset.currentKana;
        const expected = ROMA[kana];

        if (val === expected) {
          progressPts = Math.min(GOAL, progressPts + 1);
          unseen.delete(kana);
          weights[kana] = Math.max(1, weights[kana] - 1);
          updateMeter();

          setTimeout(() => {
            if (progressPts >= GOAL) {
              part3Done = true;
              // show local Next
              $('[data-action="next-part"]', part3)?.classList.remove('is-hidden');
            } else {
              newRound();
            }
          }, 260);
        } else {
          progressPts = Math.max(0, progressPts - 1);
          weights[kana] = (weights[kana] || 1) + 2;
          updateMeter();
          setTimeout(() => { newRound(); }, 360);
        }
      } else {
        // --- combo mode ---
        const currentKana = comboSeq[comboIdx];
        const expected = ROMA[currentKana];

        if (val === expected) {
          // advance within combo
          comboIdx += 1;
          if (comboIdx < 3) {
            // show next kana in combo
            const nextKana = comboSeq[comboIdx];
            glyph.dataset.currentKana = nextKana;
            glyph.textContent = nextKana;
            lastKanaP3 = nextKana;

            // clear and unlock input for next sub-step
            setTimeout(() => {
              roundLocked = false;
              input.classList.remove('is-locked');
              input.value = '';
              input.focus();
            }, 120);
          } else {
            // finished the 3-kana combo successfully → +1 progress
            comboActive = false;

            // adjust weights (reward all three)
            comboSeq.forEach(k => {
              unseen.delete(k);
              weights[k] = Math.max(1, weights[k] - 1);
            });

            progressPts = Math.min(GOAL, progressPts + 1);
            updateMeter();

            setTimeout(() => {
              if (progressPts >= GOAL) {
                part3Done = true;
                $('[data-action="next-part"]', part3)?.classList.remove('is-hidden');
              } else {
                newRound();
              }
            }, 260);
          }
        } else {
          // combo failed → -1 progress, increase weight of the kana we failed on
          weights[currentKana] = (weights[currentKana] || 1) + 2;
          progressPts = Math.max(0, progressPts - 1);
          updateMeter();

          comboActive = false;
          setTimeout(() => { newRound(); }, 360);
        }
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
    }

    nextBtn?.addEventListener('click', () => showPart(4));

    progressPts = 0; updateMeter(); newRound();
  }

  // ==========================================================
  // Part 4: Speak — local Finish button at bottom
  // ==========================================================
  const part4 = $('#part-4');
  if (part4) {
    const status   = $('.status-line', part4);
    const micBtn   = $('[data-action="mic-toggle"]', part4);
    const tryAgain = $('[data-action="try-again"]', part4);

    // local Finish at bottom
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

    micBtn?.addEventListener('click', () => {
      const pressed = micBtn.getAttribute('aria-pressed') === 'true';
      micBtn.setAttribute('aria-pressed', String(!pressed));
      if (status) status.textContent = !pressed ? 'Mic: listening…' : 'Mic: off';
      part4Done = true;
    });

    tryAgain?.addEventListener('click', () => {
      if (status) status.textContent = 'Try again queued.';
      part4Done = true;
    });

    finishBtn?.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }

  // Boot on Part 1
  showPart(1);
})();
