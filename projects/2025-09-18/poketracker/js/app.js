(async function () {
  const $ = (sel) => document.querySelector(sel);

  async function loadDemo() {
    const res = await fetch("./poketracker-demo.json", { cache: "no-store" });
    return res.ok ? res.json() : [];
  }

  function renderList(rows) {
    const list = rows
      .slice(0, 5)
      .map((r, i) => `
        <li class="demo-row">
          <span class="rank">#${i+1}</span>
          <span class="name">${r.pokemon}</span>
          <span class="score">${r.score}</span>
        </li>
      `).join("");

    $("#top-list").innerHTML = list || `<li class="muted">No data.</li>`;
    $("#demo-week").textContent = rows[0]?.week || "—";
  }

  const data = await loadDemo();
  renderList(data);
})();
