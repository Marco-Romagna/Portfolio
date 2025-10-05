// ==========================================================
// lessons-kana.js
// Kana lesson flow (Parts 1–4 + typing engine)
// ==========================================================
(() => {
  const {
    $, $$,
    SUFFIX, KANA, ROMA, PAIR,
    GOAL_IDENT, GOAL_TYPE, COMBO_LAST,
    showPart
  } = window.LessonCore;

  const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

  // ======================================================
  // Part 1 — Preview
  // ======================================================
  function initPart1() {
    const part1 = $('#part-1');
    if (!part1) return;
    part1.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'part-title';
    title.textContent = 'Preview';
    part1.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'kana-grid';
    part1.appendChild(grid);

    const uniq = Array.from(new Set(KANA));
    uniq.forEach(g => {
      const card = document.createElement('article');
      card.className = 'card-big kana-card';
      card.innerHTML = `
        <span class="kana-glyph">${g}</span>
        <span class="kana-sub">${ROMA[g] || ''}</span>
      `;
      card.addEventListener('click', () => {
        const romaji = ROMA[g];
        if (romaji) {
          const audioPath = `../assets/audio/kana/${romaji}.mp3`;
          const audio = new Audio(audioPath);
          audio.play().catch(err => console.warn('Audio failed:', err));
        }
      });
      grid.appendChild(card);
    });

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `<button class="btn primary" data-action="advance">Start</button>`;
    actions.querySelector('[data-action="advance"]').addEventListener('click', () => showPart(2));
    part1.appendChild(actions);
  }

  // ======================================================
  // Part 2 — Identify
  // ======================================================
  function initPart2() {
    const part2 = $('#part-2');
    if (!part2) return;

    part2.innerHTML = `
      <h2 class="part-title">Identify</h2>
      <div class="quiz-panel">
        <div class="quiz-prompt"><p class="prompt-text">Which kana is <strong class="prompt-target"></strong>?</p></div>
        <div class="quiz-options"></div>
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;

    const grid = $('.quiz-options', part2);
    const feedback = $('.quiz-feedback .feedback-text', part2);
    const promptEl = $('.prompt-text .prompt-target', part2);
    const meterFill = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);

    const GOAL = GOAL_IDENT;
    let progressPts = 0;
    let unseen = [...KANA];
    let currentKana = null;

    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }

    function nextQuestion() {
      if (unseen.length === 0) unseen = [...KANA];
      currentKana = unseen.splice(Math.floor(Math.random() * unseen.length), 1)[0];
      promptEl.textContent = ROMA[currentKana];
      feedback.textContent = '';

      grid.innerHTML = '';
      const distractors = KANA.filter(k => k !== currentKana).sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [currentKana, ...distractors].sort(() => 0.5 - Math.random());

      options.forEach((k, i) => {
        const b = document.createElement('button');
        b.className = `option ${THEMES[i % THEMES.length]}`;
        b.textContent = k;
        b.addEventListener('click', () => onPick(k, b));
        grid.appendChild(b);
      });
    }

    function onPick(choice, btn) {
      if (choice === currentKana) {
        btn.classList.add('is-correct');
        progressPts++;
        feedback.textContent = 'Correct!';
        updateMeter();
        setTimeout(() => {
          if (progressPts >= GOAL) {
            $('[data-action="next-part"]', part2)?.classList.remove('is-hidden');
            feedback.textContent = 'Part complete!';
          } else {
            nextQuestion();
          }
        }, 400);
      } else {
        btn.classList.add('is-wrong');
        feedback.textContent = 'Try again!';
        setTimeout(() => nextQuestion(), 500);
      }
    }

    $('[data-action="next-part"]', part2)?.addEventListener('click', () => showPart(3));

    updateMeter();
    nextQuestion();
  }

  // ======================================================
  // Part 3 — Typing
  // ======================================================
  function initPart3() {
    const part3 = $('#part-3');
    if (!part3) return;

    part3.innerHTML = `
      <h2 class="part-title">Typing</h2>
      <div class="quiz-panel">
        <p class="quiz-prompt">Type the romaji for <strong class="prompt-target"></strong></p>
        <input id="quiz-input" class="quiz-input" placeholder="Type romaji…" autocomplete="off" />
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;

    const input = $('#quiz-input', part3);
    const feedback = $('.quiz-feedback .feedback-text', part3);
    const promptEl = $('.prompt-target', part3);
    const meterFill = $('.meter-fill', part3);
    const meterLabel = $('.meter-label', part3);
    const nextBtn = $('[data-action="next-part"]', part3);

    const GOAL = GOAL_TYPE;
    let progressPts = 0;
    let currentKana = null;

    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }

    function nextQuestion() {
      currentKana = KANA[Math.floor(Math.random() * KANA.length)];
      promptEl.textContent = currentKana;
      feedback.textContent = '';
      input.value = '';
      input.focus();
    }

    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const guess = input.value.trim().toLowerCase();
        if (guess === ROMA[currentKana]) {
          progressPts++;
          feedback.textContent = '✅ Correct!';
        } else {
          feedback.textContent = `❌ Correct: ${ROMA[currentKana]}`;
          progressPts = Math.max(0, progressPts - 1);
        }
        updateMeter();
        if (progressPts >= GOAL) {
          nextBtn.classList.remove('is-hidden');
        } else {
          setTimeout(nextQuestion, 700);
        }
      }
    });

    nextBtn.addEventListener('click', () => showPart(4));

    updateMeter();
    nextQuestion();
  }

  // ======================================================
  // Part 4 — Audio Identify (sound → kana)
  // ======================================================
  function initPart4() {
    const part4 = $('#part-4');
    if (!part4) return;

    part4.innerHTML = `
      <h2 class="part-title">Audio — Listen & Identify</h2>
      <div class="quiz-panel">
        <div class="quiz-prompt">
          <button class="btn ghost" id="replay-audio">🔊 Replay sound</button>
        </div>
        <div class="quiz-options"></div>
        <div class="quiz-progress">
          <div class="meter"><div class="meter-fill"></div></div>
          <div class="meter-label"></div>
        </div>
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Finish Lesson</button></div>
      </div>
    `;

    const grid = $('.quiz-options', part4);
    const feedback = $('.quiz-feedback .feedback-text', part4);
    const meterFill = $('.quiz-progress .meter-fill', part4);
    const meterLabel = $('.quiz-progress .meter-label', part4);
    const replayBtn = $('#replay-audio', part4);

    const GOAL = KANA.length * 2;
    let progressPts = 0;
    let unseen = [...KANA];
    let currentKana = null;
    let roundLocked = false;

    function playAudio(k) {
      const romaji = ROMA[k];
      if (!romaji) return;
      const audioPath = `../assets/audio/kana/${romaji}.mp3`;
      const audio = new Audio(audioPath);
      audio.play().catch(err => console.warn("Audio failed:", err));
    }

    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }

    function nextQuestion() {
      roundLocked = false;
      grid.innerHTML = '';
      feedback.textContent = '';

      if (unseen.length === 0) unseen = [...KANA];
      currentKana = unseen.splice(Math.floor(Math.random() * unseen.length), 1)[0];

      setTimeout(() => playAudio(currentKana), 600);

      const distractors = KANA.filter(k => k !== currentKana)
                              .sort(() => 0.5 - Math.random())
                              .slice(0, 3);
      const options = [currentKana, ...distractors].sort(() => 0.5 - Math.random());

      options.forEach((g, i) => {
        const b = document.createElement('button');
        b.className = `option ${THEMES[i % THEMES.length]}`;
        b.textContent = g;
        b.addEventListener('click', () => onPick(g, b));
        grid.appendChild(b);
      });

      replayBtn.onclick = () => playAudio(currentKana);
    }

    function onPick(choice, btn) {
      if (roundLocked) return;
      roundLocked = true;
      const all = $$('.option', part4);
      all.forEach(b => b.disabled = true);

      if (choice === currentKana) {
        btn.classList.add('is-correct');
        feedback.textContent = 'Correct!';
        progressPts++;
        updateMeter();
        setTimeout(() => {
          if (progressPts >= GOAL) {
            $('[data-action="next-part"]', part4)?.classList.remove('is-hidden');
            feedback.textContent = 'Part complete!';
          } else {
            nextQuestion();
          }
        }, 350);
      } else {
        btn.classList.add('is-wrong');
        feedback.textContent = 'Try again…';
        progressPts = Math.max(0, progressPts - 1);
        updateMeter();
        setTimeout(() => nextQuestion(), 450);
      }
    }

    $('[data-action="next-part"]', part4)
      ?.addEventListener('click', () => window.location.href = '../index.html');

    updateMeter();
    setTimeout(() => nextQuestion(), 400);
  }

  // ======================================================
  // Public API
  // ======================================================
  window.initKanaParts = function () {
    initPart1();
  };
})();
