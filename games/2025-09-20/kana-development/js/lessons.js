// ==========================================================
// lessons.js (Bootstrap only)
// Reliable lesson startup + optional Part 0 Summary
// ==========================================================

document.addEventListener("DOMContentLoaded", async () => {
  // Wait until LessonCore is defined (in case scripts load slowly)
  await waitFor(() => window.LessonCore && typeof window.LessonCore.showPart === "function");

  const { IS_VOCAB, showPart } = window.LessonCore;

  // 1️⃣ Initialize lesson content (Kana or Vocab)
  if (IS_VOCAB && typeof initVocabParts === "function") {
    initVocabParts();
  } else if (!IS_VOCAB && typeof initKanaParts === "function") {
    initKanaParts();
  } else {
    console.error("init functions not found — are lessons-kana.js / lessons-vocab.js included?");
    return;
  }

  // 2️⃣ Try to show summary first; otherwise start Part 1
  const hadSummary = await maybeShowSummary();
  if (!hadSummary) {
    showPart(1);
  }
});

// ----------------------------------------------------------
// Helper: wait for condition
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
// Part 0 — Optional Summary Loader
// ----------------------------------------------------------
async function maybeShowSummary() {
  try {
    const lessonId = new URLSearchParams(location.search).get("lesson");
    if (!lessonId) return false;

    // Adjust path as needed (relative to lesson.html)
    const res = await fetch("../data/lexicon_summaries.json");
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    const summaries = await res.json();

    const summaryText = summaries?.[lessonId];
    if (!summaryText) return false;

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

    part0.querySelector("[data-action='begin']").addEventListener("click", () => {
      part0.remove();
      window.LessonCore.showPart(1);
    });

    return true;
  } catch (err) {
    console.warn("Summary load failed:", err);
    return false;
  }
}
