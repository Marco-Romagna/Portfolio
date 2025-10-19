// ==========================================================
// init.js — entrypoint for Kana Development worlds
// ==========================================================

(function () {
  console.log("[Init] Starting Kana Development...");

  // Utility: wait until worlds and renderer are both ready
  function tryInitWorlds(attempt = 0) {
    if (window.renderWorlds && window.KANA_STAGES) {
      // Render all world panels
      renderWorlds();

      // Initialize carousel when DOM & slides exist
      if (typeof window.initCarousel === "function") {
        window.initCarousel();
      } else {
        console.warn("[Init] Carousel not yet defined.");
      }

      console.log("[Init] Worlds + Carousel initialized.");
    } else {
      // Retry logic for slow loads
      if (attempt < 10) {
        console.warn("[Init] Worlds not ready, retrying...", attempt);
        setTimeout(() => tryInitWorlds(attempt + 1), 300);
      } else {
        console.error("[Init] Failed to initialize after 10 attempts.");
      }
    }
  }

  // Start when DOM is ready
  document.addEventListener("DOMContentLoaded", () => tryInitWorlds());
})();
