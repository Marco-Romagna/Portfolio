// games/2025-09-14/pokemon-sorting/js/game.js
// Pokémon Sorting (Horizontal)
// Arrange LEFT→RIGHT so LOW is on the LEFT and HIGHEST is on the RIGHT.
// - Stats hidden until "Lock In"
// - Top controls in two rows: Row 1 = Category + Difficulty + New Round, Row 2 = Generations

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const gameEl = document.getElementById("game");

  /* =========================
     Demo dataset (expand later)
     ========================= */
  const POKE = [
    P(1,  "Bulbasaur", 1, {hp:45, atk:49, def:49, spa:65, spd:65, spe:45}),
    P(4,  "Charmander",1, {hp:39, atk:52, def:43, spa:60, spd:50, spe:65}),
    P(7,  "Squirtle",  1, {hp:44, atk:48, def:65, spa:50, spd:64, spe:43}),
    P(152,"Chikorita", 2, {hp:45, atk:49, def:65, spa:49, spd:65, spe:45}),
    P(155,"Cyndaquil", 2, {hp:39, atk:52, def:43, spa:60, spd:50, spe:65}),
    P(158,"Totodile",  2, {hp:50, atk:65, def:64, spa:44, spd:48, spe:43}),
  ];
  function P(id, name, gen, s){
    const total = s.hp+s.atk+s.def+s.spa+s.spd+s.spe;
    return { id, name, gen, stats: {...s, total} };
  }

  /* ================
     Config / State
     ================ */
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
  const ALL_GENS = [1,2,3,4,5,6,7,8,9];

  const state = {
    chosenStat: "random",
    allowedGens: new Set([1,2]),
    difficulty: 3,   // 3 = Easy, 4 = Medium, 5 = Hard (default)
    round: [],
    locked: false,
  };

  /* ==========================
     Layout skeleton / Controls
     ========================== */
  gameEl.innerHTML = "";

  // Controls container (column with two rows)
  const controls = el("div", "controls-bar");
  gameEl.appendChild(controls);

  // Row 1: Category • Difficulty • New Round
  const row1 = el("div", "controls-row");
  controls.appendChild(row1);

  // Row 2: Generations
  const row2 = el("div", "controls-row");
  controls.appendChild(row2);

  /* ----- Category (row1) ----- */
  const statWrap = el("div", "control stat-wrap");
  row1.appendChild(statWrap);
  statWrap.appendChild(lbl("Category:", "stat-select"));

  const statSelect = el("select", "select--comfy");
  statSelect.id = "stat-select";
  STAT_OPTIONS.forEach(opt => {
    const o = document.createElement("option");
    o.value = opt.key; o.textContent = opt.label;
    statSelect.appendChild(o);
  });
  statSelect.value = state.chosenStat;
  statWrap.appendChild(statSelect);

  /* ----- Difficulty (row1) ----- */
  const diffWrap = el("div", "control diff-wrap");
  row1.appendChild(diffWrap);
  diffWrap.appendChild(lbl("Difficulty:", "diff-select"));

  const diffSelect = el("select", "select--comfy");
  diffSelect.id = "diff-select";
  [
    {v:3, t:"Easy (3)"},
    {v:4, t:"Medium (4)"},
    {v:5, t:"Hard (5)"}
  ].forEach(d => {
    const o = document.createElement("option");
    o.value = d.v; o.textContent = d.t;
    diffSelect.appendChild(o);
  });
  diffSelect.value = String(state.difficulty);
  diffWrap.appendChild(diffSelect);

  
  /* ----- Generations (row2) ----- */
  const gensWrap = el("div", "control gens-wrap");
  row2.appendChild(gensWrap);
  gensWrap.appendChild(span("Generations:"));

  const gensList = el("div", "gens-list");
  gensWrap.appendChild(gensList);
  ALL_GENS.forEach(g => {
    const chip = el("label", "gen-chip");
    chip.innerHTML = `<input type="checkbox" value="${g}"><span>Gen ${g}</span>`;
    const input = chip.querySelector("input");
    input.checked = state.allowedGens.has(g);
    gensList.appendChild(chip);
  });

  // Side labels bar: LOW | DRAG | HIGHEST
  const sides = el("div", "sides-bar");
  sides.innerHTML = `
    <div class="side low"><span class="badge">LOW</span></div>
    <div class="side center"><span class="badge">DRAG</span></div>
    <div class="side high"><span class="badge">HIGHEST</span></div>
  `;
  gameEl.appendChild(sides);

  // Centered hint bar
  const hintBar = el("div", "hint-bar");
  const statHint = el("div", "stat-hint");
  hintBar.appendChild(statHint);
  gameEl.appendChild(hintBar);

  // Cards row
  const list = el("div", "cards-row");
  gameEl.appendChild(list);

  // Bottom bar
  const bottom = el("div", "bottom-bar");
  const newRoundBtn = btn("New Round", "new-round-btn");
  const lockBtn = btn("Lock In", "lock-btn");
  const banner  = el("div", "result-banner");
  
  bottom.appendChild(newRoundBtn);
  bottom.appendChild(lockBtn);
  bottom.appendChild(banner);
  gameEl.appendChild(bottom);


  /* ===========
     Events
     =========== */
  statSelect.addEventListener("change", () => {
    state.chosenStat = statSelect.value;
    refreshHint();
  });

  gensList.addEventListener("change", (e) => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    const g = parseInt(e.target.value, 10);
    if (e.target.checked) state.allowedGens.add(g);
    else state.allowedGens.delete(g);
    // Ensure at least one gen remains selected
    if (state.allowedGens.size === 0) {
      state.allowedGens.add(g);
      e.target.checked = true;
    }
  });

  diffSelect.addEventListener("change", () => {
    state.difficulty = Math.min(5, Math.max(3, parseInt(diffSelect.value, 10)));
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

  /* ===========
     Helpers
     =========== */
  function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className=cls; return d; }
  function span(t){ const s=document.createElement("span"); s.textContent=t; return s; }
  function lbl(t,forId){ const l=document.createElement("label"); l.textContent=t; if(forId) l.setAttribute("for",forId); return l; }
  function btn(t,cls){ const b=document.createElement("button"); b.textContent=t; if(cls) b.className=cls; return b; }

  function refreshHint() {
    const label = STAT_OPTIONS.find(s => s.key === state.chosenStat)?.label || "Random Stat";
    statHint.textContent = `Comparing by: ${label} • (Low → Highest)`;
  }

  function getSpriteURL(id){
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

  function pickStatKey(){
    if (state.chosenStat !== "random") return state.chosenStat;
    const keys = ["hp","atk","def","spa","spd","spe","total"];
    return keys[Math.floor(Math.random()*keys.length)];
  }

  function rollAndRenderRound() {
    const pool = POKE.filter(p => state.allowedGens.has(p.gen));
    const count = Math.min(Math.max(state.difficulty, 3), 5);
    const chosen =
      (pool.length >= count) ? sample(pool, count)
      : (POKE.length >= count ? sample(POKE, count)
      : sample(POKE, Math.min(POKE.length, count)));
    state.round = chosen;

    const statKey = pickStatKey();
    list.dataset.statKey = statKey;
    refreshHint();

    chosen.forEach(p => {
      const card = el("div", "pokemon-card");
      card.draggable = true;
      card.dataset.name = p.name;
      card.dataset.id = String(p.id);
      card.dataset.stat = String(p.stats[statKey]);
      card.dataset.statKey = statKey;

      const img = new Image();
      img.src = getSpriteURL(p.id);
      img.alt = p.name;

      card.appendChild(img);
      list.appendChild(card);
    });

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
      if (after == null) container.appendChild(dragged);
      else container.insertBefore(dragged, after);
    });
  }

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

    // Reveal data and freeze drag
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

    // Check LEFT→RIGHT ascending (LOW → HIGHEST)
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

    banner.textContent = globallyCorrect
      ? "✅ Correct order!"
      : "❌ Not quite — check the red cards.";
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

  // Boot first round
  refreshHint();
  rollAndRenderRound();
});
