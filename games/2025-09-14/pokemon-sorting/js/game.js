
window.addEventListener("DOMContentLoaded", () => {
  const gameEl = document.getElementById("game");

  // Temporary sample data (replace with real Pokémon data later)
  const pokemon = [
    { name: "Bulbasaur", stat: 45 },
    { name: "Charmander", stat: 39 },
    { name: "Squirtle", stat: 44 }
  ];

  // Render Pokémon as draggable cards
  pokemon.forEach(p => {
    const card = document.createElement("div");
    card.className = "pokemon-card";
    card.textContent = `${p.name} (Stat: ${p.stat})`;
    gameEl.appendChild(card);
  });

  // TODO: Add drag & drop or sorting logic
  console.log("Pokémon Sorting game initialized.");
});
