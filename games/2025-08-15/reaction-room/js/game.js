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

  // State
  let targetShape = null;
  let startedAt = 0;
  let lives = 3;
  let playing = false;
  let cells = [];
  let totalTargets = 0;
  let foundTargets = 0;
  let countdownTimer = null;
  let revealTimer = null;
  const roundTotals = []; // store total time per round for Best/Avg/Worst

  // Utils
  const ms = x => `${Math.round(x)} ms`;
  const log = msg => { if (!logEl) return; const d=document.createElement("div"); d.textContent=msg; logEl.prepend(d); };
  const clearTimers = () => { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer=null; } if (revealTimer){ clearTimeout(revealTimer); revealTimer=null; } };
  function setPreview(shape){
    if (!preview) return;
    preview.innerHTML = "";
    if (!shape) return;
    const el = document.createElement("div");
    if (shape === "triangle") {
      el.className = "shape triangle big";
    } else {
      el.className = `shape ${shape} big`;
    }
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
    if (s === "triangle"){
      const tri = document.createElement("div");
      tri.className = "shape triangle";
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
    foundTargets = 0;
    totalTargets = 0;
    setPreview(null);

    cdEl.textContent = "3";
    targetEl.textContent = "—";
    lives = 3;
    livesEl.textContent = lives;

    // clear cell state
    buildGrid();

    // 3-2-1
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
    // choose a target that exists & count how many of that shape are on the board
    const present = cells.map(c => c.dataset.shape).filter(Boolean);
    if (present.length === 0){ buildGrid(); return revealTarget(); }
    targetShape = present[Math.floor(Math.random()*present.length)];
    totalTargets = cells.filter(c => c.dataset.shape === targetShape).length;
    foundTargets = 0;

    targetEl.textContent = targetShape;
    setPreview(targetShape);
    cdEl.textContent = "—";
    startedAt = performance.now();
    playing = true;
    log(`Target: ${targetShape} (${totalTargets} to find)`);
  }

  function handleClick(cell){
    if (!playing) return;
    const clicked = cell.dataset.shape;

    // empty tile -> treat as miss (stays neutral)
    if (!clicked) return;

    // already marked?
    if (cell.classList.contains("correct") || cell.classList.contains("wrong")) return;

    if (clicked !== targetShape){
      // wrong -> mark red + lose a life
      cell.classList.add("wrong");
      lives = Math.max(0, lives - 1);
      livesEl.textContent = lives;
      log(`Miss (${clicked}). Lives left: ${lives}`);
      if (lives === 0){
        endRound(false); // failed
      }
      return;
    }

    // correct -> mark blue; if all found, stop timer
    cell.classList.add("correct");
    foundTargets++;
    if (foundTargets === totalTargets){
      endRound(true); // success
    }
  }

  function endRound(success){
    playing = false;
    const total = performance.now() - startedAt;
    totalEl.textContent = ms(total);

    // Record for stats even on failure (optional but useful)
    roundTotals.push(total);

    // Update Best/Avg/Worst
    const best = Math.min(...roundTotals);
    const worst = Math.max(...roundTotals);
    const avg = roundTotals.reduce((a,b)=>a+b,0) / roundTotals.length;

    bestEl.textContent  = ms(best);
    worstEl.textContent = ms(worst);
    avgEl.textContent   = ms(avg);

    log(success ? `Completed in ${ms(total)}` : `Failed in ${ms(total)}`);
  }

  function resetAll(){
    roundTotals.length = 0;
    bestEl.textContent = avgEl.textContent = worstEl.textContent = totalEl.textContent = "—";
    if (logEl) logEl.textContent = "";
    startRound();
  }

  // Wire up buttons and draw initial grid
  btnStart.addEventListener("click", startRound);
  btnReset.addEventListener("click", resetAll);
  buildGrid();
});
