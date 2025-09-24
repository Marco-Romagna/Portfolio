// ==========================================================
// lessons-vocab.js 
// Vocab lesson flow (Parts 1–5: Explorer, Hunt, Identify, Typing, Audio)
// ==========================================================

(() => {
  const {
    $, $$,
    WORLD, SUFFIX,
    showPart,
    getRoleKey
  } = window.LessonCore;

  const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

  // ======================================================
  // Part 1 — Preview Words (Word Explorer)
  // ======================================================
  async function initPart1(words) {
    const part1 = $('#part-1');
    if (!part1) return;
  
    part1.innerHTML = '<h2 class="part-title">Vocabulary — Word Explorer</h2>';
  
    const container = document.createElement('div');
    container.className = 'vocab-explorer';
  
    const listEl = document.createElement('ul');
    listEl.className = 'vocab-list';
  
    const detail = document.createElement('div');
    detail.className = 'vocab-detail';
  
    function showWord(w) {
      detail.innerHTML = `
        <div class="kana-glyph">${w.kana}</div>
        <div class="kana-romaji">${w.romaji}</div>
        <div class="kana-gloss">${w.gloss_en}</div>
        ${w.note ? `<div class="vocab-note">Note: ${w.note}</div>` : ""}
        ${w.example ? `
          <div class="vocab-example">
            <div>${w.example.kana}</div>
            <div><strong>${w.example.romaji}</strong></div>
            <div>${w.example.english}</div>
          </div>` : ""}
      `;
    }
  
    const items = [];
    let currentIdx = 0;
  
    words.forEach((w, idx) => {
      const li = document.createElement('li');
      li.textContent = w.kana;
      li.addEventListener('click', () => {
        items.forEach(el => el.classList.remove('is-active'));
        li.classList.add('is-active');
        showWord(w);
        currentIdx = idx;
      });
      if (idx === 0) {
        li.classList.add('is-active');
        showWord(w);
      }
      items.push(li);
      listEl.appendChild(li);
    });
  
    container.appendChild(listEl);
    container.appendChild(detail);
    part1.appendChild(container);
  
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button class="btn ghost" data-action="prev">← Prev</button>
      <button class="btn ghost" data-action="next">Next →</button>
      <button class="btn primary" data-action="advance">Start Hunt</button>
    `;
    part1.appendChild(actions);
  
    function selectIndex(newIdx) {
      if (newIdx < 0 || newIdx >= items.length) return;
      items.forEach(el => el.classList.remove('is-active'));
      items[newIdx].classList.add('is-active');
      showWord(words[newIdx]);
      currentIdx = newIdx;
    }
  
    $('[data-action="prev"]', part1).addEventListener('click', () => selectIndex(currentIdx - 1));
    $('[data-action="next"]', part1).addEventListener('click', () => selectIndex(currentIdx + 1));
    $('[data-action="advance"]', part1).addEventListener('click', () => showPart(2));
  }
  
  // ==========================================================
  // Part 2 — Vocab Hunt (Immersion Passage using hunts-tokens.json)
  // ==========================================================
  async function initPart2Hunt(worldKey, words) {
    const { $, showPart } = window.LessonCore;
    const part2 = $('#part-2');
    if (!part2) return;
  
    const res = await fetch("../data/hunts-tokens.json");
    const hunts = await res.json();
    const paragraphs = hunts[worldKey];
    if (!paragraphs || paragraphs.length === 0) {
      part2.innerHTML = `<p>No hunt data for ${worldKey}</p>`;
      return;
    }
  
    let currentPara = 0;
    let targets = [];
    let currentTarget = null;
  
    part2.innerHTML = `
      <h2 class="part-title">Immersion Hunt</h2>
      <div id="hunt-target" class="hunt-target"></div>
      <div id="hunt-passage" class="hunt-passage"></div>
      <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
    `;
  
    const passageEl = $('#hunt-passage', part2);
    const targetEl = $('#hunt-target', part2);
    const nextBtn = $('[data-action="next-part"]', part2);
  
    // Shuffle helper
    function shuffle(arr) {
      return arr.sort(() => Math.random() - 0.5);
    }
  
    // Pick next target from pool
    function setNextTarget() {
      if (targets.length === 0) {
        // all words for this paragraph are done
        nextBtn.classList.remove("is-hidden");
        targetEl.innerHTML = `<div class="hunt-english">✅ All words found!</div>`;
        currentTarget = null;
        return;
      }
    
      currentTarget = targets.pop();
      targetEl.innerHTML = `
        <div class="hunt-romaji">${currentTarget.romaji}</div>
        <div class="hunt-english">${currentTarget.gloss_en}</div>
      `;
    }

  
    function renderParagraph() {
      passageEl.textContent = "";
      nextBtn.classList.add("is-hidden");
  
      // reset target pool (shuffle for randomness)
      targets = shuffle([...words]);
      currentTarget = null;
  
      // Render paragraph tokens
      paragraphs[currentPara].forEach(token => {
        const span = document.createElement("span");
        span.className = "hunt-token";
        span.textContent = token;
      
        span.addEventListener("click", () => {
          if (!currentTarget) return;
      
          // ✅ strict equality instead of substring match
          if (span.textContent === currentTarget.kana) {
            span.classList.add("is-correct");
            setNextTarget(); // move to next target
          } else {
            span.classList.add("is-wrong");
            setTimeout(() => span.classList.remove("is-wrong"), 400);
          }
        });
      
        passageEl.appendChild(span);
        passageEl.append(" ");
      });
  
      setNextTarget(); // start first target
    }
  
    renderParagraph();
  
    nextBtn.addEventListener("click", () => {
      currentPara++;
      if (currentPara < paragraphs.length) {
        renderParagraph(); // next paragraph
      } else {
        showPart(3); // after last one, go to Part 3
      }
    });
  }

  // ======================================================
  // Part 3 — Identify
  // ======================================================
  async function initPart3(words) {
    const part3 = $('#part-3');
    if (!part3) return;

    part3.innerHTML = `
      <h2 class="part-title">Identify</h2>
      <div class="quiz-panel">
        <div class="quiz-prompt"><p class="prompt-text">Which word is <strong class="prompt-target"></strong>?</p></div>
        <div class="quiz-options"></div>
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;

    const grid = $('.quiz-options', part3);
    const feedback = $('.quiz-feedback .feedback-text', part3);
    const promptEl = $('.prompt-text .prompt-target', part3);
    const meterFill = $('.quiz-progress .meter-fill', part3);
    const meterLabel = $('.quiz-progress .meter-label', part3);

    const GOAL = words.length * 2;
    let progressPts = 0;

    let queue = [...words];
    let current = null;
    let firstTry = true;

    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }

    function nextQuestion() {
      grid.innerHTML = '';
      feedback.textContent = '';
      // reset old classes before rendering new buttons
      document.querySelectorAll('.option').forEach(btn => {
        btn.classList.remove('is-correct', 'is-wrong');
      });
      
      if (queue.length === 0) {
        queue = [...words].sort(() => Math.random() - 0.5);
      }

      current = queue.shift();
      firstTry = true;

      promptEl.textContent = current.gloss_en;

      const distractors = words.filter(w => w.id !== current.id).sort(() => 0.5 - Math.random()).slice(0, 3);
      const options = [current, ...distractors].sort(() => 0.5 - Math.random());

      options.forEach((w, i) => {
        const b = document.createElement('button');
        b.className = `option ${THEMES[i % THEMES.length]}`;
        b.textContent = w.kana;
        b.addEventListener('click', () => {
          if (w === current) {
            if (firstTry) {
              progressPts++;
              updateMeter();
            }
            b.classList.add('is-correct');
            if (progressPts >= GOAL) {
              $('[data-action="next-part"]', part3).classList.remove('is-hidden');
              feedback.textContent = 'Well done!';
            } else {
              setTimeout(nextQuestion, 400);
            }
          } else {
            b.classList.add('is-wrong');
            feedback.textContent = 'Try again!';
            firstTry = false;
            if (!queue.includes(current)) {
              queue.push(current);
            }
          }
        });
        grid.appendChild(b);
      });
    }

    $('[data-action="next-part"]', part3)?.addEventListener('click', () => showPart(4));

    updateMeter();
    nextQuestion();
  }

  // ======================================================
  // Part 4 — Typing (English → romaji)
  // ======================================================
  async function initPart4(words) {
    const part4 = $('#part-4');
    if (!part4) return;
  
    part4.innerHTML = `
      <h2 class="part-title">Typing</h2>
      <div class="type-panel">
        <div class="type-prompt-box">
          <span id="type-prompt" class="type-prompt"></span>
        </div>
        <div class="type-input-wrapper theme-dark">
          <input id="type-input" class="type-input" placeholder="Type romaji…" autocomplete="off" />
        </div>
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="quiz-progress">
          <div class="meter"><div class="meter-fill"></div></div>
          <div class="meter-label"></div>
        </div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;
  
    const promptEl = $('#type-prompt', part4);
    const input = $('#type-input', part4);
    const feedback = $('.feedback-text', part4);
    const meterFill = $('.meter-fill', part4);
    const meterLabel = $('.meter-label', part4);
    const actionBtn = $('[data-action="next-part"]', part4);
  
    let progressPts = 0, GOAL = words.length * 2;
    let current = null, last = null;
  
    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${progressPts}/${GOAL}`;
    }
  
    function pickWord() {
      let next;
      do {
        next = words[Math.floor(Math.random() * words.length)];
      } while (last && next.id === last.id && words.length > 1);
      last = next;
      return next;
    }
  
    function newRound() {
      current = pickWord();
      promptEl.textContent = current.gloss_en;
      input.value = '';
      feedback.textContent = '';
      input.focus();
    }
  
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const guess = input.value.trim().toLowerCase();
        if (guess === current.romaji.toLowerCase()) {
          progressPts++;
          feedback.textContent = '✅ Correct!';
          feedback.className = 'feedback-text is-correct';
        } else {
          progressPts = Math.max(0, progressPts - 1);
          feedback.textContent = `❌ Wrong (${current.romaji})`;
          feedback.className = 'feedback-text is-wrong';
        }
        updateMeter();
        if (progressPts >= GOAL) {
          actionBtn.classList.remove('is-hidden');
        } else {
          setTimeout(newRound, 700);
        }
      }
    });
  
    actionBtn.addEventListener('click', () => showPart(5));
  
    updateMeter();
    newRound();
  }


  // ======================================================
  // Part 5 — Audio
  // ======================================================
  async function initPart5(words) {
    const part5 = $('#part-5');
    if (!part5) return;

    part5.innerHTML = '<h2 class="part-title">Audio Quiz</h2>';
    const panel = document.createElement('div');
    panel.className = 'speak-panel';
    panel.innerHTML = `
      <button class="btn primary" id="play-audio">Play Audio</button>
      <input id="audio-answer" class="type-input" placeholder="Type romaji or English…" />
      <div class="actions"><button class="btn primary" data-action="finish-lesson">Finish</button></div>
    `;
    part5.appendChild(panel);

    const btnPlay = $('#play-audio', part5);
    const input = $('#audio-answer', part5);
    const finishBtn = $('[data-action="finish-lesson"]', part5);

    let current = words[Math.floor(Math.random() * words.length)];

    btnPlay.addEventListener('click', () => {
      if (current.audio) {
        new Audio(current.audio).play();
      } else {
        alert("No audio file found for this word yet.");
      }
    });

    finishBtn.addEventListener('click', () => { window.location.href = '../index.html'; });
  }

  // ======================================================
  // Public API
  // ======================================================
  window.initVocabParts = async function () {
    const roleKey = getRoleKey(WORLD, SUFFIX);
    const words = await Vocab.getWorldMilestone(roleKey);

    await initPart1(words);
    window.initPart2 = () => initPart2Hunt(roleKey, words);
    window.initPart3 = () => initPart3(words);
    window.initPart4 = () => initPart4(words);
    window.initPart5 = () => initPart5(words);
  };
})();
