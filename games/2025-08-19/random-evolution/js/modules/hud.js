(function(){
  const root = window.Revo = window.Revo || {};
  const { cap } = root.Util;

  const HUD = {
    update(dom, state){
      const { hudCurrent, hudScore, hudLives, hudMult, hudMode, hudRule } = dom;
      const { gameActive, currentId, score, lives, mult, mode, rule } = state;

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
      if (currentId != null) root.Rail.update(dom, currentId);

      // aim banner
      const overlaysHidden =
        dom.startScreen?.classList.contains("hidden") &&
        dom.endScreen?.classList.contains("hidden");
      const active = gameActive && overlaysHidden;

      if (dom.aim){
        dom.aim.style.display = active ? "block" : "none";
        const isHigher = rule === "higher";
        const ref = (currentId != null) ? currentId : "—";
        dom.aim.textContent = `${isHigher ? "Higher" : "Lower"} than ${ref}`;
        dom.aim.classList.toggle("higher", isHigher);
        dom.aim.classList.toggle("lower", !isHigher);
        dom.aim.setAttribute("aria-hidden", active ? "false" : "true");
      }
    },
    setActive(dom, active){
      dom.hud?.classList.toggle("inactive", !active);
      dom.rail?.classList.toggle("pokedex-rail--hidden", !active);
      this.update(dom, window.Revo.Game.getPublicState());
    },
    pulseGood(dom){ if (dom.hudScore){ dom.hudScore.classList.remove('revo-pulse-good'); void dom.hudScore.offsetWidth; dom.hudScore.classList.add('revo-pulse-good'); } },
    pulseBad(dom){  if (dom.hudLives){ dom.hudLives.classList.remove('revo-pulse-bad'); void dom.hudLives.offsetWidth; dom.hudLives.classList.add('revo-pulse-bad'); } },
  };

  root.HUD = HUD;
})();
