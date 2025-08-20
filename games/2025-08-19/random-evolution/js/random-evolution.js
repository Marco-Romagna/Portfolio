// games/2025-08-19/random-evolution/js/random-evolution.js

window.addEventListener("DOMContentLoaded", () => {
  (async function () {
    /* ---------- Boot debug ---------- */
    const settingsURL = new URL("../settings.json", import.meta.url);
    console.log("[REVO] boot", {
      jsURL: import.meta.url,
      settingsURL: settingsURL.toString(),
      startScreen: !!document.getElementById("start-screen"),
      stage: !!document.getElementById("stage")
    });

    /* ---------- Grab DOM ---------- */
    // Stage
    const imgA   = document.getElementById("imgA");
    const imgB   = document.getElementById("imgB");
    const flash  = document.getElementById("flash");
    const timerEl= document.getElementById("timer");

    // Rail (outside stage)
    const rail        = document.getElementById("pokedex-rail");
    const railTrack   = rail?.querySelector(".rail-track");
    const railFill    = rail?.querySelector(".rail-fill");
    const railNeedle  = rail?.querySelector(".rail-needle");
    const needleLine  = railNeedle?.querySelector(".needle-line");
    const needleLabel = railNeedle?.querySelector(".needle-label");

    // Controls
    const controls = document.getElementById("controls");
    const btnA     = document.getElementById("a-button");
    const btnB     = document.getElementById("b-button");

    // Overlays
    const startScreen  = document.getElementById("start-screen");
    const startButtons = startScreen?.querySelectorAll(".mode-btn");
    const endScreen    = document.getElementById("end-screen");
    const finalScore   = document.getElementById("final-score");
    const playAgain    = document.getElementById("play-again");

    // HUD (display only)
    const hud        = document.getElementById("hud");
    const hudCurrent = document.getElementById("hud-current");
    const hudRule    = document.getElementById("hud-rule");
    const hudScore   = document.getElementById("hud-score");
    const hudLives   = document.getElementById("hud-lives");
    const hudMult    = document.getElementById("hud-mult");
    const hudMode    = document.getElementById("hud-mode");

    /* ---------- Settings ---------- */
    let settings;
    try {
      const res = await fetch(settingsURL, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      settings = await res.json();
    } catch (err) {
      console.error("[REVO] Failed to load settings.json", err);
      settings = {
        sprites: {
          base_url: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/",
          file_extension: ".png",
          range: { start: 1, end: 1025 }
        }
      };
    }

    const base  = settings.sprites.base_url;
    const ext   = settings.sprites.file_extension || ".png";
    const start = settings.sprites.range.start || 1;
    const end   = settings.sprites.range.end   || 1025;

    /* ---------- Constants ---------- */
    const GEN_STARTS = [1, 152, 252, 387, 494, 650, 722, 810, 906]; // Gens 1..9
    const MAX_DEX    = end;

    const modes = {
      easy:   { speedFactor: 0.4, limitMs: 16000 },
      medium: { speedFactor: 0.8, limitMs: 11000 },
      hard:   { speedFactor: 1.0, limitMs:  7000 }
    };
    const baseInterval   = 500;
    const reducedMotion  = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- State ---------- */
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

    /* ---------- Helpers ---------- */
    const randId    = () => Math.floor(Math.random() * (end - start + 1)) + start;
    const pickOther = () => { let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; };
    const urlFor    = (id) => `${base}${id}${ext}`;
    const sleep     = (ms) => new Promise(r => setTimeout(r, ms));
    const now       = () => performance.now();
    const cap       = (s) => s ? s[0].toUpperCase() + s.slice(1) : "—";
    const currentInterval = () =>
      reducedMotion ? 240 : (baseInterval / (modes[mode]?.speedFactor || 1.0));

    /* ---------- Rail ---------- */
    const pctForDex = (n) => (Math.max(1, Math.min(MAX_DEX, n || 1)) / MAX_DEX) * 100;

    function clearRailDecor() {
      if (!railTrack) return;
      railTrack.querySelectorAll(".rail-divider, .rail-badge, .rail-left-label").forEach(el => el.remove());
    }

    function renderRailDecor(currentMode) {
      if (!railTrack) return;
      clearRailDecor();
      if (currentMode === "hard") return;

      GEN_STARTS.forEach((startNum, idx) => {
        const pos = pctForDex(startNum);

        const divider = document.createElement("div");
        divider.className = "rail-divider";
        divider.style.bottom = pos + "%";
        railTrack.appendChild(divider);

        const badge = document.createElement("div");
        badge.className = "rail-badge";
        badge.style.bottom = pos + "%";
        badge.textContent = `GEN ${idx + 1}`;
        railTrack.appendChild(badge);

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
      if (!rail || !railFill || !railNeedle || !needleLine || !needleLabel) return;
      rail.classList.remove("pokedex-rail--hidden");
      const pct = pctForDex(dexNumber);
      railFill.style.height = pct + "%";
      railNeedle.style.bottom = pct + "%";
      needleLine.style.width = "100%";
      needleLabel.textContent = `#${dexNumber ?? "—"}`;
      renderRailDecor(currentMode || "easy");
    }

    /* ---------- Game UI ---------- */
    function setGameActive(active) {
      gameActive = active;

      // A/B buttons hidden until game starts
      controls?.classList.toggle("hidden", !active);

      // Hide left/right HUD blocks until game starts
      hud?.classList.toggle("inactive", !active);

      // Keep rail column; hide contents when inactive
      rail?.classList.toggle("pokedex-rail--hidden", !active);
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

    // Overlays
    const showStart = () => startScreen?.classList.remove("hidden");
    const hideStart = () => startScreen?.classList.add("hidden");
    const showEnd   = () => endScreen?.classList.remove("hidden");
    const hideEnd   = () => endScreen?.classList.add("hidden");

    /* ---------- Rolling ---------- */
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

    async function stopAndJudge() {
      if (!rolling) return;

      session++;
      rolling = false;

      imgA.classList.add("silhouette");
      imgB.classList.add("silhouette");
      imgA.style.opacity = 0;
      imgB.style.opacity = 1;

      if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

      flash.style.opacity = 1;
      await sleep(120);
      flash.style.opacity = 0;

      imgA.classList.remove("silhouette");
      imgB.classList.remove("silhouette");
      imgA.style.opacity = 0;
      imgB.style.opacity = 1;
      pop(imgB, 250);

      const ok = rule === "higher" ? candidateId > currentId : candidateId < currentId;
      if (ok) {
        score += mult;
        mult  += 1;
        currentId = candidateId;
      } else {
        lives -= 1;
        mult   = 1;
      }

      await sleep(280);
      imgA.src = urlFor(currentId);
      imgA.style.opacity = 1;
      imgB.style.opacity = 0;
      setHUD();

      if (lives <= 0) {
        if (finalScore) finalScore.textContent = String(score);
        setGameActive(false);   // hides A/B + HUD side blocks
        showEnd();
        return;
      }

      newRule();
    }

    /* ---------- Debounce & inputs ---------- */
    function withDebounce(fn, ms = 120) {
      return (...args) => {
        if (debouncing) return;
        debouncing = true;
        try { fn(...args); } finally { setTimeout(() => { debouncing = false; }, ms); }
      };
    }

    const onA = withDebounce(() => {
      if (!gameActive) return;
      if (!rolling) startRoll(); else stopAndJudge();
    });
    const onB = withDebounce(() => {
      if (!gameActive || !rolling) return;
      stopAndJudge();
    });

    btnA?.addEventListener("click", onA);
    btnB?.addEventListener("click", onB);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") onA();
      if (e.key.toLowerCase() === "b" || e.key === "Escape") onB();
    });

    /* ---------- Start / Restart ---------- */
    startButtons?.forEach(btn => {
      btn.addEventListener("click", async () => {
        const m = btn.getAttribute("data-mode");
        if (!modes[m]) return;
        mode = m;

        score = 0; lives = 3; mult = 1;
        setGameActive(true);         // show A/B and HUD blocks

        renderRailDecor(mode);

        if (!currentId) currentId = randId();
        await showInstant(currentId);

        hideEnd();
        hideStart();
        newRule();
      });
    });

    playAgain?.addEventListener("click", async () => {
      setGameActive(false);
      mode = null;

      clearRailDecor();
      if (railFill) railFill.style.height = "0%";
      if (railNeedle) railNeedle.style.bottom = "0%";
      if (needleLabel) needleLabel.textContent = "#—";

      currentId = randId();
      imgA.src = urlFor(currentId);
      imgA.style.opacity = 0;
      imgB.style.opacity = 0;
      if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
      setHUD();

      hideEnd();
      showStart();
    });

    /* ---------- First paint: FORCE idle ---------- */
    // (Even if HTML classes were missing, we guarantee the idle look.)
    controls?.classList.add("hidden");
    hud?.classList.add("inactive");
    rail?.classList.add("pokedex-rail--hidden");

    currentId = randId();
    imgA.src = urlFor(currentId);
    imgA.style.opacity = 0;
    imgB.style.opacity = 0;
    if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

    setGameActive(false);
    setHUD();
    hideEnd();
    showStart();
  })();
});
