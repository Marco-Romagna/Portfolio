// no-mobile.js
(() => {
  const MIN_WIDTH = 781; // required width in px

  function ensureStyle() {
    if (document.getElementById("no-mobile-style")) return;
    const style = document.createElement("style");
    style.id = "no-mobile-style";
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
  }

  function showOverlay(html) {
    ensureStyle();
    let overlay = document.querySelector(".no-mobile-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "no-mobile-overlay";
      document.body.appendChild(overlay);
    }
    overlay.innerHTML = html;
  }

  function removeOverlay() {
    document.querySelector(".no-mobile-overlay")?.remove();
  }

  function updateOverlay() {
    const w = window.innerWidth;
    const screenW = screen.width; // physical device width

    // Wide enough: no overlay
    if (w >= MIN_WIDTH) {
      removeOverlay();
      return;
    }

    // Case 1: Device itself too small
    if (screenW < MIN_WIDTH) {
      showOverlay(`
        <p><strong>Not supported on this device</strong></p>
        <p>Your screen is too small. Please use a desktop or larger tablet.</p>
      `);
      return;
    }

    // Case 2: Can widen window
    showOverlay(`
      <p><strong>Please widen your window</strong></p>
      <p>Minimum required: ${MIN_WIDTH}px</p>
      <p>Current width: ${w}px</p>
    `);
  }

  document.addEventListener("DOMContentLoaded", updateOverlay);
  window.addEventListener("resize", updateOverlay);
})();
