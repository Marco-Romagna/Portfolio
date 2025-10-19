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
    // Add translateZ(0) to fix Chrome seam issue
    track.style.transform = `translateX(-${current * 100}%) translateZ(0)`;

    // Update carousel dots
    [...nav.children].forEach((dot, i) =>
      dot.classList.toggle("active", i === current)
    );

    // Highlight the quick-jump button
    const jumpButtons = document.querySelectorAll(".world-nav-buttons button");
    jumpButtons.forEach((btn, i) =>
      btn.classList.toggle("active", i === current)
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
    track.style.willChange = "transform";
    track.style.backfaceVisibility = "hidden";
    track.style.transformStyle = "preserve-3d";

    [...slides].forEach(slide => {
      slide.style.flex = "0 0 100%";
      slide.style.maxWidth = "100%";
      slide.style.boxSizing = "border-box";
      slide.style.backfaceVisibility = "hidden";
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

  // ==========================================================
  // Quick world jump buttons (1–10 navigation)
  // ==========================================================
  const jumpButtons = document.querySelectorAll(".world-nav-buttons button");
  if (jumpButtons.length) {
    jumpButtons.forEach((btn, i) => {
      btn.addEventListener("click", () => {
        updateCarousel(i);
      });
    });
  }
};
