// card-mode.js
(() => {
  // CONFIG: 'light' | 'dark' | 'sepia' | 'auto' | 'cycle'
  const MODE = 'auto';

  const modes = ['light', 'dark', 'sepia'];
  let chosen = 'light';

  if (MODE === 'auto') {
    // Random each load
    chosen = modes[Math.floor(Math.random() * modes.length)];
  } else if (MODE === 'cycle') {
    // Cycle across reloads using localStorage
    const k = 'kana_mode_index';
    const i = (parseInt(localStorage.getItem(k) || '0', 10) % modes.length);
    chosen = modes[i];
    localStorage.setItem(k, (i + 1) % modes.length);
  } else {
    chosen = MODE; // fixed value
  }

  // Apply class to <body>
  document.addEventListener("DOMContentLoaded", () => {
    document.body.classList.add('mode-' + chosen);
  });
})();
