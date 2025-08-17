// games/2025-08-15/reaction-room/js/game.js

window.addEventListener('DOMContentLoaded', () => {
  /* ===================== Config ===================== */
  const ROWS = 6, COLS = 5;
  const CELLS = ROWS * COLS;
  const OCC_MIN = 0.58, OCC_MAX = 0.69;   // board occupancy per round
  const COUNT_SECONDS = 7;                // countdown before reveal
  const COUNT_INTERVAL = 1000;            // 1s ticks
  const TARGETS_TO_COMPLETE = 12;         // end after N correct hits

  const BASIC   = ["circle","square","triangle"];
  const SUITS   = ["club","heart","diamond","spade"];
  const SPECIAL = ["star","moon","bolt","shield"];
  const GUARANTEED = {
    club:1, heart:1, diamond:1, spade:1,
    star:1, moon:1,
    bolt:2, shield:2
  };
  const WEIGHTS = {
    circle:6, square:6, triangle:6,
    bolt:0.5, shield:0.5,
    club:0.25, heart:0.25, diamond:0.25, spade:0.25,
    star:0, moon:0
  };
  const NON_TARGET = new Set(["shield"]);

  /* ===================== Elements ===================== */
  const board     = document.getElementById("game-board");
  const livesEl   = document.getElementById("lives");
  const bestEl    = document.getElementById("best");
  const avgEl     = document.getElementById("avg");
  const worstEl   = document.getElementById("worst");
  const totalEl   = document.getElementById("total");
  const logEl     = document.getElementById("log");
  const btnStart  = document.getElementById("start");
  const btnReset  = document.getElementById("reset");
  const preview   = document.getElementById("targetPreview"); // Big preview box

  // Results modal
  const modal   = document.getElementById("resultsModal");
  const mBest   = document.getElementById("m-best");
  const mAvg    = document.getElementById("m-avg");
  const mWorst  = document.getElementById("m-worst");
  const mTotal  = document.getElementById("m-total");
  const mSplits = document.getElementById("m-splits");
  const btnClose= document.getElementById("closeModal");
  const btnAgain= document.getElementById("playAgain");

  /* ===================== Round State ===================== */
  let occupancy = 0.62;
  let lives = 3;
  let playing = false;

  let cells = [];
  let shapes = new Array(CELLS).fill("");
  let targetShape = null;

  let usedTargets = new Set();

  let startedAt = 0;
  let lastSplitAt = 0;
  let clickSplits = [];
  let splitDetails = [];

  let lock = null;
  let nextLock = null;
  let forbidNext = new Set();

  let countdownTimer = null, revealTimer = null;

  /* ===================== Utils ===================== */
  const ms = x => `${Math.round(x)} ms`;
  const rowOf = i => Math.floor(i / COLS);
  const colOf = i => i % COLS;
  function log(msg){ if (!logEl) return; const d=document.createElement("div"); d.textContent=msg; logEl.prepend(d); }
  function clearTimers(){ if (countdownTimer){clearInterval(countdownTimer);countdownTimer=null;} if (revealTimer){clearTimeout(revealTimer);revealTimer=null;} }
  function resetStatsUI(){ bestEl.textContent=avgEl.textContent=worstEl.textContent=totalEl.textContent="—"; }

  function glyphFor(shape){
    switch (shape){
      case "club":return "♣"; case "heart":return "♥"; case "diamond":return "♦"; case "spade":return "♠";
      case "star":return "★"; case "moon":return "☾"; case "bolt":return "⚡"; case "shield":return "🛡";
      default:return null;
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
    if (!shape){ setPreview(null); return; }
    setPreview(shape);
  }

  function showBigCountdown(n){
    if (!preview) return;
    preview.innerHTML = `<div class="big-count">${n}</div>`;
  }

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

  /* ===================== Core Game Loop ===================== */
  function startCountdown(){
    let n = COUNT_SECONDS;
    showBigCountdown(n);
    countdownTimer = setInterval(() => {
      n--;
      if (n <= 0){
        clearInterval(countdownTimer);
        countdownTimer=null;
        setTarget(pickTarget());
      } else {
        showBigCountdown(n);
      }
    }, COUNT_INTERVAL);
  }

  function pickTarget(){
    // (Original target selection logic left untouched)
    const pool = [...BASIC,...SUITS,...SPECIAL].filter(x=>!NON_TARGET.has(x));
    let pick;
    do { pick = pool[Math.floor(Math.random()*pool.length)]; }
    while (usedTargets.has(pick) && usedTargets.size < pool.length);
    usedTargets.add(pick);
    return pick;
  }

  /* ===================== Event Binding ===================== */
  btnStart.addEventListener("click", ()=>{
    playing=true; usedTargets.clear();
    startCountdown();
  });

  btnReset.addEventListener("click", ()=>{
    clearTimers();
    playing=false; usedTargets.clear();
    setTarget(null);
    preview.innerHTML="";
  });

});
