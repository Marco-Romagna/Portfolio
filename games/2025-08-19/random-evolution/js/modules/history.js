// games/2025-08-19/random-evolution/js/modules/history.js
// Small history rail manager. Exposes window.RevoHistory with:
//   init(), clear(), pushHistory({id, action, correct}), pushStart(id),
//   updateCapacity().
//
// Expects a global urlFor(id) at window.RevoUtil.urlFor (or override via setUrlFor).

(function () {
  const wrapEl   = document.getElementById("revo-history");
  const trackEl  = document.getElementById("history-track");

  let history = [];
  let capacity = 0;
  let urlFor = (id) => (window.RevoUtil && window.RevoUtil.urlFor)
    ? window.RevoUtil.urlFor(id)
    : String(id); // fallback

  function computeCapacity() {
    if (!wrapEl) return 0;
    const rect = wrapEl.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    const thumb = parseFloat(cs.getPropertyValue("--hist-thumb")) || 40;
    const gap = parseFloat(cs.getPropertyValue("--hist-gap")) || 8;
    const labelH = 14; // rough text height
    const tileH = thumb + labelH + gap;
    const padding = gap * 2; // from .history-track padding
    const innerH = rect.height - padding;
    const cap = Math.max(1, Math.floor(innerH / tileH));
    return cap;
  }

  function trimDOM() {
    if (!trackEl) return;
    const items = trackEl.querySelectorAll(".hist-item");
    for (let i = items.length - 1; i >= capacity; i--) {
      items[i]?.remove();
    }
  }

  function init() {
    updateCapacity();
    clear();
    window.addEventListener("resize", () => {
      requestAnimationFrame(updateCapacity);
    });
  }

  function clear() {
    history = [];
    if (trackEl) trackEl.innerHTML = "";
  }

  function updateCapacity() {
    const next = computeCapacity();
    if (next !== capacity) {
      capacity = next;
      trimDOM();
      history = history.slice(0, capacity);
    }
  }

  function setUrlFor(fn) {
    if (typeof fn === "function") urlFor = fn;
  }

  // entry.action: 'accept' | 'cancel' | 'start'
  // entry.correct: true | false | 'neutral'
  function pushHistory(entry) {
    if (!trackEl || !entry || !entry.id) return;

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
    wrap.setAttribute("data-action", entry.action);
    const corrAttr =
      entry.correct === true  ? "true" :
      entry.correct === false ? "false" : "neutral";
    wrap.setAttribute("data-correct", corrAttr);

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
    trackEl.insertBefore(item, trackEl.firstChild);

    // Track + trim
    history.unshift(entry);
    const items = trackEl.querySelectorAll(".hist-item");
    if (items.length > capacity) {
      for (let i = items.length - 1; i >= capacity; i--) {
        items[i]?.remove();
      }
      history = history.slice(0, capacity);
    }
  }

  function pushStart(id) {
    pushHistory({ id, action: "start", correct: "neutral" });
  }

  window.RevoHistory = {
    init, clear, pushHistory, pushStart, updateCapacity, setUrlFor
  };
})();
