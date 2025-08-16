// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  // --- Config ---
  const ROWS = 6, COLS = 5;
  const CELLS = ROWS * COLS;
  const OCC_MIN = 0.58, OCC_MAX = 0.69;
  const COUNT_DELAY = 500;
  const TARGETS_TO_COMPLETE = 12;

  const BASIC   = ["circle","square","triangle"];
  const SUITS   = ["club","heart","diamond","spade"];
  const SPECIAL = ["star","moon","bolt","shield"];
  const GUARANTEED = {
    club:1, heart:1, diamond:1, spade:1,
    star:1, moon:1,
    bolt:2, shield:2
  };
  // Favor basics for filler
  const WEIGHTS = {
    circle:6, square:6, triangle:6,
    bolt:0.5, shield:0.5,
    club:0.25, heart:0.25, diamond:0.25, spade:0.25,
    star:0, moon:0
  };

  // Only shield is non-target; bolt IS a valid target now
  const NON_TARGET = new Set(["shield"]);

  // --- Elements ---
  const board     = document.getElementById("game-board");
  const cdEl      = document.getElementById("countdown");
  const targetEl  = document.getElementById("target");
  const livesEl   = document.getElementById("lives");
  const bestEl    = document.getElementById("best");
  const avgEl     = document.getElementById("avg");
  const worstEl   = document.getElementById("worst");
  const totalEl   = document.getElementById("total");
  const logEl     = document.getElementById("log");
  const btnStart  = document.getElementById("start");
  const btnReset  = document.getElementById("reset");
  const preview   = document.getElementById("targetPreview");
  const sideStats = document.querySelector(".side .stats");

  // Modal
  const modal   = document.getElementById("resultsModal");
  const mBest   = document.getElementById("m-best");
  const mAvg    = document.getElementById("m-avg");
  const mWorst  = document.getElementById("m-worst");
  const mTotal  = document.getElementById("m-total");
  const mSplits = document.getElementById("m-splits");
  const btnClose= document.getElementById("closeModal");
  const btnAgain= document.getElementById("playAgain");

  // --- State ---
  let occupancy = 0.62;
  let lives = 3;
  let playing = false;

  let cells = [];                      // DOM cells
  let shapes = new Array(CELLS).fill(""); // shape id or ""
  let targetShape = null;

  // Targets used this round (no repeat shape)
  let usedTargets = new Set();

  // Splits
  let startedAt = 0;
  let lastSplitAt = 0;
  let clickSplits = [];     // numbers
  let splitDetails = [];    // { idx,row,col,split,total,shape }

  // Lock & hints
  // lock / nextLock := { type:'row'|'col', idx:number }
  let lock = null;
  let nextLock = null;

  // “Forbid next target” (from star/moon & suits)
  let forbidNext = new Set();

  // Timers
  let countdownTimer = null, revealTimer = null;

  // --- Utils ---
  const ms = x => `${Math.round(x)} ms`;
  const rowOf = i => Math.floor(i / COLS);
  const colOf = i => i % COLS;
  const lockLabel = lk => lk ? (lk.type === 'row' ? `row ${lk.idx+1}` : `column ${lk.idx+1}`) : '';

  function log(msg){ if (!logEl) return; const d=document.createElement("div"); d.textContent=msg; logEl.prepend(d); }
  function clearTimers(){ if (countdownTimer){clearInterval(countdownTimer);countdownTimer=null;} if (revealTimer){clearTimeout(revealTimer);revealTimer=null;} }
  function resetStatsUI(){ bestEl.textContent=avgEl.textContent=worstEl.textContent=totalEl.textContent="—"; }

  function glyphFor(shape){
    switch (shape){
      case "club": return "♣";
      case "heart": return "♥";
      case "diamond": return "♦";
      case "spade": return "♠";
      case "star": return "★";
      case "moon": return "☾";
      case "bolt": return "⚡";
      case "shield": return "🛡";
      default: return null;
    }
  }

  function setPreview(shape){
    if (!preview) return;
    preview.innerHTML = "";
    if (!shape) return;
    const ch = glyphFor(shape);
    if (ch){
      const span=document.createElement("span");
      span.className=`glyph ${shape}`;
      span.textContent=ch;
      preview.appendChild(span);
    } else {
      const el=document.createElement("div");
      el.className=(shape==="triangle")?"shape triangle big":`shape ${shape} big`;
      preview.appendChild(el);
    }
  }

  function setTarget(shape){
    targetShape = shape;
    targetEl.innerHTML = "";
    if (!shape){ targetEl.textContent="—"; setPreview(null); return; }
    const ch = glyphFor(shape);
    if (ch){
      const span=document.createElement("span");
      span.className=`glyph ${shape}`;
      span.textContent=ch;
      targetEl.appendChild(span);
    } else {
      targetEl.textContent=shape;
    }
    setPreview(shape);
  }

  function randomOccupancy(){ return OCC_MIN + Math.random()*(OCC_MAX - OCC_MIN); }
  function weightedPick(){
    const entries = Object.entries(WEIGHTS).filter(([,w])=>w>0);
    const total = entries.reduce((s,[,w])=>s+w,0);
    let r = Math.random()*total;
    for (const [k,w] of entries){ if (r < w) return k; r -= w; }
    return "circle";
  }

  function clearHints(){
    cells.forEach(c => c.classList.remove('hint-pulse','hint-dim','hint-bolt'));
  }

  function coverageIndicesFor(lk){
    const out=[];
    for (let i=0;i<CELLS;i++){
      if (lk.type==='row' && rowOf(i)===lk.idx) out.push(i);
      if (lk.type==='col' && colOf(i)===lk.idx) out.push(i);
    }
    return out;
  }
  function applyLock(lk){
    cells.forEach(c => c.classList.remove('locked'));
    lock = lk;
    coverageIndicesFor(lock).forEach(i => cells[i].classList.add('locked'));
  }
  function planNextLock(){
    // Try to avoid covering remaining target tiles, if possible
    const avoid=[];
    for (let i=0;i<CELLS;i++){
      if (shapes[i]===targetShape && !cells[i].classList.contains('correct')) avoid.push(i);
    }
    const tried=new Set();
    for (let attempts=0; attempts<100; attempts++){
      const type = Math.random()<0.5 ? 'row':'col';
      const idx  = (type==='row') ? Math.floor(Math.random()*ROWS) : Math.floor(Math.random()*COLS);
      const key = `${type}:${idx}`; if (tried.has(key)) continue; tried.add(key);
      const covers = coverageIndicesFor({type,idx});
      if (!avoid.some(v => covers.includes(v))){ nextLock = {type,idx}; return; }
    }
    nextLock = { type:'row', idx:0 };
  }
  function moveLock(reason){
    if (!nextLock) planNextLock();
    clearHints();                    // remove all purple/yellow hints
    applyLock(nextLock);             // promote next → current
    planNextLock();                  // compute new “next”
    log(`Lock moved (${reason}) → ${lockLabel(lock)}`);
  }

  function buildGrid(){
    board.innerHTML="";
    board.style.gridTemplateColumns = `repeat(${COLS},1fr)`;
    cells=[];
    for (let i=0;i<CELLS;i++){
      const cell=document.createElement("div");
      cell.className="cell";
      cell.addEventListener("click",()=>handleClick(i));
      cells.push(cell);
      board.appendChild(cell);
    }
  }

  function renderCell(i){
    const cell=cells[i];
    cell.innerHTML="";
    const s=shapes[i];
    if (!s) return;
    if (s==="circle"||s==="square"||s==="triangle"){
      if (s==="triangle"){ const el=document.createElement("div"); el.className="shape triangle"; cell.appendChild(el); return; }
      const el=document.createElement("div"); el.className=`shape ${s}`; cell.appendChild(el); return;
    }
    const ch=glyphFor(s);
    if (ch){
      const span=document.createElement("span");
      span.className=`glyph ${s}`;
      span.textContent=ch;
      cell.appendChild(span);
      return;
    }
    const el=document.createElement("div"); el.className="shape square"; cell.appendChild(el);
  }

  function populateBoard(){
    occupancy = randomOccupancy();
    const fillCount = Math.round(CELLS*occupancy);
    shapes.fill("");

    const idxs=[...Array(CELLS).keys()].sort(()=>Math.random()-0.5);

    // place guarantees
    const needed=[];
    for (const [k,c] of Object.entries(GUARANTEED)) for (let t=0;t<c;t++) needed.push(k);
    const filled=[];
    for (let g=0; g<needed.length && idxs.length; g++){
      const i=idxs.pop();
      shapes[i]=needed[g];
      filled.push(i);
    }
    // fill with weighted
    while (filled.length<fillCount && idxs.length){
      const i=idxs.pop();
      shapes[i]=weightedPick();
      filled.push(i);
    }
    for (let i=0;i<CELLS;i++) renderCell(i);
  }

  // --- Availability-aware target picking ---
  function availableCount(shape){
    let n=0;
    for (let i=0;i<CELLS;i++){
      if (shapes[i]===shape && !cells[i].classList.contains('correct')) n++;
    }
    return n;
  }

  function chooseTargetFrom(presentShapes, banSet){
    // Start: remove non-targets, banned, and already used
    let pool = presentShapes.filter(s => !NON_TARGET.has(s) && !banSet.has(s) && !usedTargets.has(s));
    // Keep only shapes that still have clickable instances
    pool = pool.filter(s => availableCount(s) > 0);
    if (!pool.length) return null;

    // Prefer shapes with >= 2 available instances
    const avail2 = pool.filter(s => availableCount(s) >= 2);
    const finalPool = avail2.length ? avail2 : pool;

    return finalPool[Math.floor(Math.random()*finalPool.length)];
  }

  function computeForbidNext(lastShape){
    const ban=new Set();
    if (lastShape==="star") ban.add("moon");
    if (lastShape==="moon") ban.add("star");
    if (SUITS.includes(lastShape)){
      for (const s of SUITS) if (s!==lastShape) ban.add(s);
    }
    return ban;
  }

  function respawnShapeAt(i){
    // For non-shield respawns; never blank the tile
    shapes[i]=weightedPick();
    renderCell(i);
  }

  function lightningPreviewNext(){
    if (!nextLock) return;
    const covers=coverageIndicesFor(nextLock);
    covers.forEach(i => {
      const c=cells[i];
      c.classList.remove('hint-dim');
      c.classList.add('hint-pulse'); // purple
    });
  }
  function lightningPreviewNextNextYellow(){
    // After a lock move, nextLock has already been planned => preview “next-next” as yellow
    if (!nextLock) return;
    const covers=coverageIndicesFor(nextLock);
    covers.forEach(i => {
      const c=cells[i];
      c.classList.remove('hint-dim','hint-pulse');
      c.classList.add('hint-bolt'); // yellow pulse (CSS required)
    });
  }

  // --- Flow ---
  function startRound(){
    clearTimers();
    playing=false;
    lives=3;
    usedTargets.clear();
    forbidNext.clear();
    targetShape=null;
    clickSplits.length=0;
    splitDetails.length=0;
    startedAt=0; lastSplitAt=0;

    if (sideStats) sideStats.style.display='none';
    resetStatsUI();
    logEl.textContent="";

    cdEl.textContent="3";
    setTarget(null);
    livesEl.textContent=lives;

    buildGrid();
    populateBoard();

    cells.forEach(c => c.classList.remove('locked','hint-pulse','hint-dim','hint-bolt','correct','pulse-wrong'));
    lock=null; nextLock=null;

    let n=3;
    countdownTimer=setInterval(()=>{
      n--;
      if (n>0) cdEl.textContent=n;
      else { clearInterval(countdownTimer); countdownTimer=null; revealTimer=setTimeout(revealTarget,400); }
    }, COUNT_DELAY);
  }

  function revealTarget(){
    // initial lock & plan
    const type = Math.random()<0.5 ? 'row':'col';
    const idx  = (type==='row') ? Math.floor(Math.random()*ROWS) : Math.floor(Math.random()*COLS);
    applyLock({type,idx});
    planNextLock();

    // initial target picking (availability-aware)
    const present = Array.from(new Set(shapes.filter(Boolean)));
    let next = chooseTargetFrom(present, new Set());
    if (!next){
      // No available target at all → auto-success (edge case)
      return endRound(true, performance.now());
    }
    setTarget(next);

    cdEl.textContent="—";
    startedAt=performance.now();
    lastSplitAt=startedAt;
    playing=true;

    log(`Lock placed → ${lockLabel(lock)}. Target set.`);
  }

  function updateSplitStats(totalMsNow){
    if (clickSplits.length===0){ resetStatsUI(); totalEl.textContent=ms(totalMsNow); return; }
    const best=Math.min(...clickSplits);
    const worst=Math.max(...clickSplits);
    const avg=clickSplits.reduce((a,b)=>a+b,0)/clickSplits.length;
    bestEl.textContent=ms(best);
    worstEl.textContent=ms(worst);
    avgEl.textContent=ms(avg);
    totalEl.textContent=ms(totalMsNow);
  }

  function handleClick(i){
    if (!playing) return;
    const cell=cells[i];
    const s=shapes[i];
    const r=rowOf(i), c=colOf(i);

    // Neutral (empty) → hint
    if (!s){
      if (nextLock){
        const willLock = (nextLock.type==='row') ? (r===nextLock.idx) : (c===nextLock.idx);
        cell.classList.remove('hint-pulse','hint-dim','hint-bolt');
        if (willLock){ cell.classList.add('hint-pulse'); log(`Hint: next lock → ${lockLabel(nextLock)}`); }
        else { cell.classList.add('hint-dim'); log(`Hint: not ${lockLabel(nextLock)}`); }
      } else { log("Hint: next lock unknown"); }
      return;
    }

    // Already confirmed correct? ignore
    if (cell.classList.contains("correct")) return;

    // Shield → safe, DOES move the lock, does not change shape
    if (s==="shield"){
      log("🛡 Shield clicked (safe) • lock advances");
      moveLock('shield');
      return;
    }

    // Lightning behavior:
    if (s==="bolt"){
      if (targetShape === "bolt"){
        // Treat as CORRECT
        cell.classList.add("correct");
        const now=performance.now();
        const split=now-lastSplitAt; clickSplits.push(split); lastSplitAt=now;
        const totalSoFar=now-startedAt;
        splitDetails.push({idx:i,row:r,col:c,split,total:totalSoFar,shape:s});
        log(`✔ bolt at r${r+1}c${c+1} • split ${Math.round(split)} ms • total ${Math.round(totalSoFar)} ms`);
        updateSplitStats(totalSoFar);

        usedTargets.add("bolt");
        forbidNext = computeForbidNext("bolt");

        // Move lock, then preview the next-next lock in YELLOW
        moveLock('correct');
        lightningPreviewNextNextYellow();

        // Pick next target (availability-aware)
        const present = Array.from(new Set(shapes.filter(Boolean)));
        let next = chooseTargetFrom(present, forbidNext);
        if (!next){ return endRound(true, now); }
        setTarget(next);

        if (clickSplits.length >= TARGETS_TO_COMPLETE) return endRound(true, now);
        return;
      } else {
        // Not target → reveal NEXT lock (purple), do not move lock; respawn bolt to keep board lively
        log("⚡ Lightning reveals the next lock");
        lightningPreviewNext();
        respawnShapeAt(i);
        return;
      }
    }

    // Locked penalty (non-shield)
    if (cell.classList.contains('locked')){
      lives=Math.max(0,lives-1); livesEl.textContent=lives;
      cell.classList.remove('pulse-wrong'); void cell.offsetWidth; cell.classList.add('pulse-wrong');
      log(`✖ locked ${s} • lives ${lives}`);
      if (lives===0) return endRound(false, performance.now());
      moveLock('penalty');
      return;
    }

    // Wrong unlocked
    if (s!==targetShape){
      cell.classList.remove('pulse-wrong'); void cell.offsetWidth; cell.classList.add('pulse-wrong');
      lives=Math.max(0,lives-1); livesEl.textContent=lives;
      log(`✖ wrong: ${s} • lives ${lives}`);
      if (lives===0) return endRound(false, performance.now());
      moveLock('penalty');
      return;
    }

    // Correct (non-bolt)
    cell.classList.add("correct");
    const now=performance.now();
    const split=now-lastSplitAt; clickSplits.push(split); lastSplitAt=now;
    const totalSoFar=now-startedAt;
    splitDetails.push({idx:i,row:r,col:c,split,total:totalSoFar,shape:s});
    log(`✔ ${s} at r${r+1}c${c+1} • split ${Math.round(split)} ms • total ${Math.round(totalSoFar)} ms`);
    updateSplitStats(totalSoFar);

    usedTargets.add(s);
    forbidNext = computeForbidNext(s);

    moveLock('correct');

    // Next target (availability-aware)
    const present = Array.from(new Set(shapes.filter(Boolean)));
    let next = chooseTargetFrom(present, forbidNext);
    if (!next){ return endRound(true, now); }
    setTarget(next);

    if (clickSplits.length >= TARGETS_TO_COMPLETE) return endRound(true, now);
  }

  function endRound(success, nowTs){
    playing=false;
    const total = nowTs - startedAt;
    const best  = clickSplits.length ? Math.min(...clickSplits) : 0;
    const worst = clickSplits.length ? Math.max(...clickSplits) : 0;
    const avg   = clickSplits.length ? (clickSplits.reduce((a,b)=>a+b,0)/clickSplits.length) : 0;

    mBest.textContent  = best  ? `${Math.round(best)} ms`  : '—';
    mAvg.textContent   = avg   ? `${Math.round(avg)} ms`   : '—';
    mWorst.textContent = worst ? `${Math.round(worst)} ms` : '—';
    mTotal.textContent = `${Math.round(total)} ms`;
    mSplits.innerHTML = splitDetails.map((s,i)=>`
      <tr><td>${i+1}</td><td>${Math.round(s.split)} ms</td><td>${Math.round(s.total)} ms</td><td>${s.shape} @ r${s.row+1}, c${s.col+1}</td></tr>
    `).join('');

    modal.hidden=false;
    if (sideStats) sideStats.style.display='grid';
    log(success ? `Completed ${clickSplits.length} targets in ${Math.round(total)} ms` : `Failed in ${Math.round(total)} ms`);
  }

  function resetAll(){ modal.hidden=true; startRound(); }

  // Wire
  btnStart.addEventListener("click", startRound);
  btnReset.addEventListener("click", resetAll);
  btnClose.addEventListener("click", () => { modal.hidden=true; });
  btnAgain.addEventListener("click", () => { modal.hidden=true; startRound(); });

  // Initial layout
  buildGrid();
});
