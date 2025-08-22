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
    let state = []; // array of entries

    function els(DOM){
      return {
        wrap: DOM.historyWrap || document.getElementById("revo-history"),
        track: DOM.historyTrack || document.getElementById("history-track"),
      };
    }

    function computeCapacity(DOM){
      const { wrap } = els(DOM);
      if (!wrap) return 0;
      const rect = wrap.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      const thumb  = parseFloat(cs.getPropertyValue("--hist-thumb")) || 40;
      const gap    = parseFloat(cs.getPropertyValue("--hist-gap")) || 8;
      const labelH = 14;
      const tileH  = thumb + labelH + gap;
      const padding= gap * 2; // .history-track padding
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

    function setCapacity(DOM){
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

      // Track + trim
      state.unshift(entry);
      const items = track.querySelectorAll(".hist-item");
      if (items.length > capacity){
        for (let i = items.length - 1; i >= capacity; i--){
          items[i]?.remove();
        }
        state = state.slice(0, capacity);
      }
    }

    return { push, clear, setCapacity };
  })();

  root.History = History;
})();
