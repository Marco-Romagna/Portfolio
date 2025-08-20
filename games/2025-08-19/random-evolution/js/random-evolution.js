// Random Evolution: silhouette flicker -> speed-up -> flash -> reveal

(async function () {
  // Elements
  const imgA = document.getElementById("imgA");
  const imgB = document.getElementById("imgB");
  const flash = document.getElementById("flash");
  const btn = document.getElementById("evolve-btn");

  // Settings
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base = settings.sprites.base_url;
  const ext = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end = settings.sprites.range.end || 1025;

  // Timings (classic feel; can move into settings later)
  const timings = {
    introHold: 650,
    swaps: 16,
    startInterval: 200,
    endInterval: 35,
    flashMs: 100,
    revealPopMs: 220
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentId = null;
  let busy = false;

  const randId = () => Math.floor(Math.random() * (end - start + 1)) + start;

  const pickOther = () => {
    let id = randId();
    if (currentId == null) return id;
    while (id === currentId) id = randId();
    return id;
  };

  const urlFor = (id) => `${base}${id}${ext}`;

  // Preload helper
  function preload(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(src);
      img.onerror = reject;
      img.src = src;
    });
  }

  // Smoothstep
  const ease = (p) => p * p * (3 - 2 * p);

  // Show a specific id instantly (no animation)
  async function showInstant(id) {
    currentId = id;
    imgA.src = urlFor(id);
    imgB.src = "";
    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
  }

  // Evolution sequence
  async function evolve() {
    if (busy) return;
    busy = true;
    btn.disabled = true;

    const nextId = pickOther();
    // Preload next to avoid hitch
    try { await preload(urlFor(nextId)); } catch (_) { /* fallback to another pick */ }

    // Prepare layers
    imgA.src = urlFor(currentId ?? pickOther());
    imgB.src = urlFor(nextId);
    imgA.classList.add("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;

    // Reduced motion path: simple crossfade
    if (reducedMotion) {
      imgA.classList.remove("silhouette");
      imgB.classList.remove("silhouette");
      imgB.style.transition = "opacity 200ms linear";
      requestAnimationFrame(() => {
        imgB.style.opacity = 1;
        imgA.style.opacity = 0;
      });
      await new Promise((r) => setTimeout(r, 220));
      currentId = nextId;
      btn.disabled = false;
      busy = false;
      return;
    }

    // Intro hold on current silhouette
    await sleep(timings.introHold);

    // Alternating silhouettes with acceleration
    for (let i = 0; i < timings.swaps; i++) {
      const p = timings.swaps <= 1 ? 1 : i / (timings.swaps - 1);
      const interval = lerp(timings.startInterval, timings.endInterval, ease(p));
      const showB = i % 2 === 0;
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;
      await sleep(interval);
    }

    // Flash + reveal (remove silhouettes)
    flash.style.opacity = 1;
    await sleep(timings.flashMs);
    flash.style.opacity = 0;

    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;

    // Tiny pop (scale via transform)
    pop(imgB, timings.revealPopMs);

    currentId = nextId;
    btn.disabled = false;
    busy = false;
  }

  // Helpers
  function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function pop(el, durMs) {
    el.style.transition = `transform ${durMs}ms cubic-bezier(.2,1,.2,1)`;
    el.style.transform = "scale(0.9)";
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
      // cleanup after
      setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, durMs + 20);
    });
  }

  // Init: pick a starting Pokémon
  await showInstant(randId());

  // Wire button
  btn?.addEventListener("click", evolve);
})();
