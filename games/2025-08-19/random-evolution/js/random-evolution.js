// Higher / Lower mode with A-toggle stop and limited B (resets multiplier)

(async function () {
  // Elements
  const imgA   = document.getElementById("imgA");
  const imgB   = document.getElementById("imgB");
  const flash  = document.getElementById("flash");
  const btnA   = document.getElementById("a-button"); // start/stop (no penalty)
  const btnB   = document.getElementById("b-button"); // panic stop (limited, resets mult)

  // HUD
  const hudCurrent = document.getElementById("hud-current");
  const hudRule    = document.getElementById("hud-rule");
  const hudScore   = document.getElementById("hud-score");
  const hudLives   = document.getElementById("hud-lives");
  const hudMult    = document.getElementById("hud-mult");
  const hudBuses   = document.getElementById("hud-buses");

  // Settings
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base  = settings.sprites.base_url;
  const ext   = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end   = settings.sprites.range.end   || 1025;

  // Timing (slower feel you liked)
  const timings = {
    introHold: 900,
    swaps: 18,
    startInterval: 260,
    endInterval: 70,
    flashMs: 120,
    revealPopMs: 250
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Game state
  let currentId = null;       // current shown in color between rounds
  let rolling   = false;      // are we currently alternating silhouettes?
  let killed    = false;      // stop flag for the roll loop
  let score     = 0;
  let lives     = 3;
  let mult      = 1;          // score multiplier
  let bUses     = 3;          // remaining B uses
  let rule      = "higher";   // "higher" | "lower"
  let candidateId = null;     // currently-displayed silhouette during roll

  // Helpers
  const randId = () => Math.floor(Math.random() * (end - start + 1)) + start;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor = (id) => `${base}${id}${ext}`;
  const sleep  = (ms) => new Promise((r) => setTimeout(r, ms));
  const lerp   = (a, b, t) => a + (b - a) * t;
  const ease   = (p) => p * p * (3 - 2 * p);

  function preload(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(src);
      i.onerror = reject;
      i.src = src;
    });
  }

  function pop(el, durMs) {
    el.style.transition = `transform ${durMs}ms cubic-bezier(.2,1,.2,1)`;
    el.style.transform = "scale(0.9)";
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
      setTimeout(() => { el.style.transition = ""; el.style.transform = ""; }, durMs + 20);
    });
  }

  function setHUD() {
    if (hudCurrent) hudCurrent.textContent = currentId ? `#${String(currentId).padStart(3,"0")}` : "#—";
    if (hudScore)   hudScore.textContent   = String(score);
    if (hudLives)   hudLives.textContent   = String(lives);
    if (hudRule) {
      hudRule.textContent = rule === "higher" ? "Higher" : "Lower";
      hudRule.classList.toggle("higher", rule === "higher");
      hudRule.classList.toggle("lower",  rule === "lower");
    }
    if (hudMult) hudMult.textContent = `x${mult}`;
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
    setHUD();
  }

  async function startRoundIfNeeded() {
    if (!currentId) await showInstant(randId());
    newRule();
  }

  // Start rolling silhouettes (called when A pressed if not rolling)
  async function startRoll() {
    if (rolling) return;
    rolling = true;
    killed  = false;

    candidateId = pickOther();
    try { await preload(urlFor(candidateId)); } catch {}

    // prep: A in color, B silhouette
    imgA.src = urlFor(currentId);
    imgB.src = urlFor(candidateId);
    imgA.classList.remove("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;

    // rolling loop
    let i = 0;
    while (!killed) {
      const p = Math.min(1, i / timings.swaps);
      const interval = reducedMotion ? 200 : lerp(timings.startInterval, timings.endInterval, ease(p));
      const showB = i % 2 === 0;

      if (showB) imgB.src = urlFor(candidateId = pickOther());
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;

      i++;
      await sleep(interval);
    }
  }

  // Stop & lock-in (called by A when rolling)
 async function stopAndJudge() {
    if (!rolling) return;
    killed  = true;
    rolling = false;
  
    // flash + reveal
    flash.style.opacity = 1;
    await sleep(timings.flashMs);
    flash.style.opacity = 0;
  
    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;
    pop(imgB, timings.revealPopMs);

    // Judge
    const ok = rule === "higher" ? candidateId > currentId : candidateId < currentId;

    if (ok) {
      score += mult;   // award with current multiplier
      mult += 1;       // grow multiplier on correct
      currentId = candidateId;
    } else {
      lives -= 1;
      mult = 1;        // reset only on wrong
    }
  
    // settle back
    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
  
    setHUD();
  
    if (lives <= 0) {
      lives = 3; score = 0; mult = 1;
      currentId = randId();
      await showInstant(currentId);
    }
  
    newRule();
  }

  // A = toggle: start roll if idle, stop & judge if rolling (no penalty)
  async function onA() {
    if (!rolling) startRoll();
    else stopAndJudge(); // no penalty
  }

  // B = panic stop:
  async function onB() {
    if (!rolling) return;
    stopAndJudge(); // no penalty, unlimited
  }

  // Init
  await showInstant(randId());
  await startRoundIfNeeded();
  setHUD();

  // Controls
  btnA?.addEventListener("click", onA);
  btnB?.addEventListener("click", onB);

  // Keyboard shortcuts
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") btnA?.click();             // A
    if (e.key.toLowerCase() === "b" || e.key === "Escape") btnB?.click(); // B
  });
})();
