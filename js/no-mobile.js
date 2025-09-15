// no-mobile.js
(() => {
  const MIN_WIDTH = 781; // required width in px

  function createOverlay(message) {
    const style = document.createElement("style");
    style.textContent = `
      .no-mobile-overlay {
        position: fixed; inset: 0;
        display: flex; align-items: center; justify-content: center;
        background: #000;
        color: #fff;
        font-family: sans-serif;
        font-size: 1.1rem;
        z-index: 9999;
        text-align: center;
        padding: 2rem;
        flex-direction: column;
        gap: .75rem;
      }
    `;
    document.head.appendChild(style);

    const overlay = document.createElement("div");
    overlay.className = "no-mobile-overlay";
    overlay.innerHTML = message;
    document.body.appendChild(overlay);
    return overlay;
  }

  function updateOverlay() {
    const w = window.innerWidth;
    const screenW = screen.width; // physical device width

    // Already wide enough? remove overlay
    if (w >= MIN_WIDTH) {
      document.querySelector(".no-mobile-overlay")?.remove();
      return;
    }

    // Case 1: Device itself is too small
    if (screenW < MIN_WIDTH) {
      createOverlay("<p>This screen size is not supported.</p>");
      return;
    }

    // Case 2: Can widen window
    createOverlay(`
      <p>Please widen your window to at least <strong>${MIN_WIDTH}px</strong>.</p>
      <p>Current width: ${w}px</p>
    `);
  }

  document.addEventListener("DOMContentLoaded", updateOverlay);
  window.addEventListener("resize", updateOverlay);
})();
