// Start screen + fixed difficulty: A=start/confirm, B=cancel&judge, timer & race-safe

(async function () {
  // Elements
  const imgA = document.getElementById("imgA");
  const imgB = document.getElementById("imgB");
  const flash = document.getElementById("flash");
  const btnA = document.getElementById("a-button");
  const btnB = document.getElementById("b-button");
  const timerEl = document.getElementById("timer");
  const startScreen = document.getElementById("start-screen");
  const startButtons = startScreen?.querySelectorAll(".mode-btn");

  // HUD (no mode selector here)
  const hudCurrent = document.getElementById("hud-current");
  const hudRule    = document.getElementById("hud-rule");
  const hudScore   = document.getElementById("hud-score");
  const hudLives   = document.getElementById("hud-lives");
  const hudMult    = document.getElementById("hud-mult");

  // Settings
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base  = settings.sprites.base_url;
  const ext   = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end   = settings.sprites.range.end   || 1025;

  // Modes (interval = baseInterval / factor)
  const modes = {
    easy:   { speedFactor: 0.4, limitMs: 16000 },
    medium: { speedFactor: 0.8, limitMs: 11000 },
    hard:   { speedFactor: 1.0, limitMs:  7000 }
  };
  const baseInterval = 500;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // State
  let mode = null;            // chosen at start
  let currentId   = null;
  let candidateId = null;
  let deadline    = 0;
  let score = 0, lives = 3, mult = 1;
  let rule = "higher";

  // Loop/session control (prevents race conditions)
  let session = 0;
  let rolling = false;
  let debouncing = false;

  // Helpers
  const randId    = () => Math.floor(Math.random() * (end - start + 1)) + start;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor    = (id) => `${base}${id}${ext}`;
  const sleep     = (ms) => new Promise(r => setTimeout(r, ms));
  const now       = () => performance.now();

  const currentInterval = () => reducedMotion ? 240 : (baseInterval / (modes[mode]?.speedFactor || 1.0));

  function setHUD() {
    if (hudCurrent) hudCurrent.textContent = currentId ? `#${String(currentId).padStart(3,"0")}` : "#—";
    if (hudScore)   hudScore.textContent   = String(score);
    if (hudLives)   hudLives.textContent   = String(lives);
    if (hudMult)    hudMult.textContent    = `x${mult}`;
    if (hudRule) {
      hudRule.textContent = rule === "higher" ? "Higher" : "Lower";
      hudRule.classList.toggle("higher", rule === "higher");
      hudRule.classList.toggle("lower",  rule === "lower");
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
    const ms = Math.max(0, deadline - now());
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

  // --- Start screen flow ---

  function showStart() {
    // blank the stage visuals
    imgA.style.opacity = 0;
    imgB.style.opacity = 0;
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
    startScreen?.classList.remove("hidden");
  }

  function hideStart() {
    startScreen?.classList.add("hidden");
  }

  // --- Rolling machinery with session token ---

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
      if (now() >= deadline) {
        await stopAndJudge(true);
        break;
      }
      await sleep(60);
    }
  }

  // --- Actions ---

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

  async function confirm() {
    await stopAndJudge(false);
  }

  async function stopAndJudge(fromTimeout = false) {
    if (!rolling) return;

    // cancel async loops
    session++;
    rolling = false;

    // lock visuals on candidate before flash (prevents stray swap)
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
      mult += 1;
      currentId = candidateId;
    } else {
      lives -= 1;
      mult = 1;
    }

    // settle
    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    setHUD();

    // game over -> back to start screen
    if (lives <= 0) {
      lives = 3; score = 0; mult = 1;
      await showInstant(randId()); // preload next start mon
      showStart();
      mode = null;                // force re-pick difficulty next game
      return;                     // don't roll a new rule yet
    }

    // next round
    newRule();
  }

  // Debounce helper
  function withDebounce(fn, ms = 120) {
    return (...args) => {
      if (debouncing) return;
      debouncing = true;
      try { fn(...args); } finally {
        setTimeout(() => { debouncing = false; }, ms);
      }
    };
  }

  // Inputs
  const onA = withDebounce(() => {
    if (!mode) return; // no difficulty chosen yet
    if (!rolling) startRoll();
    else confirm();
  });

  const onB = withDebounce(() => {
    if (!mode) return;
    if (!rolling) return;
    stopAndJudge(false);
  });

  // Start buttons (choose difficulty and reveal the first mon)
  startButtons?.forEach(btn => {
    btn.addEventListener("click", async () => {
      const m = btn.getAttribute("data-mode");
      if (!modes[m]) return;
      mode = m;

      // reveal the first Pokémon (was hidden)
      if (!currentId) {
        await showInstant(randId());
      } else {
        imgA.style.opacity = 1;
      }

      hideStart();
      // Pick the first rule; player can now press A to start rolling
      newRule();
    });
  });

  // Init — preload a starting Pokémon but keep it hidden behind the overlay
  currentId = randId();
  imgA.src = urlFor(currentId);
  imgA.style.opacity = 0; // hidden until mode picked
  imgB.style.opacity = 0;
  if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
  setHUD(); // shows #--- until game begins
  showStart();

  // Bind controls
  btnA?.addEventListener("click", onA);
  btnB?.addEventListener("click", onB);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onA();
    if (e.key.toLowerCase() === "b" || e.key === "Escape") onB();
  });
})();
