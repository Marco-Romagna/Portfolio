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
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base  = settings.sprites.base_url;
  const ext   = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end   = settings.sprites.range.end   || 1025;

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
  let session      = 0;             // bump to cancel loops
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

  // Toggle global game UI/inputs availability
  function setGameActive(active) {
    gameActive = active;
    controls?.classList.toggle("disabled", !active);
    hud?.classList.toggle("inactive", !active); // hides Current + Score/Mult/Lives when inactive
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
      setGameActive(false);  // disables A/B and hides HUD left/right
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
    if (!gameActive) return;   // ignore outside active game
    if (!rolling) startRoll(); // start
    else stopAndJudge(false);  // confirm
  });

  const onB = withDebounce(() => {
    if (!gameActive || !rolling) return;
    stopAndJudge(false);       // cancel & judge immediately
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
      setGameActive(true);       // enables A/B, shows HUD left/right

      // Reveal the first Pokémon (was hidden), but DO NOT start rolling yet
      if (!currentId) currentId = randId();
      await showInstant(currentId);

      hideEnd();   // in case we're restarting after game over
      hideStart(); // remove title + difficulty buttons
      newRule();   // show "Higher" / "Lower" in the HUD
      // Wait for player to press A to start the roll
    });
  });

  // --- Play Again: reset state and return to difficulty picker ---
  playAgain?.addEventListener("click", async () => {
    // reset game state (inactive until a difficulty is picked again)
    setGameActive(false);
    mode  = null;

    // pick & preload a new starting Pokémon; keep it on stage but HUD left/right hidden
    currentId = randId();
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 0; // hidden until difficulty chosen
    imgB.style.opacity = 0;
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
    setHUD();

    hideEnd();
    showStart();
  });

  // --- Initial boot: preload a starting Pokémon, keep UI inactive, show start screen ---
  currentId = randId();
  imgA.src = urlFor(currentId);
  imgA.style.opacity = 0; // hidden until a difficulty is chosen
  imgB.style.opacity = 0;
  if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
  setGameActive(false);   // disables A/B; hides Current/Score/Mult/Lives
  setHUD();               // HUD shows placeholders
  showStart();            // overlay visible until difficulty picked
})();
