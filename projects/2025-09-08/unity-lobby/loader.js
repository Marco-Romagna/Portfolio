// projects/unity-lobby/loader.js

(function () {
  const bar = document.getElementById('barFill');
  const pct = document.getElementById('pct');
  const loader = document.getElementById('loader');
  const placeholder = document.getElementById('placeholder');

  if (!bar || !pct || !loader || !placeholder) return;

  placeholder.style.display = 'none'; // hide until finished
  let p = 0;
  const tick = () => {
    p += Math.max(0.5, (100 - p) * 0.05);
    if (p > 100) p = 100;
    bar.style.width = p.toFixed(0) + '%';
    pct.textContent = p.toFixed(0) + '%';
    if (p < 100) {
      requestAnimationFrame(tick);
    } else {
      setTimeout(() => {
        loader.style.opacity = '0';
        loader.addEventListener('transitionend', () => {
          loader.hidden = true;
          placeholder.style.display = 'grid'; // reveal after load
        }, { once: true });
      }, 300);
    }
  };
  requestAnimationFrame(tick);
})();
