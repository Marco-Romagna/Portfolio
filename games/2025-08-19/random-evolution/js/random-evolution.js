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
      .revo-img[src=""]{ display:none; } /* hide empty img to avoid flicker */
      `;
      const style = document.createElement('style');
      style.setAttribute('data-revo-feedback','');
      style.textContent = css;
      document.head.appendChild(style);
    })();

    /* ---------- Grab DOM ---------- */
    const stage      = document.getElementById("stage");
    const aimBanner  = document.getElementById("aim");

    const imgA       = document.getElementById("imgA");
    const imgB       = document.getElementById("imgB");
    const flash      = document.getElementById("flash");
    const timerEl    = document.getElementById("timer");

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

    const audioRow   = document.querySelector(".revo-audio");

    // NEW: Title element for difficulty suffix
    const titleEl    = document.getElementById("game-title");

    // Safety: make sure A/B controls are actually inside the stage
    if (controls && stage && !controls.classList.contains("ab-instage")) {
      controls.classList.add("ab-instage");
      stage.appendChild(controls);
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
        localStorage.setItem(MUTE_KEY, m ? '1' : '0');
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

    // Add volume UI BELOW the stage (in .revo-audio)
    (function addVolumeUI(){
      document.querySelectorAll('[data-revo-audio-ui]').forEach(n => n.remove());
      if (!audioRow) return;

      const wrap = document.createElement('span');
      wrap.setAttribute('data-revo-audio-ui','');
      wrap.style.display = 'inline-flex';
      wrap.style.alignItems = 'center';
      wrap.style.gap = '8px';
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
      rng.style.width = '140px';

      btn.addEventListener('click', () => {
        AudioMgr.setMuted(!AudioMgr.muted);
        btn.textContent = AudioMgr.muted ? '🔇' : '🔊';
      });
      rng.addEventListener('input', () => AudioMgr.setVolume(rng.value));

      wrap.appendChild(btn);
      wrap.appendChild(rng);
      audioRow.appendChild(wrap);

      window.addEventListener('keydown', (e)=>{
        if (e.key.toLowerCase() === 'm') { btn.click(); }
      });
    })();

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
      easy:   { speedFactor: 0.4, limitMs: 16000, bias: 0.30 },
      medium: { speedFactor: 0.8, limitMs: 11000, bias: 0.60 },
      hard:   { speedFactor: 1.0, limitMs:  7000, bias: 0.85 }
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
    let rule       = "higher";      // "higher" | "lower"
    let lastRule   = null;          // for alternating feel

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

      GEN_STARTS.forEach(startNum => {
        const pos = pctForDex(startNum);
        const divider = document.createElement("div");
        divider.className = "rail-divider";
        divider.style.bottom = pos + "%";
        railTrack.appendChild(divider);
      });

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
        lab.innerHTML = `<span class="full">Gen ${i + 1}</span><span class="short">G${i + 1}</span>`;
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

    /* ---------- HUD & Aim Banner ---------- */
    function updateAim() {
      if (!aimBanner) return;
      const overlaysHidden =
        startScreen?.classList.contains("hidden") &&
        endScreen?.classList.contains("hidden");
      const active = gameActive && overlaysHidden;

      aimBanner.style.display = active ? "block" : "none";
      const isHigher = rule === "higher";

      // NEW: concise descriptive banner
      const ref = (currentId != null) ? currentId : "—";
      aimBanner.textContent = `[${isHigher ? "Higher" : "Lower"} than ${ref}]`;

      aimBanner.classList.toggle("higher", isHigher);
      aimBanner.classList.toggle("lower", !isHigher);
      aimBanner.setAttribute("aria-hidden", active ? "false" : "true");
    }

    function setGameActive(active) {
      gameActive = active;
      controls?.classList.toggle("hidden", !active);
      hud?.classList.toggle("inactive", !active);
      rail?.classList.toggle("pokedex-rail--hidden", !active);
      updateAim();
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
      updateAim();
    }

    /* ---------- Likely-direction weighting with light alternation ---------- */
    function pickRuleWeighted(currentDex, m) {
      const s = modes[m]?.bias ?? 0.5;
      const clamped = Math.max(1, Math.min(MAX_DEX, currentDex || 1));
      const x = clamped / MAX_DEX;
      const pLower = (1 - s) * 0.5 + s * x;
      let chosen = (Math.random() < pLower) ? "lower" : "higher";

      if (lastRule && Math.random() < 0.35) {
        chosen = (lastRule === "higher") ? "lower" : "higher";
      }
      lastRule = chosen;

      dlog("rule:pick", {
        mode: m, currentDex, x: +x.toFixed(3),
        biasStrength: s,
        pLower: +pLower.toFixed(3),
        pHigher: +(1 - pLower).toFixed(3),
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

    const showStart = () => { startScreen?.classList.remove("hidden"); updateAim(); };
    const hideStart = () => { startScreen?.classList.add("hidden");    updateAim(); };
    const showEnd   = () => { endScreen?.classList.remove("hidden");   updateAim(); };
    const hideEnd   = () => { endScreen?.classList.add("hidden");      updateAim(); };

    /* ---------- Rolling ---------- */
    async function prepRoll(id, preloadedUrl) {
      imgB.src = "";
      imgA.src = urlFor(currentId ?? randId());
      imgA.classList.remove("silhouette");

      imgB.classList.add("silhouette");
      imgA.style.opacity = 1;
      imgB.style.opacity = 0;
      flash.style.opacity = 0;
      if (timerEl) timerEl.classList.remove("warn");

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

      try { await preloadImage(candUrl); } catch (_) { /* ignore */ }

      await prepRoll(candidateId, candUrl);

      deadline = now() + (modes[mode]?.limitMs || 7000);
      dlog("roll:start", { rule, currentId, candidateId, timeLimitMs: (modes[mode]?.limitMs || 7000) });

      rollLoop(mySession);
      watchdogLoop(mySession);
    }

    async function stopAndJudge(action /* "accept" | "cancel" | "timeout" */) {
      if (!rolling) return;
      session++;
      rolling = false;

      const prevCurrent = currentId;
      const isCorrectDir = (rule === "higher") ? (candidateId > currentId) : (candidateId < currentId);
      let gained = false, lost = false;

      if (action === "cancel") {
        if (!isCorrectDir) {
          score += mult; mult += 1;
          AudioMgr.playOK();
          if (hudScore) { hudScore.classList.remove('revo-pulse-good'); void hudScore.offsetWidth; hudScore.classList.add('revo-pulse-good'); }
          gained = true;
        } else {
          lives -= 1; mult = 1;
          AudioMgr.playBad();
          if (hudLives) { hudLives.classList.remove('revo-pulse-bad'); void hudLives.offsetWidth; hudLives.classList.add('revo-pulse-bad'); }
          lost = true;
        }

        imgA.classList.remove("silhouette");
        imgB.classList.remove("silhouette");
        imgA.src = urlFor(currentId);
        imgA.style.opacity = 1;
        imgB.style.opacity = 0;
        imgB.src = "";
        if (timerEl) { timerEl.textContent = "—"; timerEl.classList.remove("warn"); }

        dlog("compare", {
          rule, current_before: prevCurrent, next: candidateId,
          current_after: currentId, isCorrectDir, action,
          outcome: gained ? "point" : "life_lost"
        });

        setHUD();

        if (lives <= 0) {
          if (finalScore) finalScore.textContent = String(score);
          setGameActive(false);
          showEnd();
          dlog("game:over", { finalScore: score });
          return;
        }
        newRule();
        return;
      }

      // ACCEPT/TIMEOUT path
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

      if (isCorrectDir) {
        score += mult; mult += 1;
        currentId = candidateId;
        AudioMgr.playOK();
        if (hudScore) { hudScore.classList.remove('revo-pulse-good'); void hudScore.offsetWidth; hudScore.classList.add('revo-pulse-good'); }
        gained = true;
      } else {
        lives -= 1; mult = 1;
        currentId = candidateId;
        AudioMgr.playBad();
        if (hudLives) { hudLives.classList.remove('revo-pulse-bad'); void hudLives.offsetWidth; hudLives.classList.add('revo-pulse-bad'); }
        lost = true;
      }

      dlog("compare", {
        rule, current_before: prevCurrent, next: candidateId,
        current_after: currentId, isCorrectDir, action,
        outcome: gained ? "point" : "life_lost"
      });

      await sleep(280);
      imgA.src = urlFor(currentId);
      imgA.style.opacity = 1;
      imgB.style.opacity = 0;
      imgB.src = "";
      setHUD();

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

        // NEW: update title with difficulty
        if (titleEl) titleEl.textContent = `Random Evolution (${cap(mode)})`;

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

      // NEW: reset title
      if (titleEl) titleEl.textContent = "Random Evolution";
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

    dlog("ready");
  })();
});
