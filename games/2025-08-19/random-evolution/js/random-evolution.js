// Higher / Lower with modes + timer: A = start/confirm, B = re-roll, auto-lock on timeout

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

  // Modes (interval = baseInterval / factor)
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
  let candidateId = null;   // one-at-a-time candidate
  let rolling     = false;
  let stopFlag    = false;
  let deadline    = 0;      // epoch ms
  let score = 0, lives = 3, mult = 1;
  let rule = "higher";

  // Helpers
  const randId = () => Math.floor(Math.random() * (end - start + 1)) + start;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor = (id) => `${base}${id}${ext}`;
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));

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

  function currentInterval() {
    if (reducedMotion) return 240;
    return baseInterval / (modes[mode]?.speedFactor || 1.0);
  }

  function updateTimer() {
    if (!timerEl || !rolling) return;
    const ms = Math.max(0, deadline - performance.now());
    const sec = (ms / 1000).toFixed(1);
    timerEl.textContent = sec;
    timerEl.classList.toggle("warn", ms <= 3000);
  }

  // A: if idle -> start; if rolling -> confirm (stop & judge)
  async function onA() {
    if (!rolling) {
      candidateId = pickOther();
      await prepRoll(candidateId);
      rolling = true;
      stopFlag = false;
      deadline = performance.now() + (modes[mode]?.limitMs || 7000);
      rollLoop();     // start alternation
      watchdogLoop(); // start timer
    } else {
      await stopAndJudge(); // confirm
    }
  }

  // B: re-roll candidate (timer does NOT reset)
  async function onB() {
    if (!rolling) return;
    candidateId = pickOther();
    imgB.src = urlFor(candidateId);
    // keep silhouettes and alternation; player keeps thinking within same timer
  }

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

  // Alternation loop between current and the single candidate
  async function rollLoop() {
    while (rolling && !stopFlag) {
      const showB = imgB.style.opacity !== "1";
      imgA.classList.add("silhouette");
      imgB.classList.add("silhouette");
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;
      updateTimer();
      await sleep(currentInterval());
    }
  }

  // Auto-lock watchdog: confirm when time expires
  async function watchdogLoop() {
    while (rolling && !stopFlag) {
      updateTimer();
      if (performance.now() >= deadline) {
        await stopAndJudge();
        break;
      }
      await sleep(60);
    }
  }

  // Stop & judge current candidate (used by A confirm or timeout)
  async function stopAndJudge() {
    if (!rolling) return;
    stopFlag = true;
    rolling  = false;

    // reveal candidate
    flash.style.opacity = 1;
    await sleep(120);
    flash.style.opacity = 0;

    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;

    // tiny pop
    imgB.style.transition = `transform 250ms cubic-bezier(.2,1,.2,1)`;
    imgB.style.transform  = "scale(0.9)";
    requestAnimationFrame(() => {
      imgB.style.transform = "scale(1)";
      setTimeout(() => { imgB.style.transition = ""; imgB.style.transform = ""; }, 270);
    });

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

    // settle back to A layer
    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

    setHUD();

    // game over → soft reset
    if (lives <= 0) {
      lives = 3; score = 0; mult = 1;
      await showInstant(randId());
    }

    // next round
    newRule();
  }

  // Mode change
  modeSelect?.addEventListener("change", (e) => {
    const v = String(e.target.value || "").toLowerCase();
    if (modes[v]) mode = v;
  });

  // Init
  await showInstant(randId());
  modeSelect && (mode = modeSelect.value);
  newRule();

  // Controls
  btnA?.addEventListener("click", onA);
  btnB?.addEventListener("click", onB);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") btnA?.click();              // A
    if (e.key.toLowerCase() === "b" || e.key === "Escape") btnB?.click(); // B (re-roll)
  });
})();
