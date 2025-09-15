// Pokémon Sorting — per-gen preloading + spinner
// - Preload 10 images per generation and keep pools topped up
// - Show Pokéball spinner while any image buffers
// - Names/stats fetched only on Lock In
// - Desktop-only guard

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const gameEl = document.getElementById("game");

  /* ============== Desktop-only ============== */
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isSmall = window.matchMedia("(max-width: 780px)").matches;
  if (isTouch || isSmall) {
    gameEl.innerHTML = `
      <div class="mobile-blocker">
        <h2>Not available on mobile</h2>
        <p>Please use a desktop or widen your window to play.</p>
      </div>
    `;
    return;
  }

  /* ============== Config ============== */
  const MAX_ID = 1025;
  const ALL_IDS = Array.from({ length: MAX_ID }, (_, i) => i + 1);

  const STAT_OPTIONS = [
    { key: "random", label: "Random Stat" },
    { key: "hp",     label: "HP" },
    { key: "atk",    label: "Attack" },
    { key: "def",    label: "Defense" },
    { key: "spa",    label: "Sp. Atk" },
    { key: "spd",    label: "Sp. Def" },
    { key: "spe",    label: "Speed" },
    { key: "total",  label: "Total" },
  ];
  const ALL_GENS = [1,2,3,4,5,6,7,8,9];

  // Official artwork (commit-pinned)
  const SPRITES = {
    base_url:
      "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@9683e1d7ffbab3401c1542e39d8105102153e6f9/sprites/pokemon/other/official-artwork/",
    ext: ".png",
  };

  const state = {
    chosenStat: "hp",           // default to HP
    roundStat: null,            // actual stat key for this round
    allowedGens: new Set([1]),  // default: only Gen 1 selected
    difficulty: 3,              // 3..5
    roundIds: [],
    locked: false,
  };

  /* ============== Preload manager ============== */
  const PER_GEN_TARGET = 10;         // keep 10 images warm per generation
  const ImageCache = new Map();      // id -> HTMLImageElement
  const GenBuckets = new Map();      // gen -> number[] (all ids in gen)
  const GenPools = new Map();        // gen -> Set<number> (currently preloaded)

  /* ============== Layout ============== */
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
  [{v:3,t:"Easy (3)"},{v:4,t:"Medium (4)"},{v:5,t:"Hard (5)"}].forEach(d=>{
    const o=document.createElement("option");
    o.value=d.v; o.textContent=d.t;
    diffSelect.appendChild(o);
  });
  diffSelect.value = String(state.difficulty);
  diffWrap.appendChild(diffSelect);

  // Generations
  const gensWrap = el("div", "control gens-wrap");
  row2.appendChild(gensWrap);
  gensWrap.appendChild(span("Generations:"));
  const gensList = el("div", "gens-list");
  gensWrap.appendChild(gensList);
  ALL_GENS.forEach(g=>{
    const chip = el("label", "gen-chip");
    chip.innerHTML = `<input type="checkbox" value="${g}"><span>Gen ${g}</span>`;
    const input = chip.querySelector("input");
    input.checked = state.allowedGens.has(g);
    gensList.appendChild(chip);
  });

  // Hint
  const hintBar = el("div", "hint-bar");
  const statHint = el("div", "stat-hint");
  hintBar.appendChild(statHint);
  gameEl.appendChild(hintBar);

  // Cards
  const list = el("div", "cards-row");
  gameEl.appendChild(list);

  // Bottom actions
  const bottom = el("div", "bottom-bar");
  const newRoundBtn = btn("New Round", "new-round-btn");
  const lockBtn = btn("Lock In", "lock-btn");
  const banner = el("div", "result-banner");
  bottom.appendChild(newRoundBtn);
  bottom.appendChild(lockBtn);
  bottom.appendChild(banner);
  gameEl.appendChild(bottom);

  /* ============== Events ============== */
  statSelect.addEventListener("change", ()=>{
    state.chosenStat = statSelect.value;
    refreshHint();
  });
  diffSelect.addEventListener("change", ()=>{
    state.difficulty = Math.min(5, Math.max(3, parseInt(diffSelect.value,10)));
  });
  gensList.addEventListener("change",(e)=>{
    if(!e.target.matches('input[type="checkbox"]')) return;
    const g = parseInt(e.target.value,10);
    e.target.checked ? state.allowedGens.add(g) : state.allowedGens.delete(g);
    if(state.allowedGens.size===0){ state.allowedGens.add(g); e.target.checked=true; }
    // We maintain pools for ALL gens, so no rebuild needed here.
  });
  newRoundBtn.addEventListener("click", ()=>{
    state.locked = false;
    banner.textContent = "";
    list.innerHTML = "";
    rollAndRenderRound();
  });
  lockBtn.addEventListener("click", async ()=>{
    if(state.locked) return;
    state.locked = true;
    await revealAndScore();
  });

  /* ============== Helpers ============== */
  function el(tag, cls){ const d=document.createElement(tag); if(cls) d.className=cls; return d; }
  function span(t){ const s=document.createElement("span"); s.textContent=t; return s; }
  function lbl(t,forId){ const l=document.createElement("label"); l.textContent=t; if(forId) l.setAttribute("for",forId); return l; }
  function btn(t,cls){ const b=document.createElement("button"); b.textContent=t; if(cls) b.className=cls; return b; }

  function capName(name){
    if(!name) return "";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  function refreshHint(){
    const key = state.roundStat || state.chosenStat;
    const label = STAT_OPTIONS.find(s=>s.key===key)?.label || "Random Stat";
    statHint.textContent = `Comparing by: ${label} • (Low → Highest)`;
  }

  function sample(arr,k){
    const copy=arr.slice();
    for(let i=copy.length-1;i>0;i--){
      const j=Math.floor(Math.random()*(i+1));
      [copy[i],copy[j]]=[copy[j],copy[i]];
    }
    return copy.slice(0,k);
  }

  function pickStatKey(){
    if(state.chosenStat!=="random") return state.chosenStat;
    const keys=["hp","atk","def","spa","spd","spe","total"];
    return keys[Math.floor(Math.random()*keys.length)];
  }

  function getArtworkURL(id){
    return `${SPRITES.base_url}${id}${SPRITES.ext}`;
  }

  function genFromDex(id){
    if(id<=151) return 1;
    if(id<=251) return 2;
    if(id<=386) return 3;
    if(id<=493) return 4;
    if(id<=649) return 5;
    if(id<=721) return 6;
    if(id<=809) return 7;
    if(id<=905) return 8;
    if(id<=1025) return 9;
    return null;
  }

  /* ============== Per-gen preloading ============== */
  function buildGenBuckets(){
    ALL_GENS.forEach(g => GenBuckets.set(g, []));
    for (const id of ALL_IDS) {
      const g = genFromDex(id);
      if (g) GenBuckets.get(g).push(id);
    }
  }

  function preloadImage(id){
    if (ImageCache.has(id)) return ImageCache.get(id);
    const img = new Image();
    img.decoding = "async";
    img.loading = "eager";
    img.src = getArtworkURL(id);
    ImageCache.set(id, img);
    return img;
  }

  function ensureGenPool(gen, target = PER_GEN_TARGET){
    if (!GenPools.has(gen)) GenPools.set(gen, new Set());
    const pool = GenPools.get(gen);
    const bucket = GenBuckets.get(gen) || [];
    const need = Math.max(0, target - pool.size);
    if (need === 0) return;
    const candidates = bucket.filter(id => !pool.has(id));
    const picks = sample(candidates, Math.min(need, candidates.length));
    picks.forEach(id => { pool.add(id); preloadImage(id); });
  }

  function kickoffPreloadAllGens(){
    ALL_GENS.forEach(g => ensureGenPool(g)); // parallel-ish preload via <img> src
  }

  function consumeFromPoolsForGens(gens, count){
    // union from selected gen pools
    const union = [];
    gens.forEach(g => {
      const set = GenPools.get(g);
      if (set) union.push(...set);
    });
    const unique = Array.from(new Set(union));
    const take = sample(unique, Math.min(count, unique.length));

    // remove taken from their pools
    take.forEach(id => {
      const g = genFromDex(id);
      const pool = GenPools.get(g);
      if (pool) pool.delete(id);
    });

    // top up those gens immediately
    gens.forEach(g => ensureGenPool(g));

    return take;
  }

  /* ============== Game flow ============== */
  function rollAndRenderRound(){
    const statKey = pickStatKey();
    state.roundStat = statKey;
    list.dataset.statKey = statKey;
    refreshHint();

    const gens = [...state.allowedGens];
    const count = Math.min(Math.max(state.difficulty,3),5);

    // Prefer preloaded
    let chosen = consumeFromPoolsForGens(gens, count);

    // Fallback: if not enough, take from gen buckets and preload as we go
    if (chosen.length < count) {
      const allowedIds = gens.flatMap(g => GenBuckets.get(g) || []);
      const need = count - chosen.length;
      const extras = sample(allowedIds.filter(id => !chosen.includes(id)), need);
      extras.forEach(id => preloadImage(id));
      chosen = chosen.concat(extras);
    }

    state.roundIds = chosen;

    // Render cards with spinner; swap image when ready
    chosen.forEach(id=>{
      const card = el("div","pokemon-card");
      card.draggable = true;
      card.dataset.id = String(id);

      const spinner = el("div","pokeball-spinner");
      spinner.setAttribute("aria-label","Loading");
      card.appendChild(spinner);

      const cached = ImageCache.get(id) || preloadImage(id);
      if (cached.complete) {
        swapInImage(card, cached);
      } else {
        cached.addEventListener("load", () => swapInImage(card, cached), { once:true });
        cached.addEventListener("error", () => spinner.classList.add("error"), { once:true });
      }

      list.appendChild(card);
    });

    enableHorizontalDrag(list);
  }

  function swapInImage(card, imgObj){
    card.innerHTML = "";
    const img = new Image();
    img.src = imgObj.src;
    img.alt = "#";
    card.appendChild(img);
  }

  function enableHorizontalDrag(container){
    let dragged=null;
    container.addEventListener("dragstart",(e)=>{
      const card=e.target.closest(".pokemon-card");
      if(!card) return;
      dragged=card;
      dragged.classList.add("dragging");
    });
    container.addEventListener("dragend",()=>{
      if(dragged) dragged.classList.remove("dragging");
      dragged=null;
    });
    container.addEventListener("dragover",(e)=>{
      e.preventDefault();
      if(!dragged) return;
      const after=getDragAfterElementX(container,e.clientX);
      if(after==null) container.appendChild(dragged);
      else container.insertBefore(dragged,after);
    });
  }

  function getDragAfterElementX(container,x){
    const els=[...container.querySelectorAll(".pokemon-card:not(.dragging)")];
    return els.reduce((closest,child)=>{
      const box=child.getBoundingClientRect();
      const offset=x-(box.left+box.width/2);
      if(offset<0 && offset>closest.offset){
        return {offset, element: child};
      }
      return closest;
    }, {offset: Number.NEGATIVE_INFINITY, element:null}).element;
  }

  async function revealAndScore(){
    const cards=[...list.querySelectorAll(".pokemon-card")];
    const statKey = state.roundStat || list.dataset.statKey;

    const results = await Promise.all(cards.map(async (c)=>{
      const id = parseInt(c.dataset.id,10);
      const data = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`).then(r=>r.json());
      const statsObj = {
        hp:  data.stats.find(s=>s.stat.name==="hp").base_stat,
        atk: data.stats.find(s=>s.stat.name==="attack").base_stat,
        def: data.stats.find(s=>s.stat.name==="defense").base_stat,
        spa: data.stats.find(s=>s.stat.name==="special-attack").base_stat,
        spd: data.stats.find(s=>s.stat.name==="special-defense").base_stat,
        spe: data.stats.find(s=>s.stat.name==="speed").base_stat,
      };
      statsObj.total = statsObj.hp + statsObj.atk + statsObj.def + statsObj.spa + statsObj.spd + statsObj.spe;
      return { card: c, id, name: capName(data.name), stat: statsObj[statKey] };
    }));

    results.forEach(({card, name, stat})=>{
      card.draggable=false;
      card.dataset.stat = String(stat);
      const imgSrc = card.querySelector("img")?.src || "";
      card.innerHTML = `
        <img src="${imgSrc}" alt="${name}">
        <p>${name} (${labelForStat(statKey)}: ${stat})</p>
      `;
    });

    const stats = cards.map(c => parseInt(c.dataset.stat,10));
    const allCorrect = stats.every((s,i,arr)=> i===arr.length-1 || s<=arr[i+1]);

    cards.forEach((c,i)=>{
      const prev = i>0 ? parseInt(cards[i-1].dataset.stat,10) : null;
      const cur  = parseInt(c.dataset.stat,10);
      const next = i<cards.length-1 ? parseInt(cards[i+1].dataset.stat,10) : null;
      let good = true;
      if(prev!==null && prev>cur) good = false;
      if(next!==null && cur>next) good = false;
      c.classList.remove("good","bad");
      c.classList.add(good ? "good" : "bad");
    });

    banner.textContent = allCorrect
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

  /* ============== Boot ============== */
  buildGenBuckets();         // make per-gen ID buckets
  kickoffPreloadAllGens();   // preload 10 per gen (in parallel)
  refreshHint();
  rollAndRenderRound();
});
