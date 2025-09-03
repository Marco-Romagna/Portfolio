// games/2025-08-19/random-evolution/js/modules/history.js
// History rail manager used by Game.
// API:
//   History.push(DOM, urlFor, { id, action: 'accept'|'cancel'|'start', correct: true|false|'neutral' })
//   History.clear(DOM)
//   History.setCapacity(DOM)   // recompute & enforce capacity
//   History.observe(DOM)       // (optional) bind observers + initial capacity

(function(){
  const root = window.Revo = window.Revo || {};
  const History = (() => {
    let capacity = 0;            // how many tiles we keep in DOM/state
    let state = [];              // most-recent-first
    let _observersBound = false; // bind observers once

    /* -------------------- DOM helpers -------------------- */
    function els(DOM){
      return {
        wrap:  DOM.historyWrap  || document.getElementById("revo-history"),
        track: DOM.historyTrack || document.getElementById("history-track"),
      };
    }

    /* -------------------- Capacity math -------------------- */
    // For vertical right rail: derive from available height and CSS vars
    function computeCapacity(DOM){
      const { wrap } = els(DOM);
      if (!wrap) return 0;

      const rect = wrap.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      const thumb  = parseFloat(cs.getPropertyValue("--hist-thumb")) || 40;
      const gap    = parseFloat(cs.getPropertyValue("--hist-gap")) || 8;
      const labelH = 14;                                  // approx label height
      const tileH  = thumb + labelH + gap;                // one tile + gap
      const padding= gap * 2;                             // .history-track padding
      const innerH = rect.height - padding;

      return Math.max(1, Math.floor(innerH / tileH));
    }

    function trimDOM(DOM){
      const { track } = els(DOM);
      if (!track) return;
      const items = track.querySelectorAll(".hist-item");
      for (let i = items.length - 1; i >= capacity; i--){
        items[i]?.remove();
      }
    }

    /* -------------------- Capacity controller -------------------- */
    // Determines how many history tiles to keep/render, based on actual layout.
    function setCapacity(DOM){
      const { track } = els(DOM);
      if (!track){ capacity = 0; return; }

      // Read the layout CSS applied to the track
      const dir = (getComputedStyle(track).flexDirection || "row").trim();

      if (dir === "row"){               // Bottom horizontal strip
        capacity = 40;                  // soft cap; lets it scroll
        trimDOM(DOM);
        state = state.slice(0, capacity);
        return;
      }

      // Vertical right rail — compute from available height
      const next = computeCapacity(DOM);
      if (next !== capacity){
        capacity = next;
        trimDOM(DOM);
        state = state.slice(0, capacity);
      }
    }

    /* -------------------- Observers (resize/orientation) -------------------- */
    const _debounce = (fn, ms = 120) => {
      let t;
      return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
    };

    function _bindObservers(DOM){
      if (_observersBound) return;
      _observersBound = true;

      // ResizeObserver on the history track (height/width changes)
      const { wrap, track } = els(DOM);
      const observed = track || wrap;
      if (observed){
        try{
          const ro = new ResizeObserver(() => setCapacity(DOM));
          ro.observe(observed);
        }catch(_){}
      }

      // Window resize + orientation changes (address bar show/hide, rotate, etc.)
      const onResize = _debounce(() => setCapacity(DOM), 120);
      window.addEventListener("resize", onResize, { passive: true });

      try{
        const mqP = window.matchMedia("(orientation: portrait)");
        const mqL = window.matchMedia("(orientation: landscape)");
        mqP.addEventListener?.("change", () => setCapacity(DOM));
        mqL.addEventListener?.("change", () => setCapacity(DOM));
      }catch(_){}
    }

    function observe(DOM){
      _bindObservers(DOM);
      setCapacity(DOM); // prime
    }

    /* -------------------- Public ops -------------------- */
    function clear(DOM){
      const { track } = els(DOM);
      state = [];
      if (track) track.innerHTML = "";
    }

    // entry.action: 'accept' | 'cancel' | 'start'
    // entry.correct: true | false | 'neutral'
    function push(DOM, urlFor, entry){
      const { track } = els(DOM);
      if (!track || !entry?.id) return;

      const item = document.createElement("div");
      item.className = "hist-item";

      const actionLabel =
        entry.action === "accept" ? "Accepted" :
        entry.action === "cancel" ? "Canceled" : "Start";
      const correctnessLabel =
        entry.correct === true  ? "Correct" :
        entry.correct === false ? "Incorrect" : "Neutral";
      item.title = `#${entry.id} • ${actionLabel} • ${correctnessLabel}`;

      const wrap = document.createElement("div");
      wrap.className = "hist-imgwrap";
      wrap.setAttribute("data-action", entry.action || "accept");
      wrap.setAttribute(
        "data-correct",
        entry.correct === true ? "true" : entry.correct === false ? "false" : "neutral"
      );

      const img = document.createElement("img");
      img.className = "hist-thumb";
      img.alt = `#${entry.id} Pokémon`;
      img.src = urlFor(entry.id);

      wrap.appendChild(img);

      const label = document.createElement("div");
      label.className = "hist-label";
      label.textContent = `#${entry.id}`;

      item.appendChild(wrap);
      item.appendChild(label);

      // Insert at top
      track.insertBefore(item, track.firstChild);

      // Ensure capacity is at least 1 before trimming
      if (capacity === 0) {
        capacity = computeCapacity(DOM) || 1;
      }

      // Track + trim to capacity
      state.unshift(entry);
      const items = track.querySelectorAll(".hist-item");
      if (items.length > capacity){
        for (let i = items.length - 1; i >= capacity; i--){
          items[i]?.remove();
        }
        state = state.slice(0, capacity);
      }
    }

    return { push, clear, setCapacity, observe };
  })();

  root.History = History;
})();
