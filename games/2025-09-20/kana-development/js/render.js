// ==========================================================
// render.js — grouped rows with correct vocab placement
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

  // Explicit consonant rows per world
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

  // Label shortening
  const shortLabel = (title = "") => {
    if (title.includes("Vocabulary") && title.includes("Hiragana"))
      return "Hira Vocab";
    if (title.includes("Vocabulary") && title.includes("Katakana"))
      return "Kata Vocab";
    if (title.includes("Hiragana")) return "Hira";
    if (title.includes("Katakana")) return "Kata";
    if (title.includes("Mixed")) return "Mix";
    return title.split("—")[1]?.trim() || title;
  };

  // Extract kana sample for label
  const extractKanaSample = (title = "") => {
    const match = title.match(/\(([ぁ-んァ-ン]+)\)/);
    return match ? match[1] : "";
  };

  // Dakuten and Handakuten mapping
  const DAKU_MAP = { K: "G", S: "Z", T: "D", H: "B" };
  const HANDA_MAP = { H: "P" };

  // ---------- Render each world ----------
  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    const wEl = wNode.querySelector(".world");

    wEl.querySelector(".world-title").textContent = w.title;
    wEl.querySelector(".world-desc").textContent = w.desc || "";

    const list = wEl.querySelector(".levels-list");

    const worldNum = parseInt(w.code);
    const rows = WORLD_ROWS[worldNum] || [];
    let usedVocab = new Set(); // track vocab usage per world

    rows.forEach((rowKey, rowIndex) => {
      const levels = (w.levels || []).filter(lv => {
        const title = lv.title;

        // --- Vowel world ---
        if (rowKey === "V") {
          return (
            title.includes("Vowel") ||
            (title.includes("Vocabulary") &&
              title.includes("Hiragana") &&
              !usedVocab.has("HiraVocab"))
          );
        }

        // --- Base detection ---
        // Treat kana lessons like "Hiragana W + ん", "Katakana W + ン", or "Mixed W/N" as valid rows
        const isKanaRow =
          title.includes(`${rowKey} (`) ||             // normal "(かきくけこ)"
          title.includes(` ${rowKey} `) ||             // spaced " K "
          title.includes(`${rowKey} +`) ||             // "W + ん"
          title.includes(`${rowKey}/`) ||              // "Mixed W/N"
          title.startsWith(rowKey);                    // fallback, e.g., "W Row" edge cases
        const isSameRowVocab =
          title.includes("Vocabulary") &&
          !title.includes("Dakuten") &&
          !title.includes("Handakuten");

        const dakuBase = Object.keys(DAKU_MAP).find(b => DAKU_MAP[b] === rowKey);
        const handaBase = Object.keys(HANDA_MAP).find(b => HANDA_MAP[b] === rowKey);

        const isDakutenVocab =
          title.includes("Vocabulary") && title.includes("Dakuten") && !!dakuBase;

        const isHandakutenVocab =
          title.includes("Vocabulary") &&
          title.includes("Handakuten") &&
          !!handaBase;

        const vocabType = title.includes("Katakana")
          ? "KataVocab"
          : title.includes("Hiragana")
          ? "HiraVocab"
          : null;

        // --- Decide if vocab should show for this row ---
        let allowVocab = false;

        // Base row vocab → only first row (normal)
        if (isSameRowVocab && rowIndex === 0 && !usedVocab.has(vocabType)) {
          allowVocab = true;
        }

        // Dakuten vocab → belongs to rowKey = mapped dakuten letter
        if (isDakutenVocab && rowKey === DAKU_MAP[dakuBase]) {
          allowVocab = true;
        }

        // Handakuten vocab → belongs to rowKey = mapped handakuten letter
        if (isHandakutenVocab && rowKey === HANDA_MAP[handaBase]) {
          allowVocab = true;
        }

        const isKanaLesson = isKanaRow && !title.includes("Vocabulary");

        if (allowVocab && vocabType) usedVocab.add(vocabType);

        return isKanaLesson || allowVocab;
      });

      if (!levels.length) return;

      // --- Build row group ---
      const sample = extractKanaSample(levels[0].title);
      const rowGroup = document.createElement("div");
      rowGroup.className = "level-row-group";

      const label = document.createElement("div");
      label.className = "level-row-label";
      label.textContent = `${
        rowKey === "V" ? "Vowel" : rowKey
      } Row${sample ? ` (${sample})` : ""}`;
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

  // ---------- Carousel ----------
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
});
