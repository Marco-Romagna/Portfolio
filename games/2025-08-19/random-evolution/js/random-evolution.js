// Higher / Lower with modes + timer: A = start/confirm, B = cancel & judge
(async function () {
  // Elements
  const imgA = document.getElementById("imgA");
  const imgB = document.getElementById("imgB");
  const flash = document.getElementById("flash");
  const btnA = document.getElementById("a-button");
  const btnB = document.getElementById("b-button");
  const timerEl = document.getElementById("timer");

  // HUD
  const hudCurrent = document.getElementById("hud-current");
  const hudRule    = document.getElementById("hud-rule");
  const hudScore   = document.getElementById("hud-score");
  const hudLives   = document.getElementById("hud-lives");
  const hudMult    = document.getElementById("hud-mult");
  const modeSelect = document.getElementById("mode-select");

  // Settings
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base  = settings.sprites.base_url;
  const ext   = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end   = settings.sprites.range.end   || 1025;

  // Modes
  const modes = {
    easy:   { speedFactor: 0.4, limitMs: 16000 },
    medium: { speedFactor: 0.8, limitMs: 11000 },
    hard:   { speedFactor: 1.0, limitMs:  7000 }
  };
  let mode = "medium";
  const baseInterval = 500;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // State
  let currentId   = null;
  let candidateId = null;      // single candidate per roll
  let deadline    = 0;         // epoch ms for auto-confirm
  let score = 0, lives = 3, mult = 1;
  let rule = "higher";

  // Loop/session control
  let session = 0;             // increments to cancel old loops
  let rolling = false;
  let debouncing = false;

  // Helpers
  const randId = () => Math.floor(Math.random() * (end - start + 1)) + start;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor = (id) => `${base}${id}${ext}`;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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
    const ms = Math.max(0, deadline - performance.now());
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
    // alternate visibility between current (A) and candidate (B)
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
      if (performance.now() >= deadline) {
        // auto-confirm
        await stopAndJudge(true /* fromTimeout */);
        break;
      }
      await sleep(60);
    }
  }

  // --- Actions ---

  async function startRoll() {
    // start a brand-new session
    session++;
    const mySession = session;
    rolling = true;

    candidateId = pickOther();
    await prepRoll(candidateId);

    deadline = performance.now() + (modes[mode]?.limitMs || 7000);

    // fire-and-forget loops bound to this session
    rollLoop(mySession);
    watchdogLoop(mySession);
  }

  async function confirm() {
    await stopAndJudge(false);
  }

  async function reroll() {
    if (!rolling) return;
    // just change the single candidate; do not touch session or deadline
    candidateId = pickOther();
    imgB.src = urlFor(candidateId);
  }

  // Stop flicker & judge the candidate now
  async function stopAndJudge(fromTimeout = false) {
    if (!rolling) return;

    // cancel loops by bumping session and flipping rolling off
    session++;
    rolling = false;

    // lock visuals on candidate BEFORE any flash to avoid stray swap
    imgA.classList.add("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;

    // stop timer UI
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

    // reveal candidate
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

    // settle back to A layer showing the *current* (post-judgment) mon
    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    setHUD();

    if (lives <= 0) {
      lives = 3; score = 0; mult = 1;
      await showInstant(randId());
    }

    newRule();
  }

  // --- Input handlers with light debounce to avoid double-fires ---

  function withDebounce(fn, ms = 120) {
    return (...args) => {
      if (debouncing) return;
      debouncing = true;
      try { fn(...args); } finally {
        setTimeout(() => { debouncing = false; }, ms);
      }
    };
  }

  // A: if idle -> start roll; if rolling -> confirm now
  const onA = withDebounce(() => {
    if (!rolling) startRoll();
    else confirm();
  });

  // B: if rolling -> cancel flicker & judge now (no re-roll here per your request)
  const onB = withDebounce(() => {
    if (!rolling) return;
    stopAndJudge(false);
  });

  // Mode changes don’t interrupt current roll; new mode applies next start
  modeSelect?.addEventListener("change", (e) => {
    const v = String(e.target.value || "").toLowerCase();
    if (modes[v]) mode = v;
  });

  // Init
  await showInstant(randId());
  modeSelect && (mode = modeSelect.value);
  newRule();

  // Bind controls
  btnA?.addEventListener("click", onA);
  btnB?.addEventListener("click", onB);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") onA();
    if (e.key.toLowerCase() === "b" || e.key === "Escape") onB();
  });
})();
