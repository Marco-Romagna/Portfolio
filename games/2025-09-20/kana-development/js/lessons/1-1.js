// lesson-1-1.js — Intro logic for 1-1 (no audio yet)
(() => {
  // Footer year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // Map kana -> romaji
  const ROMAJI = { "あ":"a","い":"i","う":"u","え":"e","お":"o" };

  // Elements
  const glyph = document.querySelector(".kana-glyph");
  const romajiEl = document.getElementById("kanaRomaji");

  // Update card when a vowel button is clicked
  document.querySelectorAll("#vowelBtns .choice").forEach(btn => {
    btn.addEventListener("click", () => {
      const kana = btn.textContent.trim();
      glyph.textContent = kana;
      romajiEl.textContent = ROMAJI[kana] || "";
    });
  });

  // View switching (no page redirect)
  const intro = document.getElementById("intro");
  const activity = document.getElementById("activity");
  const nextBtn = document.getElementById("nextBtn");
  const backBtn = document.getElementById("backBtn");

  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      intro.hidden = true;
      activity.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  if (backBtn) {
    backBtn.addEventListener("click", () => {
      activity.hidden = true;
      intro.hidden = false;
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();
