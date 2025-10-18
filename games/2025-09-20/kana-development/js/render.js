// ==========================================================
// render.js — grouped kana rows (Hira / Kata / Mix / Vocab)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("worlds-track");
  const nav = document.getElementById("carousel-nav");
  const worldTpl = document.getElementById("tpl-world");
  const rowTpl = document.getElementById("tpl-level-row");

  if (!track || !worldTpl) {
    console.warn("[Render] Missing required DOM elements");
    return;
  }

  track.innerHTML = "";
  const worlds = window.WORLDS || [];
  if (!worlds.length) {
    console.warn("[Render] No worlds found");
    return;
  }

  // Helper: short label from title
  const shortLabel = (title = "") => {
    if (title.includes("Hiragana")) return "Hira";
    if (title.includes("Katakana")) return "Kata";
    if (title.includes("Mixed")) return "Mix";
    if (title.includes("Vocab") && title.includes("Hiragana")) return "Voc-H";
    if (title.includes("Vocab") && title.includes("Katakana")) return "Voc-K";
    return title.split("—")[1]?.trim() || title;
  };

  // Helper: detect kana row key from title (K, G, P, etc.)
  const detectKanaRow = (title = "") => {
    const match = title.match(/—\s+([A-Za-z])\s/);
    return match ? match[1] : "Other";
  };

  // --- Render each world ---
  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    const wEl = wNode.querySelector(".world");

    wEl.querySelector(".world-title").textContent = w.title;
    wEl.querySelector(".world-desc").textContent = w.desc || "";

    const list = wEl.querySelector(".levels-list");

    // Group levels by kana letter (like K, G, P)
    const groups = {};
    (w.levels || []).forEach(lv => {
      const key = detectKanaRow(lv.title);
      if (!groups[key]) groups[key] = [];
      groups[key].push(lv);
    });

    // --- Render grouped rows ---
    Object.entries(groups).forEach(([kana, levels]) => {
      const rowGroup = document.createElement("div");
      rowGroup.className = "level-row-group";

      const label = document.createElement("div");
      label.className = "level-row-label";
      label.textContent = kana + "-row";
      rowGroup.appendChild(label);

      const rowButtons = document.createElement("div");
      rowButtons.className = "level-row-buttons";

      levels.forEach(lv => {
        const btn = document.createElement("div");
        btn.className = "level-btn";
        btn.textContent = shortLabel(lv.title);

        const href = lv.href || "#";
        const go = () => { if (href && href !== "#") window.location.href = href; };
        btn.addEventListener("click", go);
        btn.addEventListener("keydown", e => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            go();
          }
        });

        rowButtons.appendChild(btn);
      });

      rowGroup.appendChild(rowButtons);
      list.appendChild(rowGroup);
    });

    track.appendChild(wEl);
  });

  // --- Carousel setup ---
  const slides = Array.from(track.children);
  if (!slides.length) return;

  track.style.display = "flex";
  track.style.transition = "transform 0.6s ease";
  track.style.width = `${slides.length * 100}%`;
  slides.forEach(slide => {
    slide.style.width = "100%";
    slide.style.flexShrink = "0";
  });

  nav.innerHTML = "";
  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.addEventListener("click", () => updateCarousel(i));
    nav.appendChild(dot);
  });

  let current = 0;
  function updateCarousel(index) {
    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;
    [...nav.children].forEach((dot, i) =>
      dot.classList.toggle("active", i === current)
    );
  }

  document.addEventListener("keydown", e => {
    if (e.key === "ArrowRight") updateCarousel(current + 1);
    if (e.key === "ArrowLeft") updateCarousel(current - 1);
  });

  let startX = 0;
  track.addEventListener("touchstart", e => (startX = e.touches[0].clientX));
  track.addEventListener("touchend", e => {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) updateCarousel(current + (diff < 0 ? 1 : -1));
  });

  updateCarousel(0);
  console.log("[Render] Rowed kana grid rendered successfully");
});
