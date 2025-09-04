// games/2025-08-19/random-evolution/js/modules/history.js
// History rail manager used by Game.
// API:
//   History.push(DOM, urlFor, { id, action: 'accept'|'cancel'|'start', correct: true|false|'neutral' })
//   History.clear(DOM)
//   History.setCapacity(DOM)

(function(){
  const root = window.Revo = window.Revo || {};
  const History = (() => {
    let capacity = 0;
    let state = []; // most-recent-first

    function els(DOM){
      return {
        wrap:  DOM.historyWrap  || document.getElementById("revo-history"),
        track: DOM.historyTrack || document.getElementById("history-track"),
      };
    }

    function computeCapacity(DOM){
      const { wrap } = els(DOM);
      if (!wrap) return 0;

      // Read CSS custom properties (fallbacks mirror history.css)
      const cs     = getComputedStyle(document.documentElement);
      const thumb  = parseFloat(cs.getPropertyValue("--hist-thumb")) || 40;
      const gap    = parseFloat(cs.getPropertyValue("--hist-gap"))   || 8;
      const labelH = 14; // rough text height
      const tileH  = thumb + labelH + gap;
      const padding= gap * 2; // .history-track padding
      const rect   = wrap.getBoundingClientRect();
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

    // Determines how many history tiles to keep/render.
    // - Horizontal (bottom strip / small screens): soft cap with scroll.
    // - Vertical (portrait right rail / desktop right rail): compute from height.
    function setCapacity(DOM){
      const { track } = els(DOM);
      if (!track){ capacity = 0; return; }

      // What layout did CSS apply?
      const dir = (getComputedStyle(track).flexDirection || "row").trim();

      if (dir === "row"){               // Horizontal strip (landscape/short)
        capacity = 40;                  // generous cap; container scrolls
        trimDOM(DOM);
        state = state.slice(0, capacity);
        return;
      }

      // Vertical rail — compute by actual available height
      const next = computeCapacity(DOM);
      if (next !== capacity){
        capacity = next;
        trimDOM(DOM);
        state = state.slice(0, capacity);
      }
    }

    function clear(DOM){
      const { track } = els(DOM);
      state = [];
      if (track) track.innerHTML = "";
    }

    // entry.action: 'accept' | 'cancel' | 'start'
    // entry.correct: true | false | 'neutral'
    function push(DOM, urlFor, entry){
      const { track, wrap } = els(DOM);
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

      const frame = document.createElement("div");
      frame.className = "hist-imgwrap";
      frame.setAttribute("data-action", entry.action || "accept");
      frame.setAttribute(
        "data-correct",
        entry.correct === true ? "true" : entry.correct === false ? "false" : "neutral"
      );

      const img = document.createElement("img");
      img.className = "hist-thumb";
      img.alt = `#${entry.id} Pokémon`;
      img.src = urlFor(entry.id);

      frame.appendChild(img);

      const label = document.createElement("div");
      label.className = "hist-label";
      label.textContent = `#${entry.id}`;

      item.appendChild(frame);
      item.appendChild(label);

      // Insert most-recent at the top/start
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

      // Keep the most recent visible without showing a scrollbar:
      // If vertical column, keep the container scrolled to the top.
      // If horizontal strip, keep scrolled to the left.
      const dir = (getComputedStyle(track).flexDirection || "row").trim();
      if (dir === "column"){
        if (typeof track.scrollTo === "function"){
          track.scrollTo({ top: 0, behavior: "smooth" });
        } else {
          track.scrollTop = 0;
        }
      } else {
        if (typeof track.scrollTo === "function"){
          track.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          track.scrollLeft = 0;
        }
      }
    }

    return { push, clear, setCapacity };
  })();

  root.History = History;
})();
