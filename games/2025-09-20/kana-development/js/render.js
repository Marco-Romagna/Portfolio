// ==========================================================
// render.js — grouped kana rows (Hira / Kata / Mix / Vocab)
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

  // --- Helpers ---
  const shortLabel = (title = "") => {
    if (title.includes("Vocabulary") && title.includes("Hiragana")) return "Hira Vocab";
    if (title.includes("Vocabulary") && title.includes("Katakana")) return "Kata Vocab";
    if (title.includes("Hiragana")) return "Hira";
    if (title.includes("Katakana")) return "Kata";
    if (title.includes("Mixed")) return "Mix";
    return title.split("—")[1]?.trim() || title;
  };

  // Detect consonant row: e.g., K, G, H, B, P, etc.
  const detectKanaRow = (title = "") => {
    if (title.includes("Vowel")) return "Vowel"; // world 1 only

    // Extract consonant like K, G, H, B, etc.
    const match = title.match(/[—\(]\s*[HKGZDBPMNRWY]\s/);
    if (match) {
      const letter = match[0].match(/[HKGZDBPMNRWY]/)[0];
      return letter;
    }

    // Try a fallback for “Dakuten” (map to previous consonant)
    if (title.includes("Dakuten")) {
      if (title.includes("K")) return "G";
      if (title.includes("S")) return "Z";
      if (title.includes("T")) return "D";
      if (title.includes("H")) return "B";
    }

    // Handakuten → P row
    if (title.includes("Handakuten")) return "P";

    return "Other";
  };

  // --- Render each world ---
  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    const wEl = wNode.querySelector(".world");

    wEl.querySelector(".world-title").textContent = w.title;
    wEl.querySelector(".world-desc").textContent = w.desc || "";

    const list = wEl.querySelector(".levels-list");

    // Group levels by kana letter (K, G, etc.)
    const groups = {};
    (w.levels || []).forEach(lv => {
      const key = detectKanaRow(lv.title);
      if (!groups[key]) groups[key] = [];
      groups[key].push(lv);
    });

    // --- Render each kana row ---
    Object.entries(groups).forEach(([kana, levels]) => {
      // Skip filler groups for vowels (we only want one)
      if (w.title.includes("Vowel") && kana !== "Vowel") return;

      const rowGroup = document.createElement("div");
      rowGroup.className = "level-row-group";

      const label = document.createElement("div");
      label.className = "level-row-label";
      label.textContent =
        kana === "Vowel" ? "Vowel Row" : `${kana} Row`;
      rowGroup.appendChild(label);

      const rowButtons = document.createElement("div");
      rowButtons.className = "level-row-buttons";

      levels.forEach(lv => {
        const btn = document.createElement("div");
        btn.className = "level-btn";
        btn.textContent = shortLabel(lv.title);

        const href = lv.href || "#";
        const go = () => {
          if (href && href !== "#") window.location.href = href;
        };
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
  console.log("[Render] Improved kana grid rendered successfully");
});
