// Random Evolution: silhouette flicker -> speed-up -> flash -> reveal, with A/B controls

(async function () {
  // Elements
  const imgA = document.getElementById("imgA");
  const imgB = document.getElementById("imgB");
  const flash = document.getElementById("flash");
  const btnA = document.getElementById("a-button"); // evolve
  const btnB = document.getElementById("b-button"); // cancel

  // Settings
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base = settings.sprites.base_url;
  const ext = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end = settings.sprites.range.end || 1025;

  // Timings
  const timings = {
    introHold: 900,
    swaps: 18,
    startInterval: 260,
    endInterval: 70,
    flashMs: 120,
    revealPopMs: 250
  };

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let currentId = null;
  let busy = false;
  let cancelRequested = false;

  // Helpers
  const randId = () => Math.floor(Math.random() * (end - start + 1)) + start;

  const pickOther = () => {
    let id = randId();
    if (currentId == null) return id;
    while (id === currentId) id = randId();
    return id;
  };

  const urlFor = (id) => `${base}${id}${ext}`;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (p) => p * p * (3 - 2 * p); // smoothstep

  function preload(src) {
    return new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(src);
      i.onerror = reject;
      i.src = src;
    });
  }

  function pop(el, durMs) {
    el.style.transition = `transform ${durMs}ms cubic-bezier(.2,1,.2,1)`;
    el.style.transform = "scale(0.9)";
    requestAnimationFrame(() => {
      el.style.transform = "scale(1)";
      setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, durMs + 20);
    });
  }

  async function showInstant(id) {
    currentId = id;
    imgA.src = urlFor(id);
    imgB.src = "";
    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;
  }

  async function evolve() {
    if (busy) return;
    busy = true;
    cancelRequested = false;
    btnA?.classList.add("disabled");

    // cancel hook
    const requestCancel = () => {
      if (!busy) return;
      cancelRequested = true;
    };
    btnB?.addEventListener("click", requestCancel, { once: true });

    const nextId = pickOther();

    try { await preload(urlFor(nextId)); } catch (_) { /* ignore; will try anyway */ }

    // Prep
    imgA.src = urlFor(currentId ?? pickOther());
    imgB.src = urlFor(nextId);
    imgA.classList.add("silhouette");
    imgB.classList.add("silhouette");
    imgA.style.opacity = 1;
    imgB.style.opacity = 0;
    flash.style.opacity = 0;

    // Reduced motion: quick crossfade
    if (reducedMotion) {
      if (!cancelRequested) {
        imgA.classList.remove("silhouette");
        imgB.classList.remove("silhouette");
        imgB.style.transition = "opacity 200ms linear";
        requestAnimationFrame(() => {
          imgB.style.opacity = 1;
          imgA.style.opacity = 0;
        });
        await sleep(220);
        currentId = nextId;
      }
      finish();
      return;
    }

    // Intro hold
    for (let t = 0; t < timings.introHold; t += 16) {
      if (cancelRequested) return finish();
      await sleep(16);
    }

    // Alternation with acceleration
    for (let i = 0; i < timings.swaps; i++) {
      if (cancelRequested) return finish();
      const p = timings.swaps <= 1 ? 1 : i / (timings.swaps - 1);
      const interval = lerp(timings.startInterval, timings.endInterval, ease(p));
      const showB = i % 2 === 0;
      imgA.style.opacity = showB ? 0 : 1;
      imgB.style.opacity = showB ? 1 : 0;
      await sleep(interval);
    }

    if (cancelRequested) return finish();

    // Flash + reveal
    flash.style.opacity = 1;
    await sleep(timings.flashMs);
    flash.style.opacity = 0;

    imgA.classList.remove("silhouette");
    imgB.classList.remove("silhouette");
    imgA.style.opacity = 0;
    imgB.style.opacity = 1;

    pop(imgB, timings.revealPopMs);

    currentId = nextId;
    finish();

    // local cleanup
    function finish() {
      busy = false;
      btnA?.classList.remove("disabled");
      // Show currentId in A layer for idle state
      imgA.src = urlFor(currentId ?? randId());
      imgA.classList.remove("silhouette");
      imgB.classList.remove("silhouette");
      imgA.style.opacity = 1;
      imgB.style.opacity = 0;
      flash.style.opacity = 0;
    }
  }

  // Init
  await showInstant(randId());

  // Controls
  btnA?.addEventListener("click", evolve);
  // Optional keyboard: Enter/Space = A, Escape/B = B
  window.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") btnA?.click();
    if (e.key.toLowerCase() === "b" || e.key === "Escape") {
      // simulate cancel press
      if (busy) {
        const ev = new Event("click");
        btnB?.dispatchEvent(ev);
      }
    }
  });
})();
