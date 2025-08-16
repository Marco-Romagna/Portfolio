// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  const SHAPES = ["circle","square","triangle"];
  const GRID = 5;
  const CELLS = GRID * GRID;
  const OCCUPANCY = 0.65;      // ~65% tiles have a shape
  const COUNT_DELAY = 500;     // ms between 3-2-1 ticks

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

  // Timing state (split stats)
  let startedAt = 0;       // when target revealed
  let lastSplitAt = 0;     // last correct click timestamp (or reveal)
  let clickSplits = [];    // durations between correct clicks

  // Purple lock state
  // lock = { type: 'row'|'col', idx: number }
  let lock = null;
  let prevCoveredCorrectIndices = []; // correct (matching target) indices covered by the previous lock

  // Timers
  let countdownTimer = null;
  let revealTimer = null;

  // --- Utils ---
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

  // --- Grid ---
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

  // --- Purple Lock helpers ---
  function coverageIndicesFor(lk){
    const out = [];
    for (let i=0;i<CELLS;i++){
      if (lk.type === 'row' && cellRow(i) === lk.idx) out.push(i);
      if (lk.type === 'col' && cellCol(i) === lk.idx) out.push(i);
    }
    return out;
  }

  function applyLock(lk){
    // clear previous visuals
    cells.forEach(c => c.classList.remove('locked'));
    lock = lk;
    const cover = coverageIndicesFor(lock);
    cover.forEach(i => cells[i].classList.add('locked'));
  }

  function coveredCorrectIndices(lk){
    if (!lk) return [];
    const cover = coverageIndicesFor(lk);
    return cover.filter(i =>
      cells[i].dataset.shape === targetShape &&
      !cells[i].classList.contains('correct') // only those not yet found
    );
  }

  function pickNewLock(avoidCorrectIdx = []){
    // Try random candidates until we find one whose coverage
    // doesn't include any of avoidCorrectIdx
    const tried = new Set();
    for (let attempts=0; attempts<100; attempts++){
      const type = Math.random() < 0.5 ? 'row' : 'col';
      const idx = Math.floor(Math.random() * GRID);
      const key = `${type}:${idx}`;
      if (tried.has(key)) continue;
      tried.add(key);

      const candidate = { type, idx };
      const covers = coverageIndicesFor(candidate);
      // Check intersection with forbidden correct indices
      const intersects = avoidCorrectIdx.some(i => covers.includes(i));
      if (!intersects) return candidate;
    }
    // Fallback: return something (best effort)
    return { type: 'row', idx: 0 };
  }

  function moveLock(reason){
    // reason: 'correct' | 'miss'
    // Determine which correct tiles were covered by the *current* lock (to avoid them)
    prevCoveredCorrectIndices = coveredCorrectIndices(lock);
    const newLock = pickNewLock(prevCoveredCorrectIndices);
    applyLock(newLock);
    if (reason === 'correct') log("Lock moved (correct).");
    else log("Lock moved (penalty).");
  }

  // --- Flow ---
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

    // reset board + clear lock visuals
    buildGrid();
    cells.forEach(c => c.classList.remove('locked'));
    lock = null;
    prevCoveredCorrectIndices = [];

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
    // choose a target that exists & count how many to find
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

    // INITIAL LOCK
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
    if (!clicked) return;                              // empty tile ignored
    if (cell.classList.contains("correct") || cell.classList.contains("wrong")) return;

    // Purple lock rule: any click on a locked tile = lose a life + move lock
    if (cell.classList.contains('locked')){
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`Penalty: clicked locked tile. Lives left: ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('miss');
      return;
    }

    if (clicked !== targetShape){
      // wrong → mark red + lose a life + move lock
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`Miss (${clicked}). Lives left: ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('miss');
      return;
    }

    // correct → mark blue; compute split since last correct (or since reveal)
    cell.classList.add("correct");
    foundTargets++;

    const now = performance.now();
    const split = now - lastSplitAt;   // time since reveal or previous correct
    clickSplits.push(split);
    lastSplitAt = now;

    // live-update stats using total-so-far
    updateSplitStats(now - startedAt);

    // Move lock after each correct click.
    moveLock('correct');

    if (foundTargets === totalTargets){
      endRound(true, now);
    }
  }

  function endRound(success, nowTs){
    playing = false;
    const total = nowTs - startedAt;        // total time reveal → last correct
    updateSplitStats(total);                // finalize stats display
    log(success ? `Completed in ${ms(total)}` : `Failed in ${ms(total)}`);
  }

  function resetAll(){
    if (logEl) logEl.textContent = "";
    startRound();
  }

  // Wire buttons + initial layout
  btnStart.addEventListener("click", startRound);
  btnReset.addEventListener("click", resetAll);
  buildGrid();
});
