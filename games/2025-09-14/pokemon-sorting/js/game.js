// games/2025-09-14/pokemon-sorting/js/game.js
// Pokémon Sorting (Horizontal) — drag cards LEFT→RIGHT so LOWEST is on the LEFT and HIGHEST is on the RIGHT.
// Names/stats are hidden until "Lock In". Top controls let you pick a stat (or Random) and filter by generations.

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const gameEl = document.getElementById("game");

  // ===== Demo dataset (expand/replace later) =====
  // id is the National Dex number (used for sprite URL).
  // gen is 1..9; stats include the common 6 stats and total.
  const POKE = [
    // Gen 1 starters
    P(1,  "Bulbasaur", 1, {hp:45, atk:49, def:49, spa:65, spd:65, spe:45}),
    P(4,  "Charmander",1, {hp:39, atk:52, def:43, spa:60, spd:50, spe:65}),
    P(7,  "Squirtle",  1, {hp:44, atk:48, def:65, spa:50, spd:64, spe:43}),
    // Gen 2 starters
    P(152,"Chikorita", 2, {hp:45, atk:49, def:65, spa:49, spd:65, spe:45}),
    P(155,"Cyndaquil", 2, {hp:39, atk:52, def:43, spa:60, spd:50, spe:65}),
    P(158,"Totodile",  2, {hp:50, atk:65, def:64, spa:44, spd:48, spe:43}),
  ];
  function P(id, name, gen, s){
    const total = s.hp+s.atk+s.def+s.spa+s.spd+s.spe;
    return { id, name, gen, stats: {...s, total} };
  }

  // ===== Config / State =====
  const STAT_OPTIONS = [
    { key: "random",  label: "Random Stat" },
    { key: "hp",      label: "HP" },
    { key: "atk",     label: "Attack" },
    { key: "def",     label: "Defense" },
    { key: "spa",     label: "Sp. Atk" },
    { key: "spd",     label: "Sp. Def" },
    { key: "spe",     label: "Speed" },
    { key: "total",   label: "Total" },
  ];
  const ALL_GENS = [1,2,3,4,5,6,7,8,9]; // UI shows 1–9; our demo data has 1–2.

  const state = {
    chosenStat: "random",
    allowedGens: new Set([1,2]), // default allow 1–2 since demo data has those
    round: [],                   // current 3-mon selection
    locked: false,
  };

  // ===== Render UI skeleton =====
  gameEl.innerHTML = "";
  const controls = document.createElement("div");
  controls.className = "controls-bar";
  gameEl.appendChild(controls);

  const statWrap = document.createElement("div");
  statWrap.className = "control stat-wrap";
  controls.appendChild(statWrap);

  const statLabel = document.createElement("label");
  statLabel.textContent = "Category:";
  statLabel.setAttribute("for","stat-select");
  statWrap.appendChild(statLabel);

  const statSelect = document.createElement("select");
  statSelect.id = "stat-select";
  STAT_OPTIONS.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.key;
    o.textContent = opt.label;
    statSelect.appendChild(o);
  });
  statSelect.value = state.chosenStat;
  statWrap.appendChild(statSelect);

  const gensWrap = document.createElement("div");
  gensWrap.className = "control gens-wrap";
  controls.appendChild(gensWrap);

  const gensLabel = document.createElement("span");
  gensLabel.textContent = "Generations:";
  gensWrap.appendChild(gensLabel);

  const gensList = document.createElement("div");
  gensList.className = "gens-list";
  gensWrap.appendChild(gensList);

  ALL_GENS.forEach(g => {
    const id = `gen-${g}`;
    const box = document.createElement("label");
    box.className = "gen-chip";
    box.innerHTML = `
      <input type="checkbox" id="${id}" value="${g}"> <span>Gen ${g}</span>
    `;
    const input = box.querySelector("input");
    // default check 1–2 if in demo set; otherwise unchecked
    input.checked = state.allowedGens.has(g);
    gensList.appendChild(box);
  });

  const actionsWrap = document.createElement("div");
  actionsWrap.className = "control actions-wrap";
  controls.appendChild(actionsWrap);

  const newRoundBtn = document.createElement("button");
  newRoundBtn.textContent = "New Round";
  newRoundBtn.className = "new-round-btn";
  actionsWrap.appendChild(newRoundBtn);

  const statHint = document.createElement("div");
  statHint.className = "stat-hint";
  actionsWrap.appendChild(statHint);

  // Cards row (horizontal)
  const list = document.createElement("div");
  list.className = "cards-row";
  gameEl.appendChild(list);

  // Bottom actions
  const bottomBar = document.createElement("div");
  bottomBar.className = "bottom-bar";
  gameEl.appendChild(bottomBar);

  const lockBtn = document.createElement("button");
  lockBtn.textContent = "Lock In";
  lockBtn.className = "lock-btn";
  bottomBar.appendChild(lockBtn);

  const banner = document.createElement("div");
  banner.className = "result-banner";
  bottomBar.appendChild(banner);

  // ===== Event wiring =====
  statSelect.addEventListener("change", () => {
    state.chosenStat = statSelect.value;
    refreshHint();
    // Don’t auto-reroll; player can press New Round
  });

  gensList.addEventListener("change", (e) => {
    if (e.target && e.target.matches('input[type="checkbox"]')) {
      const g = parseInt(e.target.value, 10);
      if (e.target.checked) state.allowedGens.add(g);
      else state.allowedGens.delete(g);
      // keep at least one gen selected
      if (state.allowedGens.size === 0) {
        state.allowedGens.add(g);
        e.target.checked = true;
      }
    }
  });

  newRoundBtn.addEventListener("click", () => {
    state.locked = false;
    banner.textContent = "";
    list.innerHTML = "";
    rollAndRenderRound();
  });

  lockBtn.addEventListener("click", () => {
    if (state.locked) return;
    state.locked = true;
    revealAndScore();
  });

  // ===== Helpers =====
  function refreshHint() {
    const label = STAT_OPTIONS.find(s => s.key === state.chosenStat)?.label || "Random Stat";
    statHint.textContent = `Comparing by: ${label} • (Lowest → Highest)`;
  }

  function getSpriteURL(id) {
    // PokeAPI default front sprites
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  function sample(arr, k) {
    const copy = arr.slice();
    for (let i=copy.length-1;i>0;i--) {
      const j = Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]] = [copy[j],copy[i]];
    }
    return copy.slice(0, k);
  }

  function pickStatKey() {
    if (state.chosenStat !== "random") return state.chosenStat;
    const keys = ["hp","atk","def","spa","spd","spe","total"];
    return keys[Math.floor(Math.random()*keys.length)];
  }

  function rollAndRenderRound() {
    // Filter by allowed gens; if none match (in larger app unlikely), fallback to all
    const pool = POKE.filter(p => state.allowedGens.has(p.gen));
    const chosen = (pool.length >= 3) ? sample(pool, 3) : sample(POKE, 3);
    state.round = chosen;

    const statKey = pickStatKey();
    list.dataset.statKey = statKey; // remember for scoring
    refreshHint();

    // Create horizontal cards (image only, draggable)
    chosen.forEach(p => {
      const card = document.createElement("div");
      card.className = "pokemon-card";
      card.draggable = true;
      card.dataset.name = p.name;
      card.dataset.id = String(p.id);
      card.dataset.stat = String(p.stats[statKey]); // chosen stat only
      card.dataset.statKey = statKey;

      const img = document.createElement("img");
      img.src = getSpriteURL(p.id);
      img.alt = p.name;
      card.appendChild(img);

      list.appendChild(card);
    });

    // Enable drag horizontal
    enableHorizontalDrag(list);
  }

  function enableHorizontalDrag(container) {
    let dragged = null;

    container.addEventListener("dragstart", (e) => {
      const card = e.target.closest(".pokemon-card");
      if (!card) return;
      dragged = card;
      dragged.classList.add("dragging");
    });

    container.addEventListener("dragend", () => {
      if (dragged) dragged.classList.remove("dragging");
      dragged = null;
    });

    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      if (!dragged) return;
      const after = getDragAfterElementX(container, e.clientX);
      if (after == null) {
        container.appendChild(dragged);
      } else {
        container.insertBefore(dragged, after);
      }
    });
  }

  // For horizontal rows, compare by X instead of Y
  function getDragAfterElementX(container, x) {
    const els = [...container.querySelectorAll(".pokemon-card:not(.dragging)")];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = x - (box.left + box.width / 2);
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }

  function revealAndScore() {
    const cards = [...list.querySelectorAll(".pokemon-card")];
    const statKey = list.dataset.statKey;

    // Reveal name + stat under each sprite; freeze drag
    cards.forEach(c => {
      c.draggable = false;
      const imgSrc = c.querySelector("img").src;
      const name   = c.dataset.name;
      const stat   = parseInt(c.dataset.stat, 10);
      c.innerHTML  = `
        <img src="${imgSrc}" alt="${name}">
        <p>${name} (${labelForStat(statKey)}: ${stat})</p>
      `;
    });

    // Check correctness for LEFT→RIGHT ascending (lowest on left, highest on right)
    const stats = cards.map(c => parseInt(c.dataset.stat, 10));
    const globallyCorrect = stats.every((s, i, arr) => i === arr.length - 1 || s <= arr[i + 1]);

    // Per-card neighbor correctness: prev <= cur <= next
    cards.forEach((c, i) => {
      const prev = i > 0 ? parseInt(cards[i - 1].dataset.stat, 10) : null;
      const cur  = parseInt(cards[i].dataset.stat, 10);
      const next = i < cards.length - 1 ? parseInt(cards[i + 1].dataset.stat, 10) : null;

      let good = true;
      if (prev !== null && prev > cur) good = false;
      if (next !== null && cur > next) good = false;

      c.classList.remove("good", "bad");
      c.classList.add(good ? "good" : "bad");
    });

    banner.textContent = globallyCorrect ? "✅ Correct order!" : "❌ Not quite — check the red cards.";
  }

  function labelForStat(k){
    switch(k){
      case "hp": return "HP";
      case "atk": return "Attack";
      case "def": return "Defense";
      case "spa": return "Sp. Atk";
      case "spd": return "Sp. Def";
      case "spe": return "Speed";
      case "total": return "Total";
      default: return "Stat";
    }
  }

  // ===== Initial round =====
  refreshHint();
  rollAndRenderRound();
});
