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

    /* ---------- rails visibility (preserve layout) ---------- */
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

    /* ---------- simple button & overlay visibility ---------- */
    function showEvolve(show){ DOM.evolveBtn?.classList.toggle('hidden', !show); }
    function showDecision(show){
      if (!DOM.controls) return;
      DOM.controls.classList.toggle('hidden', !show);
      DOM.controls.classList.toggle('center-split', show);
    }
    function showStart(){
      DOM.startScreen?.classList.remove("hidden");
      DOM.endScreen?.classList.add("hidden");
      HUD.update(DOM, getPublicState());
    }
    function showEnd(){
      DOM.endScreen?.classList.remove("hidden");
      DOM.startScreen?.classList.add("hidden");
      setTimeout(()=> DOM.playAgain?.focus(), 0);
      HUD.update(DOM, getPublicState());
    }

    /* ---------- stage helpers ---------- */
    function hardStopAll(){ rolling = false; session++; deadline = 0; }
    function clearStageImages(){
      if (DOM.imgA) { DOM.imgA.src = ""; DOM.imgA.style.opacity = 0; DOM.imgA.classList.remove("silhouette"); }
      if (DOM.imgB) { DOM.imgB.src = ""; DOM.imgB.style.opacity = 0; DOM.imgB.classList.remove("silhouette"); }
      if (DOM.flash) DOM.flash.style.opacity = 0;
      if (DOM.timer) { DOM.timer.textContent = "—"; DOM.timer.classList.remove("warn"); }
      candidateId = null;
    }
    
    function setStageGenDecor(dex){
      const gens = [
        { n:1,  start:1,   end:151 },
        { n:2,  start:152, end:251 },
        { n:3,  start:252, end:386 },
        { n:4,  start:387, end:493 },
        { n:5,  start:494, end:649 },
        { n:6,  start:650, end:721 },
        { n:7,  start:722, end:809 },
        { n:8,  start:810, end:905 },
        { n:9,  start:906, end:1025 }
      ];
      const g = gens.find(g => dex >= g.start && dex <= g.end) || gens[0];
    
      // Percent positions for vertical band
      const pct = (v) => `${(v / (Rail.maxDex || 1025)) * 100}%`;
      DOM.stage?.style.setProperty('--gen-start', pct(g.start));
      DOM.stage?.style.setProperty('--gen-end',   pct(g.end));
    
      // Badge text (visible when active)
      if (DOM.genBadge){
        DOM.genBadge.textContent = `Gen ${g.n}`;
        DOM.genBadge.setAttribute('aria-hidden', 'false');
      }
    }

    function showInstant(id){
      currentId = id;
      setStageGenDecor(currentId);
      DOM.imgA.src = urlFor(id);
      DOM.imgB.src = "";
      DOM.imgA.classList.remove("silhouette");
      DOM.imgB.classList.remove("silhouette");
      DOM.imgA.style.opacity = 1;
      DOM.imgB.style.opacity = 0;
      DOM.flash.style.opacity = 0;
      if (DOM.timer) { DOM.timer.textContent = "—"; DOM.timer.classList.remove("warn"); }
      HUD.update(DOM, getPublicState());
    }
    
    /* ======= NEW: responsive twin-panels handling ======= */
    function applyResponsiveLayout(){
      const isSmall = window.matchMedia('(max-width: 860px)').matches;
      const isLand  = window.matchMedia('(orientation: landscape)').matches;
      const wrap    = document.querySelector('.revo-stage-wrap');
      if (!wrap || !DOM.controls) return;

      const useDock = isSmall && isLand && window.innerHeight < 520;

      // Toggle wrapper class for CSS
      wrap.classList.toggle('mobile-landscape', useDock);

      // Move controls and aim to dock or back to stage
      if (useDock && DOM.controlsDock){
        if (DOM.controls.parentNode !== DOM.controlsDock){
          DOM.controlsDock.appendChild(DOM.controls);
          DOM.controlsDock.setAttribute('aria-hidden', 'false');
        }
        if (DOM.aim && DOM.aim.parentNode !== DOM.controlsDock){
          DOM.controlsDock.appendChild(DOM.aim);
        }
      } else {
        if (DOM.stage && DOM.controls.parentNode !== DOM.stage){
          DOM.stage.appendChild(DOM.controls);
        }
        if (DOM.aim && DOM.aim.parentNode !== DOM.stage){
          DOM.stage.appendChild(DOM.aim);
        }
        DOM.controlsDock?.setAttribute('aria-hidden', 'true');
      }
    }

    function updateTimer(){
      if (!DOM.timer || !rolling) return;
      const ms  = Math.max(0, deadline - now());
      const sec = (ms / 1000).toFixed(1);
      DOM.timer.textContent = sec;
      DOM.timer.classList.toggle("warn", ms <= 3000);
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
      return chosen;
    }
    function newRule(){
      rule = pickRuleWeighted(currentId, mode);
      HUD.update(DOM, getPublicState());
    }

    async function prepRoll(id, preloadedUrl){
      DOM.imgB.src = "";
      DOM.imgA.src = urlFor(currentId ?? randId());
      DOM.imgA.classList.remove("silhouette");

      DOM.imgB.classList.add("silhouette");
      DOM.imgA.style.opacity = 1;
      DOM.imgB.style.opacity = 0;
      DOM.flash.style.opacity = 0;
      if (DOM.timer) DOM.timer.classList.remove("warn");

      DOM.imgB.src = preloadedUrl || urlFor(id);
    }

    async function rollLoop(mySession){
      while (rolling && mySession === session){
        const showB = DOM.imgB.style.opacity !== "1";
        DOM.imgA.classList.add("silhouette");
        DOM.imgB.classList.add("silhouette");
        DOM.imgA.style.opacity = showB ? 0 : 1;
        DOM.imgB.style.opacity = showB ? 1 : 0;
        updateTimer();
        await sleep(currentInterval());
      }
    }

    async function watchdogLoop(mySession){
      while (rolling && mySession === session){
        updateTimer();
        if (now() >= deadline){
          await stopAndJudge("timeout");
          break;
        }
        await sleep(60);
      }
    }

    async function startRoll(){
      if (!gameActive || rolling) return;
      session++; rolling = true;

      // UI: EVOLVE -> hidden, A/B -> visible
      showEvolve(false);
      showDecision(true);

      candidateId = pickOther();
      const candUrl = urlFor(candidateId);
      try { await preloadImage(candUrl); } catch {}

      await prepRoll(candidateId, candUrl);

      deadline = now() + (modes[mode]?.limitMs || 7000);

      rollLoop(session);
      watchdogLoop(session);
    }

    async function stopAndJudge(action /* "accept" | "cancel" | "timeout" */){
      if (!rolling) return;
      session++; rolling = false;

      const prevCurrent = currentId;
      const isCorrectDir = (rule === "higher") ? (candidateId > currentId) : (candidateId < currentId);

      if (action === "cancel") {
        if (!isCorrectDir) { score += mult; mult += 1; AudioMgr.playOK(); HUD.pulseGood(DOM); }
        else { lives -= 1; mult = 1; AudioMgr.playBad(); HUD.pulseBad(DOM); }

        History.push(DOM, urlFor, { id: candidateId, action: 'cancel', correct: !isCorrectDir });

        DOM.imgA.classList.remove("silhouette");
        DOM.imgB.classList.remove("silhouette");
        DOM.imgA.src = urlFor(currentId);
        DOM.imgA.style.opacity = 1;
        DOM.imgB.style.opacity = 0;
        DOM.imgB.src = "";
        if (DOM.timer) { DOM.timer.textContent = "—"; DOM.timer.classList.remove("warn"); }

        HUD.update(DOM, getPublicState());
        if (lives <= 0) return endGame();

        newRule();
        showDecision(false);
        showEvolve(true);
        return;
      }

      // accept / timeout
      DOM.imgA.classList.add("silhouette");
      DOM.imgB.classList.add("silhouette");
      DOM.imgA.style.opacity = 0;
      DOM.imgB.style.opacity = 1;

      if (DOM.timer) { DOM.timer.textContent = "—"; DOM.timer.classList.remove("warn"); }

      DOM.flash.style.opacity = 1; await sleep(120); DOM.flash.style.opacity = 0;

      DOM.imgA.classList.remove("silhouette");
      DOM.imgB.classList.remove("silhouette");
      DOM.imgA.style.opacity = 0;
      DOM.imgB.style.opacity = 1;
      pop(DOM.imgB, 250);

      if (isCorrectDir) { score += mult; mult += 1; currentId = candidateId; AudioMgr.playOK(); HUD.pulseGood(DOM); }
      else { lives -= 1; mult = 1; currentId = candidateId; AudioMgr.playBad(); HUD.pulseBad(DOM); }
      
      setStageGenDecor(currentId);
      History.push(DOM, urlFor, { id: currentId, action: 'accept', correct: isCorrectDir });

      await sleep(280);
      DOM.imgA.src = urlFor(currentId);
      DOM.imgA.style.opacity = 1;
      DOM.imgB.style.opacity = 0;
      DOM.imgB.src = "";
      HUD.update(DOM, getPublicState());

      if (lives <= 0) return endGame();
      newRule();

      showDecision(false);
      showEvolve(true);
    }

    function bindInputs(){
      const onConfirm = withDebounce(() => { if (gameActive && rolling){ ensureAudioInit(); stopAndJudge("accept"); } });
      const onCancel  = withDebounce(() => { if (gameActive && rolling){ ensureAudioInit(); stopAndJudge("cancel"); } });
      const onEvolve  = withDebounce(() => { if (gameActive && !rolling){ ensureAudioInit(); startRoll(); } });

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

      showEvolve(false);
      showDecision(false);

      showEnd();
      clearStageImages();
      hideRails();
    }

    function setGameActive(active){
      gameActive = active;
      if (!active){ showEvolve(false); showDecision(false); }
      HUD.setActive(DOM, active);
    }

    function getPublicState(){ return { mode, gameActive, currentId, candidateId, score, lives, mult, rule }; }

    async function startMode(m){
      mode = m;
      Rail.applyModeClass(DOM, mode);

      score = 0; lives = 3; mult = 1;
      hardStopAll();
      clearStageImages();
      History.clear(DOM);

      currentId = randId();
      await showInstant(currentId);

      History.push(DOM, urlFor, { id: currentId, action: 'start', correct: 'neutral' });
      DOM.endScreen?.classList.add("hidden");
      DOM.startScreen?.classList.add("hidden");
      setGameActive(true);

      showRails();
      if (DOM.titleEl) DOM.titleEl.textContent = `Random Evolution (${cap(mode)})`;

      History.setCapacity(DOM);
      newRule();

      showDecision(false);
      showEvolve(true);
      applyResponsiveLayout();  // re-evaluate layout after reset
    }

    function wireStartButtons(){
      DOM.startButtons?.forEach(btn => {
        btn.addEventListener("click", async () => {
          const m = btn.getAttribute("data-mode");
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
      // HUD & rails
      DOM.controls?.classList.add("hidden");
      DOM.hud?.classList.add("inactive");
      hideRails();
    
      // Reset state & visuals
      currentId = null;
      clearStageImages();
      History.clear(DOM);
      History.setCapacity(DOM);
    
      setGameActive(false);
      HUD.update(DOM, getPublicState());
    
      // Overlays
      DOM.endScreen?.classList.add("hidden");
      DOM.startScreen?.classList.remove("hidden");
    
      // Rail visuals off until a mode starts
      Rail.applyModeClass(DOM, null);
    
      // Buttons hidden in idle
      showEvolve(false);
      showDecision(false);
    
      // Make sure controls & aim live back inside the stage
      if (DOM.controls && DOM.stage && DOM.controls.parentNode !== DOM.stage){
        DOM.stage.appendChild(DOM.controls);
      }
      if (DOM.aim && DOM.aim.parentNode !== DOM.stage){
        DOM.stage.appendChild(DOM.aim);
      }
      DOM.controlsDock?.setAttribute('aria-hidden', 'true');
    
      // Clear mobile “generation band” & badge
      DOM.stage?.style.setProperty('--gen-start', '0%');
      DOM.stage?.style.setProperty('--gen-end',   '0%');
      if (DOM.genBadge){
        DOM.genBadge.textContent = '';
        DOM.genBadge.setAttribute('aria-hidden', 'true');
      }
    }

    function boot(debugOn){ DEBUG = debugOn; }

    return {
      boot,
      init: async () => {
        DOM.grab();
        const onResize = () => {
          applyResponsiveLayout();
          Rail.applyModeClass(DOM, Game.getPublicState().mode);
          History.setCapacity(DOM);
          const cur = Game.getPublicState().currentId;
          if (cur != null) Rail.update(DOM, cur);
        };
        window.addEventListener('resize', onResize);
        onResize();
      
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
