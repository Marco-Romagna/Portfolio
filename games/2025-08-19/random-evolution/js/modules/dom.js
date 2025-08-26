// games/2025-08-19/random-evolution/js/modules/dom.js
(function () {
  const root = window.Revo = window.Revo || {};
  const $ = (id) => document.getElementById(id);

  const DOM = {
    // Stage & visual layer
    stage:       null,
    aim:         null,
    imgA:        null,
    imgB:        null,
    flash:       null,
    timer:       null,

    // Left rail (desktop)
    rail:        null,
    railTrack:   null,
    railFill:    null,
    railNeedle:  null,
    needleLine:  null,
    needleLabel: null,

    // In-stage controls
    controls:    null,
    evolveBtn:   null,
    btnA:        null,
    btnB:        null,

    // Overlays
    startScreen: null,
    startButtons:null,
    endScreen:   null,
    finalScore:  null,
    playAgain:   null,

    // HUD
    hud:         null,
    hudCurrent:  null,
    hudRule:     null,
    hudScore:    null,
    hudLives:    null,
    hudMult:     null,
    hudMode:     null,

    // Misc
    audioRow:    null,
    titleEl:     null,

    // History (right on desktop, bottom on mobile)
    historyWrap: null,
    historyTrack:null,

    // Mobile-specific hooks
    genBadge:     null,   // “Gen X” badge inside stage
    controlsDock: null,   // Side dock container (mobile landscape)

    grab(){
      // Stage & images
      this.stage      = $("stage");
      this.aim        = $("aim");
      this.imgA       = $("imgA");
      this.imgB       = $("imgB");
      this.flash      = $("flash");
      this.timer      = $("timer");

      // Rail
      this.rail        = $("pokedex-rail");
      this.railTrack   = this.rail?.querySelector(".rail-track");
      this.railFill    = this.rail?.querySelector(".rail-fill");
      this.railNeedle  = this.rail?.querySelector(".rail-needle");
      this.needleLine  = this.railNeedle?.querySelector(".needle-line");
      this.needleLabel = this.railNeedle?.querySelector(".needle-label");

      // Controls
      this.controls  = $("controls");
      this.evolveBtn = $("evolve-button");
      this.btnA      = $("a-button");
      this.btnB      = $("b-button");

      // Overlays
      this.startScreen  = $("start-screen");
      this.startButtons = this.startScreen?.querySelectorAll(".mode-btn");
      this.endScreen    = $("end-screen");
      this.finalScore   = $("final-score");
      this.playAgain    = $("play-again");

      // HUD
      this.hud        = $("hud");
      this.hudCurrent = $("hud-current");
      this.hudRule    = $("hud-rule");
      this.hudScore   = $("hud-score");
      this.hudLives   = $("hud-lives");
      this.hudMult    = $("hud-mult");
      this.hudMode    = $("hud-mode");

      // Misc
      this.audioRow   = document.querySelector(".revo-audio");
      this.titleEl    = $("game-title");

      // History
      this.historyWrap  = $("revo-history");
      this.historyTrack = $("history-track");

      // Mobile extras
      this.genBadge     = $("gen-badge");
      this.controlsDock = $("controls-dock");

      // Ensure A/B controls live inside the stage and have the in-stage class.
      // (If a previous mobile-landscape session docked them, this pulls them back.)
      if (this.controls && this.stage && this.controls.parentNode !== this.stage){
        this.stage.appendChild(this.controls);
      }
      if (this.controls && !this.controls.classList.contains("ab-instage")){
        this.controls.classList.add("ab-instage");
      }
    }
  };

  root.DOM = DOM;
})();
