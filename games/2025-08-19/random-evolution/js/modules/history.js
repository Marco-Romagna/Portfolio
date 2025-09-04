// games/2025-08-19/random-evolution/js/modules/history.js
// History rail manager (most-recent-first).
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

      const rect = wrap.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      const thumb  = parseFloat(cs.getPropertyValue("--hist-thumb")) || 56;
      const gap    = parseFloat(cs.getPropertyValue("--hist-gap")) || 8;
      const labelH = 14; // rough label height
      const tileH  = thumb + labelH + gap;
      const padding= gap * 2; // .history-track padding (top+bottom)
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

    // Decide capacity by actual layout, not breakpoints:
    // - if the track is a horizontal row (bottom strip) => soft cap 40
    // - if the track is a vertical column (right rail)  => compute by height
    function setCapacity(DOM){
      const { track } = els(DOM);
      if (!track){ capacity = 0; return; }

      const dir = (getComputedStyle(track).flexDirection || "row").trim();
      if (dir === "row"){
        capacity = 40;              // horizontal thumbnail strip
        trimDOM(DOM);
        state = state.slice(0, capacity);
        return;
      }

      const next = computeCapacity(DOM);   // vertical rail
      if (next !== capacity){
        capacity = next;
        trimDOM(DOM);
        state = state.slice(0, capacity);
      }
    }

    function clear(DOM){
      const { track } = els(DOM);
      state = [];
      if (track) {
        track.innerHTML = "";
        // Ensure the scroll position is reset (portrait rail)
        track.scrollTop = 0;
        track.scrollLeft = 0;
      }
    }

    // entry.action: 'accept' | 'cancel' | 'start'
    // entry.correct: true | false | 'neutral'
    function push(DOM, urlFor, entry){
      const { track } = els(DOM);
      if (!track || !entry?.id) return;

      // Ensure capacity is at least 1 (first run after layout)
      if (capacity === 0) {
        capacity = computeCapacity(DOM) || 1;
      }

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

      // Insert newest at the top
      track.insertBefore(item, track.firstChild);
      state.unshift(entry);

      // Trim to capacity
      const items = track.querySelectorAll(".hist-item");
      if (items.length > capacity){
        for (let i = items.length - 1; i >= capacity; i--){
          items[i]?.remove();
        }
        state = state.slice(0, capacity);
      }

      // Keep the most recent visible at the top (portrait/column).
      // If it's horizontal (row), keep left aligned.
      const dir = (getComputedStyle(track).flexDirection || "column").trim();
      if (dir === "column"){
        // Scroll to top without showing the bar (CSS hides it).
        // 2 rAFs to ensure layout has applied.
        requestAnimationFrame(() => requestAnimationFrame(() => {
          track.scrollTop = 0;
        }));
      } else {
        track.scrollLeft = 0;
      }
    }

    return { push, clear, setCapacity };
  })();

  root.History = History;
})();
