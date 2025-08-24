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

    controls:    null,   // unified row BELOW the stage
    evolveBtn:   null,   // #evolve-button (center, big)
    btnA:        null,   // #a-button (left)
    btnB:        null,   // #b-button (right)

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

      // Unified controls row (outside the stage)
      this.controls  = $("controls");
      this.evolveBtn = $("evolve-button");
      this.btnA      = $("a-button");
      this.btnB      = $("b-button");

      this.startScreen  = $("start-screen");
      this.startButtons = this.startScreen?.querySelectorAll(".mode-btn");
      this.endScreen    = $("end-screen");
      this.finalScore   = $("final-score");
      this.playAgain    = $("play-again");

      this.hud        = $("hud");
      this.hudCurrent = $("hud-current"); // optional
      this.hudRule    = $("hud-rule");    // optional
      this.hudScore   = $("hud-score");
      this.hudLives   = $("hud-lives");
      this.hudMult    = $("hud-mult");
      this.hudMode    = $("hud-mode");    // optional

      this.audioRow   = document.querySelector(".revo-audio");
      this.titleEl    = $("game-title");

      this.historyWrap  = $("revo-history");
      this.historyTrack = $("history-track");

      // IMPORTANT: do NOT move #controls into #stage.
      // It must remain a sibling (in the middle column) so it sits below the stage.
    }
  };

  root.DOM = DOM;
})();
