// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  const SHAPES = ["circle","square","triangle"];
  const GRID = 5;
  const CELLS = GRID * GRID;
  const OCCUPANCY = 0.65;
  const COUNT_DELAY = 500;

  // Elements
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

  // Round state
  let targetShape = null;
  let lives = 3;
  let playing = false;
  let cells = [];
  let totalTargets = 0;
  let foundTargets = 0;

  // Timing (split stats)
  let startedAt = 0;
  let lastSplitAt = 0;
  let clickSplits = [];

  // Purple lock state
  // lock = { type: 'row'|'col', idx: number }
  let lock = null;
  let prevCoveredCorrectIndices = [];

  // Timers
  let countdownTimer = null;
  let revealTimer = null;

  // Utils
  const ms = x => `${Math.round(x)} ms`;
  const log = msg => { if (!logEl) return; const d=document.createElement("div"); d.textContent=msg; logEl.prepend(d); };
  const clearTimers = () => { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer=null; } if (revealTimer){ clearTimeout(revealTimer); revealTimer=null; } };
  const resetStatsUI = () => { bestEl.textContent = avgEl.textContent = worstEl.textContent = totalEl.textContent = "—"; };
  const cellRow = i => Math.floor(i / GRID);
  const cellCol = i => i % GRID;

  function setPreview(shape){
    if (!preview) return;
    preview.innerHTML = "";
    if (!shape) return;
    const el = document.createElement("div");
    el.className = (shape === "triangle") ? "shape triangle big" : `shape ${shape} big`;
    preview.appendChild(el);
  }

  // Grid
  function buildGrid(){
    board.innerHTML = "";
    cells = [];
    for (let i=0;i<CELLS;i++){
      const cell = document.createElement("div");
      cell.className = "cell";
      if (Math.random() < OCCUPANCY){
        const s = SHAPES[Math.floor(Math.random()*SHAPES.length)];
        cell.dataset.shape = s;
        cell.appendChild(makeShape(s));
      } else {
        cell.dataset.shape = "";
      }
      cell.addEventListener("click", () => handleClick(cell));
      cells.push(cell);
      board.appendChild(cell);
    }
  }
  function makeShape(s){
    if (s === "triangle"){ const tri=document.createElement("div"); tri.className="shape triangle"; return tri; }
    const el=document.createElement("div"); el.className=`shape ${s}`; return el;
  }

  // Purple Lock helpers
  function coverageIndicesFor(lk){
    const out = [];
    for (let i=0;i<CELLS;i++){
      if (lk.type === 'row' && cellRow(i) === lk.idx) out.push(i);
      if (lk.type === 'col' && cellCol(i) === lk.idx) out.push(i);
    }
    return out;
  }
  function applyLock(lk){
    cells.forEach(c => c.classList.remove('locked'));   // clear old
    lock = lk;
    coverageIndicesFor(lock).forEach(i => cells[i].classList.add('locked'));
  }
  function coveredCorrectIndices(lk){
    if (!lk) return [];
    return coverageIndicesFor(lk).filter(i =>
      cells[i].dataset.shape === targetShape &&
      !cells[i].classList.contains('correct')
    );
  }
  function pickNewLock(avoidCorrectIdx = []){
    const tried = new Set();
    for (let attempts=0; attempts<100; attempts++){
      const type = Math.random() < 0.5 ? 'row' : 'col';
      const idx = Math.floor(Math.random() * GRID);
      const key = `${type}:${idx}`;
      if (tried.has(key)) continue;
      tried.add(key);
      const candidate = { type, idx };
      const covers = coverageIndicesFor(candidate);
      if (!avoidCorrectIdx.some(i => covers.includes(i))) return candidate;
    }
    return { type: 'row', idx: 0 }; // fallback
  }
  function moveLock(reason){
    prevCoveredCorrectIndices = coveredCorrectIndices(lock);
    applyLock(pickNewLock(prevCoveredCorrectIndices));
    log(reason === 'correct' ? "Lock moved (correct)." : "Lock moved (penalty).");
  }

  // Flow
  function startRound(){
    clearTimers();
    playing = false;
    targetShape = null;
    foundTargets = 0;
    totalTargets = 0;
    clickSplits = [];
    startedAt = 0;
    lastSplitAt = 0;

    setPreview(null);
    resetStatsUI();

    cdEl.textContent = "3";
    targetEl.textContent = "—";
    lives = 3; livesEl.textContent = lives;

    buildGrid();
    cells.forEach(c => c.classList.remove('locked'));
    lock = null;
    prevCoveredCorrectIndices = [];

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
    const present = cells.map(c => c.dataset.shape).filter(Boolean);
    if (present.length === 0){ buildGrid(); return revealTarget(); }

    targetShape = present[Math.floor(Math.random()*present.length)];
    totalTargets = cells.filter(c => c.dataset.shape === targetShape).length;
    foundTargets = 0;

    targetEl.textContent = targetShape;
    setPreview(targetShape);

    cdEl.textContent = "—";
    startedAt = performance.now();
    lastSplitAt = startedAt;
    playing = true;

    // place initial lock
    applyLock(pickNewLock([]));
    log(`Target: ${targetShape} (${totalTargets} to find). Lock placed.`);
  }

  function updateSplitStats(totalMsNow){
    if (clickSplits.length === 0) { resetStatsUI(); totalEl.textContent = ms(totalMsNow); return; }
    const best  = Math.min(...clickSplits);
    const worst = Math.max(...clickSplits);
    const avg   = clickSplits.reduce((a,b)=>a+b,0) / clickSplits.length;

    bestEl.textContent  = ms(best);
    worstEl.textContent = ms(worst);
    avgEl.textContent   = ms(avg);
    totalEl.textContent = ms(totalMsNow);
  }

  function handleClick(cell){
    if (!playing) return;

    const clicked = cell.dataset.shape;
    if (!clicked) return;
    if (cell.classList.contains("correct") || cell.classList.contains("wrong")) return;

    // locked penalty
    if (cell.classList.contains('locked')){
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`Penalty: clicked locked tile. Lives left: ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('miss');
      return;
    }

    // wrong shape
    if (clicked !== targetShape){
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`Miss (${clicked}). Lives left: ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('miss');
      return;
    }

    // correct shape
    cell.classList.add("correct");
    foundTargets++;

    const now = performance.now();
    const split = now - lastSplitAt;
    clickSplits.push(split);
    lastSplitAt = now;

    updateSplitStats(now - startedAt);
    moveLock('correct');

    if (foundTargets === totalTargets){
      endRound(true, now);
    }
  }

  function endRound(success, nowTs){
    playing = false;
    const total = nowTs - startedAt;
    updateSplitStats(total);
    log(success ? `Completed in ${ms(total)}` : `Failed in ${ms(total)}`);
  }

  function resetAll(){
    if (logEl) logEl.textContent = "";
    startRound();
  }

  btnStart.addEventListener("click", startRound);
  btnReset.addEventListener("click", resetAll);
  buildGrid();
});
