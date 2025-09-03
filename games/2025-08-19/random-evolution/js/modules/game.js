// games/2025-08-19/random-evolution/js/modules/game.js
// Random Evolution game coordinator
// Public API:
//   Revo.Game.init()
//   Revo.Game.startMode("easy"|"medium"|"hard")
//   Revo.Game.resetToStart()

(function () {
  const root = (window.Revo = window.Revo || {});
  const { Util = {}, Audio = {}, DOM: DOMMod = {}, Rail = {}, HUD = {}, History = {} } = root;
  const { sleep = (ms)=>new Promise(r=>setTimeout(r,ms)), now = ()=>performance.now(),
          preloadImage = (src)=>new Promise((res)=>{ const i=new Image(); i.onload=()=>res(); i.src=src; } ) } = Util;
  const { AudioMgr = {} } = Audio;

  // sprite url builder (base/ext provided by Rail or DOM)
  let base = "", ext = ".png", startDex = 1, endDex = 1025;
  function urlFor(dex) { return `${base}${dex}${ext}`; }

  // difficulties
  const MODES = {
    easy:   { speedFactor: 0.4, limitMs: 16000, bias: 0.30 },
    medium: { speedFactor: 0.8, limitMs: 11000, bias: 0.60 },
    hard:   { speedFactor: 1.0, limitMs:  7000, bias: 0.85 }
  };
  const BASE_INTERVAL = 500;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // state
  let mode = null, running = false, rolling = false, session = 0;
  let currentId = null, candidateId = null, deadline = 0;
  let score = 0, mult = 1, lives = 3;
  let rule = "higher", lastRule = null;

  // timers
  let _tickTimer = null, _roundTimer = null;

  // DOM cache (via Revo.DOM.grab if present)
  function grabDOM() {
    if (DOMMod && typeof DOMMod.grab === "function") return DOMMod.grab();
    return {
      stageWrap: document.querySelector(".revo-stage-wrap"),
      stage: document.querySelector(".revo-stage"),
      controlsDock: document.querySelector(".controls-dock"),

      imgA: document.getElementById("revo-img-a") || document.getElementById("revo-img"),
      imgB: document.getElementById("revo-img-b"),
      flash: document.getElementById("revo-flash"),
      timer: document.getElementById("revo-timer"),
      genBadge: document.getElementById("stage-gen-badge"),
      aim: document.getElementById("revo-aim"),

      evolveBtn: document.getElementById("evolve-button"),
      controls: document.getElementById("controls"),

      startScreen: document.getElementById("difficulty-pane"),
      endScreen: document.getElementById("end-screen"),
      playAgain: document.getElementById("btn-play-again"),
      titleEl: document.getElementById("game-title"),

      historyWrap: document.getElementById("revo-history"),
      historyTrack: document.getElementById("history-track"),

      // audio ui (optional)
      volume: document.getElementById("volume") || document.querySelector('[data-audio="volume"]'),
      mute: document.getElementById("mute-toggle") || document.querySelector('[data-audio="mute"]')
    };
  }

  // utils
  const debounce = (fn, ms = 120) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  function teardownTimers(){ try{clearInterval(_tickTimer);}catch{} try{clearTimeout(_roundTimer);}catch{} _tickTimer=_roundTimer=null; }

  // layout ----------------------------------------------------
  function applyResponsiveLayout(DOM){
    const wrap = DOM.stageWrap;
    if (!wrap) return;
    const isMobileLandscape = window.matchMedia("(max-width: 860px) and (orientation: landscape)").matches;
    wrap.classList.toggle("mobile-landscape", isMobileLandscape);

    // move controls/evolve/aim into dock in landscape small
    if (isMobileLandscape && DOM.controlsDock){
      if (DOM.controls && DOM.controls.parentNode !== DOM.controlsDock) DOM.controlsDock.appendChild(DOM.controls);
      if (DOM.evolveBtn && DOM.evolveBtn.parentNode !== DOM.controlsDock) DOM.controlsDock.appendChild(DOM.evolveBtn);
      if (DOM.aim && DOM.aim.parentNode !== DOM.controlsDock) DOM.controlsDock.appendChild(DOM.aim);
      DOM.controlsDock.setAttribute("aria-hidden","false");
    }else if (DOM.stage){
      if (DOM.controls && DOM.controls.parentNode !== DOM.stage) DOM.stage.appendChild(DOM.controls);
      if (DOM.evolveBtn && DOM.evolveBtn.parentNode !== DOM.stage) DOM.stage.appendChild(DOM.evolveBtn);
      if (DOM.aim && DOM.aim.parentNode !== DOM.stage) DOM.stage.appendChild(DOM.aim);
      DOM.controlsDock?.setAttribute("aria-hidden","true");
    }
  }
  const onResize = debounce(()=>{ const DOM=grabDOM(); applyResponsiveLayout(DOM); History.setCapacity?.(DOM); },120);

  // rails visibility ------------------------------------------
  function hideRails(DOM){ DOM.stageWrap?.classList.add("rails-hidden"); DOM.historyWrap?.setAttribute("aria-hidden","true"); }
  function showRails(DOM){ DOM.stageWrap?.classList.remove("rails-hidden"); DOM.historyWrap?.setAttribute("aria-hidden","false"); History.setCapacity?.(DOM); }

  // stage helpers ---------------------------------------------
  function currentInterval(){ return REDUCED ? 240 : (BASE_INTERVAL / (MODES[mode]?.speedFactor || 1)); }
  function randInt(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }
  function randId(){ return randInt(startDex, endDex); }
  function pickOther(){ let id = randId(); while (currentId != null && id === currentId) id = randId(); return id; }

  function setStageGenDecor(DOM, dex){
    const gens = [
      { n:1,s:1,e:151 },{ n:2,s:152,e:251 },{ n:3,s:252,e:386 },
      { n:4,s:387,e:493 },{ n:5,s:494,e:649 },{ n:6,s:650,e:721 },
      { n:7,s:722,e:809 },{ n:8,s:810,e:905 },{ n:9,s:906,e:1025 }
    ];
    const g = gens.find(g => dex >= g.s && dex <= g.e) || gens[0];
    const pct = (v) => `${(v / (endDex || 1025)) * 100}%`;
    DOM.stage?.style.setProperty("--gen-start", pct(g.s));
    DOM.stage?.style.setProperty("--gen-end", pct(g.e));
    if (DOM.genBadge){ DOM.genBadge.textContent = `Gen ${g.n}`; DOM.genBadge.setAttribute("aria-hidden","false"); }
  }

  function clearStageImages(DOM){
    if (DOM.imgA){ DOM.imgA.src=""; DOM.imgA.style.opacity=0; DOM.imgA.classList.remove("silhouette"); }
    if (DOM.imgB){ DOM.imgB.src=""; DOM.imgB.style.opacity=0; DOM.imgB.classList.remove("silhouette"); }
    if (DOM.flash) DOM.flash.style.opacity = 0;
    if (DOM.timer){ DOM.timer.textContent=""; DOM.timer.classList.remove("warn"); }
    DOM.genBadge?.setAttribute("aria-hidden","true");
  }

  function showInstant(DOM, id){
    currentId = id;
    setStageGenDecor(DOM, currentId);
    if (DOM.imgA){ DOM.imgA.src = urlFor(id); DOM.imgA.style.opacity = 1; DOM.imgA.classList.remove("silhouette"); }
    if (DOM.imgB){ DOM.imgB.src = ""; DOM.imgB.style.opacity = 0; DOM.imgB.classList.remove("silhouette"); }
    if (DOM.flash) DOM.flash.style.opacity = 0;
    if (DOM.timer){ DOM.timer.textContent=""; DOM.timer.classList.remove("warn"); }
    HUD.update?.(DOM, publicState());
  }

  // rule logic ------------------------------------------------
  function pickRuleWeighted(currentDex, m){
    const s = MODES[m]?.bias ?? 0.5;
    const x = (Math.max(1, Math.min(endDex, currentDex || 1))) / endDex;
    const pLower = (1 - s)*0.5 + s*x;               // more likely lower for higher dex
    let chosen = (Math.random() < pLower) ? "lower" : "higher";
    if (lastRule && Math.random() < 0.35) chosen = (lastRule === "higher") ? "lower" : "higher";
    lastRule = chosen;
    return chosen;
  }
  function newRule(DOM){ rule = pickRuleWeighted(currentId, mode); HUD.update?.(DOM, publicState()); }

  // roll loop -------------------------------------------------
  async function prepRoll(DOM, id, url){
    if (DOM.imgB) DOM.imgB.src = "";
    if (DOM.imgA){ DOM.imgA.src = urlFor(currentId ?? randId()); DOM.imgA.classList.remove("silhouette"); DOM.imgA.style.opacity = 1; }
    if (DOM.imgB){ DOM.imgB.classList.add("silhouette"); DOM.imgB.style.opacity = 0; }
    if (DOM.flash) DOM.flash.style.opacity = 0;
    if (DOM.timer) DOM.timer.classList.remove("warn");
    if (DOM.imgB) DOM.imgB.src = url || urlFor(id);
  }

  function updateTimer(DOM){
    if (!DOM.timer || !rolling) return;
    const ms = Math.max(0, deadline - now());
    DOM.timer.textContent = (ms/1000).toFixed(1);
    DOM.timer.classList.toggle("warn", ms <= 3000);
  }

  async function rollLoop(DOM, token){
    while (rolling && token === session){
      const showB = DOM.imgB && DOM.imgB.style.opacity !== "1";
      if (DOM.imgA) { DOM.imgA.classList.add("silhouette"); DOM.imgA.style.opacity = showB ? 0 : 1; }
      if (DOM.imgB) { DOM.imgB.classList.add("silhouette"); DOM.imgB.style.opacity = showB ? 1 : 0; }
      updateTimer(DOM);
      await sleep(currentInterval());
    }
  }

  async function watchdogLoop(DOM, token){
    while (rolling && token === session){
      updateTimer(DOM);
      if (now() >= deadline){ await stopAndJudge(DOM, "timeout"); break; }
      await sleep(60);
    }
  }

  async function startRoll(DOM){
    if (!running || rolling) return;
    session++; rolling = true;

    DOM.evolveBtn?.classList.add("hidden");
    DOM.controls?.classList.remove("hidden");

    candidateId = pickOther();
    const candUrl = urlFor(candidateId);
    try { await preloadImage(candUrl); } catch {}

    await prepRoll(DOM, candidateId, candUrl);

    deadline = now() + (MODES[mode]?.limitMs || 7000);

    rollLoop(DOM, session);
    watchdogLoop(DOM, session);
  }

  async function stopAndJudge(DOM, action /* "accept" | "cancel" | "timeout" */){
    if (!rolling) return;
    session++; rolling = false;

    const isCorrectDir = (rule === "higher") ? (candidateId > currentId) : (candidateId < currentId);

    if (action === "cancel"){
      if (!isCorrectDir){ score += mult; mult += 1; AudioMgr.playOK?.(); HUD.pulseGood?.(DOM); }
      else { lives -= 1; mult = 1; AudioMgr.playBad?.(); HUD.pulseBad?.(DOM); }
      History.push?.(DOM, urlFor, { id: candidateId, action:'cancel', correct: !isCorrectDir });

      if (DOM.imgA){ DOM.imgA.classList.remove("silhouette"); DOM.imgA.src = urlFor(currentId); DOM.imgA.style.opacity = 1; }
      if (DOM.imgB){ DOM.imgB.classList.remove("silhouette"); DOM.imgB.style.opacity = 0; DOM.imgB.src = ""; }
      if (DOM.timer){ DOM.timer.textContent=""; DOM.timer.classList.remove("warn"); }

      HUD.update?.(DOM, publicState());
      if (lives <= 0) return endGame(DOM);

      newRule(DOM);
      DOM.controls?.classList.add("hidden");
      DOM.evolveBtn?.classList.remove("hidden");
      return;
    }

    // accept / timeout
    if (DOM.imgA){ DOM.imgA.classList.add("silhouette"); DOM.imgA.style.opacity = 0; }
    if (DOM.imgB){ DOM.imgB.classList.add("silhouette"); DOM.imgB.style.opacity = 1; }
    if (DOM.timer){ DOM.timer.textContent=""; DOM.timer.classList.remove("warn"); }

    if (DOM.flash){ DOM.flash.style.opacity = 1; await sleep(120); DOM.flash.style.opacity = 0; }

    if (isCorrectDir){ score += mult; mult += 1; currentId = candidateId; AudioMgr.playOK?.(); HUD.pulseGood?.(DOM); }
    else { lives -= 1; mult = 1; currentId = candidateId; AudioMgr.playBad?.(); HUD.pulseBad?.(DOM); }

    setStageGenDecor(DOM, currentId);
    History.push?.(DOM, urlFor, { id: currentId, action:'accept', correct: isCorrectDir });

    await sleep(280);
    if (DOM.imgA){ DOM.imgA.src = urlFor(currentId); DOM.imgA.style.opacity = 1; }
    if (DOM.imgB){ DOM.imgB.style.opacity = 0; DOM.imgB.src = ""; }
    HUD.update?.(DOM, publicState());

    if (lives <= 0) return endGame(DOM);
    newRule(DOM);

    DOM.controls?.classList.add("hidden");
    DOM.evolveBtn?.classList.remove("hidden");
  }

  // game flow -------------------------------------------------
  function publicState(){ return { mode, running, currentId, candidateId, score, lives, mult, rule }; }

  function setRunning(DOM, on){
    running = on;
    HUD.setActive?.(DOM, on);
    if (!on){ DOM.controls?.classList.add("hidden"); DOM.evolveBtn?.classList.add("hidden"); }
  }

  function endGame(DOM){
    teardownTimers();
    setRunning(DOM, false);
    if (DOM.endScreen) DOM.endScreen.classList.remove("hidden");
    if (DOM.startScreen) DOM.startScreen.classList.add("hidden");
    clearStageImages(DOM);
    hideRails(DOM);
  }

  async function startMode(m){
    const DOM = grabDOM();
    mode = m || "easy";
    Rail.applyModeClass?.(DOM, mode);

    // reset round state
    score = 0; mult = 1; lives = 3; candidateId = null;
    session++; rolling = false; deadline = 0;
    History.clear?.(DOM);
    clearStageImages(DOM);

    currentId = randId();
    await showInstant(DOM, currentId);
    History.push?.(DOM, urlFor, { id: currentId, action:'start', correct:'neutral' });

    DOM.endScreen?.classList.add("hidden");
    DOM.startScreen?.classList.add("hidden");
    setRunning(DOM, true);

    showRails(DOM);
    if (DOM.titleEl) DOM.titleEl.textContent = `Random Evolution (${m[0].toUpperCase()+m.slice(1)})`;

    History.setCapacity?.(DOM);
    newRule(DOM);

    DOM.controls?.classList.add("hidden");
    DOM.evolveBtn?.classList.remove("hidden");
    applyResponsiveLayout(DOM);
  }

  // reset to start (refresh-like) -----------------------------
  function resetToStart(passedDOM){
    const DOM = passedDOM || grabDOM();
    teardownTimers();
    setRunning(DOM, false);

    clearStageImages(DOM);
    History.clear?.(DOM);
    hideRails(DOM);

    // show start panel
    DOM.startScreen?.classList.remove("hidden");
    DOM.endScreen?.classList.add("hidden");

    // memory state
    mode = null; currentId = null; candidateId = null; score = 0; mult = 1; lives = 3; rule = "higher"; lastRule = null;

    applyResponsiveLayout(DOM);
    History.setCapacity?.(DOM);
  }

  // input wiring ----------------------------------------------
  function bindInputs(DOM){
    // evolve / A / B
    DOM.evolveBtn?.addEventListener("click", ()=> startRoll(DOM));
    const btnA = DOM.controls?.querySelector('[data-key="A"]');
    const btnB = DOM.controls?.querySelector('[data-key="B"]');
    btnA?.addEventListener("click", ()=> rolling && stopAndJudge(DOM,"accept"));
    btnB?.addEventListener("click", ()=> rolling && stopAndJudge(DOM,"cancel"));

    window.addEventListener("keydown",(e)=>{
      if (!running) return;
      const k = e.key.toLowerCase();
      if (!rolling){
        if (k==="enter" || k===" " || k==="e") startRoll(DOM);
      }else{
        if (k==="enter" || k===" ") stopAndJudge(DOM,"accept");
        if (k==="b" || k==="escape") stopAndJudge(DOM,"cancel");
      }
    });

    // difficulty buttons via delegation
    document.addEventListener("click", (e)=>{
      const b = e.target.closest("[data-mode]");
      if (!b) return;
      const m = b.dataset.mode;
      if (m==="easy"||m==="medium"||m==="hard"){ e.preventDefault(); startMode(m); }
    });

    // play again
    DOM.playAgain?.addEventListener("click", (e)=>{ e.preventDefault(); resetToStart(DOM); });

    // audio UI binding (slider/mute)
    try{ AudioMgr.init?.(); root.Audio?.bindUI?.(DOM); }catch{}
  }

  // init ------------------------------------------------------
  function init(){
    const DOM = grabDOM();

    // sprite base/ext and dex range from Rail (if provided)
    if (Rail && Rail.spriteBase) base = Rail.spriteBase;
    if (Rail && Rail.spriteExt)  ext  = Rail.spriteExt;
    if (Rail && Rail.minDex)     startDex = Rail.minDex;
    if (Rail && Rail.maxDex)     endDex   = Rail.maxDex;

    // layout + observers
    applyResponsiveLayout(DOM);
    window.addEventListener("resize", onResize, { passive:true });
    try{
      const q1 = window.matchMedia("(orientation: portrait)");
      const q2 = window.matchMedia("(orientation: landscape)");
      q1.addEventListener?.("change", onResize);
      q2.addEventListener?.("change", onResize);
    }catch{}

    bindInputs(DOM);

    // land on start screen
    resetToStart(DOM);
  }

  // exports
  root.Game = { init, startMode, resetToStart };
})();
