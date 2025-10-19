// ==========================================================
// render.js — rule-based kana row grouping (explicit world map)
// ==========================================================
document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("worlds-track");
  const nav = document.getElementById("carousel-nav");
  const worldTpl = document.getElementById("tpl-world");

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

  // Explicit rows per world
  const WORLD_ROWS = {
    1: ["V"],
    2: ["K", "G"],
    3: ["S", "Z"],
    4: ["T", "D"],
    5: ["N"],
    6: ["H", "B", "P"],
    7: ["M"],
    8: ["Y"],
    9: ["R"],
    10: ["W"]
  };

  // Shorter labels
  const shortLabel = (title = "") => {
    if (title.includes("Vocabulary") && title.includes("Hiragana")) return "Hira Vocab";
    if (title.includes("Vocabulary") && title.includes("Katakana")) return "Kata Vocab";
    if (title.includes("Hiragana")) return "Hira";
    if (title.includes("Katakana")) return "Kata";
    if (title.includes("Mixed")) return "Mix";
    return title.split("—")[1]?.trim() || title;
  };

  // Extract kana samples (like (かきくけこ))
  const extractKanaSample = (title = "") => {
    const match = title.match(/\(([ぁ-んァ-ン]+)\)/);
    return match ? match[1] : "";
  };

  // Render each world
  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    const wEl = wNode.querySelector(".world");

    wEl.querySelector(".world-title").textContent = w.title;
    wEl.querySelector(".world-desc").textContent = w.desc || "";

    const list = wEl.querySelector(".levels-list");

    const worldNum = parseInt(w.code);
    const rows = WORLD_ROWS[worldNum] || [];

    // Group by row consonant (V, K, G, etc.)
    rows.forEach(rowKey => {
      const levels = (w.levels || []).filter(lv => {
        const title = lv.title;
        if (rowKey === "V") return title.includes("Vowel");
        if (rowKey === "K") return title.includes("K (");
        if (rowKey === "G") return title.includes("G (");
        if (rowKey === "S") return title.includes("S (");
        if (rowKey === "Z") return title.includes("Z (");
        if (rowKey === "T") return title.includes("T (");
        if (rowKey === "D") return title.includes("D (");
        if (rowKey === "N") return title.includes("N (");
        if (rowKey === "H") return title.includes("H (");
        if (rowKey === "B") return title.includes("B (");
        if (rowKey === "P") return title.includes("P (");
        if (rowKey === "M") return title.includes("M (");
        if (rowKey === "Y") return title.includes("Y (");
        if (rowKey === "R") return title.includes("R (");
        if (rowKey === "W") return title.includes("W (");
        return false;
      });

      if (!levels.length) return; // skip empty rows

      const sample = extractKanaSample(levels[0].title);
      const rowGroup = document.createElement("div");
      rowGroup.className = "level-row-group";

      const label = document.createElement("div");
      label.className = "level-row-label";
      label.textContent = `${rowKey === "V" ? "Vowel" : rowKey} Row${sample ? ` (${sample})` : ""}`;
      rowGroup.appendChild(label);

      const rowButtons = document.createElement("div");
      rowButtons.className = "level-row-buttons";

      levels.forEach(lv => {
        const btn = document.createElement("div");
        btn.className = "level-btn";
        btn.textContent = shortLabel(lv.title);
        const href = lv.href || "#";
        btn.addEventListener("click", () => {
          if (href && href !== "#") window.location.href = href;
        });
        rowButtons.appendChild(btn);
      });

      rowGroup.appendChild(rowButtons);
      list.appendChild(rowGroup);
    });

    track.appendChild(wEl);
  });

  // Carousel setup
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
  console.log("[Render] Explicit world-based kana rows rendered successfully");
});
