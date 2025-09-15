// games/2025-09-14/pokemon-sorting/js/game.js
// Pokémon Sorting — drag cards into DESCENDING order by the hidden stat.
// Names/stats are hidden until the player presses "Lock In".

window.addEventListener("DOMContentLoaded", () => {
  "use strict";

  const gameEl = document.getElementById("game");

  // --- Demo data (replace later with real JSON or a picker by gen/type) ---
  // Using PokeAPI static sprite URLs for convenience.
  const demoSet = [
    { name: "Bulbasaur",  stat: 45, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
    { name: "Charmander", stat: 39, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
    { name: "Squirtle",   stat: 44, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" }
  ];

  // Render one round
  renderRound(demoSet);

  // ====== Functions ======

  function renderRound(pokeList) {
    gameEl.innerHTML = ""; // clear

    // Cards wrapper (column)
    const list = document.createElement("div");
    list.className = "cards-wrap";
    gameEl.appendChild(list);

    // Create cards (image only; hide names/stats)
    pokeList.forEach(p => {
      const card = document.createElement("div");
      card.className = "pokemon-card";
      card.draggable = true;

      const img = document.createElement("img");
      img.src = p.img;
      img.alt = p.name;

      card.appendChild(img);
      list.appendChild(card);

      // Hidden data for later reveal/check
      card.dataset.name = p.name;
      card.dataset.stat = String(p.stat);
    });

    // Lock-in button
    const button = document.createElement("button");
    button.textContent = "Lock In";
    button.className = "lock-btn";
    gameEl.appendChild(button);

    // Result banner (added after button on demand)
    let banner = null;

    // Drag & drop behavior
    let dragged = null;

    list.addEventListener("dragstart", (e) => {
      const card = e.target.closest(".pokemon-card");
      if (!card) return;
      dragged = card;
      card.classList.add("dragging");
    });

    list.addEventListener("dragend", () => {
      if (dragged) dragged.classList.remove("dragging");
      dragged = null;
    });

    list.addEventListener("dragover", (e) => {
      e.preventDefault();
      const after = getDragAfterElement(list, e.clientY);
      if (!dragged) return;
      if (after == null) {
        list.appendChild(dragged);
      } else {
        list.insertBefore(dragged, after);
      }
    });

    // Handle lock-in
    let locked = false;
    button.addEventListener("click", () => {
      if (locked) return;
      locked = true;

      const cards = [...list.querySelectorAll(".pokemon-card")];

      // Reveal names + stats on each card
      cards.forEach(c => {
        const imgSrc = c.querySelector("img").src;
        const name   = c.dataset.name;
        const stat   = parseInt(c.dataset.stat, 10);
        c.innerHTML  = `
          <img src="${imgSrc}" alt="${name}">
          <p>${name} (Stat: ${stat})</p>
        `;
        c.draggable = false; // freeze layout after reveal
      });

      // Global correctness (descending, ties allowed)
      const stats = cards.map(c => parseInt(c.dataset.stat, 10));
      const globallyCorrect = stats.every((s, i, arr) => i === arr.length - 1 || s >= arr[i + 1]);

      // Per-card local correctness vs neighbors
      cards.forEach((c, i) => {
        const prev = i > 0 ? parseInt(cards[i - 1].dataset.stat, 10) : null;
        const cur  = parseInt(cards[i].dataset.stat, 10);
        const next = i < cards.length - 1 ? parseInt(cards[i + 1].dataset.stat, 10) : null;

        let good = true;
        if (prev !== null && prev < cur) good = false; // should not be greater than previous
        if (next !== null && cur < next) good = false; // next should not be greater than current

        c.classList.remove("good", "bad");
        c.classList.add(good ? "good" : "bad");
      });

      // Show banner result
      if (!banner) {
        banner = document.createElement("div");
        banner.className = "result-banner";
        button.insertAdjacentElement("afterend", banner);
      }
      banner.textContent = globallyCorrect ? "✅ Correct order!" : "❌ Not quite — check the red cards.";
    });
  }

  // Determine the element directly after the current mouse Y for insertion
  function getDragAfterElement(container, y) {
    const els = [...container.querySelectorAll(".pokemon-card:not(.dragging)")];
    return els.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      }
      return closest;
    }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
  }
});
