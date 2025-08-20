// Load settings and wire basic random-swap behavior

(async function () {
  // Elements
  const img = document.getElementById("pokemon-sprite");
  const btn = document.getElementById("evolve-btn");

  // Fetch settings
  const res = await fetch("settings.json", { cache: "no-store" });
  const settings = await res.json();
  const base = settings.sprites.base_url;
  const ext = settings.sprites.file_extension || ".png";
  const start = settings.sprites.range.start || 1;
  const end = settings.sprites.range.end || 1025;

  let currentId = null;

  // Helpers
  const randId = () => Math.floor(Math.random() * (end - start + 1)) + start;

  const pickOther = () => {
    let id = randId();
    if (currentId === null) return id;
    while (id === currentId) id = randId();
    return id;
  };

  const show = (id) => {
    img.src = `${base}${id}${ext}`;
    img.alt = `Pokémon #${id}`;
    currentId = id;
  };

  // Init
  show(randId());

  // Button
  btn?.addEventListener("click", () => {
    show(pickOther());
  });
})();
