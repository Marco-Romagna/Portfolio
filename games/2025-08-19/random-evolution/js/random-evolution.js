// random-evolution.js
window.addEventListener("DOMContentLoaded", () => {
  if (window.Revo?.Game?.init) {
    window.Revo.Game.init();
  } else {
    console.warn("[REVO] Game.init missing; nothing to do.");
  }
});
