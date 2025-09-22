// ==========================================================
// lessons-kana.js
// Kana lesson flow (Parts 1–4 + typing engine)
// ==========================================================

(() => {
  const {
    $, $$,
    SUFFIX, ROLE, KANA, ROMA, PAIR,
    GOAL_IDENT, GOAL_TYPE, COMBO_LAST,
    IS_TYPING_ONLY, MIXED_TYPE,
    showPart
  } = window.LessonCore;

  // Helpers
  const isHira = ch => /[\u3040-\u309F]/.test(ch);
  const isKata = ch => /[\u30A0-\u30FF]/.test(ch);
  const sameSound = (a,b) => ROMA[a] && ROMA[a] === ROMA[b];
  const differentScript = (a,b) => (isHira(a) && isKata(b)) || (isKata(a) && isHira(b));

  function pickAvoidRepeat(pool, last) {
    const avail = pool.length > 1 ? pool.filter(g => g !== last) : pool.slice();
    const src = avail.length ? avail : pool;
    return src[Math.floor(Math.random()*src.length)];
  }

  // Theme classes
  const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ======================================================
  // Part 1 — Preview
  // ======================================================
  function initPart1() {
    const part1 = $('#part-1');
    if (!part1) return;
    part1.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'part-title';
    part1.appendChild(title);

    // -3/-7 → pair cards; others → single-script
    if (SUFFIX === 3 || SUFFIX === 7) {
      title.textContent = 'Preview — Script Pairs';
      const grid = document.createElement('div');
      grid.className = 'kana-grid';
      part1.appendChild(grid);

      const hiraganaPool = KANA.filter(g => isHira(g));
      const pairs = hiraganaPool.map(h => ({ h, k: PAIR[h], r: ROMA[h] })).filter(p => !!p.k);

      pairs.forEach(p => {
        const card = document.createElement('article');
        card.className = 'pair-card';
        card.innerHTML = `
          <div class="pair-row">
            <span class="glyph h">${p.h}</span>
            <span class="link">⇄</span>
            <span class="glyph k">${p.k}</span>
          </div>
          <div class="pair-romaji">${p.r}</div>
        `;
        grid.appendChild(card);
      });
    } else {
      title.textContent = 'Preview';
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
        grid.appendChild(card);
      });
    }

    const actions = document.createElement('div');
    actions.className = 'actions';
    actions.innerHTML = `<button class="btn primary" data-action="advance">${(SUFFIX === 4 || SUFFIX === 8) ? 'Start Typing' : 'Start'}</button>`;
    part1.appendChild(actions);
    actions.querySelector('[data-action="advance"]')?.addEventListener('click', () => showPart(2));
  }

  // ======================================================
  // Part 2 — Identify
  // ======================================================
  function initPart2() {
    const part2 = $('#part-2');
    if (!part2 || IS_TYPING_ONLY) return;

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

    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const promptText = $('.prompt-text', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);

    const GOAL = GOAL_IDENT;
    let progressPts = 0;
    const unseen  = new Set(KANA);
    let lastPromptGlyph = null;
    let prevOptionAtIndex = [null, null, null, null];
    let roundLocked = false;

    function sample(arr,n){return shuffle(arr).slice(0,n);}
    function setFeedback(t){if(feedback)feedback.textContent=t;}
    function updateMeter(){const pct=Math.round((progressPts/GOAL)*100);if(meterFill)meterFill.style.width=`${pct}%`;if(meterLabel)meterLabel.textContent=`Progress: ${progressPts} / ${GOAL}`;}

    function arrangeOptionsNoSlotRepeat(opts){
      for(let t=0;t<60;t++){
        const perm=sample(opts,opts.length);
        let ok=true;
        for(let i=0;i<perm.length;i++){ if(prevOptionAtIndex[i]===perm[i]){ ok=false; break; } }
        if(ok) return perm;
      }
      return opts;
    }

    function pickPromptGlyph(){
      const basePool = (unseen.size > 0) ? Array.from(unseen) : [...KANA];
      let pool = basePool.filter(k => k !== lastPromptGlyph);
      if (pool.length === 0 && KANA.length > 1) pool = KANA.filter(k => k !== lastPromptGlyph);
      if (pool.length === 0) pool = basePool;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function nextQuestion(){
      roundLocked=false;grid.innerHTML='';
      const promptGlyph=pickPromptGlyph();lastPromptGlyph=promptGlyph;

      if(MIXED_TYPE){
        const isH=isHira(promptGlyph);
        const otherLabel=isH?'katakana':'hiragana';
        promptText.innerHTML=`Which <strong>${otherLabel}</strong> matches <strong class="prompt-target">“${promptGlyph}”</strong>?`;
      } else {
        promptEl.dataset.type='romaji';
        promptEl.textContent=`“${ROMA[promptGlyph]}”`;
      }

      let options=[];
      if(MIXED_TYPE){
        const correct=PAIR[promptGlyph];
        const pool=isHira(promptGlyph)
          ? KANA.filter(g=>isKata(g))
          : KANA.filter(g=>isHira(g));
        options=[correct,...sample(pool.filter(g=>g!==correct),3)];
      } else {
        const correct=promptGlyph;
        options=[correct,...sample(KANA.filter(k=>k!==correct),3)];
      }

      const ordered=arrangeOptionsNoSlotRepeat(options);

      // Fixed theme order: dark, light, sepia, high
      const themes = THEMES.slice(0, ordered.length);

      ordered.forEach((glyph,i)=>{
        const b=document.createElement('button');
        b.className=`option ${themes[i]}`;  // 👈 fixed per slot
        b.dataset.value=glyph;
        b.textContent=glyph;
        b.addEventListener('click',()=>onPick(glyph,promptGlyph,b));
        grid.appendChild(b);
      });

      prevOptionAtIndex=ordered.slice();
      setFeedback('Pick the right one to continue…');
    }

    function onPick(choice,promptGlyph,btn){
      if(roundLocked) return;
      roundLocked=true;
      const all=$$('.option',part2);
      all.forEach(b=>{ b.disabled=true; });

      const correct=MIXED_TYPE?(choice===PAIR[promptGlyph]):(choice===promptGlyph);
      if(correct){
        btn.classList.add('is-correct');
        progressPts=Math.min(GOAL,progressPts+1);
        unseen.delete(promptGlyph);
        setFeedback('Nice! That’s correct.');
        updateMeter();
        setTimeout(()=>{
          if(progressPts>=GOAL){
            $('[data-action="next-part"]',part2)?.classList.remove('is-hidden');
            setFeedback('Part complete!');
          } else {
            nextQuestion();
          }
        },320);
      } else {
        btn.classList.add('is-wrong');
        progressPts=Math.max(0,progressPts-1);
        setFeedback('Wrong, try again.');
        updateMeter();
        setTimeout(()=>nextQuestion(),420);
      }
    }

    $('[data-action="next-part"]', part2)?.addEventListener('click', () => showPart(3));
    updateMeter(); nextQuestion();
  }

  // ======================================================
  // Part 3 — Typing
  // ======================================================
  function initPart3(){
    if(IS_TYPING_ONLY) return;
    const part3=$('#part-3'); if(!part3) return;

    part3.innerHTML = `
      <h2 class="part-title">Typing</h2>
      <div class="type-panel">
        <div class="type-glyph-wrapper"></div>
        <input id="type-input" class="type-input" placeholder="Type romaji…" autocomplete="off" />
        <div class="quiz-progress">
          <div class="meter"><div class="meter-fill"></div></div>
          <div class="meter-label"></div>
        </div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;
    initTyping(part3, GOAL_TYPE, false);
  }

  // ======================================================
  // Part 4 — Speak (placeholder)
  // ======================================================
  function initPart4(){
    const part4=$('#part-4'); if(!part4) return;
    part4.innerHTML = '';
    const panel=document.createElement('div');
    panel.className='speak-panel';
    panel.innerHTML=`
      <div class="kana-glyph speak-glyph">${KANA[0]||'あ'}</div>
      <p class="muted">Speaking practice is in progress.</p>
      <button class="btn primary" data-action="finish-lesson">Finish</button>
    `;
    part4.appendChild(panel);
    panel.querySelector('[data-action="finish-lesson"]')?.addEventListener('click',()=>{ window.location.href='../index.html'; });
  }

  // ======================================================
  // Typing Engine (shared)
  // ======================================================
  function initTyping(scopeEl,GOAL,isPart2){
    const wrapper=$('.type-glyph-wrapper',scopeEl);
    const input=$('#type-input',scopeEl);
    const meterFill=$('.quiz-progress .meter-fill',scopeEl);
    const meterLabel=$('.quiz-progress .meter-label',scopeEl);
    const actionBtn=$('[data-action="next-part"]',scopeEl);

    const THEMES=['theme-dark','theme-light','theme-sepia','theme-high'];
    const unseen=new Set(KANA);
    const COMBO_THRESHOLD=GOAL-COMBO_LAST;

    let progressPts=0;
    let lastKana=null;
    let comboActive=false;
    let comboSeq=[];
    let lastComboSeq=null;
    let lastComboKey=null;

    function updateMeter(){
      const pct=Math.round((progressPts/GOAL)*100);
      if(meterFill)  meterFill.style.width=`${pct}%`;
      if(meterLabel) meterLabel.textContent=`Progress: ${progressPts} / ${GOAL}`;
    }
    function setThemeRandom(){
      wrapper.classList.remove(...THEMES);
      wrapper.classList.add(THEMES[Math.floor(Math.random()*THEMES.length)]);
    }
    function pickNextKana(){
      const basePool = (unseen.size > 0) ? Array.from(unseen) : [...KANA];
      let pool = basePool.filter(k => k !== lastKana);
      if (pool.length === 0 && KANA.length > 1) pool = KANA.filter(k => k !== lastKana);
      if (pool.length === 0) pool = basePool;
      return pool[Math.floor(Math.random() * pool.length)];
    }

    function makeCombo(){
      for(let attempt=0;attempt<120;attempt++){
        const a = pickAvoidRepeat(KANA, lastKana);
        const b = pickAvoidRepeat(KANA.filter(x=>x!==a), null);
        const c = pickAvoidRepeat(KANA.filter(x=>x!==a && x!==b), null);
        const seq=[a,b,c];

        if(new Set(seq).size !== 3) continue;
        if(lastComboSeq){
          let violatesPos=false;
          for(let i=0;i<3;i++){
            if(sameSound(seq[i], lastComboSeq[i]) && !(MIXED_TYPE && differentScript(seq[i], lastComboSeq[i]))){
              violatesPos=true; break;
            }
          }
          if(violatesPos) continue;
        }
        const key=seq.join('');
        if(key===lastComboKey) continue;
        return {seq,key};
      }
      const pool = KANA.slice();
      const a = pickAvoidRepeat(pool, lastKana);
      const b = pickAvoidRepeat(pool.filter(x=>x!==a), null);
      const c = pickAvoidRepeat(pool.filter(x=>x!==a && x!==b), null);
      return {seq:[a,b,c], key:'fallback'};
    }

    function renderGlyph(k){ wrapper.innerHTML=`<span class="kana-glyph type-glyph" data-current-kana="${k}">${k}</span>`; }
    function renderComboDisplay(){ wrapper.innerHTML=comboSeq.map(k=>`<span class="kana-glyph type-glyph">${k}</span>`).join(''); }

    function newRound(){
      if(progressPts>=COMBO_THRESHOLD){
        const {seq,key}=makeCombo();
        comboSeq=seq; lastComboSeq=seq.slice(); lastComboKey=key;
        comboActive=true; setThemeRandom(); renderComboDisplay();
      }else{
        comboActive=false;
        const k=pickNextKana();
        setThemeRandom(); renderGlyph(k); lastKana=k;
      }
      input.value=''; input.focus();
    }

    function evaluate(){
      const val=input.value.trim().toLowerCase();
      if(!val) return;

      if(!comboActive){
        const kana=wrapper.querySelector('.type-glyph')?.getAttribute('data-current-kana') || '';
        const expected=ROMA[kana];
        if(val===expected){
          progressPts=Math.min(GOAL,progressPts+1);
          unseen.delete(kana);
          updateMeter();
          if(progressPts>=GOAL){ actionBtn.classList.remove('is-hidden'); }
          else { newRound(); }
        }else{
          progressPts=Math.max(0,progressPts-1);
          updateMeter();
          newRound();
        }
        lastKana=kana;
      }else{
        const expectedAll=comboSeq.map(k=>ROMA[k]).join('');
        if(val===expectedAll){
          progressPts=Math.min(GOAL,progressPts+1);
          comboSeq.forEach(k=>unseen.delete(k));
          updateMeter();
          if(progressPts>=GOAL){ actionBtn.classList.remove('is-hidden'); }
          else { newRound(); }
        }else{
          progressPts=Math.max(0,progressPts-1);
          updateMeter();
          newRound();
        }
      }
    }

    input.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); evaluate(); } });
    actionBtn?.addEventListener('click',()=>{ if(isPart2) showPart(3); else showPart(4); });

    updateMeter(); newRound();
  }

  // ======================================================
  // Public API
  // ======================================================
  window.initKanaParts = function(){
    initPart1();
    initPart2();
    initPart3();
    initPart4();
  };
})();
