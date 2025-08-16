// games/2025-08-15/reaction-room/js/game.js
window.addEventListener('DOMContentLoaded', () => {
  const SHAPES = ["circle","square","triangle"];
  const CELLS = 25;               // 5x5
  const OCCUPANCY = 0.65;         // ~65% tiles have a shape
  const COUNT_DELAY = 500;        // ms between 3-2-1 ticks

  // Elements
  const board    = document.getElementById("game-board");
  const cdEl     = document.getElementById("countdown");
  const targetEl = document.getElementById("target");
  const livesEl  = document.getElementById("lives");
  const lastEl   = document.getElementById("last");
  const bestEl   = document.getElementById("best");
  const avgEl    = document.getElementById("avg");
  const logEl    = document.getElementById("log");
  const btnStart = document.getElementById("start");
  const btnReset = document.getElementById("reset");

  if (!board || !btnStart || !btnReset) {
    console.error("Game: required elements not found");
    return;
  }

  // State
  let targetShape = null;
  let startedAt = 0;
  let lives = 3;
  let playing = false;
  let results = [];
  let cells = [];
  let countdownTimer = null;
  let revealTimer = null;

  // Utilities
  const ms = x => `${Math.round(x)} ms`;
  const log = msg => {
    if (!logEl) return;
    const d = document.createElement("div");
    d.textContent = msg;
    logEl.prepend(d);
  };
  const clearTimers = () => {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    if (revealTimer) { clearTimeout(revealTimer); revealTimer = null; }
  };

  // Grid
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
      cell.addEventListener("click", () => handleClick(cell));
      cells.push(cell);
      board.appendChild(cell);
    }
  }
  function makeShape(s){
    if (s === "triangle"){
      const tri = document.createElement("div");
      tri.className = "shape triangle"; // triangle is drawn via borders in CSS
      return tri;
    }
    const el = document.createElement("div");
    el.className = `shape ${s}`;
    return el;
  }

  // Flow
  function startRound(){
    clearTimers();
    playing = false;
    targetShape = null;
    cdEl.textContent = "3";
    targetEl.textContent = "—";
    lives = 3;
    livesEl.textContent = lives;

    buildGrid();

    let n = 3;
    countdownTimer = setInterval(() => {
      n--;
      if (n > 0) {
        cdEl.textContent = n;
      } else {
        clearInterval(countdownTimer); countdownTimer = null;
        revealTimer = setTimeout(revealTarget, 400);
      }
    }, COUNT_DELAY);
  }

  function revealTarget(){
    const present = cells.map(c => c.dataset.shape).filter(Boolean);
    if (present.length === 0){ buildGrid(); return revealTarget(); }
    targetShape = present[Math.floor(Math.random()*present.length)];
    targetEl.textContent = targetShape;
    cdEl.textContent = "—";
    startedAt = performance.now();
    playing = true;
    log(`Target: ${targetShape}`);
  }

  function handleClick(cell){
    if (!playing) return;
    const clicked = cell.dataset.shape;
    if (!clicked) return;

    if (clicked !== targetShape){
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      // brief flash on all tiles of the wrong shape
      cells.forEach(c => {
        if (c.dataset.shape === clicked){
          c.classList.add("flash");
          setTimeout(()=>c.classList.remove("flash"), 200);
        }
      });
      log(`Miss (${clicked}). Lives left: ${lives}`);
      if (lives === 0){
        playing = false;
        log("Out of lives. Round over.");
      }
      return;
    }

    // hit
    const rt = performance.now() - startedAt;
    playing = false;
    results.push(rt);
    lastEl.textContent = ms(rt);
    bestEl.textContent = ms(Math.min(...results));
    avgEl.textContent  = ms(results.reduce((a,b)=>a+b,0)/results.length);
    log(`Hit ${targetShape} in ${ms(rt)}`);
  }

  function resetAll(){
    clearTimers();
    results = [];
    lastEl.textContent = bestEl.textContent = avgEl.textContent = "—";
    if (logEl) logEl.textContent = "";
    startRound();
  }

  // Wire buttons
  btnStart.addEventListener("click", startRound);
  btnReset.addEventListener("click", resetAll);

  // Draw an initial empty grid so layout looks right
  buildGrid();
});
