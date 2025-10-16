// ==========================================================
// lessons.js (Bootstrap only)
// Reliable lesson startup + optional Part 0 Summary
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Wait for LessonCore to exist before continuing
  await waitFor(() => window.LessonCore && typeof window.LessonCore.showPart === "function");

  const { IS_VOCAB, showPart } = window.LessonCore;

  // 1 Initialize lesson parts
  if (IS_VOCAB && typeof initVocabParts === "function") {
    initVocabParts();
  } else if (!IS_VOCAB && typeof initKanaParts === "function") {
    initKanaParts();
  } else {
    console.error("initVocabParts / initKanaParts not found. Check script includes.");
    return;
  }

  // 2 Try to show summary first; otherwise start directly
  const hadSummary = await maybeShowSummary();
  if (!hadSummary) {
    showPart(1);
  }
});

// ----------------------------------------------------------
// Utility: wait for a condition to become true
// ----------------------------------------------------------
function waitFor(check, interval = 25, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const timer = setInterval(() => {
      if (check()) {
        clearInterval(timer);
        resolve(true);
      } else if (performance.now() - start > timeout) {
        clearInterval(timer);
        reject(new Error("waitFor timeout"));
      }
    }, interval);
  });
}

// ----------------------------------------------------------
// Part 0 — Optional Summary (Pre-Lesson Screen)
// ----------------------------------------------------------
async function maybeShowSummary() {
  try {
    const lessonId = new URLSearchParams(location.search).get("lesson");
    if (!lessonId) return false;

    // adjust relative path if needed
    const res = await fetch("../data/lexicon_summaries.json");
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    const summaries = await res.json();

    const summaryText = summaries?.[lessonId];
    if (!summaryText) return false;

    // Build summary section matching your CSS
    const container = document.querySelector(".lesson") || document.body;
    const part0 = document.createElement("section");
    part0.className = "lesson-summary";
    part0.innerHTML = `
      <div class="summary-panel">
        <div class="summary-kana">${lessonId}</div>
        <h2>Summary</h2>
        <p>${summaryText}</p>
        <button id="start-lesson" class="btn primary">Begin Lesson</button>
      </div>
    `;
    container.prepend(part0);

    // Button → remove summary + begin lesson
    part0.querySelector("#start-lesson").addEventListener("click", () => {
      part0.remove();
      window.LessonCore.showPart(1);
    });

    return true;
  } catch (err) {
    console.warn("Summary load failed:", err);
    return false;
  }
}
