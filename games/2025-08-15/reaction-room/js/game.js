// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  const SHAPES = ["circle","square","triangle"];
  const CELLS = 25;               // 5x5
  const OCCUPANCY = 0.65;         // ~65% tiles have a shape
  const COUNT_DELAY = 500;        // ms between 3-2-1 ticks

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

  // Timing state (for split-based stats)
  let startedAt = 0;          // when target revealed
  let lastSplitAt = 0;        // time of last correct click (or reveal)
  let clickSplits = [];       // array of split durations (ms)

  // Timers
  let countdownTimer = null;
  let revealTimer = null;

  // Utils
  const ms = x => `${Math.round(x)} ms`;
  const log = msg => { if (!logEl) return; const d = document.createElement("div"); d.textContent = msg; logEl.prepend(d); };
  const clearTimers = () => { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer=null; } if (revealTimer){ clearTimeout(revealTimer); revealTimer=null; } };
  const resetStatsUI = () => { bestEl.textContent = avgEl.textContent = worstEl.textContent = totalEl.textContent = "—"; };

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

    // reset board
    buildGrid();

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

    log(`Target: ${targetShape} (${totalTargets} to find)`);
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

    if (clicked !== targetShape){
      // wrong → mark red + lose a life
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`Miss (${clicked}). Lives left: ${lives}`);
      if (lives === 0) endRound(false, performance.now());
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
