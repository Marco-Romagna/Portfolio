// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  // --- Config ---
  const SHAPES = ["circle","square","triangle"];
  const GRID = 5;
  const CELLS = GRID * GRID;
  const OCCUPANCY = 0.65;        // ~65% of cells contain a shape
  const COUNT_DELAY = 500;       // ms between 3-2-1 ticks

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
  const modal      = document.getElementById("resultsModal");
  const mBest      = document.getElementById("m-best");
  const mAvg       = document.getElementById("m-avg");
  const mWorst     = document.getElementById("m-worst");
  const mTotal     = document.getElementById("m-total");
  const mSplits    = document.getElementById("m-splits");
  const btnClose   = document.getElementById("closeModal");
  const btnAgain   = document.getElementById("playAgain");

  // --- Round state ---
  let targetShape = null;
  let lives = 3;
  let playing = false;
  let cells = [];
  let totalTargets = 0;
  let foundTargets = 0;

  // Timing (split stats)
  let startedAt = 0;       // reveal time
  let lastSplitAt = 0;     // time of last correct (or reveal)
  let clickSplits = [];    // durations between correct clicks
  let splitDetails = [];   // { idx,row,col,split,total }

  // Purple Lock
  // lock = { type: 'row'|'col', idx: number }
  let lock = null;
  let prevCoveredCorrectIndices = [];

  // Timers
  let countdownTimer = null;
  let revealTimer = null;

  // --- Utils ---
  const ms = x => `${Math.round(x)} ms`;
  const cellRow = i => Math.floor(i / GRID);
  const cellCol = i => i % GRID;
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
    for (let i = 0; i < CELLS; i++){
      const cell = document.createElement("div");
      cell.className = "cell";
      if (Math.random() < OCCUPANCY){
        const s = SHAPES[Math.floor(Math.random()*SHAPES.length)];
        cell.dataset.shape = s;
        cell.appendChild(makeShape(s));
      } else {
        cell.dataset.shape = "";
      }
      cell.addEventListener("click", () => handleClick(cell, i));
      cells.push(cell);
      board.appendChild(cell);
    }
  }
  function makeShape(s){
    if (s === "triangle"){ const tri = document.createElement("div"); tri.className = "shape triangle"; return tri; }
    const el = document.createElement("div"); el.className = `shape ${s}`; return el;
  }

  // --- Purple Lock ---
  function coverageIndicesFor(lk){
    const out = [];
    for (let i=0;i<CELLS;i++){
      if (lk.type === 'row' && cellRow(i) === lk.idx) out.push(i);
      if (lk.type === 'col' && cellCol(i) === lk.idx) out.push(i);
    }
    return out;
  }
  function applyLock(lk){
    cells.forEach(c => c.classList.remove('locked')); // clear old visuals
    lock = lk;
    coverageIndicesFor(lock).forEach(i => cells[i].classList.add('locked'));
  }
  function coveredCorrectIndices(lk){
    if (!lk) return [];
    return coverageIndicesFor(lk).filter(i =>
      cells[i].dataset.shape === targetShape && !cells[i].classList.contains('correct')
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
      const intersects = avoidCorrectIdx.some(i => covers.includes(i));
      if (!intersects) return candidate;
    }
    return { type: 'row', idx: 0 }; // last resort
  }
  function moveLock(reason){
    prevCoveredCorrectIndices = coveredCorrectIndices(lock);
    applyLock(pickNewLock(prevCoveredCorrectIndices));
    log(`Lock moved (${reason}) → ${lockLabel(lock)}`);
  }

  // --- Flow ---
  function startRound(){
    clearTimers();
    playing = false;
    targetShape = null;
    foundTargets = 0;
    totalTargets = 0;
    clickSplits = [];
    splitDetails = [];
    startedAt = 0;
    lastSplitAt = 0;

    setPreview(null);
    resetStatsUI();
    if (sideStats) sideStats.style.display = 'none';   // hide during play

    cdEl.textContent = "3";
    targetEl.textContent = "—";
    lives = 3; livesEl.textContent = lives;

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
    log(`Target: ${targetShape} (${totalTargets} to find). Lock placed → ${lockLabel(lock)}`);
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

  function handleClick(cell, idx){
    if (!playing) return;

    const clicked = cell.dataset.shape;
    if (!clicked) return; // empty tile ignored
    if (cell.classList.contains("correct") || cell.classList.contains("wrong")) return;

    // Purple lock penalty: life loss only; tile stays neutral
    if (cell.classList.contains('locked')){
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`✖ locked tile (in ${lockLabel(lock)}) • lives ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('penalty');
      return;
    }

    // Wrong shape (unlocked): mark red + life loss + move lock
    if (clicked !== targetShape){
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`✖ ${clicked} • lives ${lives}`);
      if (lives === 0) return endRound(false, performance.now());
      moveLock('penalty');
      return;
    }

    // Correct shape
    cell.classList.add("correct");
    foundTargets++;

    const now = performance.now();
    const split = now - lastSplitAt;     // since reveal or previous correct
    clickSplits.push(split);
    lastSplitAt = now;

    const row = cellRow(idx);
    const col = cellCol(idx);
    const totalSoFar = now - startedAt;
    splitDetails.push({ idx, row, col, split, total: totalSoFar });
    log(`✔ r${row+1} c${col+1} • split ${Math.round(split)} ms • total ${Math.round(totalSoFar)} ms`);

    updateSplitStats(totalSoFar);
    moveLock('correct');

    if (foundTargets === totalTargets){
      endRound(true, now);
    }
  }

  function endRound(success, nowTs){
    playing = false;
    const total = nowTs - startedAt;

    // Compute round stats from splits
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
        <td>r${s.row+1}, c${s.col+1}</td>
      </tr>
    `).join('');

    modal.hidden = false;                  // show results
    if (sideStats) sideStats.style.display = 'grid'; // reveal side stats now

    log(success ? `Completed in ${Math.round(total)} ms` : `Failed in ${Math.round(total)} ms`);
  }

  function resetAll(){
    if (logEl) logEl.textContent = "";
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
