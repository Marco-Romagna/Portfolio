// ==========================================================
// lessons.js (Bootstrap only)
// Decides which lesson type to initialize (Kana or Vocab)
// ==========================================================

(() => {
  const { IS_VOCAB, showPart } = window.LessonCore;

  // ----------------------------------------------------------
  // Part 0 — Optional Summary Loader
  // ----------------------------------------------------------
  async function maybeShowSummary() {
    try {
      // 1. Get current lesson ID
      const lessonId =
        window.LessonCore?.LESSON_ID ||
        new URLSearchParams(location.search).get("lesson");
      if (!lessonId) return false;

      // 2. Fetch summaries JSON
      const res = await fetch("../data/lexicon_summaries.json");
      const summaries = await res.json();

      // 3. Look up this lesson’s summary text
      const summaryText = summaries?.[lessonId];
      if (!summaryText) return false;

      // 4. Build the summary “Part 0” section
      const container = document.querySelector(".lesson") || document.body;
      const part0 = document.createElement("section");
      part0.id = "part-0";
      part0.className = "lesson-part is-visible";
      part0.innerHTML = `
        <h2 class="part-title">Summary</h2>
        <div class="lesson-summary">${summaryText}</div>
        <div class="actions">
          <button class="btn primary" data-action="begin">Begin Lesson</button>
        </div>
      `;
      container.prepend(part0);

      // 5. Handle “Begin Lesson” click → proceed to Part 1
      part0
        .querySelector("[data-action='begin']")
        .addEventListener("click", () => {
          part0.remove();
          window.LessonCore.showPart(1);
        });

      return true;
    } catch (err) {
      console.warn("Failed to load summary:", err);
      return false;
    }
  }

  // ----------------------------------------------------------
  // Main Lesson Startup
  // ----------------------------------------------------------
  async function startLesson() {
    // Show summary first if available; otherwise start normally
    const hadSummary = await maybeShowSummary();
    if (!hadSummary) {
      requestAnimationFrame(() => showPart(1));
    }
  }

  // ----------------------------------------------------------
  // Bootstrapping
  // ----------------------------------------------------------
  if (IS_VOCAB) {
    if (typeof initVocabParts === "function") {
      initVocabParts();
      startLesson();
    } else {
      console.error(
        "initVocabParts not found. Did you include lessons-vocab.js?"
      );
    }
  } else {
    if (typeof initKanaParts === "function") {
      initKanaParts();
      startLesson();
    } else {
      console.error(
        "initKanaParts not found. Did you include lessons-kana.js?"
      );
    }
  }
})();
