// games/2025-09-14/pokemon-sorting/js/game.js
// Pokémon Sorting (Horizontal, no stats preloaded)
// - Loads pokemon-data.json (id, name, gen only)
// - Shows only images until "Lock In"
// - On Lock In: fetch stats from PokéAPI and check order

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const gameEl = document.getElementById("game");

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

  const SPRITES = {
    base_url: "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@9683e1d7ffbab3401c1542e39d8105102153e6f9/sprites/pokemon/other/official-artwork/",
    file_extension: ".png"
  };

  const state = {
    allPokemon: [],       // loaded from JSON
    chosenStat: "random",
    allowedGens: new Set([1,2]),
    difficulty: 3,
    round: [],            // current Pokémon ids
    locked: false,
  };

  /* ==========================
     Layout skeleton
     ========================== */
  gameEl.innerHTML = "";

  const controls = el("div", "controls-bar");
  gameEl.appendChild(controls);

  const row1 = el("div", "controls-row");
  const row2 = el("div", "controls-row");
  controls.appendChild(row1);
  controls.appendChild(row2);

  // Category
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

  // Difficulty
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

  // Generations row
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

  // Sides
  const sides = el("div", "sides-bar");
  sides.innerHTML = `
    <div class="side low"><span class="badge">LOW</span></div>
    <div class="side center"><span class="badge">DRAG</span></div>
    <div class="side high"><span class="badge">HIGHEST</span></div>
  `;
  gameEl.appendChild(sides);

  // Hint
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

  /* ==========================
     Events
     ========================== */
  statSelect.addEventListener("change", () => {
    state.chosenStat = statSelect.value;
    refreshHint();
  });

  gensList.addEventListener("change", (e) => {
    if (!e.target.matches('input[type="checkbox"]')) return;
    const g = parseInt(e.target.value, 10);
    if (e.target.checked) state.allowedGens.add(g);
    else state.allowedGens.delete(g);
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

  lockBtn.addEventListener("click", async () => {
    if (state.locked) return;
    state.locked = true;
    await revealAndScore();
  });

  /* ==========================
     Helpers
     ========================== */
  function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className=cls; return d; }
  function span(t){ const s=document.createElement("span"); s.textContent=t; return s; }
  function lbl(t,forId){ const l=document.createElement("label"); l.textContent=t; if(forId) l.setAttribute("for",forId); return l; }
  function btn(t,cls){ const b=document.createElement("button"); b.textContent=t; if(cls) b.className=cls; return b; }

  function refreshHint() {
    const label = STAT_OPTIONS.find(s => s.key === state.chosenStat)?.label || "Random Stat";
    statHint.textContent = `Comparing by: ${label} • (Low → Highest)`;
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

  function getArtworkURL(id){
    return `${SPRITES.base_url}${id}${SPRITES.file_extension}`;
  }

  /* ==========================
     Round + Gameplay
     ========================== */
  function rollAndRenderRound() {
    const pool = state.allPokemon.filter(p => state.allowedGens.has(p.gen));
    const count = Math.min(Math.max(state.difficulty, 3), 5);
    const chosen = (pool.length >= count) ? sample(pool, count) : sample(state.allPokemon, count);
    state.round = chosen;

    const statKey = pickStatKey();
    list.dataset.statKey = statKey;
    refreshHint();

    chosen.forEach(p => {
      const card = el("div", "pokemon-card");
      card.draggable = true;
      card.dataset.id = String(p.id);
      card.dataset.name = p.name;

      const img = new Image();
      img.src = getArtworkURL(p.id);
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

  async function revealAndScore() {
    const cards = [...list.querySelectorAll(".pokemon-card")];
    const statKey = list.dataset.statKey;

    // Fetch stats for each Pokémon
    for (const c of cards) {
      const id = parseInt(c.dataset.id, 10);
      const data = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r=>r.json());

      const statsObj = {
        hp:  data.stats.find(s=>s.stat.name==="hp").base_stat,
        atk: data.stats.find(s=>s.stat.name==="attack").base_stat,
        def: data.stats.find(s=>s.stat.name==="defense").base_stat,
        spa: data.stats.find(s=>s.stat.name==="special-attack").base_stat,
        spd: data.stats.find(s=>s.stat.name==="special-defense").base_stat,
        spe: data.stats.find(s=>s.stat.name==="speed").base_stat,
      };
      statsObj.total = Object.values(statsObj).reduce((a,b)=>a+b,0);

      const stat = statsObj[statKey];
      c.dataset.stat = stat;

      const imgSrc = c.querySelector("img").src;
      const name   = c.dataset.name;
      c.innerHTML  = `
        <img src="${imgSrc}" alt="${name}">
        <p>${name} (${labelForStat(statKey)}: ${stat})</p>
      `;
    }

    // Check order
    const stats = cards.map(c => parseInt(c.dataset.stat, 10));
    const globallyCorrect = stats.every((s, i, arr) => i === arr.length - 1 || s <= arr[i + 1]);

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

  /* ==========================
     Boot: load JSON then start
     ========================== */
  fetch("data/pokemon-data.json")
    .then(r => r.json())
    .then(json => {
      state.allPokemon = json;
      refreshHint();
      rollAndRenderRound();
    });
});
