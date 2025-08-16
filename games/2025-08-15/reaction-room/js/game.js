// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  // --- Config ---
  const ROWS = 6, COLS = 5;
  const CELLS = ROWS * COLS;
  const OCC_MIN = 0.58, OCC_MAX = 0.69;     // 58%–69% each round
  const COUNT_DELAY = 500;                  // ms between 3-2-1 ticks
  const TARGETS_TO_COMPLETE = 12;           // round ends after this many correct hits

  // Shape keys
  const BASIC = ["circle","square","triangle"];
  const SUITS = ["club","heart","diamond","spade"];
  const SPECIAL = ["star","moon","bolt","shield"];
  const ALL_SHAPES = [...BASIC, ...SUITS, ...SPECIAL];

  // Guaranteed counts each round
  const GUARANTEED = {
    club:1, heart:1, diamond:1, spade:1,
    star:1, moon:1,
    bolt:2, shield:2
  };

  // Weighted pool for non-guaranteed spawns (basics favored)
  const WEIGHTS = { circle:6, square:6, triangle:6, bolt:0.5, shield:0.5, club:0.25, heart:0.25, diamond:0.25, spade:0.25, star:0, moon:0 };

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

  // Modal elements
  const modal   = document.getElementById("resultsModal");
  const mBest   = document.getElementById("m-best");
  const mAvg    = document.getElementById("m-avg");
  const mWorst  = document.getElementById("m-worst");
  const mTotal  = document.getElementById("m-total");
  const mSplits = document.getElementById("m-splits");
  const btnClose= document.getElementById("closeModal");
  const btnAgain= document.getElementById("playAgain");

  // --- Round state ---
  let occupancy = 0.62;
  let targetShape = null;
  let lives = 3;
  let playing = false;
  let cells = []; // DOM refs
  let shapes = new Array(CELLS).fill(""); // shape ids or ""
  let foundTargetsCount = 0;

  // Timing (split stats)
  let startedAt = 0;
  let lastSplitAt = 0;
  let clickSplits = [];    // durations between correct clicks
  let splitDetails = [];   // { idx,row,col,split,total,shape }

  // Lock state & hints
  // lock/nextLock = { type: 'row'|'col', idx: number }
  let lock = null;
  let nextLock = null;

  // Exclusivity limiter (applies to NEXT target only)
  let forbidNext = new Set(); // e.g., star forbids moon for next target

  // Timers
  let countdownTimer = null;
  let revealTimer = null;

  // --- Utils ---
  const ms = x => `${Math.round(x)} ms`;
  const idxOf = (r,c) => r*COLS + c;
  const rowOf = i => Math.floor(i / COLS);
  const colOf = i => i % COLS;
  const lockLabel = lk => lk ? (lk.type === 'row' ? `row ${lk.idx+1}` : `column ${lk.idx+1}`) : '';

  function log(msg){
    if (!logEl) return;
    const d = document.createElement("div");
    d.textContent = msg;
    logEl.prepend(d);
  }
  function clearTimers(){
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
  }
  function resetStatsUI(){
    bestEl.textContent = avgEl.textContent = worstEl.textContent = totalEl.textContent = "—";
  }

  // specials as glyphs for reliability
  function glyphFor(shape) {
    switch (shape) {
      case "club":    return "♣";
      case "heart":   return "♥";
      case "diamond": return "♦";
      case "spade":   return "♠";
      case "star":    return "★";
      case "moon":    return "☾";
      case "bolt":    return "⚡";
      case "shield":  return "🛡";
      default:        return null;
    }
  }

  function setPreview(shape){
    if (!preview) return;
    preview.innerHTML = "";
    if (!shape) return;

    const ch = glyphFor(shape);
    if (ch) {
      const span = document.createElement("span");
      span.className = `glyph ${shape}`;
      span.textContent = ch;
      preview.appendChild(span);
      return;
    }

    // basics use big CSS shapes
    const el = document.createElement("div");
    if (shape === "triangle") el.className = "shape triangle big";
    else el.className = `shape ${shape} big`;
    preview.appendChild(el);
  }

  // --- Board build & spawn rules ---
  function randomOccupancy(){
    return OCC_MIN + Math.random()*(OCC_MAX - OCC_MIN);
  }
  function weightedPick(){
    const entries = Object.entries(WEIGHTS).filter(([,w]) => w > 0);
    const total = entries.reduce((s,[,w])=>s+w,0);
    let r = Math.random()*total;
    for (const [k,w] of entries){
      if (r < w) return k;
      r -= w;
    }
    return "circle";
  }

  function clearHints(){
    cells.forEach(c => c.classList.remove('hint-pulse','hint-dim'));
  }

  function coverageIndicesFor(lk){
    const out = [];
    for (let i=0;i<CELLS;i++){
      if (lk.type === 'row' && rowOf(i) === lk.idx) out.push(i);
      if (lk.type === 'col' && colOf(i) === lk.idx) out.push(i);
    }
    return out;
  }
  function applyLock(lk){
    cells.forEach(c => c.classList.remove('locked'));
    lock = lk;
    coverageIndicesFor(lock).forEach(i => cells[i].classList.add('locked'));
  }
  function planNextLock(){
    // avoid covering unfound targets if possible
    const avoid = [];
    for (let i=0;i<CELLS;i++){
      if (shapes[i] === targetShape && !cells[i].classList.contains('correct')) avoid.push(i);
    }
    const tried = new Set();
    for (let attempts=0; attempts<100; attempts++){
      const type = Math.random() < 0.5 ? 'row' : 'col';
      const idx  = (type === 'row') ? Math.floor(Math.random()*ROWS) : Math.floor(Math.random()*COLS);
      const key  = `${type}:${idx}`;
      if (tried.has(key)) continue; tried.add(key);

      const covers = coverageIndicesFor({type,idx});
      const bad = avoid.some(i => covers.includes(i));
      if (!bad){ nextLock = {type,idx}; return; }
    }
    nextLock = { type:'row', idx:0 };
  }
  function moveLock(reason){
    if (!nextLock) planNextLock();
    clearHints();
    applyLock(nextLock);
    planNextLock();
    log(`Lock moved (${reason}) → ${lockLabel(lock)}`);
  }

  function buildGrid(){
    board.innerHTML = "";
    board.style.gridTemplateColumns = `repeat(${COLS},1fr)`;
    cells = [];
    for (let i=0;i<CELLS;i++){
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.addEventListener("click", () => handleClick(i));
      cells.push(cell);
      board.appendChild(cell);
    }
  }

  function renderCell(i){
    const cell = cells[i];
    cell.innerHTML = "";
    const s = shapes[i];
    if (!s) return; // empty (neutral)

    // basics via CSS shapes
    if (s === "circle" || s === "square" || s === "triangle") {
      if (s === "triangle") {
        const el = document.createElement("div");
        el.className = "shape triangle";
        cell.appendChild(el);
      } else {
        const el = document.createElement("div");
        el.className = `shape ${s}`;
        cell.appendChild(el);
      }
      return;
    }

    // specials as glyphs
    const ch = glyphFor(s);
    if (ch) {
      const span = document.createElement("span");
      span.className = `glyph ${s}`;
      span.textContent = ch;
      cell.appendChild(span);
      return;
    }

    // fallback
    const el = document.createElement("div");
    el.className = "shape square";
    cell.appendChild(el);
  }

  function populateBoard(){
    occupancy = randomOccupancy();
    const fillCount = Math.round(CELLS * occupancy);

    shapes.fill("");

    // choose distinct random indices to fill
    const idxs = [...Array(CELLS).keys()];
    idxs.sort(()=>Math.random()-0.5);

    // place guaranteed first
    const needed = [];
    for (const [key,count] of Object.entries(GUARANTEED)){
      for (let k=0;k<count;k++) needed.push(key);
    }
    const filled = [];

    for (let g=0; g<needed.length && idxs.length; g++){
      const i = idxs.pop();
      shapes[i] = needed[g];
      filled.push(i);
    }

    // fill remaining up to fillCount with weighted pool
    while (filled.length < fillCount && idxs.length){
      const i = idxs.pop();
      const pick = weightedPick();
      shapes[i] = pick;
      filled.push(i);
    }

    // render
    for (let i=0;i<CELLS;i++) renderCell(i);
  }

  // --- Target selection ---
  function pickInitialTarget(){
    const presentSet = new Set(shapes.filter(Boolean));
    const candidates = [...presentSet];
    return chooseTargetFrom(candidates, new Set());
  }

  function chooseTargetFrom(candidates, banSet){
    const pool = candidates.filter(s => !banSet.has(s));
    if (!pool.length) return null;

    // prefer shapes with >=2 instances
    const counts = new Map();
    for (let s of shapes) if (s) counts.set(s, (counts.get(s)||0)+1);
    const twoPlus = pool.filter(s => (counts.get(s)||0) >= 2);
    const finalPool = twoPlus.length ? twoPlus : pool;

    return finalPool[Math.floor(Math.random()*finalPool.length)];
  }

  function setTarget(shape){
    targetShape = shape;
    targetEl.textContent = shape || "—";
    setPreview(shape);
  }

  function computeForbidNext(lastShape){
    const ban = new Set();
    if (lastShape === "star") ban.add("moon");
    if (lastShape === "moon") ban.add("star");
    if (SUITS.includes(lastShape)){
      for (const s of SUITS) if (s !== lastShape) ban.add(s);
    }
    return ban;
  }

  // Keep at least one instance of current target after a click
  function ensureTargetExistsAfter(iRemoved){
    if (!targetShape) return;
    let count = 0;
    for (let i=0;i<CELLS;i++){
      if (i === iRemoved) continue;
      if (shapes[i] === targetShape) count++;
    }
    if (count === 0){
      const candidates = [];
      for (let i=0;i<CELLS;i++){
        if (i===iRemoved) continue;
        if (!shapes[i]) continue;
        if (cells[i].classList.contains('locked')) continue;
        candidates.push(i);
      }
      if (candidates.length){
        const j = candidates[Math.floor(Math.random()*candidates.length)];
        shapes[j] = targetShape;
        renderCell(j);
      }
    }
  }

  function respawnShapeAt(i){
    shapes[i] = weightedPick();
    renderCell(i);
  }

  function lightningReveal(){
    if (!nextLock) return;
    const covers = coverageIndicesFor(nextLock);
    covers.forEach(i => {
      const c = cells[i];
      c.classList.remove('hint-dim');
      c.classList.add('hint-pulse');
    });
  }

  // --- Flow ---
  function startRound(){
    clearTimers();
    playing = false;
    lives = 3;
    foundTargetsCount = 0;
    clickSplits = [];
    splitDetails = [];
    startedAt = 0;
    lastSplitAt = 0;
    forbidNext = new Set();
    targetShape = null;

    if (sideStats) sideStats.style.display = 'none';
    resetStatsUI();
    logEl.textContent = "";

    cdEl.textContent = "3";
    targetEl.textContent = "—";
    livesEl.textContent = lives;

    buildGrid();
    populateBoard();

    cells.forEach(c => c.classList.remove('locked','hint-pulse','hint-dim','correct','wrong'));
    lock = null; nextLock = null;

    // 3-2-1
    let n = 3;
    countdownTimer = setInterval(() => {
      n--;
      if (n > 0) cdEl.textContent = n;
      else {
        clearInterval(countdownTimer); countdownTimer = null;
        revealTimer = setTimeout(revealTarget, 400);
      }
    }, COUNT_DELAY);
  }

  function revealTarget(){
    // initial lock
    const type = Math.random()<0.5 ? 'row' : 'col';
    const idx  = (type==='row') ? Math.floor(Math.random()*ROWS) : Math.floor(Math.random()*COLS);
    applyLock({ type, idx });
    planNextLock();

    // initial target
    const present = new Set(shapes.filter(Boolean));
    setTarget(chooseTargetFrom([...present], forbidNext));

    cdEl.textContent = "—";
    startedAt = performance.now();
    lastSplitAt = startedAt;
    playing = true;

    log(`Lock placed → ${lockLabel(lock)}. Target: ${targetShape}`);
  }

  function updateSplitStats(totalMsNow){
    if (clickSplits.length === 0) {
      resetStatsUI();
      totalEl.textContent = ms(totalMsNow);
      return;
    }
    const best  = Math.min(...clickSplits);
    const worst = Math.max(...clickSplits);
    const avg   = clickSplits.reduce((a,b)=>a+b,0) / clickSplits.length;

    bestEl.textContent  = ms(best);
    worstEl.textContent = ms(worst);
    avgEl.textContent   = ms(avg);
    totalEl.textContent = ms(totalMsNow);
  }

  function handleClick(i){
    if (!playing) return;

    const cell = cells[i];
    const s = shapes[i]; // may be "" for neutral
    const r = rowOf(i), c = colOf(i);

    // NEUTRAL (empty) – hint behavior
    if (!s){
      if (nextLock){
        const willLock = (nextLock.type === 'row') ? (r === nextLock.idx) : (c === nextLock.idx);
        cell.classList.remove('hint-pulse','hint-dim');
        if (willLock){ cell.classList.add('hint-pulse'); log(`Hint: next lock → ${lockLabel(nextLock)}`); }
        else { cell.classList.add('hint-dim'); log(`Hint: not ${lockLabel(nextLock)}`); }
      } else {
        log("Hint: next lock unknown");
      }
      return; // no life change, costs time only
    }

    // Already marked? ignore
    if (cell.classList.contains("correct") || cell.classList.contains("wrong")) return;

    // LOCKED penalty (except shield)
    if (cell.classList.contains('locked') && s !== "shield"){
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`✖ locked ${s} • lives ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('penalty');
      // respawn the clicked tile to keep board fresh
      respawnShapeAt(i);
      return;
    }

    // SHIELD is always safe—no life loss even if locked
    if (s === "shield" && cell.classList.contains('locked')){
      log(`🛡 Safe click on locked shield`);
      respawnShapeAt(i);
      moveLock('penalty');
      return;
    }

    // WRONG unlocked click (non-target)
    if (s !== targetShape){
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`✖ wrong: ${s} • lives ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('penalty');
      respawnShapeAt(i);
      return;
    }

    // CORRECT click
    cell.classList.add("correct");
    foundTargetsCount++;

    const now = performance.now();
    const split = now - lastSplitAt;
    clickSplits.push(split);
    lastSplitAt = now;

    const totalSoFar = now - startedAt;
    splitDetails.push({ idx:i, row:r, col:c, split, total: totalSoFar, shape: s });
    log(`✔ ${s} at r${r+1}c${c+1} • split ${Math.round(split)} ms • total ${Math.round(totalSoFar)} ms`);

    updateSplitStats(totalSoFar);

    // Special on-click effects
    if (s === "bolt"){ lightningReveal(); }

    // Exclusivity for NEXT target
    forbidNext = computeForbidNext(s);

    // Respawn the clicked tile to keep board fresh
    shapes[i] = "";
    renderCell(i);
    // Make sure at least one of current target still exists elsewhere before switching
    ensureTargetExistsAfter(i);
    respawnShapeAt(i);

    // Move lock after correct
    moveLock('correct');

    // NEXT TARGET: re-pick immediately (target changes after each correct)
    const presentSet = new Set(shapes.filter(Boolean));
    const nextTarget = chooseTargetFrom([...presentSet], forbidNext);
    setTarget(nextTarget);

    // End conditions
    if (foundTargetsCount >= TARGETS_TO_COMPLETE){
      return endRound(true, now);
    }
  }

  function endRound(success, nowTs){
    playing = false;
    const total = nowTs - startedAt;

    const best  = clickSplits.length ? Math.min(...clickSplits) : 0;
    const worst = clickSplits.length ? Math.max(...clickSplits) : 0;
    const avg   = clickSplits.length ? (clickSplits.reduce((a,b)=>a+b,0) / clickSplits.length) : 0;

    // Fill modal
    mBest.textContent  = best  ? `${Math.round(best)} ms`  : '—';
    mAvg.textContent   = avg   ? `${Math.round(avg)} ms`   : '—';
    mWorst.textContent = worst ? `${Math.round(worst)} ms` : '—';
    mTotal.textContent = `${Math.round(total)} ms`;
    mSplits.innerHTML = splitDetails.map((s, i) => `
      <tr>
        <td>${i+1}</td>
        <td>${Math.round(s.split)} ms</td>
        <td>${Math.round(s.total)} ms</td>
        <td>${s.shape} @ r${s.row+1}, c${s.col+1}</td>
      </tr>
    `).join('');

    modal.hidden = false;
    if (sideStats) sideStats.style.display = 'grid';

    log(success ? `Completed ${TARGETS_TO_COMPLETE} targets in ${Math.round(total)} ms` : `Failed in ${Math.round(total)} ms`);
  }

  function resetAll(){
    modal.hidden = true;
    startRound();
  }

  // --- Events ---
  btnStart.addEventListener("click", startRound);
  btnReset.addEventListener("click", resetAll);
  btnClose.addEventListener("click", () => { modal.hidden = true; });
  btnAgain.addEventListener("click", () => { modal.hidden = true; startRound(); });

  // Initial layout
  buildGrid();
});
