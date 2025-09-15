// no-mobile.js
(() => {
  // Run only if small screen
  if (!window.matchMedia("(max-width: 720px)").matches) return;

  // Inject overlay
  const style = document.createElement("style");
  style.textContent = `
    .no-mobile-overlay {
      position: fixed; inset: 0;
      display: flex; align-items: center; justify-content: center;
      background: #000;
      color: #fff;
      font-family: sans-serif;
      font-size: 1.25rem;
      z-index: 9999;
      text-align: center;
      padding: 2rem;
    }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "no-mobile-overlay";
  overlay.textContent = "This page is not supported on mobile. Please use a larger screen.";
  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(overlay);
    // Lock scrolling underneath
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  });
})();
