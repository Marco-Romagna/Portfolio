// ==========================================================
// lessons.js — Final stable version (instant startup + summary)
// ==========================================================

console.log("🟢 lessons.js file fetched, script starting");

(async () => {
  try {
    console.log("🟢 lessons.js executing immediately");

    // ------------------------------------------------------
    // Wait for LessonCore to exist before continuing
    // ------------------------------------------------------
    await waitFor(() => window.LessonCore && typeof window.LessonCore.showPart === "function");
    console.log("🟢 LessonCore found:", window.LessonCore);

    const { IS_VOCAB, showPart } = window.LessonCore;

    // ------------------------------------------------------
    // 1️⃣ Initialize lesson parts
    // ------------------------------------------------------
    if (IS_VOCAB && typeof initVocabParts === "function") {
      console.log("🟢 Initializing vocab lesson");
      initVocabParts();
    } else if (!IS_VOCAB && typeof initKanaParts === "function") {
      console.log("🟢 Initializing kana lesson");
      initKanaParts();
    } else {
      console.error("❌ initVocabParts / initKanaParts not found. Check script includes.");
      return;
    }

    // ------------------------------------------------------
    // 2️⃣ Try to show summary first; otherwise start directly
    // ------------------------------------------------------
    const hadSummary = await maybeShowSummary();
    console.log("🟢 maybeShowSummary returned:", hadSummary);

    if (!hadSummary) {
      console.log("🟢 No summary found → starting Part 1");
      showPart(1);
    }

  } catch (err) {
    console.error("❌ lessons.js crashed:", err);
  }
})();

// ==========================================================
// Utility: wait for a condition to become true
// ==========================================================
function waitFor(check, interval = 25, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    const timer = setInterval(() => {
      try {
        if (check()) {
          clearInterval(timer);
          resolve(true);
        } else if (performance.now() - start > timeout) {
          clearInterval(timer);
          reject(new Error("waitFor timeout"));
        }
      } catch (err) {
        clearInterval(timer);
        reject(err);
      }
    }, interval);
  });
}

// ==========================================================
// Part 0 — Optional Summary (Pre-Lesson Screen)
// ==========================================================
async function maybeShowSummary() {
  console.log("🟢 maybeShowSummary() entered");

  try {
    const lessonId = new URLSearchParams(location.search).get("lesson");
    console.log("🟢 lessonId from URL:", lessonId);
    if (!lessonId) return false;

    // Adjust relative path if needed
    const summaryPath = "../data/lexicon_summaries.json";
    console.log("🟢 Fetching summaries from:", summaryPath);
    const res = await fetch(summaryPath);
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    const summaries = await res.json();
    console.log("🟢 summaries keys:", Object.keys(summaries || {}));

    const summaryText = summaries?.[lessonId];
    console.log("🟢 summaryText for", lessonId, "=", summaryText);
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

    console.log("🟢 Summary panel inserted");

    // Button → remove summary + begin lesson
    part0.querySelector("#start-lesson").addEventListener("click", () => {
      console.log("🟢 Begin Lesson clicked → removing summary");
      part0.remove();
      window.LessonCore.showPart(1);
    });

    return true;
  } catch (err) {
    console.warn("⚠️ Summary load failed:", err);
    return false;
  }
}
