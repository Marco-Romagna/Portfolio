const shapes = ["circle","square","triangle"];
const CELLS = 25;
const OCCUPANCY = 0.65;

let targetShape = "";
let startTime = 0;
let lives = 3;
let playing = false;
let results = [];
let cells = [];

const board = document.getElementById("game-board");
const cdEl = document.getElementById("countdown");
const targetEl = document.getElementById("target");
const livesEl = document.getElementById("lives");
const lastEl = document.getElementById("last");
const bestEl = document.getElementById("best");
const avgEl = document.getElementById("avg");
const logEl = document.getElementById("log");
document.getElementById("start").onclick = startRound;
document.getElementById("reset").onclick = resetAll;

function ms(x){return `${Math.round(x)} ms`; }
function log(msg){ const d=document.createElement("div"); d.textContent=msg; logEl.prepend(d); }

function buildGrid(){
  board.innerHTML = "";
  cells = [];
  for(let i=0;i<CELLS;i++){
    const cell = document.createElement("div");
    cell.className = "cell";
    if(Math.random() < OCCUPANCY){
      const shape = shapes[Math.floor(Math.random()*shapes.length)];
      cell.dataset.shape = shape;
      cell.appendChild(makeShape(shape));
    } else {
      cell.dataset.shape = "";
    }
    cell.onclick = () => handleClick(cell);
    cells.push(cell);
    board.appendChild(cell);
  }
}

function makeShape(shape){
  if(shape === "triangle"){
    const tri = document.createElement("div");
    tri.className = "shape triangle";
    return tri;
  }
  const el = document.createElement("div");
  el.className = `shape ${shape}`;
  return el;
}

function countdown(n){
  cdEl.textContent = n;
  if(n>1) setTimeout(()=>countdown(n-1), 500);
  else    setTimeout(revealTarget, 400);
}

function revealTarget(){
  const present = cells.map(c=>c.dataset.shape).filter(Boolean);
  if(present.length===0){ buildGrid(); return revealTarget(); }
  targetShape = present[Math.floor(Math.random()*present.length)];
  targetEl.textContent = targetShape;
  startTime = performance.now();
  playing = true;
  log(`Target: ${targetShape}`);
}

function handleClick(cell){
  if(!playing) return;
  const s = cell.dataset.shape;
  if(!s) return; // empty cell

  if(s !== targetShape){
    // miss
    lives = Math.max(0, lives-1);
    livesEl.textContent = lives;
    cells.forEach(c=>{
      if(c.dataset.shape===s){ c.classList.add("flash"); setTimeout(()=>c.classList.remove("flash"),200); }
    });
    log(`Miss (${s}). Lives left: ${lives}`);
    if(lives===0){ playing=false; log("Out of lives. Round over."); }
    return;
  }

  // hit
  const rt = performance.now() - startTime;
  playing = false;
  results.push(rt);
  lastEl.textContent = ms(rt);
  bestEl.textContent = ms(Math.min(...results));
  avgEl.textContent  = ms(results.reduce((a,b)=>a+b,0)/results.length);
  log(`Hit ${targetShape} in ${ms(rt)}`);
}

function startRound(){
  resetRoundUI();
  lives = 3; livesEl.textContent = lives;
  buildGrid();
  countdown(3);
}

function resetRoundUI(){
  cdEl.textContent = "—";
  targetEl.textContent = "—";
  playing = false;
}

function resetAll(){
  results = [];
  lastEl.textContent = bestEl.textContent = avgEl.textContent = "—";
  logEl.textContent = "";
  startRound();
}

// kick off an initial render
buildGrid();
