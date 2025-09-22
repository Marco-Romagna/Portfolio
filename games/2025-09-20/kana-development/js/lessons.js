(() => {
  const { IS_VOCAB, showPart } = window.LessonCore;
  if (IS_VOCAB) {
    initVocabParts();
  } else {
    initKanaParts();
  }
  showPart(1);
})();
