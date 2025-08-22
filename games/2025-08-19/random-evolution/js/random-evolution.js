// games/2025-08-19/random-evolution/js/random-evolution.js
// Tiny boot that connects modules and runs the game.
// Assumes other modules define window.RevoUtil, window.RevoAudio,
// window.RevoRail, window.RevoHUD, window.RevoGame, window.RevoHistory.

window.addEventListener("DOMContentLoaded", () => {
  // --- 1) Ensure urlFor is available to history ---
  if (window.RevoHistory && window.RevoUtil && typeof window.RevoUtil.urlFor === "function") {
    window.RevoHistory.setUrlFor(window.RevoUtil.urlFor);
  }

  // Init subsystems (if your modules expose init hooks)
  if (window.RevoAudio?.init) window.RevoAudio.init();
  if (window.RevoRail?.init)  window.RevoRail.init();
  if (window.RevoHUD?.init)   window.RevoHUD.init();

  // History needs to compute capacity on load
  if (window.RevoHistory?.init) window.RevoHistory.init();

  // Wire up "start game" from your game module
  // This example assumes your RevoGame exposes a start(mode, callbacks) API.
  // If your code differs, only keep the "pushStart" RIGHT AFTER the first
  // Pokémon is chosen and shown.

  if (!window.RevoGame || typeof window.RevoGame.start !== "function") {
    console.warn("[REVO] Boot: window.RevoGame.start missing; nothing to do.");
    return;
  }

  // Hook into RevoGame lifecycle
  // We pass callbacks so Game can notify us when the *first* Pokémon is ready.
  window.RevoGame.start({
    onFirstPokemonShown(currentId) {
      // --- 2) Add the first Pokémon to the history as neutral ---
      if (window.RevoHistory?.pushStart) {
        window.RevoHistory.pushStart(currentId);
      }
    },
    onLayoutChange() {
      // If layout changes (e.g., after choose mode), recompute history capacity.
      if (window.RevoHistory?.updateCapacity) {
        window.RevoHistory.updateCapacity();
      }
    }
  });

  // If your game instead starts after clicking mode buttons and calls some
  // internal function to show the first Pokémon, just ensure you call:
  //   RevoHistory.pushStart(currentId);
  // immediately after you call your equivalent of `showInstant(currentId)`.
});
