// ==========================================================
// render.js — render list of worlds and levels (carousel version)
// combines full renderWorlds logic + carousel-ready structure
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("worlds-track");
  const nav = document.getElementById("carousel-nav");
  const worldTpl = document.getElementById("tpl-world");
  const rowTpl = document.getElementById("tpl-level-row");

  if (!track || !worldTpl || !rowTpl) {
    console.warn("[Render] Missing required DOM elements");
    return;
  }

  // Clear existing track
  track.innerHTML = "";

  // Load from global WORLDS (stages.js)
  const worlds = window.WORLDS || [];
  if (!worlds.length) {
    console.warn("[Render] No worlds found");
    return;
  }

  // --- Render all worlds ---
  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    const wEl = wNode.querySelector(".world");

    // Titles + desc
    wEl.querySelector(".world-title").textContent = w.title;
    wEl.querySelector(".world-desc").textContent = w.desc || "";

    const list = wEl.querySelector(".levels-list");

    // --- Render all levels within this world ---
    (w.levels || []).forEach(lv => {
      const node = rowTpl.content.cloneNode(true);
      const head  = node.querySelector(".level-head");
      const icon  = node.querySelector(".level-icon");
      const title = node.querySelector(".level-title");

      // optional style/icon
      if (lv.class) icon.classList.add(lv.class);

      icon.textContent = lv.thumb || lv.code || "";
      title.textContent = lv.title || lv.code || "";

      // Label script type
      if (lv.lexicon === "katakana") title.textContent += " (カタカナ)";
      else if (lv.lexicon === "hiragana") title.textContent += " (ひらがな)";

      // Make row navigable
      const href = lv.href || "#";
      const go = () => { if (href && href !== "#") window.location.href = href; };
      head.addEventListener("click", go);
      head.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault(); go();
        }
      });

      list.appendChild(node);
    });

    track.appendChild(wNode);
  });

  // --- Initialize carousel layout ---
  const slides = Array.from(track.children);
  if (!slides.length) return;

  track.style.display = "flex";
  track.style.transition = "transform 0.6s ease";
  track.style.width = `${slides.length * 100}%`;

  slides.forEach(slide => {
    slide.style.width = "100%";
    slide.style.flexShrink = "0";
    slide.style.padding = "1rem";
  });

  // --- Build nav dots ---
  nav.innerHTML = "";
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.addEventListener("click", () => updateCarousel(i));
    nav.appendChild(dot);
  });

  // --- Carousel control ---
  let current = 0;
  function updateCarousel(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    [...nav.children].forEach((dot, i) =>
      dot.classList.toggle("active", i === current)
    );
  }

  // Keyboard + swipe navigation
  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") updateCarousel(current + 1);
    if (e.key === "ArrowLeft") updateCarousel(current - 1);
  });

  let startX = 0;
  track.addEventListener("touchstart", e => startX = e.touches[0].clientX);
  track.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) updateCarousel(current + (diff < 0 ? 1 : -1));
  });

  // --- Initialize ---
  updateCarousel(0);
  console.log("[Render] Carousel worlds rendered successfully");
});
