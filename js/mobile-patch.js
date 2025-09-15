// mobile-patch.js
(() => {
  // CSS override only active on mobile widths
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 860px) {
      /* Kill rogue All Games pill */
      .header .links .cta::after { content: none !important; }
      .header .links, .header .nav { position: static !important; }
    }
  `;
  document.head.appendChild(style);

  // Extra cleanup if any element literally says "All Games"
  document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 860) {
      document.querySelectorAll('a,button,div,span').forEach(el => {
        if (el.textContent.trim() === 'All Games') el.remove();
      });
    }
  });
})();
