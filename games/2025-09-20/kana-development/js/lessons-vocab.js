// ==========================================================
// lessons-vocab.js
// Vocab lesson flow (Parts 1–4: Preview, Identify, Typing, Audio)
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

    // Sidebar
    const listEl = document.createElement('ul');
    listEl.className = 'vocab-list';

    // Detail panel
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

    // Build sidebar items
    words.forEach((w, idx) => {
      const li = document.createElement('li');
      li.textContent = w.kana;
      li.addEventListener('click', () => {
        // remove active from all
        $$('.vocab-list li').forEach(el => el.classList.remove('is-active'));
        li.classList.add('is-active');
        showWord(w);
      });
      if (idx === 0) {
        li.classList.add('is-active'); // first word active
        showWord(w);
      }
      listEl.appendChild(li);
    });

    container.appendChild(listEl);
    container.appendChild(detail);
    part1.appendChild(container);

    // Controls
    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `
      <button class="btn ghost" data-action="prev">← Prev</button>
      <button class="btn ghost" data-action="next">Next →</button>
      <button class="btn primary" data-action="advance">Start Lesson</button>
    `;
    part1.appendChild(actions);

    const items = $$('.vocab-list li', part1);
    let currentIdx = 0;

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

  // ======================================================
  // Part 2 — Identify (English → Kana multiple-choice)
  // ======================================================
  async function initPart2(words) {
    const part2 = $('#part-2');
    if (!part2) return;

    part2.innerHTML = `
      <h2 class="part-title">Identify</h2>
      <div class="quiz-panel">
        <div class="quiz-prompt"><p class="prompt-text">Which word is <strong class="prompt-target"></strong>?</p></div>
        <div class="quiz-options"></div>
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="quiz-feedback"><p class="feedback-text"></p></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;

    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);

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
            if (firstTry) {
              progressPts++;
              updateMeter();
            }
            b.classList.add('is-correct');
            if (progressPts >= GOAL) {
              $('[data-action="next-part"]', part2).classList.remove('is-hidden');
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

    $('[data-action="next-part"]', part2)?.addEventListener('click', () => showPart(3));

    updateMeter();
    nextQuestion();
  }

  // ======================================================
  // Part 3 — Typing (English → Kana input)
  // ======================================================
  async function initPart3(words) {
    const part3 = $('#part-3');
    if (!part3) return;

    part3.innerHTML = `
      <h2 class="part-title">Typing</h2>
      <div class="type-panel">
        <div class="type-glyph-wrapper"></div>
        <input id="type-input" class="type-input" placeholder="Type kana…" autocomplete="off" />
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;

    const wrapper=$('.type-glyph-wrapper',part3);
    const input=$('#type-input',part3);
    const meterFill=$('.meter-fill',part3);
    const meterLabel=$('.meter-label',part3);
    const actionBtn=$('[data-action="next-part"]',part3);

    let progressPts=0, GOAL=words.length*2, current=null;

    function updateMeter(){
      const pct=Math.round((progressPts/GOAL)*100);
      meterFill.style.width=`${pct}%`;
      meterLabel.textContent=`Progress: ${progressPts}/${GOAL}`;
    }

    function newRound(){
      current=words[Math.floor(Math.random()*words.length)];
      wrapper.innerHTML=`<span class="kana-glyph">${current.gloss_en}</span>`;
      input.value='';
    }

    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'){
        if(input.value.trim()===current.kana){
          progressPts++; updateMeter();
          if(progressPts>=GOAL){ actionBtn.classList.remove('is-hidden'); }
          else newRound();
        } else {
          input.value=''; // retry
        }
      }
    });
    actionBtn.addEventListener('click',()=>showPart(4));
    updateMeter(); newRound();
  }

  // ======================================================
  // Part 4 — Audio (Play audio → Romaji/English input)
  // ======================================================
  async function initPart4(words) {
    const part4 = $('#part-4');
    if (!part4) return;

    part4.innerHTML = '<h2 class="part-title">Audio Quiz</h2>';
    const panel=document.createElement('div');
    panel.className='speak-panel';
    panel.innerHTML=`
      <button class="btn primary" id="play-audio">Play Audio</button>
      <input id="audio-answer" class="type-input" placeholder="Type romaji or English…" />
      <div class="actions"><button class="btn primary" data-action="finish-lesson">Finish</button></div>
    `;
    part4.appendChild(panel);

    const btnPlay = $('#play-audio', part4);
    const input = $('#audio-answer', part4);
    const finishBtn = $('[data-action="finish-lesson"]', part4);

    let current = words[Math.floor(Math.random()*words.length)];

    btnPlay.addEventListener('click',()=>{
      if(current.audio){
        new Audio(current.audio).play();
      } else {
        alert("No audio file found for this word yet.");
      }
    });

    finishBtn.addEventListener('click',()=>{ window.location.href='../index.html'; });
  }

  // ======================================================
  // Public API
  // ======================================================
  window.initVocabParts = async function(){
    const roleKey = getRoleKey(WORLD, SUFFIX);
    const words = await Vocab.getWorldMilestone(roleKey);

    await initPart1(words);
    await initPart2(words);
    await initPart3(words);
    await initPart4(words);
  };
})();
