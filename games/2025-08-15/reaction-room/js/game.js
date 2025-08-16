// ----- Config -----
const SHAPES = ["circle","square","triangle"];
const CELLS = 25;            // 5x5
const OCCUPANCY = 0.65;      // ~65% of tiles have a shape
const COUNT_DELAY = 500;     // ms between 3-2-1

// ----- State -----
let targetShape = null;
let lives = 3;
let playing = false;
let startedAt = 0;
let results = [];
let cells = [];
let countdownTimer = null;
let revealTimer = null;

// ----- DOM -----
const board   = document.getElementById("game-board");
const cdEl    = document.getElementById("countdown");
const targetEl= document.getElementById("target");
const livesEl = document.getElementById("lives");
const lastEl  = document.getElementById("last");
const bestEl  = document.getElementById("best");
const avgEl   = document.getElementById("avg");
const logEl   = document.getElementById("log");

document.getElementById("start").addEventListener("click", startRound);
document.getElementById("reset").addEventListener("click", resetAll);

// ----- Utils -----
const ms = x => `${Math.round(x)} ms`;
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

// ----- Grid -----
function buildGrid(){
  board.innerHTML = "";
  cells = [];
  for (let i=0;i<CELLS;i++){
    const cell = document.createElement("div");
    cell.className = "cell";
    if (Math.random() < OCCUPANCY){
      const shape = SHAPES[Math.floor(Math.random()*SHAPES.length)];
      cell.dataset.shape = shape;
      cell.appendChild(makeShape(shape));
    } else {
      cell.dataset.shape = "";
    }
    cell.addEventListener("click", () => handleClick(cell));
    cells.push(cell);
    board.appendChild(cell);
  }
}
function makeShape(shape){
  if (shape === "triangle"){
    const tri = document.createElement("div");
    tri.className = "shape triangle";
    return tri;
  }
  const el = document.createElement("div");
  el.className = `shape ${shape}`;
  return el;
}

// ----- Round flow -----
function startRound(){
  // reset UI for a new round
  clearTimers();
  playing = false;
  targetShape = null;
  cdEl.textContent = "3";
  targetEl.textContent = "—";
  lives = 3;
  livesEl.textContent = lives;

  buildGrid();
  // side countdown 3-2-1 then reveal target that exists on the board
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
  // choose a target from shapes actually present
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
  if (!clicked) return; // empty tile ignored

  if (clicked !== targetShape){
    // miss → lose a life and flash wrong-shape tiles
    lives = Math.max(0, lives - 1);
    livesEl.textContent = lives;
    cells.forEach(c=>{
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

  // hit → record RT
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
  logEl && (logEl.textContent = "");
  startRound();
}

// initial render: draw an empty board so layout looks right
buildGrid();
