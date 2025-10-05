// ==========================================================
// lessons.js (Bootstrap only)
// Decides which lesson type to initialize (Kana or Vocab)
// ==========================================================

(() => {
  const { IS_VOCAB, showPart } = window.LessonCore;

  function startLesson() {
    // Call showPart only after the lesson content exists
    if (typeof showPart === "function") {
      requestAnimationFrame(() => showPart(1));
    }
  }

  if (IS_VOCAB) {
    if (typeof initVocabParts === 'function') {
      initVocabParts();
      startLesson();
    } else {
      console.error("initVocabParts not found. Did you include lessons-vocab.js?");
    }
  } else {
    if (typeof initKanaParts === 'function') {
      initKanaParts();
      startLesson();
    } else {
      console.error("initKanaParts not found. Did you include lessons-kana.js?");
    }
  }
})();
