(function(){
  const root = window.Revo = window.Revo || {};
  const $ = (id) => document.getElementById(id);

  const DOM = {
    stage:       null,
    aim:         null,
    imgA:        null,
    imgB:        null,
    flash:       null,
    timer:       null,
    rail:        null,
    railTrack:   null,
    railFill:    null,
    railNeedle:  null,
    needleLine:  null,
    needleLabel: null,
    controls:    null,
    evolveBtn:   null,
    decisionRow: null,
    btnA:        null,
    btnB:        null,
    startScreen: null,
    startButtons:null,
    endScreen:   null,
    finalScore:  null,
    playAgain:   null,
    hud:         null,
    hudCurrent:  null,
    hudRule:     null,
    hudScore:    null,
    hudLives:    null,
    hudMult:     null,
    hudMode:     null,
    audioRow:    null,
    titleEl:     null,
    historyWrap: null,
    historyTrack:null,

    grab(){
      this.stage      = $("stage");
      this.aim        = $("aim");
      this.imgA       = $("imgA");
      this.imgB       = $("imgB");
      this.flash      = $("flash");
      this.timer      = $("timer");

      this.rail        = $("pokedex-rail");
      this.railTrack   = this.rail?.querySelector(".rail-track");
      this.railFill    = this.rail?.querySelector(".rail-fill");
      this.railNeedle  = this.rail?.querySelector(".rail-needle");
      this.needleLine  = this.railNeedle?.querySelector(".needle-line");
      this.needleLabel = this.railNeedle?.querySelector(".needle-label");

      this.controls    = $("controls");
      this.evolveBtn   = $("evolve-button");
      this.decisionRow = $("decision-row");
      this.btnA        = $("a-button");
      this.btnB        = $("b-button");

      this.startScreen  = $("start-screen");
      this.startButtons = this.startScreen?.querySelectorAll(".mode-btn");
      this.endScreen    = $("end-screen");
      this.finalScore   = $("final-score");
      this.playAgain    = $("play-again");

      this.hud        = $("hud");
      this.hudCurrent = $("hud-current");
      this.hudRule    = $("hud-rule");
      this.hudScore   = $("hud-score");
      this.hudLives   = $("hud-lives");
      this.hudMult    = $("hud-mult");
      this.hudMode    = $("hud-mode");

      this.audioRow   = document.querySelector(".revo-audio");
      this.titleEl    = $("game-title");

      this.historyWrap  = $("revo-history");
      this.historyTrack = $("history-track");

      // Ensure controls are inside stage
      if (this.controls && this.stage && !this.controls.classList.contains("ab-instage")){
        this.controls.classList.add("ab-instage");
        this.stage.appendChild(this.controls);
      }
    }
  };

  root.DOM = DOM;
})();
