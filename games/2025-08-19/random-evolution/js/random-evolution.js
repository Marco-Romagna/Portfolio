// games/2025-08-19/random-evolution/js/random-evolution.js

window.addEventListener("DOMContentLoaded", () => {
  (async function () {
    /* ---------- Boot & Debug ---------- */
    const settingsURL = new URL("./settings.json", document.baseURI);

    // DEBUG is ON by default. Override with ?debug=0 or localStorage 'revo_debug' = '0'
    const qp = new URLSearchParams(location.search).get("debug"); // "1" | "0" | null
    const stored = localStorage.getItem("revo_debug");            // "1" | "0" | null
    let DEBUG = true; // default on
    if (qp === "1" || stored === "1") DEBUG = true;
    if (qp === "0" || stored === "0") DEBUG = false;

    const dlog = (...args) => { if (DEBUG) console.log("[REVO]", ...args); };

    // Console helpers
    window.revoDebug = {
      on()    { localStorage.setItem("revo_debug","1"); location.reload(); },
      off()   { localStorage.setItem("revo_debug","0"); location.reload(); },
      toggle(){ (localStorage.getItem("revo_debug")==="1") ? this.off() : this.on(); },
      state(){ return { DEBUG, qp, stored }; }
    };

    dlog("boot", {
      pageURL: window.location.href,
      settingsURL: settingsURL.toString(),
      debug: DEBUG
    });

    /* ---------- Inject minimal feedback styles (score/lives pulse) ---------- */
    (function injectRevoFeedbackStyles(){
      if (document.querySelector('style[data-revo-feedback]')) return;
      const css = `
      @keyframes revo-good { 0%{transform:scale(1)} 30%{transform:scale(1.18)} 100%{transform:scale(1)} }
      @keyframes revo-bad  { 0%{transform:scale(1)} 30%{transform:scale(0.88)} 100%{transform:scale(1)} }
      .revo-pulse-good{ animation:revo-good 320ms cubic-bezier(.2,1,.2,1); }
      .revo-pulse-bad { animation:revo-bad  320ms cubic-bezier(.2,1,.2,1); color:#f7768e !important; }
      .revo-img[src=""]{ display:none; } /* safety: hide empty img to avoid flicker */
      `;
      const style = document.createElement('style');
      style.setAttribute('data-revo-feedback','');
      style.textContent = css;
      document.head.appendChild(style);
    })();

    /* ---------- Grab DOM ---------- */
    const stage  = document.getElementById("stage");
    const imgA   = document.getElementById("imgA");
    const imgB   = document.getElementById("imgB");
    const flash  = document.getElementById("flash");
    const timerEl= document.getElementById("timer");

    const rail        = document.getElementById("pokedex-rail");
    const railTrack   = rail?.querySelector(".rail-track");
    const railFill    = rail?.querySelector(".rail-fill");
    const railNeedle  = rail?.querySelector(".rail-needle");
    const needleLine  = railNeedle?.querySelector(".needle-line");
    const needleLabel = railNeedle?.querySelector(".needle-label");

    const controls = document.getElementById("controls");
    const btnA     = document.getElementById("a-button");
    const btnB     = document.getElementById("b-button");

    const startScreen  = document.getElementById("start-screen");
    const startButtons = startScreen?.querySelectorAll(".mode-btn");
    const endScreen    = document.getElementById("end-screen");
    const finalScore   = document.getElementById("final-score");
    const playAgain    = document.getElementById("play-again");

    const hud        = document.getElementById("hud");
    const hudCurrent = document.getElementById("hud-current");
    const hudRule    = document.getElementById("hud-rule");
    const hudScore   = document.getElementById("hud-score");
    const hudLives   = document.getElementById("hud-lives");
    const hudMult    = document.getElementById("hud-mult");
    const hudMode    = document.getElementById("hud-mode");

    /* ---------- Feedback helpers (pulses) ---------- */
    function pulseOnce(el, cls){
      if(!el) return;
      el.classList.remove(cls);
      void el.offsetWidth; // reflow restart
      el.classList.add(cls);
    }

    /* ---------- Audio Manager (soft blips + mute/volume) ---------- */
    const VOL_KEY = 'revo_volume';   // '0'..'1'
    const MUTE_KEY= 'revo_muted';    // '0' or '1'
    const AudioMgr = (() => {
      let ctx = null;
      let okEl = null, badEl = null;
      let muted = localStorage.getItem(MUTE_KEY) === '1';
      let volume = parseFloat(localStorage.getItem(VOL_KEY) ?? '0.5');
      if (isNaN(volume)) volume = 0.5;

      function ensureCtx(){
        if (!ctx) {
          try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
        }
      }
      function loadTag(src){
        const a = new Audio();
        a.src = src;
        a.preload = 'auto';
        a.volume = muted ? 0 : volume;
        return a;
      }
      function init() {
        if (!okEl)  okEl  = loadTag('./assets/sfx/correct.mp3');
        if (!badEl) badEl = loadTag('./assets/sfx/wrong.mp3');
      }
      function setMuted(m){
        muted = !!m;
        localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
        if (okEl)  okEl.volume  = muted ? 0 : volume;
        if (badEl) badEl.volume = muted ? 0 : volume;
      }
      function setVolume(v){
        volume = Math.max(0, Math.min(1, Number(v)||0));
        localStorage.setItem(VOL_KEY, String(volume));
        if (okEl)  okEl.volume  = muted ? 0 : volume;
        if (badEl) badEl.volume = muted ? 0 : volume;
      }
      function beep(freq=880, durMs=140, type='sine'){
        if (muted) return;
        ensureCtx();
        if (!ctx) return;
        const g = ctx.createGain();
        g.gain.value = 0.09 * volume;
        g.connect(ctx.destination);
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = freq;
        o.connect(g);
        o.start();
        setTimeout(()=>{ o.stop(); g.disconnect(); }, durMs);
      }
      function playOK(){
        if (okEl && okEl.readyState > 0) { try{ okEl.currentTime=0; okEl.play(); }catch{} }
        else beep(1040,130,'sine');
      }
      function playBad(){
        if (badEl && badEl.readyState > 0) { try{ badEl.currentTime=0; badEl.play(); }catch{} }
        else beep(220,170,'square');
      }
      return { init, setMuted, setVolume, playOK, playBad, get muted(){return muted}, get volume(){return volume} };
    })();

    // Add volume UI into HUD (right block)
    (function addVolumeUI(){
      const right = document.querySelector('#hud .hud-right');
      if (!right) return;
      const wrap = document.createElement('span');
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '6px';
      wrap.style.marginLeft = '8px';

      const btn = document.createElement('button');
      btn.textContent = AudioMgr.muted ? '🔇' : '🔊';
      btn.title = 'Toggle sound (M)';
      btn.className = 'mode-btn';
      btn.style.padding = '2px 8px';
      btn.style.fontSize = '12px';

      const rng = document.createElement('input');
      rng.type = 'range';
      rng.min = '0'; rng.max = '1'; rng.step = '0.05';
      rng.value = String(AudioMgr.volume);
      rng.title = 'Volume';
      rng.style.width = '80px';
      rng.addEventListener('input', () => AudioMgr.setVolume(rng.value));

      btn.addEventListener('click', () => {
        AudioMgr.setMuted(!AudioMgr.muted);
        btn.textContent = AudioMgr.muted ? '🔇' : '🔊';
      });

      wrap.appendChild(btn);
      wrap.appendChild(rng);
      right.appendChild(wrap);

      // keyboard shortcut M
      window.addEventListener('keydown', (e)=>{
        if (e.key.toLowerCase() === 'm') { btn.click(); }
      });
    })();

    // Ensure audio initialized on first interaction (autoplay policies)
    let audioInited = false;
    function ensureAudioInit(){
      if (!audioInited) { AudioMgr.init(); audioInited = true; }
    }

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
    const baseInterval  = 500;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    // Preload helper to avoid ghost images
    function preloadImage(url) {
      return new Promise((resolve, reject) => {
        const im = new Image();
        im.onload = () => resolve(true);
        im.onerror = reject;
        im.src = url;
      });
    }

    /* ---------- Rail ---------- */
    const pctForDex = (n) => (Math.max(1, Math.min(MAX_DEX, n || 1)) / MAX_DEX) * 100;

    function clearRailDecor() {
      if (!railTrack) return;
      railTrack.querySelectorAll(".rail-divider").forEach(el => el.remove());
      rail?.querySelector(".rail-mid-labels")?.remove();
    }

    function renderRailDecor(currentMode) {
      if (!railTrack) return;
      clearRailDecor();

      // Dividers at generation starts
      GEN_STARTS.forEach(startNum => {
        const pos = pctForDex(startNum);
        const divider = document.createElement("div");
        divider.className = "rail-divider";
        divider.style.bottom = pos + "%";
        railTrack.appendChild(divider);
      });

      // Midpoint overlay labels (skip for hard)
      if (currentMode === "hard") return;

      const bounds = [...GEN_STARTS, MAX_DEX + 1];
      const wrap = document.createElement("div");
      wrap.className = "rail-mid-labels";

      for (let i = 0; i < bounds.length - 1; i++) {
        const segStart = bounds[i];
        const next     = bounds[i + 1];
        const segEnd   = next - 1;
        const midDex   = Math.floor((segStart + segEnd) / 2);
        const pos      = pctForDex(midDex);

        const lab = document.createElement("div");
        lab.className = "rail-mid-label";
        lab.style.bottom = pos + "%";
        lab.textContent = `GEN ${i + 1}`;
        wrap.appendChild(lab);
      }

      rail.appendChild(wrap);
    }

    function updateRail(dexNumber) {
      if (!rail || !railFill || !railNeedle || !needleLine || !needleLabel) return;
      rail.classList.remove("pokedex-rail--hidden");
      const pct = pctForDex(dexNumber);
      railFill.style.height = pct + "%";
      railNeedle.style.bottom = pct + "%";
      needleLine.style.width = "100%";
      needleLabel.textContent = `#${dexNumber ?? "—"}`;
    }

    function applyRailModeClass(m) {
      if (!rail) return;
      rail.classList.remove("easy", "medium", "hard");
      if (m) rail.classList.add(m);
      renderRailDecor(m || "easy");
    }

    /* ---------- HUD ---------- */
    function setGameActive(active) {
      gameActive = active;
      controls?.classList.toggle("hidden", !active);
      hud?.classList.toggle("inactive", !active);
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
      if (currentId != null) updateRail(currentId);
    }

    /* ---------- Likely-direction weighting with difficulty ---------- */
    // 0 = neutral (50/50), 1 = fully biased
    function biasStrengthForMode(m) {
      if (m === "easy")   return 0.30;
      if (m === "medium") return 0.60;
      if (m === "hard")   return 0.85;
      return 0.50;
    }

    // High currentId → more "Lower"; low currentId → more "Higher"
    function pickRuleWeighted(currentDex, m) {
      const s = biasStrengthForMode(m);
      const clamped = Math.max(1, Math.min(MAX_DEX, currentDex || 1));
      const x = clamped / MAX_DEX;                 // 0..1 position in dex
      const pLower = (1 - s) * 0.5 + s * x;        // increases with x
      const roll = Math.random();
      const chosen = (roll < pLower) ? "lower" : "higher";

      dlog("rule:pick", {
        mode: m, currentDex, x: +x.toFixed(3),
        biasStrength: s,
        pLower: +pLower.toFixed(3),
        pHigher: +(1 - pLower).toFixed(3),
        roll: +roll.toFixed(3),
        chosen
      });
      return chosen;
    }

    function newRule() {
      rule = pickRuleWeighted(currentId, mode);
      setHUD();
    }

    /* ---------- Stage helpers ---------- */
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

    const showStart = () => startScreen?.classList.remove("hidden");
    const hideStart = () => startScreen?.classList.add("hidden");
    const showEnd   = () => endScreen?.classList.remove("hidden");
    const hideEnd   = () => endScreen?.classList.add("hidden");

    /* ---------- Rolling ---------- */
    async function prepRoll(id, preloadedUrl) {
      // Clear old candidate to avoid stale flashes
      imgB.src = "";

      // Ensure current is set deterministically
      imgA.src = urlFor(currentId ?? randId());
      imgA.classList.remove("silhouette");

      imgB.classList.add("silhouette");
      imgA.style.opacity = 1;
      imgB.style.opacity = 0;
      flash.style.opacity = 0;
      if (timerEl) timerEl.classList.remove("warn");

      // Set new candidate (preloaded)
      imgB.src = preloadedUrl || urlFor(id);
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
          dlog("timeout:deadline", { at: now(), deadline, rule, currentId, candidateId });
          await stopAndJudge("timeout");
          break;
        }
        await sleep(60);
      }
    }

    async function startRoll() {
      session++;
      const mySession = session;
      rolling = true;

      candidateId = pickOther();
      const candUrl = urlFor(candidateId);

      // PRELOAD before assigning to imgB to avoid ghost silhouette
      try { await preloadImage(candUrl); } catch (_) { /* ignore */ }

      await prepRoll(candidateId, candUrl);

      deadline = now() + (modes[mode]?.limitMs || 7000);
      dlog("roll:start", { rule, currentId, candidateId, timeLimitMs: (modes[mode]?.limitMs || 7000) });

      rollLoop(mySession);
      watchdogLoop(mySession);
    }

    // --------- ACCEPT / CANCEL / TIMEOUT judge ----------
    // Timeout = "accept" (evolves): point if correct, life lost if wrong
    async function stopAndJudge(action /* "accept" | "cancel" | "timeout" */) {
      if (!rolling) return;
      session++;
      rolling = false;

      const prevCurrent = currentId;
      const isCorrectDir = (rule === "higher") ? (candidateId > currentId) : (candidateId < currentId);

      // CANCEL path: instant revert (no flash/reveal)
      if (action === "cancel") {
        let gained = false, lost = false;

        if (!isCorrectDir) {        // correctly rejected
          score += mult; mult += 1;
          AudioMgr.playOK();
          pulseOnce(hudScore, 'revo-pulse-good');
          gained = true;
        } else {                    // wrongly rejected
          lives -= 1; mult = 1;
          AudioMgr.playBad();
          pulseOnce(hudLives, 'revo-pulse-bad');
          lost = true;
        }

        // Snap back to current form immediately
        imgA.classList.remove("silhouette");
        imgB.classList.remove("silhouette");
        imgA.src = urlFor(currentId);
        imgA.style.opacity = 1;
        imgB.style.opacity = 0;
        imgB.src = ""; // clear candidate to prevent ghosting
        if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

        dlog("compare", {
          rule,
          current_before: prevCurrent,
          next: candidateId,
          current_after: currentId,
          isCorrectDir,
          action: "cancel",
          outcome: gained ? "point" : "life_lost"
        });
        if (lost) dlog("life:lost", { score, mult, lives });
        if (gained) dlog("score:update", { score, mult, lives });

        setHUD();

        if (lives <= 0) {
          if (finalScore) finalScore.textContent = String(score);
          setGameActive(false);
          showEnd();
          dlog("game:over", { finalScore: score });
          return;
        }
        newRule();
        return; // end cancel flow
      }

      // ACCEPT/TIMEOUT path: keep reveal + flash (timeout behaves as accept)
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

      let gained = false, lost = false;

      if (isCorrectDir) {           // accepted correct evolution
        score += mult; mult += 1;
        currentId = candidateId;
        AudioMgr.playOK();
        pulseOnce(hudScore, 'revo-pulse-good');
        gained = true;
      } else {                      // accepted wrong evolution
        lives -= 1; mult = 1;
        currentId = candidateId;
        AudioMgr.playBad();
        pulseOnce(hudLives, 'revo-pulse-bad');
        lost = true;
      }

      dlog("compare", {
        rule,
        current_before: prevCurrent,
        next: candidateId,
        current_after: currentId,
        isCorrectDir,
        action,
        outcome: gained ? "point" : "life_lost"
      });

      await sleep(280);
      imgA.src = urlFor(currentId);
      imgA.style.opacity = 1;
      imgB.style.opacity = 0;
      imgB.src = ""; // clear candidate to prevent ghosting
      setHUD();

      if (lost) dlog("life:lost", { score, mult, lives });
      if (gained) dlog("score:update", { score, mult, lives });

      if (lives <= 0) {
        if (finalScore) finalScore.textContent = String(score);
        setGameActive(false);
        showEnd();
        dlog("game:over", { finalScore: score });
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
      ensureAudioInit();
      dlog("input:A", { rolling });
      if (!rolling) startRoll();
      else stopAndJudge("accept");
    });
    const onB = withDebounce(() => {
      if (!gameActive || !rolling) return;
      ensureAudioInit();
      dlog("input:B");
      stopAndJudge("cancel");
    });

    btnA?.addEventListener("click", onA);
    btnB?.addEventListener("click", onB);
    window.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") onA();                // A = accept
      if (e.key.toLowerCase() === "b" || e.key === "Escape") onB(); // B/Esc = cancel
    });

    /* ---------- Start / Restart ---------- */
    startButtons?.forEach(btn => {
      btn.addEventListener("click", async () => {
        const m = btn.getAttribute("data-mode");
        if (!modes[m]) return;
        mode = m;
        applyRailModeClass(mode);

        score = 0; lives = 3; mult = 1;
        setGameActive(true);

        if (!currentId) currentId = randId();
        await showInstant(currentId);

        hideEnd();
        hideStart();
        dlog("mode:start", { mode: m });
        newRule();
      });
    });

    playAgain?.addEventListener("click", async () => {
      setGameActive(false);
      mode = null;
      applyRailModeClass(null);

      currentId = randId();
      imgA.src = urlFor(currentId);
      imgA.style.opacity = 0;
      imgB.style.opacity = 0;
      if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }
      setHUD();

      hideEnd();
      showStart();
      dlog("game:reset");
    });

    /* ---------- First paint ---------- */
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
    applyRailModeClass(null);
  })();
});
