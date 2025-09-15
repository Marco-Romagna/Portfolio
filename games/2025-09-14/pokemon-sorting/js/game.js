window.addEventListener("DOMContentLoaded", () => {
  const gameEl = document.getElementById("game");

  // Placeholder Pokémon data (using official sprite URLs for demo)
  const pokemon = [
    { name: "Bulbasaur", stat: 45, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/1.png" },
    { name: "Charmander", stat: 39, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/4.png" },
    { name: "Squirtle", stat: 44, img: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/7.png" }
  ];

  // Render Pokémon cards (image only)
  pokemon.forEach(p => {
    const card = document.createElement("div");
    card.className = "pokemon-card";
    card.draggable = true;

    const img = document.createElement("img");
    img.src = p.img;
    img.alt = p.name;

    card.appendChild(img);
    gameEl.appendChild(card);

    // Store hidden data for later
    card.dataset.name = p.name;
    card.dataset.stat = p.stat;
  });

  // Add Lock-In button
  const button = document.createElement("button");
  button.textContent = "Lock In";
  button.className = "lock-btn";
  gameEl.appendChild(button);

  // Drag & drop
  let dragged;
  gameEl.addEventListener("dragstart", e => {
    if (e.target.closest(".pokemon-card")) {
      dragged = e.target.closest(".pokemon-card");
      dragged.classList.add("dragging");
    }
  });
  gameEl.addEventListener("dragend", () => {
    if (dragged) dragged.classList.remove("dragging");
  });
  gameEl.addEventListener("dragover", e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(gameEl, e.clientY);
    if (afterElement == null) {
      gameEl.insertBefore(dragged, button);
    } else {
      gameEl.insertBefore(dragged, afterElement);
    }
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll(".pokemon-card:not(.dragging)")];
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > closest.offset) {
        return { offset: offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  // Lock-in logic
  button.addEventListener("click", () => {
    const cards = [...document.querySelectorAll(".pokemon-card")];
    const order = cards.map(c => ({
      name: c.dataset.name,
      stat: parseInt(c.dataset.stat, 10)
    }));

    // Reveal stats + names
    cards.forEach(c => {
      c.innerHTML = `
        <img src="${c.querySelector("img").src}" alt="${c.dataset.name}">
        <p>${c.dataset.name} (Stat: ${c.dataset.stat})</p>
      `;
    });

    // Check correctness (descending order)
    let correct = true;
    for (let i = 0; i < order.length - 1; i++) {
      if (order[i].stat < order[i + 1].stat) correct = false;
    }

    if (correct) {
      alert("✅ Correct order!");
    } else {
      alert("❌ Incorrect order. Try again!");
    }
  });
});
