(function init() {
  // footer year
  const y = document.getElementById("year");
  if (y) y.textContent = new Date().getFullYear();

  // merge (world level codes → level objects) then render
  const { worlds, levels } = window.KANA_STAGES;
  const index = Object.fromEntries(levels.map(l => [l.code, l]));
  const merged = worlds.map(w => ({
    ...w,
    levels: (w.levels || []).map(code => index[code]).filter(Boolean)
  }));

  window.renderWorlds(merged);
})();
