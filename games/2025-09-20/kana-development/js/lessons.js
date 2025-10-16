
// ==========================================================
// lessons.js
// ==========================================================

(async () => {
  try {
    // Wait for LessonCore to exist before continuing
    await waitFor(() => window.LessonCore && typeof window.LessonCore.showPart === "function");

    const { IS_VOCAB, showPart } = window.LessonCore;

    // 1️⃣ Prepare the correct lesson initializer (deferred)
    let startLessonFn = null;

    if (IS_VOCAB && typeof initVocabParts === "function") {
      startLessonFn = initVocabParts;
    } else if (!IS_VOCAB && typeof initKanaParts === "function") {
      startLessonFn = initKanaParts;
    } else {
      console.error("initVocabParts / initKanaParts not found. Check script includes.");
      return;
    }

    // 2️⃣ Try to show summary first; otherwise start directly
    const hadSummary = await maybeShowSummary();

    // Always initialize lesson parts (build DOM, preload data)
    startLessonFn();

    if (!hadSummary) {
      showPart(1);
    }
    // If hadSummary === true, the summary button will start Part 1 later.

  } catch (err) {
    console.error("lessons.js crashed:", err);
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
  try {
    const params = new URLSearchParams(location.search);
    const lessonId = params.get("lesson") || params.get("id");
    if (!lessonId) return false;

    const summaryPath = "../data/lexicon_summaries.json";
    const res = await fetch(summaryPath);
    if (!res.ok) throw new Error(`fetch failed (${res.status})`);
    const data = await res.json();

    let summary = null;
    if (Array.isArray(data.summaries)) {
      summary = data.summaries.find(
        s => (Array.isArray(s.worlds) && s.worlds.includes(lessonId)) || s.id === lessonId
      );
    }

    if (!summary) return false;

    const summaryText = summary.note || summary.gloss_en || "No summary available";
    const container = document.querySelector(".lesson") || document.body;

    // 🔹 add flag class to hide other parts
    container.classList.add("has-summary");

    const part0 = document.createElement("section");
    part0.className = "lesson-summary";
    part0.innerHTML = `
      <div class="summary-panel">
        <div class="summary-kana">${summary.kana ?? ""}</div>
        <h2>${summary.gloss_en ?? "Summary"}</h2>
        <p>${summaryText}</p>
        <button id="start-lesson" class="btn primary">Begin Lesson</button>
      </div>
    `;
    const main = document.querySelector("main") || container;
    main.prepend(part0);

    // Button → remove summary + begin lesson
    part0.querySelector("#start-lesson").addEventListener("click", () => {
      container.classList.remove("has-summary"); // 🔹 show parts again
      part0.remove();
      window.LessonCore.showPart(1);
    });

    return true;
  } catch (err) {
    console.warn("Summary load failed:", err);
    return false;
  }
}
