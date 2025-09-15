window.addEventListener("DOMContentLoaded", () => {
  const gameEl = document.getElementById("game");

  // Placeholder Pokémon data
  const pokemon = [
    { name: "Bulbasaur", stat: 45 },
    { name: "Charmander", stat: 39 },
    { name: "Squirtle", stat: 44 }
  ];

  // Render Pokémon cards (stats hidden)
  pokemon.forEach(p => {
    const card = document.createElement("div");
    card.className = "pokemon-card";
    card.textContent = p.name;
    card.draggable = true;
    gameEl.appendChild(card);

    // Store stat for later
    card.dataset.stat = p.stat;
  });

  // Add Lock-In button
  const button = document.createElement("button");
  button.textContent = "Lock In";
  button.className = "lock-btn";
  gameEl.appendChild(button);

  // Drag & drop support
  let dragged;
  gameEl.addEventListener("dragstart", e => {
    if (e.target.classList.contains("pokemon-card")) {
      dragged = e.target;
      e.target.classList.add("dragging");
    }
  });
  gameEl.addEventListener("dragend", e => {
    if (dragged) dragged.classList.remove("dragging");
  });
  gameEl.addEventListener("dragover", e => {
    e.preventDefault();
    const afterElement = getDragAfterElement(gameEl, e.clientY);
    if (afterElement == null) {
      gameEl.insertBefore(dragged, button); // drop before button
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
      name: c.textContent,
      stat: parseInt(c.dataset.stat, 10)
    }));

    // Reveal stats
    cards.forEach(c => {
      c.textContent = `${c.textContent} (Stat: ${c.dataset.stat})`;
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
