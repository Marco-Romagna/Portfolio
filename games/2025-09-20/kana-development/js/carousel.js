

document.addEventListener("DOMContentLoaded", () => {
  const track = document.getElementById("worlds-track");
  const nav = document.getElementById("carousel-nav");
  let current = 0;

  // Move to a specific world index
  function updateCarousel(index) {
    const slides = track.children;
    if (!slides.length) return;

    current = (index + slides.length) % slides.length;
    track.style.transform = `translateX(-${current * 100}%)`;

    // Update active nav dot
    [...nav.children].forEach((dot, i) =>
      dot.classList.toggle("active", i === current)
    );
  }

  // Add keyboard & swipe navigation
  function handleKeyPress(e) {
    if (e.key === "ArrowRight") updateCarousel(current + 1);
    if (e.key === "ArrowLeft") updateCarousel(current - 1);
  }

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

  // Wait for worlds to load dynamically
  const observer = new MutationObserver(() => {
    const slides = track.children;
    if (!slides.length) return;

    // Prepare carousel layout
    track.style.display = "flex";
    track.style.transition = "transform 0.6s ease";
    track.style.width = `${slides.length * 100}%`;

    [...slides].forEach(slide => {
      slide.style.width = "100%";
      slide.style.flexShrink = "0";
    });

    // Rebuild navigation dots
    nav.innerHTML = "";
    for (let i = 0; i < slides.length; i++) {
      const dot = document.createElement("button");
      dot.addEventListener("click", () => updateCarousel(i));
      nav.appendChild(dot);
    }

    // Initialize
    updateCarousel(0);
  });

  observer.observe(track, { childList: true });

  // Input listeners
  document.addEventListener("keydown", handleKeyPress);
  track.addEventListener("touchstart", handleTouchStart);
  track.addEventListener("touchend", handleTouchEnd);
});
