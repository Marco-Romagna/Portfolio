// lesson-1-1.js (no audio yet)
(() => {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  const card = document.querySelector('.card-big');
  const sub  = card?.querySelector('.kana-sub');
  document.querySelectorAll('#vowelBtns .choice').forEach(btn => {
    btn.addEventListener('click', () => {
      const kana = btn.textContent.trim();
      if (card) card.firstChild.nodeValue = kana;
      if (sub)  sub.textContent = ''; // no audio/romaji here yet
    });
  });
})();
