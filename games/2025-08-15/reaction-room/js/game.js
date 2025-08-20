// Start screen + fixed difficulty + timer + end screen
// A = start (if idle) / confirm (if rolling)
// B = cancel & judge immediately (while rolling)

(async function () {
  // --- Stage elements ---
  const imgA    = document.getElementById("imgA");
  const imgB    = document.getElementById("imgB");
  const flash   = document.getElementById("flash");
  const timerEl = document.getElementById("timer");
  const stage   = document.getElementById("stage");

  // --- Controls ---
  const btnA     = document.getElementById("a-button");
  const btnB     = document.getElementById("b-button");
  const controls = document.getElementById("controls");

  // --- Overlays ---
  const startScreen  = document.getElementById("start-screen");
  const startButtons = startScreen?.querySelectorAll(".mode-btn");
  const endScreen    = document.getElementById("end-screen");
  const finalScore   = document.getElementById("final-score");
  const playAgain    = document.getElementById("play-again");

  // --- HUD (display only) ---
  const hud        = document.querySelector(".revo-hud");
  const hudCurrent = document.getElementById("hud-current");
  const hudRule    = document.getElementById("hud-rule");
  const hudScore   = document.getElementById("hud-score");
  const hudLives   = document.getElementById("hud-lives");
  const hudMult    = document.getElementById("hud-mult");
  const hudMode    = document.getElementById("hud-mode");

  // --- Settings (sprite source) ---
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base  = settings.sprites.base_url;
  const ext   = settings.sprites.file_extension || ".png";
  const rangeStart = settings.sprites.range.start || 1;
  const rangeEnd   = settings.sprites.range.end   || 1025;

  // --- Pokédex meta ---
  const GEN_STARTS = [1, 152, 252, 387, 494, 650, 722, 810, 906];
  const MAX_DEX = rangeEnd;

  // --- Modes ---
  const modes = {
    easy:   { speedFactor: 0.4, limitMs: 16000 },
    medium: { speedFactor: 0.8, limitMs: 11000 },
    hard:   { speedFactor: 1.0, limitMs:  7000 }
  };
  const baseInterval   = 500;
  const reducedMotion  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Game state ---
  let mode       = null;
  let gameActive = false;
  let currentId  = null;
  let candidateId= null;
  let deadline   = 0;
  let score      = 0;
  let lives      = 3;
  let mult       = 1;
  let rule       = "higher";
  let session    = 0;
  let rolling    = false;
  let debouncing = false;

  // --- Helpers ---
  const randId    = () => Math.floor(Math.random() * (rangeEnd - rangeStart + 1)) + rangeStart;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor    = (id) => `${base}${id}${ext}`;
  const sleep     = (ms) => new Promise(r => setTimeout(r, ms));
  const now       = () => performance.now();
  const cap       = (s) => s ? s[0].toUpperCase() + s.slice(1) : "—";
  const currentInterval = () => reducedMotion ? 240 : (baseInterval / (modes[mode]?.speedFactor || 1.0));

  // ---------- Pokédex Rail ----------
  let railEl, railFillEl, needleEl, needleLabelEl;

  function buildPokedexRail(){
    railEl = document.getElementById("pokedex-rail");
    if (!railEl) return;

    railFillEl = railEl.querySelector(".rail-fill");
    if (!railFillEl){
      railFillEl = document.createElement("div");
      railFillEl.className = "rail-fill";
      railEl.appendChild(railFillEl);
    }

    needleEl = railEl.querySelector(".needle");
    needleLabelEl = railEl.querySelector(".needle .needle-label");
    if (!needleEl){
      needleEl = document.createElement("div");
      needleEl.className = "needle";
      needleLabelEl = document.createElement("span");
      needleLabelEl.className = "needle-label";
      needleLabelEl.textContent = "#—";
      needleEl.appendChild(needleLabelEl);
      railEl.appendChild(needleEl);
    }
  }

  function setRailMode(m){
    if (!railEl) return;
    railEl.classList.remove("easy","medium","hard");
    railEl.classList.add(m || "easy");
  }

  function clearGenMarkers(){
    if (!railEl) return;
    railEl.querySelectorAll(".gen-marker").forEach(n => n.remove());
  }

  function renderGenMarkers(currentMode){
    if (!railEl) return;
    clearGenMarkers();
    if (currentMode === "hard") return;

    GEN_STARTS.forEach((startNum, idx) => {
      const posPct = Math.max(0, Math.min(100, (startNum / MAX_DEX) * 100));
      const el = document.createElement("div");
      el.className = "gen-marker";
      el.style.bottom = posPct + "%";
      el.textContent  = (currentMode === "easy") ? `Gen ${idx+1} (${startNum})` : `Gen ${idx+1}`;
      railEl.appendChild(el);
    });
  }

  function updateRail(dex){
    if (!railEl || !railFillEl || !needleEl || !needleLabelEl) return;
    const pct = Math.max(0, Math.min(100, (dex / MAX_DEX) * 100));
    railFillEl.style.height = pct + "%";
    needleEl.style.bottom   = pct + "%";
    needleLabelEl.textContent = `#${String(dex).padStart(3,"0")}`;
  }

  // ---------- UI ----------
  function setGameActive(active){
    gameActive = active;
    // Show/hide A/B controls only if you want; we keep them visible.
    controls?.classList.toggle("hidden", false);
    hud?.classList.toggle("inactive", !active);
  }

  function setHUD(){
    if (hudCurrent) hudCurrent.textContent = (gameActive && currentId) ? `#${String(currentId).padStart(3,"0")}` : "#—";
    if (hudScore)   hudScore.textContent   = String(gameActive ? score : 0);
    if (hudLives)   hudLives.textContent   = String(gameActive ? lives : 3);
    if (hudMult)    hudMult.textContent    = `x${gameActive ? mult : 1}`;
    if (hudMode)    hudMode.textContent    = cap(mode);
    if (hudRule){
      const txt = gameActive ? (rule === "higher" ? "Higher" : "Lower") : "—";
      hudRule.textContent = txt;
      hudRule.classList.toggle("higher", gameActive && rule === "higher");
      hudRule.classList.toggle("lower",  gameActive && rule === "lower");
    }
    if (currentId != null) updateRail(currentId);
  }

  function newRule(){ rule = Math.random() < 0.5 ? "higher" : "lower"; setHUD(); }

  async function showInstant(id){
    currentId = id;
    imgA.src = urlFor(id);
    imgB.src = "";
    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;
    if (timerEl){ timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
    setHUD();
  }

  function updateTimer(){
    if (!timerEl || !rolling) return;
    const ms = Math.max(0, deadline - now());
    const sec = (ms / 1000).toFixed(1);
    timerEl.textContent = sec;
    timerEl.classList.toggle("warn", ms <= 3000);
  }

  function pop(el, durMs = 250){
    el.style.transition = `transform ${durMs}ms cubic-bezier(.2,1,.2,1)`;
    el.style.transform  = "scale(0.9)";
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
      setTimeout(() => { el.style.transition = ""; el.style.transform = ""; }, durMs + 20);
    });
  }

  // --- Overlay helpers ---
  const showStart = () => startScreen?.classList.remove("hidden");
  const hideStart = () => startScreen?.classList.add("hidden");
  const showEnd   = () => endScreen?.classList.remove("hidden");
  const hideEnd   = () => endScreen?.classList.add("hidden");

  // --- Rolling machinery ---
  async function prepRoll(id){
    imgA.src = urlFor(currentId ?? randId());
    imgB.src = urlFor(id);
    imgA.classList.remove("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;
    if (timerEl) timerEl.classList.remove("warn");
  }

  async function rollLoop(mySession){
    while (rolling && mySession === session){
      const showB = imgB.style.opacity !== "1";
      imgA.classList.add("silhouette");
      imgB.classList.add("silhouette");
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;
      updateTimer();
      await sleep(currentInterval());
    }
  }

  async function watchdogLoop(mySession){
    while (rolling && mySession === session){
      updateTimer();
      if (now() >= deadline){ await stopAndJudge(true); break; }
      await sleep(60);
    }
  }

  async function startRoll(){
    session++; const mySession = session; rolling = true;
    candidateId = pickOther(); await prepRoll(candidateId);
    deadline = now() + (modes[mode]?.limitMs || 7000);
    rollLoop(mySession); watchdogLoop(mySession);
  }

  async function stopAndJudge(fromTimeout = false){
    if (!rolling) return;
    session++; rolling = false;

    imgA.classList.add("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 0; imgB.style.opacity = 1;

    if (timerEl){ timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

    flash.style.opacity = 1; await sleep(120); flash.style.opacity = 0;

    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0; imgB.style.opacity = 1; pop(imgB, 250);

    const ok = rule === "higher" ? candidateId > currentId : candidateId < currentId;
    if (ok){ score += mult; mult += 1; currentId = candidateId; }
    else { lives -= 1; mult = 1; }

    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1; imgB.style.opacity = 0; setHUD();

    if (lives <= 0){
      if (finalScore) finalScore.textContent = String(score);
      setGameActive(false); showEnd(); return;
    }
    newRule();
  }

  // --- Debounce ---
  function withDebounce(fn, ms = 120){
    return (...args) => {
      if (debouncing) return;
      debouncing = true;
      try { fn(...args); } finally { setTimeout(() => debouncing = false, ms); }
    };
  }

  // --- Inputs ---
  const onA = withDebounce(() => {
    if (!gameActive) return;
    if (!rolling) startRoll(); else stopAndJudge(false);
  });
  const onB = withDebounce(() => {
    if (!gameActive || !rolling) return;
    stopAndJudge(false);
  });

  btnA?.addEventListener("click", onA);
  btnB?.addEventListener("click", onB);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onA();                 // A
    if (e.key.toLowerCase() === "b" || e.key === "Escape") onB();  // B
  });

  // --- Start buttons ---
  startButtons?.forEach(btn => {
    btn.addEventListener("click", async () => {
      const m = btn.getAttribute("data-mode");
      if (!modes[m]) return;
      mode = m;

      score = 0; lives = 3; mult = 1;
      setGameActive(true);

      setRailMode(mode);
      renderGenMarkers(mode);

      if (!currentId) currentId = randId();
      await showInstant(currentId);

      hideEnd(); hideStart(); newRule();
    });
  });

  // --- Play Again ---
  playAgain?.addEventListener("click", async () => {
    setGameActive(false); mode = null;

    clearGenMarkers(); setRailMode("easy"); // default look when idle

    currentId = randId();
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 0; imgB.style.opacity = 0;
    if (timerEl){ timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
    setHUD(); hideEnd(); showStart();
  });

  // --- Initial boot ---
  buildPokedexRail();

  currentId = randId();
  imgA.src = urlFor(currentId);
  imgA.style.opacity = 0; imgB.style.opacity = 0;
  if (timerEl){ timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
  setRailMode("easy"); renderGenMarkers("easy"); updateRail(currentId);
  setGameActive(false); setHUD(); showStart();
})();
