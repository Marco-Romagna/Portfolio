(function(){
  const root = window.Revo = window.Revo || {};

  const GEN_STARTS = [1, 152, 252, 387, 494, 650, 722, 810, 906];

  function isMobile(){
    return window.matchMedia("(max-width: 860px)").matches;
  }
  function genForDex(n){
    for (let i = GEN_STARTS.length - 1; i >= 0; i--){
      if (n >= GEN_STARTS[i]) return i + 1;
    }
    return 1;
  }

  const Rail = {
    maxDex: 1025,
    setMax(end){ this.maxDex = end || 1025; },
    pctForDex(n){ return (Math.max(1, Math.min(this.maxDex, n || 1)) / this.maxDex) * 100; },

    // We no longer inject any on-stage rail elements on mobile.
    clearDecor(dom){
      const { rail, railTrack } = dom;
      if (railTrack) railTrack.querySelectorAll(".rail-divider").forEach(el => el.remove());
      rail?.querySelector(".rail-mid-labels")?.remove();
    },

    renderDecor(dom, mode){
      if (isMobile()) return; // no side-rail decor on mobile
      const { rail, railTrack } = dom;
      if (!railTrack) return;
      this.clearDecor(dom);

      // Generation dividers
      GEN_STARTS.forEach(startNum => {
        const pos = this.pctForDex(startNum);
        const divider = document.createElement("div");
        divider.className = "rail-divider";
        divider.style.bottom = pos + "%";
        railTrack.appendChild(divider);
      });

      if (mode === "hard") return;

      // Mid labels
      const bounds = [...GEN_STARTS, this.maxDex + 1];
      const wrap = document.createElement("div");
      wrap.className = "rail-mid-labels";
      for (let i = 0; i < bounds.length - 1; i++) {
        const segStart = bounds[i];
        const next     = bounds[i + 1];
        const segEnd   = next - 1;
        const midDex   = Math.floor((segStart + segEnd) / 2);
        const pos      = this.pctForDex(midDex);
        const lab = document.createElement("div");
        lab.className = "rail-mid-label";
        lab.style.bottom = pos + "%";
        lab.innerHTML = `<span class="full">Gen ${i + 1}</span><span class="short">G${i + 1}</span>`;
        rail.appendChild(wrap);
        wrap.appendChild(lab);
      }
    },

    update(dom, dexNumber){
      if (isMobile()){
        // On mobile we rely on Game.setStageGenDecor() to paint the subtle background band.
        return;
      }

      // Desktop: update the left rail fill/needle
      const { rail, railFill, railNeedle, needleLine, needleLabel } = dom;
      if (!rail || !railFill || !railNeedle || !needleLine || !needleLabel) return;

      rail.classList.remove("pokedex-rail--hidden");
      const pct = this.pctForDex(dexNumber);
      railFill.style.height = pct + "%";
      railNeedle.style.bottom = pct + "%";
      needleLine.style.width = "100%";
      needleLabel.textContent = `#${dexNumber ?? "—"}`;
    },

    applyModeClass(dom, mode){
      if (!isMobile()){
        const { rail } = dom;
        if (rail){
          rail.classList.remove("easy","medium","hard");
          if (mode) rail.classList.add(mode);
        }
      }
      this.renderDecor(dom, mode || "easy");
    }
  };

  root.Rail = Rail;
})();
