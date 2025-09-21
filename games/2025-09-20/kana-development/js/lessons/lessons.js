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

  // Center CTA
  const cta = $('.lesson-cta [data-action="advance"]');
  const showCTA = (label) => { cta.textContent = label; cta.classList.remove('is-hidden'); };
  const hideCTA = () => cta.classList.add('is-hidden');

  // 1-1 data (could be read from data-* later)
  const KANA = ['あ','い','う','え','お'];
  const ROMA = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' };

  let current = 1;
  let part2Done = false;
  let part3Done = false;
  let part4Done = false;

  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);

    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));

    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));

    // CTA rules
    if (current === 1) {
      showCTA('Start');
    } else if (current === 2) {
      part2Done ? showCTA('Next') : hideCTA();
    } else if (current === 3) {
      part3Done ? showCTA('Next') : hideCTA();
    } else if (current === 4) {
      // Part 4 can proceed anytime
      showCTA(part4Done ? 'Finish' : 'Next');
    }
  }

  // Single CTA click
  cta.addEventListener('click', () => {
    if (current < totalParts) {
      showPart(current + 1);
    } else {
      // Finished lesson — go back to stage index
      window.location.href = '../index.html';
    }
  });

  // ===== Part 2: Identify (auto-next question; show CTA when complete) =====
  const part2 = $('#part-2');
  if (part2) {
    const grid      = $('.quiz-options', part2);
    const feedback  = $('.quiz-feedback .feedback-text', part2);
    const counterEl = $('.quiz-meta .counter', part2);
    const streakEl  = $('.quiz-meta .streak', part2);

    let needed = Number(counterEl?.dataset.needed || 5);
    let correctSoFar = 0;
    let streak = 0;

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
    function clearStates() { $$('.option', part2).forEach(b => b.classList.remove('is-correct','is-wrong')); }

    function setRound() {
      const correctKana = KANA[Math.floor(Math.random() * KANA.length)];
      const targetRomaji = ROMA[correctKana];
      const prompt = $('.prompt-text .prompt-target', part2);
      if (prompt) { prompt.dataset.type = 'romaji'; prompt.textContent = `“${targetRomaji}”`; }

      const opts = sample(KANA, Math.min(4, KANA.length));
      if (!opts.includes(correctKana)) opts[Math.floor(Math.random()*opts.length)] = correctKana;
      const shuffled = sample(opts, opts.length);

      grid.innerHTML = '';
      shuffled.forEach(k => {
        const b = document.createElement('button');
        b.className = 'option';
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

    // optional manual reshuffle
    const reshuffleBtn = $('[data-action="reshuffle"]', part2);
    if (reshuffleBtn) reshuffleBtn.addEventListener('click', () => { clearStates(); setRound(); setFeedback('Options reshuffled…'); });

    // init
    correctSoFar = 0; streak = 0; updateMeta(); setRound();
  }

  // ===== Part 3: Typing (auto-next glyph; show CTA when complete) =====
  const part3 = $('#part-3');
  if (part3) {
    const glyph     = $('.type-glyph', part3);
    const input     = $('#type-input', part3);
    const checkBtn  = $('[data-action="check-typing"]', part3);
    const counterEl = $('.type-meta .counter', part3);

    let needed = Number(counterEl?.dataset.needed || 5);
    let correctSoFar = 0;

    function updateMeta() { if (counterEl) counterEl.textContent = `${correctSoFar} / ${needed}`; }

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

    if (checkBtn) checkBtn.addEventListener('click', evaluate);
    if (input) {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); evaluate(); } });
      input.addEventListener('input', () => glyph.classList.remove('state-correct','state-wrong'));
    }

    correctSoFar = 0; updateMeta(); newRound();
  }

  // ===== Part 4: Speak =====
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

    // You said part 4 can proceed when ready → allow Next immediately; mark done on first action.
    showCTA('Next');
    tryAgain?.addEventListener('click', () => { part4Done = true; });
    micBtn?.addEventListener('click', () => { part4Done = true; });
  }

  // Start on Part 1
  showPart(1);
})();
