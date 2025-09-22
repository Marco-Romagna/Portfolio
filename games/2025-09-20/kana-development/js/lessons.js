// ==========================================================
// Universal lessons.js
// Handles ALL lessons (1-1 … 2-8 and beyond)
// ==========================================================

(() => {
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const lesson = $('.lesson');
  if (!lesson) return;

  const params = new URLSearchParams(window.location.search);
  const qId = params.get('id') || '1-1';
  lesson.dataset.lessonId = qId;

  const [, suffixStr] = qId.split('-');
  const suffix = Number(suffixStr);
  lesson.dataset.totalParts = (suffix === 4 || suffix === 8) ? 3 : 4;

  const lessonId   = lesson.dataset.lessonId;
  const totalParts = Number(lesson.dataset.totalParts);

  const parts      = $$('.lesson-part');
  const stepsList  = $('.steps');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  const cta = $('.lesson-cta [data-action="advance"]');
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  function showPart(idx) {
    const current = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    $$('.steps .step').forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));
    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
    hideCTA();
  }

  const H_VOW = ['あ','い','う','え','お'];
  const K_VOW = ['ア','イ','ウ','エ','オ'];
  const H_KA  = ['か','き','く','け','こ'];
  const K_KA  = ['カ','キ','ク','ケ','コ'];
  const H_GA  = ['が','ぎ','ぐ','げ','ご'];
  const K_GA  = ['ガ','ギ','グ','ゲ','ゴ'];

  const ROMA = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go'
  };

  const PAIR = {};
  [...H_VOW].forEach((h,i)=>{ PAIR[h] = K_VOW[i]; PAIR[K_VOW[i]] = h; });
  [...H_KA ].forEach((h,i)=>{ PAIR[h] = K_KA [i]; PAIR[K_KA [i]] = h; });
  [...H_GA ].forEach((h,i)=>{ PAIR[h] = K_GA [i]; PAIR[K_GA [i]] = h; });

  const [WORLD, SUFFIX] = (() => {
    const [w, s] = lessonId.split('-');
    return [Number(w), Number(s)];
  })();

  function getWorldSets(world) {
    if (world === 1) return { H_BASE: H_VOW, K_BASE: K_VOW, H_DAKU: [], K_DAKU: [] };
    if (world === 2) return { H_BASE: H_KA, K_BASE: K_KA, H_DAKU: H_GA, K_DAKU: K_GA };
    return { H_BASE: [], K_BASE: [], H_DAKU: [], K_DAKU: [] };
  }

  const { H_BASE, K_BASE, H_DAKU, K_DAKU } = getWorldSets(WORLD);

  const ROLE = (() => {
    const map = {1:'hira-base',2:'kata-base',3:'mixed-base',4:'type-base',5:'hira-daku',6:'kata-daku',7:'mixed-daku',8:'type-daku'};
    return map[SUFFIX] || 'hira-base';
  })();

  let KANA = [];
  let MIXED_TYPE = false;
  let IS_TYPING_ONLY = false;
  if (ROLE === 'hira-base')         KANA = [...H_BASE];
  else if (ROLE === 'kata-base')    KANA = [...K_BASE];
  else if (ROLE === 'mixed-base') { KANA = [...H_BASE, ...K_BASE]; MIXED_TYPE = true; }
  else if (ROLE === 'type-base')  { KANA = [...H_BASE, ...K_BASE]; IS_TYPING_ONLY = true; }
  else if (ROLE === 'hira-daku')    KANA = [...H_DAKU];
  else if (ROLE === 'kata-daku')    KANA = [...K_DAKU];
  else if (ROLE === 'mixed-daku') { KANA = [...H_DAKU, ...K_DAKU]; MIXED_TYPE = true; }
  else if (ROLE === 'type-daku')  { KANA = [...H_DAKU, ...K_DAKU]; IS_TYPING_ONLY = true; }

  const GOAL_IDENT = (MIXED_TYPE || IS_TYPING_ONLY) ? 20 : 15;
  const GOAL_TYPE  = (MIXED_TYPE || IS_TYPING_ONLY) ? 20 : 15;
  const COMBO_LAST = (MIXED_TYPE || IS_TYPING_ONLY) ? 10 : 5;

  const WORLD1_COMBO_RULES = (WORLD === 1);
  const REQUIRE_MIXED_SCRIPTS_IN_COMBO = (WORLD === 1 && SUFFIX === 3);

  (function initSteps() {
    if (!stepsList) return;
    stepsList.innerHTML = '';
    const labels = IS_TYPING_ONLY ? ['Preview','Typing','Finish'] : ['Preview','Identify','Typing','Speak'];
    labels.forEach((label, idx) => {
      const li = document.createElement('li');
      li.className = `step ${idx===0 ? 'is-active' : ''}`;
      li.dataset.part = (idx+1);
      li.innerHTML = `<span class="step-label">Part ${idx+1}</span><span class="step-sub">${label}</span>`;
      stepsList.appendChild(li);
    });
  })();

  (function initPart1() {
    const part1 = $('#part-1');
    if (!part1) return;
    part1.innerHTML = '';

    const title = document.createElement('h2');
    title.className = 'part-title';
    part1.appendChild(title);

    if (SUFFIX === 3 || SUFFIX === 7) {
      title.textContent = 'Preview — Script Pairs';
      const grid = document.createElement('div');
      grid.className = 'kana-grid';
      part1.appendChild(grid);
      const hiraganaPool = KANA.filter(g => /[\u3040-\u309F]/.test(g));
      const pairs = hiraganaPool.map(h => ({ h, k: PAIR[h], r: ROMA[h] })).filter(p => !!p.k);
      pairs.forEach(p => {
        const card = document.createElement('article');
        card.className = 'pair-card';
        card.innerHTML = `
          <div class="pair-row"><span class="glyph h">${p.h}</span><span class="link">⇄</span><span class="glyph k">${p.k}</span></div>
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
    actions.innerHTML = `<button class="btn primary" data-action="advance">Start</button>`;
    part1.appendChild(actions);
    actions.querySelector('[data-action="advance"]')?.addEventListener('click', () => showPart(2));
  })();

  (function initPart2() {
    const part2 = $('#part-2');
    if (!part2) return;

    if (IS_TYPING_ONLY) { initTyping(part2, GOAL_TYPE, true); return; }

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
    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];
    const unseen  = new Set(KANA);
    let lastPromptGlyph = null;
    let prevOptionAtIndex = [null, null, null, null];
    let roundLocked = false;

    function sample(arr,n){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a.slice(0,n);}
    function setFeedback(t){if(feedback)feedback.textContent=t;}
    function updateMeter(){const pct=Math.round((progressPts/GOAL)*100);if(meterFill)meterFill.style.width=`${pct}%`;if(meterLabel)meterLabel.textContent=`Progress: ${progressPts} / ${GOAL}`;}

    function arrangeOptionsNoSlotRepeat(opts){for(let t=0;t<60;t++){const perm=sample(opts,opts.length);let ok=true;for(let i=0;i<perm.length;i++){if(prevOptionAtIndex[i]===perm[i]){ok=false;break;}}if(ok)return perm;}return opts;}

    function pickPromptGlyph(){if(unseen.size>0){let c=Array.from(unseen);if(c.length>1)c=c.filter(k=>k!==lastPromptGlyph);return c[Math.floor(Math.random()*c.length)];}return KANA[Math.floor(Math.random()*KANA.length)];}

    function nextQuestion(){
      roundLocked=false;grid.innerHTML='';
      const promptGlyph=pickPromptGlyph();lastPromptGlyph=promptGlyph;
      if(MIXED_TYPE){const isH=/[\u3040-\u309F]/.test(promptGlyph);const otherLabel=isH?'katakana':'hiragana';promptText.innerHTML=`Which <strong>${otherLabel}</strong> matches <strong class="prompt-target">“${promptGlyph}”</strong>?`;}
      else{promptEl.dataset.type='romaji';promptEl.textContent=`“${ROMA[promptGlyph]}”`;}
      let options=[];if(MIXED_TYPE){const correct=PAIR[promptGlyph];const pool=/[\u3040-\u309F]/.test(promptGlyph)?KANA.filter(g=>/[\u30A0-\u30FF]/.test(g)):KANA.filter(g=>/[\u3040-\u309F]/.test(g));options=[correct,...sample(pool.filter(g=>g!==correct),3)];}else{const correct=promptGlyph;options=[correct,...sample(KANA.filter(k=>k!==correct),3)];}
      const ordered=arrangeOptionsNoSlotRepeat(options);const shuffledThemes=[...THEMES].sort(()=>Math.random()-.5);
      ordered.forEach((glyph,i)=>{const b=document.createElement('button');b.className=`option ${shuffledThemes[i%shuffledThemes.length]}`;b.dataset.value=glyph;b.textContent=glyph;b.addEventListener('click',()=>onPick(glyph,promptGlyph,b));grid.appendChild(b);});
      prevOptionAtIndex=ordered.slice();setFeedback('Pick the right one to continue…');
    }

    function onPick(choice,promptGlyph,btn){
      if(roundLocked)return;roundLocked=true;const all=$$('.option',part2);all.forEach(b=>{b.disabled=true;});
      const correct=MIXED_TYPE?(choice===PAIR[promptGlyph]):(choice===promptGlyph);
      if(correct){btn.classList.add('is-correct');progressPts=Math.min(GOAL,progressPts+1);unseen.delete(promptGlyph);setFeedback('Nice! That’s correct.');updateMeter();setTimeout(()=>{if(progressPts>=GOAL){$('[data-action="next-part"]',part2)?.classList.remove('is-hidden');setFeedback('Part complete!');}else nextQuestion();},320);}
      else{btn.classList.add('is-wrong');progressPts=Math.max(0,progressPts-1);setFeedback('Wrong, try again.');updateMeter();setTimeout(()=>nextQuestion(),420);}
    }

    $('[data-action="next-part"]', part2)?.addEventListener('click', () => showPart(3));
    updateMeter();nextQuestion();
  })();

  (function initPart3(){
    if(IS_TYPING_ONLY)return;
    const part3=$('#part-3');if(!part3)return;
    part3.innerHTML = `
      <h2 class="part-title">Typing</h2>
      <div class="type-panel">
        <div class="type-glyph-wrapper"></div>
        <input id="type-input" class="type-input" placeholder="Type romaji…" autocomplete="off" />
        <div class="quiz-progress"><div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div></div>
        <div class="actions"><button class="btn primary is-hidden" data-action="next-part">Next</button></div>
      </div>
    `;
    initTyping(part3,GOAL_TYPE,false);
  })();

  (function initPart4(){
    const part4=$('#part-4');if(!part4)return;
    part4.innerHTML = '';
    const panel=document.createElement('div');
    panel.className='speak-panel';
    panel.innerHTML=`<div class="kana-glyph speak-glyph">${KANA[0]||'あ'}</div><p class="muted">Speaking practice is in progress.</p><button class="btn primary" data-action="finish-lesson">Finish</button>`;
    part4.appendChild(panel);
    panel.querySelector('[data-action="finish-lesson"]')?.addEventListener('click',()=>{window.location.href='../index.html';});
  })();

  function initTyping(scopeEl,GOAL,isPart2){
    const panel = $('.type-panel', scopeEl) || scopeEl;
    let wrapper=$('.type-glyph-wrapper',panel);
    if(!wrapper){wrapper=document.createElement('div');wrapper.className='type-glyph-wrapper';panel.appendChild(wrapper);}
    let input=$('#type-input',panel);
    if(!input){input=document.createElement('input');input.id='type-input';input.className='type-input';input.setAttribute('autocomplete','off');input.setAttribute('placeholder','Type romaji…');panel.appendChild(input);}
    let progressWrap=$('.quiz-progress',panel);
    if(!progressWrap){progressWrap=document.createElement('div');progressWrap.className='quiz-progress';progressWrap.innerHTML='<div class="meter"><div class="meter-fill"></div></div><div class="meter-label"></div>';panel.appendChild(progressWrap);}
    const meterFill=$('.quiz-progress .meter-fill',panel);
    const meterLabel=$('.quiz-progress .meter-label',panel);
    let actionBtn=$('[data-action="next-part"]',panel);
    if(!actionBtn){const actions=document.createElement('div');actions.className='actions';actionBtn=document.createElement('button');actionBtn.className='btn primary is-hidden';actionBtn.dataset.action='next-part';actionBtn.textContent='Next';actions.appendChild(actionBtn);panel.appendChild(actions);} else {actionBtn.classList.add('is-hidden');}

    const THEMES=['theme-dark','theme-light','theme-sepia','theme-high'];
    const unseen=new Set(KANA);
    const COMBO_THRESHOLD=GOAL-COMBO_LAST;
    let progressPts=0;
    let lastKana=null;
    let comboActive=false;
    let comboSeq=[];
    let comboIdx=0;
    let lastComboKey=null;

    function updateMeter(){const pct=Math.round((progressPts/GOAL)*100);if(meterFill)meterFill.style.width=`${pct}%`;if(meterLabel)meterLabel.textContent=`Progress: ${progressPts} / ${GOAL}`;}
    function setThemeRandom(){wrapper.classList.remove(...THEMES);wrapper.classList.add(THEMES[Math.floor(Math.random()*THEMES.length)]);}
    function pickNextKana(){const unseenArr=Array.from(unseen);if(unseenArr.length){let c=unseenArr;if(c.length>1)c=c.filter(k=>k!==lastKana);return c[Math.floor(Math.random()*c.length)];}return KANA[Math.floor(Math.random()*KANA.length)];}
    function makeCombo(){
      for(let attempt=0;attempt<80;attempt++){
        const seq=[pickNextKana(),pickNextKana(),pickNextKana()];
        if(WORLD1_COMBO_RULES&&new Set(seq).size!==3)continue;
        if(REQUIRE_MIXED_SCRIPTS_IN_COMBO){
          const hasH=seq.some(g=>/[\u3040-\u309F]/.test(g));
          const hasK=seq.some(g=>/[\u30A0-\u30FF]/.test(g));
          if(!(hasH&&hasK))continue;
        }
        const key=seq.join('');
        if(key!==lastComboKey)return{seq,key};
      }
      return{seq:[pickNextKana(),pickNextKana(),pickNextKana()],key:'fallback'};
    }
    function renderGlyph(k){wrapper.innerHTML=`<span class="kana-glyph type-glyph" data-current-kana="${k}">${k}</span>`;}
    function renderComboDisplay(){wrapper.innerHTML=comboSeq.map(k=>`<span class="kana-glyph type-glyph">${k}</span>`).join(' ');}
    function newRound(){
      if(progressPts>=COMBO_THRESHOLD){
        const {seq,key}=makeCombo();comboSeq=seq;comboIdx=0;lastComboKey=key;comboActive=true;setThemeRandom();renderComboDisplay();
      }else{
        comboActive=false;const k=pickNextKana();setThemeRandom();renderGlyph(k);lastKana=k;
      }
      input.value='';input.focus();
    }
    function evaluate(){
      const val=input.value.trim().toLowerCase();if(!val)return;
      if(!comboActive){
        const kana=wrapper.querySelector('.type-glyph')?.getAttribute('data-current-kana') || '';
        const expected=ROMA[kana];
        if(val===expected){
          progressPts=Math.min(GOAL,progressPts+1);unseen.delete(kana);updateMeter();
          if(progressPts>=GOAL){actionBtn.classList.remove('is-hidden');} else {newRound();}
        }else{
          progressPts=Math.max(0,progressPts-1);updateMeter();newRound();
        }
      }else{
        const expectedAll=comboSeq.map(k=>ROMA[k]).join('');
        if(val===expectedAll){
          progressPts=Math.min(GOAL,progressPts+1);comboSeq.forEach(k=>unseen.delete(k));updateMeter();
          if(progressPts>=GOAL){actionBtn.classList.remove('is-hidden');} else {newRound();}
        }else{
          progressPts=Math.max(0,progressPts-1);updateMeter();newRound();
        }
      }
    }
    input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();evaluate();}});
    actionBtn?.addEventListener('click',()=>{if(isPart2)showPart(3);else showPart(4);});
    updateMeter();newRound();
  }

  showPart(1);
})();
