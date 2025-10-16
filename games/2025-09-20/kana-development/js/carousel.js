// ==========================================================
// carousel.js — horizontal world carousel logic
// ==========================================================
window.initCarousel = function () {
  const track = document.getElementById("worlds-track");
  const nav = document.getElementById("carousel-nav");
  if (!track || !nav) {
    console.warn("[Carousel] Missing track or nav container.");
    return;
  }

  let current = 0;

  function updateCarousel(index) {
    const slides = track.children;
    if (!slides.length) return;

    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;

    [...nav.children].forEach((dot, i) =>
      dot.classList.toggle("active", i === current)
    );
  }

  // Keyboard navigation
  function handleKeyPress(e) {
    if (e.key === "ArrowRight") updateCarousel(current + 1);
    if (e.key === "ArrowLeft") updateCarousel(current - 1);
  }

  // Touch swipe support
  let startX = 0;
  function handleTouchStart(e) {
    startX = e.touches[0].clientX;
  }
  function handleTouchEnd(e) {
    const diff = e.changedTouches[0].clientX - startX;
    if (Math.abs(diff) > 50) {
      if (diff < 0) updateCarousel(current + 1);
      else updateCarousel(current - 1);
    }
  }

  // Wait until worlds are rendered
  const observer = new MutationObserver(() => {
    const slides = track.children;
    if (!slides.length) return;

    track.style.display = "flex";
    track.style.transition = "transform 0.6s ease";
    track.style.width = `${slides.length * 100}%`;

    [...slides].forEach(slide => {
      slide.style.width = "100%";
      slide.style.flexShrink = "0";
    });

    // Build nav dots
    nav.innerHTML = "";
    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement("button");
      dot.addEventListener("click", () => updateCarousel(i));
      nav.appendChild(dot);
    }

    updateCarousel(0);
  });

  observer.observe(track, { childList: true });

  document.addEventListener("keydown", handleKeyPress);
  track.addEventListener("touchstart", handleTouchStart);
  track.addEventListener("touchend", handleTouchEnd);

  console.log("[Carousel] Initialized");
};
