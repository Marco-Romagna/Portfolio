// lessons/lessons.js — parts via Prev/Next only; inside-part auto-advance on correct
(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const lesson = $('.lesson');
  if (!lesson) return;

  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts      = $$('.lesson-part');
  const steps      = $$('.steps .step');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');
  const posCur     = $('.lesson-position .pos-current');
  const posTot     = $('.lesson-position .pos-total');
  if (posTot) posTot.textContent = String(totalParts);

  // basic dataset for 1-1 (can later be read from data-* on <main>)
  const KANA = ['あ','い','う','え','お'];
  const ROMA = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' };

  let current = 1;

  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));
    if (posCur) posCur.textContent = String(current);
    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
  }

  // Footer nav only controls part switching
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const a = btn.dataset.action;
    if (a === 'prev') showPart(current - 1);
    if (a === 'next') showPart(current + 1);
    if (a === 'start-quiz') showPart(2); // convenience jump
    if (a === 'reshuffle') reshuffleCurrent(); // optional no-op
  });

  function sample(arr, n) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, n);
  }

  function reshuffleCurrent() {
    if (current === 2 && part2) initPart2Round(true);
  }

  // ===== Part 2: Identify =====
  const part2 = $('#part-2');
  if (part2) {
    const grid      = $('.quiz-options', part2);
    const feedback  = $('.quiz-feedback .feedback-text', part2);
    const counterEl = $('.quiz-meta .counter', part2);
    const streakEl  = $('.quiz-meta .streak', part2);

    let needed = Number(counterEl?.dataset.needed || 5);
    let correctSoFar = 0;
    let streak = 0;
    let targetRomaji = 'a'; // set per round

    function updateMeta() {
      if (counterEl) counterEl.textContent = `${correctSoFar} / ${needed} correct`;
      if (streakEl)  streakEl.textContent  = `Streak: ${streak}`;
    }

    function setFeedback(text) { if (feedback) feedback.textContent = text; }

    function setOptions(kanaSet, correctKana) {
      grid.innerHTML = '';
      const opts = sample(kanaSet, Math.min(4, kanaSet.length));
      if (!opts.includes(correctKana)) {
        // ensure inclusion
        opts[Math.floor(Math.random() * opts.length)] = correctKana;
      }
      // shuffle for randomness
      const shuffled = sample(opts, opts.length);
      shuffled.forEach(k => {
        const b = document.createElement('button');
        b.className = 'option';
        b.dataset.value = k;
        b.textContent = k;
        b.addEventListener('click', () => onPick(k, correctKana, b));
        grid.appendChild(b);
      });
    }

    function clearStates() {
      $$('.option', part2).forEach(b => b.classList.remove('is-correct','is-wrong'));
    }

    function onPick(choice, correctKana, btn) {
      clearStates();
      if (choice === correctKana) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');
        streak += 1;
        correctSoFar += 1;
        updateMeta();

        // auto-advance to next question or finish
        setTimeout(() => {
          if (correctSoFar >= needed) {
            setFeedback('Part complete! Use Next ▶ to continue.');
            part2.classList.add('part-complete');
          } else {
            initPart2Round();
          }
        }, 450);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');
        streak = 0;
        updateMeta();
      }
    }

    function initPart2Round(forceNewPrompt = false) {
      // choose a target romaji & correct kana
      const correctKana = KANA[Math.floor(Math.random() * KANA.length)];
      targetRomaji = ROMA[correctKana];

      // update prompt
      const prompt = $('.prompt-text .prompt-target', part2);
      if (prompt) {
        prompt.dataset.type = 'romaji';
        prompt.textContent = `“${targetRomaji}”`;
      }

      clearStates();
      setOptions(KANA, correctKana);
      if (!forceNewPrompt) setFeedback('Pick the right one to continue…');
    }

    // init
    correctSoFar = 0; streak = 0; updateMeta(); initPart2Round();
  }

  // ===== Part 3: Typing =====
  const part3 = $('#part-3');
  if (part3) {
    const glyph     = $('.type-glyph', part3);
    const input     = $('#type-input', part3);
    const checkBtn  = $('[data-action="check-typing"]', part3);
    const counterEl = $('.type-meta .counter', part3);

    let needed = Number(counterEl?.dataset.needed || 5);
    let correctSoFar = 0;

    function updateMeta() {
      if (counterEl) counterEl.textContent = `${correctSoFar} / ${needed} correct`;
    }

    function newRound() {
      glyph.classList.remove('state-correct','state-wrong');
      input.value = '';
      const kana = KANA[Math.floor(Math.random() * KANA.length)];
      glyph.dataset.currentKana = kana;
      glyph.textContent = kana;
      input.focus();
    }

    function evaluate() {
      const kana = glyph.dataset.currentKana;
      const expected = ROMA[kana];
      const val = (input.value || '').trim().toLowerCase();

      glyph.classList.remove('state-correct','state-wrong');
      if (!val) return;

      if (val === expected) {
        glyph.classList.add('state-correct');
        correctSoFar += 1;
        updateMeta();
        setTimeout(() => {
          if (correctSoFar >= needed) {
            // finish; wait for footer Next
            // (optional: tiny toast)
          } else {
            newRound();
          }
        }, 350);
      } else {
        glyph.classList.add('state-wrong');
      }
    }

    if (checkBtn) checkBtn.addEventListener('click', evaluate);
    if (input) {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); evaluate(); } });
      input.addEventListener('input', () => glyph.classList.remove('state-correct','state-wrong'));
    }

    // init
    correctSoFar = 0; updateMeta(); newRound();
  }

  // ===== Part 4: Speak (unchanged UI stub) =====
  const part4 = $('#part-4');
  if (part4) {
    const status = $('.status-line', part4);
    const micBtn = $('[data-action="mic-toggle"]', part4);
    const tryAgain = $('[data-action="try-again"]', part4);
    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const pressed = micBtn.getAttribute('aria-pressed') === 'true';
        micBtn.setAttribute('aria-pressed', String(!pressed));
        if (status) status.textContent = !pressed ? 'Mic: listening…' : 'Mic: off';
      });
    }
    if (tryAgain) tryAgain.addEventListener('click', () => { if (status) status.textContent = 'Try again queued.'; });
  }

  // Init to Part 1
  showPart(1);
})();
