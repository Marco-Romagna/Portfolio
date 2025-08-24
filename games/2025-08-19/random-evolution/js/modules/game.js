// games/2025-08-19/random-evolution/js/modules/game.js
(function(){
  const root = window.Revo = window.Revo || {};
  const { Util, Audio, DOM, Rail, HUD, History } = root;
  const { sleep, now, cap, randInt, preloadImage } = Util;
  const { AudioMgr } = Audio;

  const Game = (() => {
    let DEBUG = true;
    let settings;
    let base, ext, start, end;
    let urlFor = (id) => `${base}${id}${ext}`;

    const modes = {
      easy:   { speedFactor: 0.4, limitMs: 16000, bias: 0.30 },
      medium: { speedFactor: 0.8, limitMs: 11000, bias: 0.60 },
      hard:   { speedFactor: 1.0, limitMs:  7000, bias: 0.85 }
    };
    const baseInterval  = 500;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // state
    let mode       = null;
    let gameActive = false;
    let currentId  = null;
    let candidateId= null;
    let deadline   = 0;
    let score      = 0;
    let lives      = 3;
    let mult       = 1;
    let rule       = "higher";
    let lastRule   = null;

    let session    = 0;
    let rolling    = false;
    let debouncing = false;
    let audioInited= false;

    function dlog(...args){ if (DEBUG) console.log("[REVO]", ...args); }
    function ensureAudioInit(){ if (!audioInited){ AudioMgr.init(); audioInited = true; } }
    function randId(){ return randInt(start, end); }
    function pickOther(){ let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; }
    function currentInterval(){ return reducedMotion ? 240 : (baseInterval / (modes[mode]?.speedFactor || 1.0)); }

    function withDebounce(fn, ms = 120){
      return (...args) => {
        if (debouncing) return;
        debouncing = true;
        try { fn(...args); } finally { setTimeout(() => { debouncing = false; }, ms); }
      };
    }

    function hardStopAll(){ rolling = false; session++; deadline = 0; dlog("hardStopAll",{session}); }
    function clearStageImages(){
      const dom = DOM;
      if (dom.imgA) { dom.imgA.src = ""; dom.imgA.style.opacity = 0; dom.imgA.classList.remove("silhouette"); }
      if (dom.imgB) { dom.imgB.src = ""; dom.imgB.style.opacity = 0; dom.imgB.classList.remove("silhouette"); }
      if (dom.flash) dom.flash.style.opacity = 0;
      if (dom.timer) { dom.timer.textContent = "—"; dom.timer.classList.remove("warn"); }
      candidateId = null;
    }

    function showInstant(id){
      const dom = DOM;
      currentId = id;
      dom.imgA.src = urlFor(id);
      dom.imgB.src = "";
      dom.imgA.classList.remove("silhouette");
      dom.imgB.classList.remove("silhouette");
      dom.imgA.style.opacity = 1;
      dom.imgB.style.opacity = 0;
      dom.flash.style.opacity = 0;
      if (dom.timer) { dom.timer.textContent = "—"; dom.timer.classList.remove("warn"); }
      HUD.update(DOM, getPublicState());
    }

    function updateTimer(){
      const dom = DOM;
      if (!dom.timer || !rolling) return;
      const ms  = Math.max(0, deadline - now());
      const sec = (ms / 1000).toFixed(1);
      dom.timer.textContent = sec;
      dom.timer.classList.toggle("warn", ms <= 3000);
    }

    function pop(el, durMs = 250){
      el.style.transition = `transform ${durMs}ms cubic-bezier(.2,1,.2,1)`;
      el.style.transform  = "scale(0.9)";
      requestAnimationFrame(() => {
        el.style.transform = "scale(1)";
        setTimeout(() => { el.style.transition = ""; el.style.transform = ""; }, durMs + 20);
      });
    }

    function pickRuleWeighted(currentDex, m){
      const s = modes[m]?.bias ?? 0.5;
      const clamped = Math.max(1, Math.min(end, currentDex || 1));
      const x = clamped / end;
      const pLower = (1 - s) * 0.5 + s * x;
      let chosen = (Math.random() < pLower) ? "lower" : "higher";
      if (lastRule && Math.random() < 0.35) chosen = (lastRule === "higher") ? "lower" : "higher";
      lastRule = chosen;
      dlog("rule:pick", { currentDex, chosen });
      return chosen;
    }
    function newRule(){
      rule = pickRuleWeighted(currentId, mode);
      HUD.update(DOM, getPublicState());
    }

    /* ===== Rails visibility helpers ===== */
    function stageWrap(){ return document.querySelector('.revo-stage-wrap'); }
    function hideRails(){
      const wrap = stageWrap();
      wrap?.classList.add('rails-hidden');
      DOM.rail?.setAttribute('aria-hidden','true');
      DOM.historyWrap?.setAttribute('aria-hidden','true');
    }
    function showRails(){
      const wrap = stageWrap();
      wrap?.classList.remove('rails-hidden');
      DOM.rail?.setAttribute('aria-hidden','false');
      DOM.historyWrap?.setAttribute('aria-hidden','false');
      History.setCapacity(DOM);
    }

    /* ===== Unified controls toggles (Evolve vs A/B) ===== */
    function showEvolve(show){
      // Evolve is the big center button; A/B hidden while idle
      DOM.evolveBtn?.classList.toggle('hidden', !show);
      if (show){
        DOM.btnA?.classList.add('hidden');
        DOM.btnB?.classList.add('hidden');
        DOM.controls?.classList.remove('hidden'); // keep the row visible
      }
    }
    function showDecision(show){
      // When deciding, show A/B (sides), hide Evolve (center)
      const toggle = (el, on) => el?.classList.toggle('hidden', !on);
      toggle(DOM.btnA, show);
      toggle(DOM.btnB, show);
      if (show) DOM.evolveBtn?.classList.add('hidden');
      DOM.controls?.classList.remove('hidden');
    }

    function clearOverlays(){ DOM.endScreen?.classList.add("hidden"); DOM.startScreen?.classList.add("hidden"); }
    function showStart(){ DOM.startScreen?.classList.remove("hidden"); HUD.update(DOM, getPublicState()); }
    function showEnd(){ DOM.endScreen?.classList.remove("hidden"); HUD.update(DOM, getPublicState()); }

    async function prepRoll(id, preloadedUrl){
      const dom = DOM;
      dom.imgB.src = "";
      dom.imgA.src = urlFor(currentId ?? randId());
      dom.imgA.classList.remove("silhouette");

      dom.imgB.classList.add("silhouette");
      dom.imgA.style.opacity = 1;
      dom.imgB.style.opacity = 0;
      dom.flash.style.opacity = 0;
      if (dom.timer) dom.timer.classList.remove("warn");

      dom.imgB.src = preloadedUrl || urlFor(id);
    }

    async function rollLoop(mySession){
      while (rolling && mySession === session){
        const dom = DOM;
        const showB = dom.imgB.style.opacity !== "1";
        dom.imgA.classList.add("silhouette");
        dom.imgB.classList.add("silhouette");
        dom.imgA.style.opacity = showB ? 0 : 1;
        dom.imgB.style.opacity = showB ? 1 : 0;
        updateTimer();
        await sleep(currentInterval());
      }
    }

    async function watchdogLoop(mySession){
      while (rolling && mySession === session){
        updateTimer();
        if (now() >= deadline){
          dlog("timeout:deadline", { at: now(), deadline, rule, currentId, candidateId });
          await stopAndJudge("timeout");
          break;
        }
        await sleep(60);
      }
    }

    async function startRoll(){
      if (!gameActive || rolling) return;
      session++;
      const mySession = session;
      rolling = true;

      // Toggle: hide EVOLVE, show A/B
      showEvolve(false);
      showDecision(true);

      candidateId = pickOther();
      const candUrl = urlFor(candidateId);

      try { await preloadImage(candUrl); } catch (_) {}

      await prepRoll(candidateId, candUrl);

      deadline = now() + (modes[mode]?.limitMs || 7000);
      dlog("roll:start", { rule, currentId, candidateId, timeLimitMs: (modes[mode]?.limitMs || 7000) });

      rollLoop(mySession);
      watchdogLoop(mySession);
    }

    async function stopAndJudge(action /* "accept" | "cancel" | "timeout" */){
      if (!rolling) return;
      session++;
      rolling = false;
      const dom = DOM;

      const prevCurrent = currentId;
      const isCorrectDir = (rule === "higher") ? (candidateId > currentId) : (candidateId < currentId);

      if (action === "cancel") {
        if (!isCorrectDir) {
          score += mult; mult += 1; AudioMgr.playOK(); HUD.pulseGood(dom);
        } else {
          lives -= 1; mult = 1;    AudioMgr.playBad();  HUD.pulseBad(dom);
        }
        History.push(dom, urlFor, { id: candidateId, action: 'cancel', correct: !isCorrectDir });

        dom.imgA.classList.remove("silhouette");
        dom.imgB.classList.remove("silhouette");
        dom.imgA.src = urlFor(currentId);
        dom.imgA.style.opacity = 1;
        dom.imgB.style.opacity = 0;
        dom.imgB.src = "";
        if (dom.timer) { dom.timer.textContent = "—"; dom.timer.classList.remove("warn"); }

        HUD.update(dom, getPublicState());
        if (lives <= 0) return endGame();

        newRule();
        showDecision(false);
        showEvolve(true);
        return;
      }

      // accept / timeout path
      dom.imgA.classList.add("silhouette");
      dom.imgB.classList.add("silhouette");
      dom.imgA.style.opacity = 0;
      dom.imgB.style.opacity = 1;

      if (dom.timer) { dom.timer.textContent = "—"; dom.timer.classList.remove("warn"); }

      dom.flash.style.opacity = 1; await sleep(120); dom.flash.style.opacity = 0;

      dom.imgA.classList.remove("silhouette");
      dom.imgB.classList.remove("silhouette");
      dom.imgA.style.opacity = 0;
      dom.imgB.style.opacity = 1;
      pop(dom.imgB, 250);

      if (isCorrectDir) { score += mult; mult += 1; AudioMgr.playOK(); HUD.pulseGood(dom); }
      else              { lives -= 1; mult = 1;   AudioMgr.playBad();  HUD.pulseBad(dom); }
      currentId = candidateId;

      History.push(dom, urlFor, { id: currentId, action: 'accept', correct: isCorrectDir });

      await sleep(280);
      dom.imgA.src = urlFor(currentId);
      dom.imgA.style.opacity = 1;
      dom.imgB.style.opacity = 0;
      dom.imgB.src = "";
      HUD.update(dom, getPublicState());

      if (lives <= 0) return endGame();
      newRule();

      showDecision(false);
      showEvolve(true);
    }

    function bindInputs(){
      const onConfirm = withDebounce(() => {
        if (!gameActive || !rolling) return;
        ensureAudioInit();
        dlog("input:A confirm");
        stopAndJudge("accept");
      });
      const onCancel = withDebounce(() => {
        if (!gameActive || !rolling) return;
        ensureAudioInit();
        dlog("input:B cancel");
        stopAndJudge("cancel");
      });
      const onEvolve = withDebounce(() => {
        if (!gameActive || rolling) return;
        ensureAudioInit();
        dlog("input:E evolve");
        startRoll();
      });

      DOM.btnA?.addEventListener("click", onConfirm);
      DOM.btnB?.addEventListener("click", onCancel);
      DOM.evolveBtn?.addEventListener("click", onEvolve);

      window.addEventListener("keydown", (e) => {
        if (!gameActive) return;
        const k = e.key.toLowerCase();
        if (!rolling) {
          if (k === "enter" || k === " " || k === "e") onEvolve();
        } else {
          if (k === "enter" || k === " ") onConfirm();
          if (k === "b" || k === "escape") onCancel();
        }
      });
    }

    function endGame(){
      if (DOM.finalScore) DOM.finalScore.textContent = String(score);
      hardStopAll();
      setGameActive(false);
      showEnd();
      clearStageImages();
      hideRails();
      showEvolve(false);
      showDecision(false);
      dlog("game:over", { finalScore: score });
    }

    function setGameActive(active){
      gameActive = active;
      DOM.controls?.classList.toggle("hidden", !active);
      HUD.setActive(DOM, active);
    }

    function getPublicState(){
      return { mode, gameActive, currentId, candidateId, score, lives, mult, rule };
    }

    async function startMode(m){
      mode = m;
      Rail.applyModeClass(DOM, mode);

      score = 0; lives = 3; mult = 1;

      hardStopAll();
      clearStageImages();
      History.clear(DOM);

      currentId = randId();
      await showInstant(currentId);

      // First Pokémon (neutral) into history
      History.push(DOM, urlFor, { id: currentId, action: 'start', correct: 'neutral' });

      DOM.endScreen?.classList.add("hidden");
      DOM.startScreen?.classList.add("hidden");
      setGameActive(true);

      showRails();
      if (DOM.titleEl) DOM.titleEl.textContent = `Random Evolution (${cap(mode)})`;

      History.setCapacity(DOM);
      newRule();

      // Idle: EVOLVE only
      showDecision(false);
      showEvolve(true);
    }

    function wireStartButtons(){
      DOM.startButtons?.forEach(btn => {
        btn.addEventListener("click", async () => {
          const m = btn.getAttribute("data-mode");
          if (!modes[m]) return;
          await startMode(m);
        });
      });
      DOM.playAgain?.addEventListener("click", async () => {
        hardStopAll();
        clearStageImages();
        History.clear(DOM);

        setGameActive(false);
        mode = null;
        Rail.applyModeClass(DOM, null);

        score = 0; lives = 3; mult = 1; currentId = null; candidateId = null;
        HUD.update(DOM, getPublicState());

        DOM.endScreen?.classList.add("hidden");
        DOM.startScreen?.classList.remove("hidden");
        if (DOM.titleEl) DOM.titleEl.textContent = "Random Evolution";

        hideRails();
        showEvolve(false);
        showDecision(false);

        dlog("game:reset");
      });
    }

    async function loadSettings(){
      let url = new URL("./settings.json", document.baseURI);
      try {
        const res = await fetch(url, { cache: "no-store" });
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
      base  = settings.sprites.base_url;
      ext   = settings.sprites.file_extension || ".png";
      start = settings.sprites.range.start || 1;
      end   = settings.sprites.range.end   || 1025;
      Rail.setMax(end);
      urlFor = (id) => `${base}${id}${ext}`;
    }

    function firstPaint(){
      DOM.controls?.classList.add("hidden");
      DOM.hud?.classList.add("inactive");

      hideRails();

      currentId = null;
      clearStageImages();
      History.clear(DOM);
      History.setCapacity(DOM);

      setGameActive(false);
      HUD.update(DOM, getPublicState());
      DOM.endScreen?.classList.add("hidden");
      DOM.startScreen?.classList.remove("hidden");
      Rail.applyModeClass(DOM, null);

      showEvolve(false);
      showDecision(false);

      dlog("ready");
    }

    function boot(debugOn){ DEBUG = debugOn; }

    return {
      boot,
      init: async () => {
        DOM.grab();

        // Inject minimal feedback styles once
        if (!document.querySelector('style[data-revo-feedback]')){
          const css = `
            @keyframes revo-good { 0%{transform:scale(1)} 30%{transform:scale(1.18)} 100%{transform:scale(1)} }
            @keyframes revo-bad  { 0%{transform:scale(1)} 30%{transform:scale(0.88)} 100%{transform:scale(1)} }
            .revo-pulse-good{ animation:revo-good 320ms cubic-bezier(.2,1,.2,1); }
            .revo-pulse-bad { animation:revo-bad  320ms cubic-bezier(.2,1,.2,1); color:#f7768e !important; }
            .revo-img[src=""]{ display:none; }
          `;
          const style = document.createElement('style');
          style.setAttribute('data-revo-feedback','');
          style.textContent = css;
          document.head.appendChild(style);
        }

        await loadSettings();
        Audio.injectVolumeUI(DOM.audioRow);
        bindInputs();
        wireStartButtons();
        firstPaint();
      },
      getPublicState
    };
  })();

  root.Game = Game;
})();
