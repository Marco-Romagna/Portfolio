// ==========================================================
// lessons-vocab.js 
// Vocab lesson flow (Parts 1–5: Explorer, Hunt, Identify, Typing, Audio)
// ==========================================================

(() => {
  const {
    $, $$,
    WORLD, SUFFIX,
    showPart,
    LEXICON
  } = window.LessonCore;

  const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

  // ---------- Role Key Helper ----------
  // Some vocab keys in lexicon_hiragana.json / hunts-tokens.json use
  // formats like "1-vocab-hira". We'll generate that here.
  function getRoleKey(world, suffix) {
    if (LEXICON === "hiragana") return `${world}-vocab-hira`;
    if (LEXICON === "katakana") return `${world}-vocab-kata`;
    return `${world}-vocab-hira`;
  }

  // ======================================================
  // Part 1 — Preview Words (Word Explorer)
  // ======================================================
  async function initPart1(words) {
    const part1 = $('#part-1');
    if (!part1) return;
  
    part1.innerHTML = '<h2 class="part-title">Vocabulary — Word Explorer</h2>';
  
    // Layout
    const container = document.createElement('div');
    container.className = 'vocab-explorer';
  
    const listEl = document.createElement('ul');
    listEl.className = 'vocab-list';
  
    const detail = document.createElement('div');
    detail.className = 'vocab-detail';
  
    // --- Show a vocab word in the detail pane ---
    function showWord(w) {
      detail.innerHTML = `
        <div class="kana-glyph">${w.kana}</div>
        <div class="kana-sub">${w.romaji}</div>
        <div class="vocab-english">${w.gloss_en}</div>
        ${w.note ? `<div class="vocab-note">${w.note}</div>` : ""}
        ${w.example ? `
          <div class="vocab-example">
            <p><strong>${w.example.kana}</strong></p>
            <p class="muted">${w.example.romaji}</p>
            <p>${w.example.english}</p>
          </div>` : ""}
      `;
  
      // click-to-play for the detail block
      detail.onclick = () => {
        const audioPath = `../assets/audio/vocab/${w.romaji}.mp3`;
        const audio = new Audio(audioPath);
        audio.play().catch(err => console.warn('Audio failed:', err));
      };
    }
  
    // --- Build word list sidebar ---
    const items = [];
    let currentIdx = 0;
  
    words.forEach((w, idx) => {
      const li = document.createElement('li');
      li.textContent = w.kana || w.gloss_en;
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
  
    // Append to layout
    container.appendChild(listEl);
    container.appendChild(detail);
    part1.appendChild(container);
  
    // --- Navigation buttons ---
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
  // Part 2 — Vocab Hunt (Immersion Passage)
  // ==========================================================
  async function initPart2Hunt(worldKey, words) {
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
  
    function shuffle(arr) {
      return arr.sort(() => Math.random() - 0.5);
    }
  
    function setNextTarget() {
      if (targets.length === 0) {
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
      targets = shuffle([...words]);
      currentTarget = null;
  
      paragraphs[currentPara].forEach(token => {
        const span = document.createElement("span");
        span.className = "hunt-token";
        span.textContent = token;
      
        span.addEventListener("click", () => {
          if (!currentTarget) return;
          if (span.textContent === currentTarget.kana) {
            span.classList.add("is-correct");
            setNextTarget();
          } else {
            span.classList.add("is-wrong");
            setTimeout(() => span.classList.remove("is-wrong"), 400);
          }
        });
      
        passageEl.appendChild(span);
        passageEl.append(" ");
      });
  
      setNextTarget();
    }
  
    renderParagraph();
  
    nextBtn.addEventListener("click", () => {
      currentPara++;
      if (currentPara < paragraphs.length) {
        renderParagraph();
      } else {
        showPart(3);
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
            if (firstTry) { progressPts++; updateMeter(); }
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
            if (!queue.includes(current)) queue.push(current);
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
  // Part 4 — Typing
  // ======================================================
  async function initPart4(words) {
    const part4 = $('#part-4');
    if (!part4) return;
  
    part4.innerHTML = `
      <h2 class="part-title">Typing</h2>
      <div class="quiz-panel">
        <p class="quiz-prompt">Type the romaji for <strong class="prompt-target"></strong></p>
        <div class="quiz-input-wrapper"><input id="quiz-input" class="quiz-input" placeholder="Type romaji…" autocomplete="off" /></div>
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;
  
    const input = $('#quiz-input', part4);
    const feedback = $('.quiz-feedback .feedback-text', part4);
    const promptEl = $('.prompt-target', part4);
    const meterFill = $('.meter-fill', part4);
    const meterLabel = $('.meter-label', part4);
    const actionBtn = $('[data-action="next-part"]', part4);
  
    const GOAL = words.length * 2;
    let progressPts = 0;
    let current = null;
    let lastWord = null;
    let locked = false;
  
    function updateMeter() {
      const pct = Math.round((progressPts / GOAL) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${progressPts} / ${GOAL}`;
    }
  
    function pickWord() {
      let candidate;
      do {
        candidate = words[Math.floor(Math.random() * words.length)];
      } while (candidate === lastWord && words.length > 1);
      lastWord = candidate;
      return candidate;
    }
  
    function newRound() {
      locked = false;
      current = pickWord();
      promptEl.textContent = current.gloss_en;
      feedback.textContent = "";
      input.value = "";
      input.disabled = false;
      input.focus();
    }
  
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !locked) {
        const answer = input.value.trim().toLowerCase();
        if (!answer) return;
        locked = true;
        input.disabled = true;
        if (answer === current.romaji.toLowerCase()) {
          progressPts++;
          feedback.textContent = "✅ Correct!";
        } else {
          progressPts = Math.max(0, progressPts - 1);
          feedback.innerHTML = `❌ Correct: <strong>${current.romaji}</strong>`;
        }
        updateMeter();
        if (progressPts >= GOAL) {
          actionBtn.classList.remove('is-hidden');
        } else {
          setTimeout(newRound, 900);
        }
      }
    });
  
    actionBtn.addEventListener('click', () => showPart(5));
    updateMeter();
    newRound();
  }

  // ======================================================
  // Part 5 — Audio Recognition (Compact, Slow Mode + Hint)
  // ======================================================
  async function initPart5(words) {
    const part5 = $('#part-5');
    if (!part5) return;
  
    part5.innerHTML = `
      <h2 class="part-title">Audio Recognition</h2>
      <div class="quiz-panel">
        <div class="audio-section">
          <button class="btn primary" id="play-audio">▶ Play</button>
          <button class="btn ghost" id="slow-toggle">🐢 Slow: Off</button>
          <button class="btn ghost is-hidden" id="hint-btn">💡 Hint</button>
        </div>
        <div id="options" class="options-grid fixed-grid"></div>
        <div id="feedback" class="quiz-feedback"></div>
        <div id="example-display" class="example-display is-hidden"></div>
        <div class="quiz-progress">
          <div class="meter"><div class="meter-fill"></div></div>
          <div class="meter-label"></div>
        </div>
        <div class="actions">
          <button class="btn primary is-hidden" data-action="finish-lesson">Finish</button>
        </div>
      </div>
    `;
  
    // --- UI elements ---
    const btnPlay = $('#play-audio', part5);
    const slowToggle = $('#slow-toggle', part5);
    const hintBtn = $('#hint-btn', part5);
    const opts = $('#options', part5);
    const feedback = $('#feedback', part5);
    const exampleBox = $('#example-display', part5);
    const finishBtn = $('[data-action="finish-lesson"]', part5);
    const meterFill = $('.meter-fill', part5);
    const meterLabel = $('.meter-label', part5);
  
    // --- State ---
    const tenses = LessonCore.getAvailableTensesForWorld(LessonCore.WORLD);
    const goal = words.length;
    let score = 0;
    let used = new Set();
    let lastAudio = null;
    let current = null;
    let currentTense = 'dictionary';
    let currentAudioSrc = '';
    let currentFallback = '';
    let currentExIndex = 0;
    let slowMode = false;
    let replayCount = 0;
    let hintUsed = false;
  
    // --- Helpers ---
    const updateMeter = () => {
      const pct = Math.round((score / goal) * 100);
      meterFill.style.width = `${pct}%`;
      meterLabel.textContent = `Progress: ${score} / ${goal}`;
      if (score >= goal) finishBtn.classList.remove('is-hidden');
    };
  
    const playAudio = (src, fallback) => {
      const a = new Audio(src);
      a.playbackRate = slowMode ? 0.7 : 1.0;
      a.onerror = () => {
        const b = new Audio(fallback);
        b.playbackRate = a.playbackRate;
        b.play();
      };
      a.play().catch(() => {});
    };
  
    const getKanaHint = word =>
      word?.kana ? `Hint: listen for ${word.kana.split('').join('・')}` : 'Listen carefully to the vowel pattern.';
  
    // --- Pick next ---
    function pickNext() {
      opts.innerHTML = '';
      feedback.textContent = '';
      exampleBox.classList.add('is-hidden');
      exampleBox.innerHTML = '';
      hintBtn.classList.add('is-hidden');
      replayCount = 0;
      hintUsed = false;
  
      if (used.size === words.length) used.clear();
      let next;
      do { next = LessonCore.pickRandom(words); } while (used.has(next.id));
      used.add(next.id);
  
      current = next;
      currentTense = LessonCore.pickRandom(tenses);
  
      const scriptType = LessonCore.LEXICON || 'hiragana';
      const folderWord = current.id.replace(/_hira|_kata/g, '');
      const exSet = current.examples?.[currentTense] || current.examples?.dictionary || [];
      const n = Math.floor(Math.random() * exSet.length) + 1;
      currentExIndex = n - 1;
  
      const basePath = `../../kana-development/assets/audio/vocab_examples/${currentTense}/${scriptType}/${folderWord}/`;
      currentAudioSrc = `${basePath}ex${n}.mp3`;
      currentFallback = `../../kana-development/assets/audio/vocab_examples/dictionary/${scriptType}/${folderWord}/ex1.mp3`;
  
      if (currentAudioSrc === lastAudio) return pickNext();
      lastAudio = currentAudioSrc;
  
      playAudio(currentAudioSrc, currentFallback);
  
      const shuffled = LessonCore.shuffle(words).slice(0, 5);
      if (!shuffled.includes(current)) shuffled[Math.floor(Math.random() * shuffled.length)] = current;
      shuffled.forEach(w => {
        const btn = document.createElement('button');
        btn.className = 'btn vocab-choice';
        btn.textContent = w.romaji;
        btn.onclick = () => handleAnswer(w);
        opts.appendChild(btn);
      });
      opts.style.gridTemplateColumns = 'repeat(3, 1fr)';
    }
  
    // --- Answer handler ---
    function handleAnswer(sel) {
      const correct = sel.id === current.id;
      opts.querySelectorAll('button').forEach(b => (b.disabled = true));
      feedback.classList.remove('correct', 'wrong');
      feedback.classList.add(correct ? 'correct' : 'wrong');
      feedback.textContent = correct ? '✅ Correct!' : '❌ Incorrect!';
  
      if (correct) {
        if (!hintUsed) score++;
        updateMeter();
        setTimeout(pickNext, 900);
      } else {
        const exSet = current.examples?.[currentTense] || current.examples?.dictionary || [];
        const ex = exSet[currentExIndex] || exSet[0];
        exampleBox.innerHTML = `
          <p class="ex-jp">${ex.kana}</p>
          <p class="ex-en">${ex.english}</p>
          <button class="btn small mt-2" id="next-btn">Continue →</button>
        `;
        exampleBox.classList.remove('is-hidden');
        $('#next-btn', exampleBox).onclick = () => pickNext();
        playAudio(currentAudioSrc, currentFallback);
      }
    }
  
    // --- Button actions ---
    btnPlay.onclick = () => {
      replayCount++;
      playAudio(currentAudioSrc, currentFallback);
      if (replayCount >= 2 && !hintUsed) hintBtn.classList.remove('is-hidden');
    };
  
    slowToggle.onclick = () => {
      slowMode = !slowMode;
      slowToggle.textContent = slowMode ? '🐢 Slow: On' : '🐢 Slow: Off';
    };
  
    hintBtn.onclick = () => {
      hintUsed = true;
      feedback.textContent = getKanaHint(current);
      hintBtn.classList.add('is-hidden');
    };
  
    finishBtn.onclick = () => (window.location.href = '../index.html');
  
    updateMeter();
    pickNext();
  }

  
  // ======================================================
  // Public API
  // ======================================================
  window.initVocabParts = async function () {
    const qId = document.querySelector('.lesson').dataset.lessonId;
  
    // look up this level in KANA_STAGES
    const levelDef = window.KANA_STAGES.levels.find(l => l.code === qId);
  
    // prefer vocabKey if available
    const roleKey = levelDef?.vocabKey || qId;
  
    const words = await Vocab.getWorldMilestone(roleKey, LEXICON);
  
    window.initPart1 = () => initPart1(words);
    await initPart1(words); // run immediately for Part 1
  
    window.initPart2 = () => initPart2Hunt(roleKey, words);
    window.initPart3 = () => initPart3(words);
    window.initPart4 = () => initPart4(words);
    window.initPart5 = () => initPart5(words);
  };


})();
