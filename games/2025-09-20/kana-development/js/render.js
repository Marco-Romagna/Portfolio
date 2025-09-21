function renderWorlds(worlds) {
  const root = document.getElementById("worlds-root");
  const worldTpl = document.getElementById("tpl-world");
  const levelTpl = document.getElementById("tpl-level-card");
  root.innerHTML = "";

  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    wNode.querySelector(".world-title").textContent = w.title;
    wNode.querySelector(".world-desc").textContent = w.desc;

    const grid = wNode.querySelector(".levels-grid");
    w.levels.forEach(lv => {
      const lNode = levelTpl.content.cloneNode(true);

      // Card link targets
      const thumb = lNode.querySelector(".card-thumb");
      const title = lNode.querySelector(".card-title");
      thumb.href = lv.href;
      title.href = lv.href;
      title.textContent = lv.title;

      // Text-based thumbnail (kana or fallback to code)
      const mark = lNode.querySelector(".no-thumb-mark");
      mark.textContent = lv.thumb || lv.code;

      // Tags
      const tagsWrap = lNode.querySelector(".card-tags");
      (lv.tags || []).forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tagsWrap.appendChild(span);
      });

      // Description
      lNode.querySelector(".desc").textContent = lv.desc;

      grid.appendChild(lNode);
    });

    root.appendChild(wNode);
  });
}

// expose globally if needed
window.renderWorlds = renderWorlds;
