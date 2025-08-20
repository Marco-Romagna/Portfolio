// Start screen + fixed difficulty + timer + end screen
// A = start (if idle) / confirm (if rolling)
// B = cancel & judge immediately (while rolling)
// A/B disabled outside an active game; HUD Current/Score/Mult/Lives hidden outside a game

(async function () {
  // --- Stage elements ---
  const imgA     = document.getElementById("imgA");
  const imgB     = document.getElementById("imgB");
  const flash    = document.getElementById("flash");
  const timerEl  = document.getElementById("timer");
  const stage    = document.getElementById("stage");

  // --- Rail elements (container exists in HTML)
  const rail        = document.getElementById("pokedex-rail");
  const railTrack   = rail.querySelector(".rail-track");
  const railFill    = rail.querySelector(".rail-fill");
  const railNeedle  = rail.querySelector(".rail-needle");
  const needleLine  = railNeedle.querySelector(".needle-line");
  const needleLabel = railNeedle.querySelector(".needle-label");

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

  // --- HUD (display only; no mode selector) ---
  const hud        = document.querySelector(".revo-hud");
  const hudCurrent = document.getElementById("hud-current");
  const hudRule    = document.getElementById("hud-rule");
  const hudScore   = document.getElementById("hud-score");
  const hudLives   = document.getElementById("hud-lives");
  const hudMult    = document.getElementById("hud-mult");
  const hudMode    = document.getElementById("hud-mode");

  // --- Settings (sprite source) ---
  const settingsURL = new URL("../settings.json", import.meta.url);
  const res = await fetch(settingsURL, { cache: "no-store" });
  const settings = await res.json();
  
  const base  = settings.sprites.base_url;
  const ext   = settings.sprites.file_extension;
  const start = settings.sprites.range.start;
  const end   = settings.sprites.range.end;
  // --- National Dex meta for the rail ---
  const GEN_STARTS = [1, 152, 252, 387, 494, 650, 722, 810, 906]; // Gen 1..9
  const MAX_DEX    = end;

  // --- Modes (interval = baseInterval / factor) ---
  const modes = {
    easy:   { speedFactor: 0.4, limitMs: 16000 },
    medium: { speedFactor: 0.8, limitMs: 11000 },
    hard:   { speedFactor: 1.0, limitMs:  7000 }
  };
  const baseInterval   = 500;
  const reducedMotion  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // --- Game state ---
  let mode         = null;          // chosen on start screen
  let gameActive   = false;         // true only during an active game (between start pick and game over)
  let currentId    = null;
  let candidateId  = null;
  let deadline     = 0;             // epoch ms when we auto-confirm
  let score        = 0;
  let lives        = 3;
  let mult         = 1;
  let rule         = "higher";      // "higher" | "lower"

  // --- Loop/session control (prevents races) ---
  let session      = 0;
  let rolling      = false;
  let debouncing   = false;

  // --- Helpers ---
  const randId    = () => Math.floor(Math.random() * (end - start + 1)) + start;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor    = (id) => `${base}${id}${ext}`;
  const sleep     = (ms) => new Promise(r => setTimeout(r, ms));
  const now       = () => performance.now();
  const cap       = (s) => s ? s[0].toUpperCase() + s.slice(1) : "—";

  const currentInterval = () =>
    reducedMotion ? 240 : (baseInterval / (modes[mode]?.speedFactor || 1.0));

  /* ==============================
     Pokédex Rail rendering
     ============================== */

  function pctForDex(n) {
    const clamped = Math.max(1, Math.min(MAX_DEX, n || 1));
    return (clamped / MAX_DEX) * 100;
  }

  function clearRailDecor() {
    railTrack.querySelectorAll(".rail-divider, .rail-badge, .rail-left-label").forEach(el => el.remove());
  }

  function renderRailDecor(currentMode) {
    clearRailDecor();

    // Hard mode: only the fill + needle
    if (currentMode === "hard") return;

    GEN_STARTS.forEach((startNum, idx) => {
      const pos = pctForDex(startNum);

      // divider across the rail
      const divider = document.createElement("div");
      divider.className = "rail-divider";
      divider.style.bottom = pos + "%";
      railTrack.appendChild(divider);

      // badge inside the rail
      const badge = document.createElement("div");
      badge.className = "rail-badge";
      badge.style.bottom = pos + "%";
      badge.textContent = `GEN ${idx + 1}`;
      railTrack.appendChild(badge);

      // left-side number label only in Easy
      if (currentMode === "easy") {
        const lab = document.createElement("div");
        lab.className = "rail-left-label";
        lab.style.bottom = pos + "%";
        lab.textContent = `(${startNum})`;
        railTrack.appendChild(lab);
      }
    });
  }

  function updateRail(dexNumber, currentMode) {
    // show contents (the rail column itself is always present)
    rail.classList.remove("pokedex-rail--hidden");

    const pct = pctForDex(dexNumber);
    railFill.style.height = pct + "%";

    // position the needle at the same pct
    railNeedle.style.bottom = pct + "%";
    needleLine.style.width = "100%";
    needleLabel.textContent = `#${dexNumber ?? "—"}`;

    // Re-render decor when mode changes (cheap & idempotent)
    renderRailDecor(currentMode || "easy");
  }

  /* ==============================
     Game UI / HUD
     ============================== */

  function setGameActive(active) {
    gameActive = active;
    // Hide or show A/B controls
    controls?.classList.toggle("hidden", !active);
    // Hide HUD side blocks when inactive (if you have HUD)
    hud?.classList.toggle("inactive", !active);

    // Show/hide rail CONTENTS but keep the column to prevent shifting
    rail.classList.toggle("pokedex-rail--hidden", !active);
  }

  function setHUD() {
    if (hudCurrent) hudCurrent.textContent = (gameActive && currentId) ? `#${String(currentId).padStart(3,"0")}` : "#—";
    if (hudScore)   hudScore.textContent   = String(gameActive ? score : 0);
    if (hudLives)   hudLives.textContent   = String(gameActive ? lives : 3);
    if (hudMult)    hudMult.textContent    = `x${gameActive ? mult : 1}`;
    if (hudMode)    hudMode.textContent    = cap(mode);
    if (hudRule) {
      const txt = gameActive ? (rule === "higher" ? "Higher" : "Lower") : "—";
      hudRule.textContent = txt;
      hudRule.classList.toggle("higher", gameActive && rule === "higher");
      hudRule.classList.toggle("lower",  gameActive && rule === "lower");
    }

    if (currentId != null) updateRail(currentId, mode || "easy");
  }

  function newRule() {
    rule = Math.random() < 0.5 ? "higher" : "lower";
    setHUD();
  }

  async function showInstant(id) {
    currentId = id;
    imgA.src = urlFor(id);
    imgB.src = "";
    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
    setHUD();
  }

  function updateTimer() {
    if (!timerEl || !rolling) return;
    const ms  = Math.max(0, deadline - now());
    const sec = (ms / 1000).toFixed(1);
    timerEl.textContent = sec;
    timerEl.classList.toggle("warn", ms <= 3000);
  }

  function pop(el, durMs = 250) {
    el.style.transition = `transform ${durMs}ms cubic-bezier(.2,1,.2,1)`;
    el.style.transform  = "scale(0.9)";
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
      setTimeout(() => { el.style.transition = ""; el.style.transform = ""; }, durMs + 20);
    });
  }

  // --- Overlay helpers ---
  function showStart() { startScreen?.classList.remove("hidden"); }
  function hideStart() { startScreen?.classList.add("hidden"); }
  function showEnd()   { endScreen?.classList.remove("hidden"); }
  function hideEnd()   { endScreen?.classList.add("hidden"); }

  // --- Rolling machinery (session token protects from races) ---
  async function prepRoll(id) {
    imgA.src = urlFor(currentId ?? randId());
    imgB.src = urlFor(id);
    imgA.classList.remove("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;
    if (timerEl) timerEl.classList.remove("warn");
  }

  async function rollLoop(mySession) {
    while (rolling && mySession === session) {
      const showB = imgB.style.opacity !== "1";
      imgA.classList.add("silhouette");
      imgB.classList.add("silhouette");
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;
      updateTimer();
      await sleep(currentInterval());
    }
  }

  async function watchdogLoop(mySession) {
    while (rolling && mySession === session) {
      updateTimer();
      if (now() >= deadline) { await stopAndJudge(true); break; }
      await sleep(60);
    }
  }

  async function startRoll() {
    session++;
    const mySession = session;
    rolling = true;

    candidateId = pickOther();
    await prepRoll(candidateId);

    deadline = now() + (modes[mode]?.limitMs || 7000);
    rollLoop(mySession);
    watchdogLoop(mySession);
  }

  async function stopAndJudge(fromTimeout = false) {
    if (!rolling) return;

    // cancel loops immediately
    session++;
    rolling = false;

    // lock visuals on candidate BEFORE flash to avoid a stray swap
    imgA.classList.add("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;

    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

    // reveal
    flash.style.opacity = 1;
    await sleep(120);
    flash.style.opacity = 0;

    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;
    pop(imgB, 250);

    // judge
    const ok = rule === "higher" ? candidateId > currentId : candidateId < currentId;
    if (ok) {
      score += mult;
      mult  += 1;
      currentId = candidateId;
    } else {
      lives -= 1;
      mult   = 1;
    }

    // settle back to A layer
    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    setHUD();

    // game over -> end screen (disable game; wait for Play Again)
    if (lives <= 0) {
      if (finalScore) finalScore.textContent = String(score);
      setGameActive(false);
      showEnd();
      return;
    }

    // next round instruction
    newRule();
  }

  // --- Debounce (prevents double taps) ---
  function withDebounce(fn, ms = 120) {
    return (...args) => {
      if (debouncing) return;
      debouncing = true;
      try { fn(...args); } finally {
        setTimeout(() => { debouncing = false; }, ms);
      }
    };
  }

  // --- Inputs ---
  const onA = withDebounce(() => {
    if (!gameActive) return;
    if (!rolling) startRoll();
    else stopAndJudge(false);
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

  // --- Start buttons: pick difficulty → reveal first mon (no auto-roll) ---
  startButtons?.forEach(btn => {
    btn.addEventListener("click", async () => {
      const m = btn.getAttribute("data-mode");
      if (!modes[m]) return;
      mode = m;

      // Begin a new game (activate UI)
      score = 0; lives = 3; mult = 1;
      setGameActive(true);

      // Render rail decor for the chosen mode
      renderRailDecor(mode);

      // Reveal the first Pokémon (no auto-roll)
      if (!currentId) currentId = randId();
      await showInstant(currentId);

      hideEnd();
      hideStart();
      newRule();   // show "Higher" / "Lower" in HUD (if present)
    });
  });

  // --- Play Again: reset state and return to difficulty picker ---
  playAgain?.addEventListener("click", async () => {
    // reset game state (inactive until a difficulty is picked again)
    setGameActive(false);
    mode  = null;

    // Clear rail decor while inactive, but keep column from shifting
    clearRailDecor();
    railFill.style.height = "0%";
    railNeedle.style.bottom = "0%";
    needleLabel.textContent = "#—";

    // pick & preload a new starting Pokémon; keep it on stage but HUD hidden
    currentId = randId();
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 0;
    imgB.style.opacity = 0;
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
    setHUD();

    hideEnd();
    showStart();
  });

  // --- Initial boot: preload a starting Pokémon, keep rail column visible (contents hidden) ---
  currentId = randId();
  imgA.src = urlFor(currentId);
  imgA.style.opacity = 0;
  imgB.style.opacity = 0;
  if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

  rail.classList.add("pokedex-rail--hidden"); // reserve column but hide contents
  setGameActive(false);
  setHUD();
  showStart();
})();
