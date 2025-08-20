// Higher / Lower: A = start or re-roll one candidate, B = stop & judge (no penalty)

(async function () {
  // Elements
  const imgA = document.getElementById("imgA");
  const imgB = document.getElementById("imgB");
  const flash = document.getElementById("flash");
  const btnA = document.getElementById("a-button");
  const btnB = document.getElementById("b-button");

  // HUD (no B counter)
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

  // Timings (slower + readable)
  const timings = {
    swapInterval: 500, // constant, gives time to think
    flashMs: 120,
    revealPopMs: 250
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // State
  let currentId   = null; // shown between rounds
  let candidateId = null; // single candidate while rolling
  let rolling     = false;
  let stopFlag    = false;
  let score = 0, lives = 3, mult = 1;
  let rule = "higher"; // or "lower"

  // Helpers
  const randId   = () => Math.floor(Math.random() * (end - start + 1)) + start;
  const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
  const urlFor   = (id) => `${base}${id}${ext}`;
  const sleep    = (ms) => new Promise(r => setTimeout(r, ms));

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
    setHUD();
  }

  // Start or re-roll a single candidate (A)
  async function onA() {
    if (!rolling) {
      // start new roll against one candidate
      candidateId = pickOther();
      await prepRoll(candidateId);
      rolling = true;
      stopFlag = false;
      rollLoop(); // fire and forget
    } else {
      // re-roll candidate (no judge)
      candidateId = pickOther();
      imgB.src = urlFor(candidateId);
      // keep alternating with the NEW candidate
    }
  }

  // Prepares layers and visibility for rolling vs one candidate
  async function prepRoll(id) {
    imgA.src = urlFor(currentId ?? randId());
    imgB.src = urlFor(id);
    imgA.classList.remove("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;
  }

  // Alternation loop between current and the single candidate
  async function rollLoop() {
    while (rolling && !stopFlag) {
      // toggle visibility
      const showB = imgB.style.opacity !== "1";
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;

      // keep silhouettes during roll
      imgA.classList.add("silhouette");
      imgB.classList.add("silhouette");

      await sleep(reducedMotion ? 240 : timings.swapInterval);
    }
  }

  // Stop & judge current candidate (B)
  async function onB() {
    if (!rolling) return;
    stopFlag = true;
    rolling  = false;

    // Reveal candidate
    flash.style.opacity = 1;
    await sleep(timings.flashMs);
    flash.style.opacity = 0;

    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;
    // tiny pop
    imgB.style.transition = `transform ${timings.revealPopMs}ms cubic-bezier(.2,1,.2,1)`;
    imgB.style.transform  = "scale(0.9)";
    requestAnimationFrame(() => {
      imgB.style.transform = "scale(1)";
      setTimeout(() => { imgB.style.transition = ""; imgB.style.transform = ""; }, timings.revealPopMs + 20);
    });

    // Judge
    const ok = rule === "higher" ? candidateId > currentId : candidateId < currentId;

    if (ok) {
      score += mult;
      mult += 1;             // grows only on correct
      currentId = candidateId;
    } else {
      lives -= 1;
      mult = 1;              // reset on wrong
    }

    // Settle back to A layer
    await sleep(280);
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;

    setHUD();

    // Game over → soft reset
    if (lives <= 0) {
      lives = 3; score = 0; mult = 1;
      await showInstant(randId());
    }

    // Next round instruction
    newRule();
  }

  // Init
  await showInstant(randId());
  newRule();

  // Bind controls
  btnA?.addEventListener("click", onA);
  btnB?.addEventListener("click", onB);
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") btnA?.click();              // A
    if (e.key.toLowerCase() === "b" || e.key === "Escape") btnB?.click(); // B
  });
})();
