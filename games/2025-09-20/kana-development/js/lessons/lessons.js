// lessons/lesson.js — minimal part switching (UI only)
(() => {
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const lesson = $('.lesson');
  if (!lesson) return;

  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts      = $$('.lesson-part');
  const steps      = $$('.steps .step');
  const progress   = $('.progressbar');       // element with role=progressbar
  const fill       = $('.progressbar-fill');
  const posCurrent = $('.lesson-position .pos-current');
  const posTotal   = $('.lesson-position .pos-total');

  if (posTotal) posTotal.textContent = String(totalParts);

  let current = 1;

  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);

    // visibility + active step
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));

    // position text
    if (posCurrent) posCurrent.textContent = String(current);

    // progress bar (0% at part 1, 100% at last)
    const pct = (totalParts > 1) ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
  }

  // Global click handling
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case 'prev':       showPart(current - 1); break;
      case 'next':       showPart(current + 1); break;
      case 'start-quiz': showPart(2);           break;
      case 'continue':   showPart(current + 1); break;
      case 'proceed':    showPart(current + 1); break;
      case 'reshuffle':  /* no-op for now */    break;
    }
  });

  // Allow clicking the step pills to jump
  steps.forEach(step => {
    step.addEventListener('click', () => showPart(Number(step.dataset.part)));
  });

  // ===== Part 2: Identify (visual-only feedback) =====
  const part2 = $('#part-2');
  if (part2) {
    const options = $$('.option', part2);
    const feedback = $('.quiz-feedback .feedback-text', part2);
    const contBtn = $('[data-action="continue"]', part2);

    const correctValue = options[0]?.dataset.value; // demo target

    options.forEach(btn => {
      btn.addEventListener('click', () => {
        options.forEach(b => b.classList.remove('is-correct', 'is-wrong'));
        if (btn.dataset.value === correctValue) {
          btn.classList.add('is-correct');
          if (feedback) feedback.textContent = 'Nice! That’s correct.';
          if (contBtn) contBtn.disabled = false;
        } else {
          btn.classList.add('is-wrong');
          if (feedback) feedback.textContent = 'Try another.';
          if (contBtn) contBtn.disabled = true;
        }
      });
    });

    const reshuffleBtn = $('[data-action="reshuffle"]', part2);
    if (reshuffleBtn) {
      reshuffleBtn.addEventListener('click', () => {
        const grid = $('.quiz-options', part2);
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        shuffled.forEach(o => { o.classList.remove('is-correct', 'is-wrong'); grid.appendChild(o); });
        if (feedback) feedback.textContent = 'Options reshuffled…';
        if (contBtn) contBtn.disabled = true;
      });
    }
  }

  // ===== Part 3: Typing (visual-only feedback) =====
  const part3 = $('#part-3');
  if (part3) {
    const glyph   = $('.type-glyph', part3);
    const input   = $('#type-input', part3);
    const check   = $('[data-action="check-typing"]', part3);
    const contBtn = $('[data-action="continue"]', part3);

    const correctRomaji = 'a'; // demo target

    const evaluate = () => {
      const val = (input.value || '').trim().toLowerCase();
      glyph.classList.remove('state-correct', 'state-wrong');
      if (!val) { contBtn.disabled = true; return; }
      if (val === correctRomaji) {
        glyph.classList.add('state-correct');
        contBtn.disabled = false;
      } else {
        glyph.classList.add('state-wrong');
        contBtn.disabled = true;
      }
    };

    if (check) check.addEventListener('click', evaluate);
    if (input) {
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); evaluate(); } });
      input.addEventListener('input', () => glyph.classList.remove('state-correct', 'state-wrong'));
    }
  }

  // ===== Part 4: Speak (UI-only) =====
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

  // Init
  showPart(1);
})();
