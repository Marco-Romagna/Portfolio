(() => {
  // ===== Helpers =====
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const root = document;
  const lesson = $('.lesson');
  if (!lesson) return;

  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts = $$('.lesson-part');
  const steps = $$('.steps .step');
  const progressbarFill = $('.progressbar-fill');
  const posCurrent = $('.lesson-position .pos-current');

  let currentIndex = 1; // 1..4

  const showPart = (idx) => {
    currentIndex = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === currentIndex));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === currentIndex));
    if (posCurrent) posCurrent.textContent = String(currentIndex);
    if (progressbarFill) {
      const pct = Math.round((currentIndex - 1) / (totalParts - 1) * 100);
      progressbarFill.style.width = `${pct}%`;
      progressbarFill.setAttribute('aria-valuenow', String(pct));
    }
  };

  // Global nav buttons (footer)
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === 'prev') showPart(currentIndex - 1);
    if (action === 'next') showPart(currentIndex + 1);

    // Part-specific action stubs:
    if (action === 'start-quiz') showPart(2);
    if (action === 'continue') showPart(currentIndex + 1);
  });

  // ===== Part 2: Quiz (visual only) =====
  const part2 = $('#part-2');
  if (part2) {
    const options = $$('.option', part2);
    const feedback = $('.quiz-feedback .feedback-text', part2);
    const continueBtn = $('[data-action="continue"]', part2);

    // For UI demo, mark the first option as "correct" data-wise.
    const correctValue = options[0]?.dataset.value;

    options.forEach(btn => {
      btn.addEventListener('click', () => {
        options.forEach(b => b.classList.remove('is-correct', 'is-wrong'));
        if (btn.dataset.value === correctValue) {
          btn.classList.add('is-correct');
          if (feedback) feedback.textContent = 'Nice! That’s correct.';
          if (continueBtn) continueBtn.disabled = false;
        } else {
          btn.classList.add('is-wrong');
          if (feedback) feedback.textContent = 'Try another.';
          if (continueBtn) continueBtn.disabled = true;
        }
      });
    });

    const reshuffleBtn = $('[data-action="reshuffle"]', part2);
    if (reshuffleBtn) {
      reshuffleBtn.addEventListener('click', () => {
        // simple UI shuffle (no data change), just reorder DOM
        const grid = $('.quiz-options', part2);
        const shuffled = [...options].sort(() => Math.random() - 0.5);
        shuffled.forEach(o => { o.classList.remove('is-correct', 'is-wrong'); grid.appendChild(o); });
        if (feedback) feedback.textContent = 'Options reshuffled…';
        if (continueBtn) continueBtn.disabled = true;
      });
    }
  }

  // ===== Part 3: Type (visual only) =====
  const part3 = $('#part-3');
  if (part3) {
    const glyph = $('.type-glyph', part3);
    const input = $('#type-input', part3);
    const checkBtn = $('[data-action="check-typing"]', part3);
    const contBtn = $('[data-action="continue"]', part3);

    const correctRomaji = 'a'; // demo target (wire real answer later)

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

    if (checkBtn) checkBtn.addEventListener('click', evaluate);
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); evaluate(); }
      });
      input.addEventListener('input', () => {
        glyph.classList.remove('state-correct', 'state-wrong');
      });
    }
  }

  // ===== Part 4: Speak (visual only) =====
  const part4 = $('#part-4');
  if (part4) {
    const statusLine = $('.status-line', part4);
    const micBtn = $('[data-action="mic-toggle"]', part4);
    const tryAgainBtn = $('[data-action="try-again"]', part4);

    if (micBtn) {
      micBtn.addEventListener('click', () => {
        const pressed = micBtn.getAttribute('aria-pressed') === 'true';
        micBtn.setAttribute('aria-pressed', String(!pressed));
        if (statusLine) statusLine.textContent = !pressed ? 'Mic: listening…' : 'Mic: off';
      });
    }
    if (tryAgainBtn) {
      tryAgainBtn.addEventListener('click', () => {
        if (statusLine) statusLine.textContent = 'Try again queued.';
      });
    }
  }

  // Init
  showPart(1);
})();
