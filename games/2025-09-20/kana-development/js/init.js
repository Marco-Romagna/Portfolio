// ==========================================================
// init.js — initialize world carousel once data is ready
// ==========================================================
window.addEventListener("DOMContentLoaded", () => {
  // Wait for both stages + render.js to be loaded
  if (!window.WORLDS || !window.renderWorlds) {
    console.warn("[Init] Worlds or render function not ready yet.");
    return;
  }

  // Render the worlds inside the track
  const track = document.getElementById("worlds-track");
  if (track) {
    // Clear and render each world as a slide
    track.innerHTML = "";
    window.WORLDS.forEach(world => {
      const slide = document.createElement("div");
      slide.className = "world-panel";
      slide.innerHTML = `
        <h2>${world.title}</h2>
        <p>${world.desc}</p>
        <div class="world-buttons">
          ${(world.levels || [])
            .map(
              lv => `<a href="${lv.href}" class="btn">${lv.thumb || lv.title}</a>`
            )
            .join("")}
        </div>
      `;
      track.appendChild(slide);
    });

    console.log(`[Init] Rendered ${window.WORLDS.length} worlds in carousel`);
  }

  // Start the carousel behavior
  if (typeof window.initCarousel === "function") {
    window.initCarousel();
  } else {
    console.warn("[Init] Carousel script not found or not loaded yet.");
  }
});
