// ==========================================================
// lessons.js (Bootstrap only)
// Decides which lesson type to initialize (Kana or Vocab)
// ==========================================================

(() => {
  const { IS_VOCAB, showPart } = window.LessonCore;

  if (IS_VOCAB) {
    if (typeof initVocabParts === 'function') {
      initVocabParts();
    } else {
      console.error("initVocabParts not found. Did you include lessons-vocab.js?");
    }
  } else {
    if (typeof initKanaParts === 'function') {
      initKanaParts();
    } else {
      console.error("initKanaParts not found. Did you include lessons-kana.js?");
    }
  }

  showPart(1);
})();
