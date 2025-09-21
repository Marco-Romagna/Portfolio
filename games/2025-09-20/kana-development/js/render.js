function renderWorlds(worlds) {
  const root = document.getElementById("worlds-root");
  const worldTpl = document.getElementById("tpl-world");
  const rowTpl = document.getElementById("tpl-level-row");
  root.innerHTML = "";

  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    wNode.querySelector(".world-title").textContent = w.title;
    wNode.querySelector(".world-desc").textContent = w.desc;

    const list = wNode.querySelector(".levels-list");

    w.levels.forEach(lv => {
      const node = rowTpl.content.cloneNode(true);

      // Header bits
      const head = node.querySelector(".level-head");
      const icon = node.querySelector(".level-icon");
      const title = node.querySelector(".level-title");
      const body  = node.querySelector(".level-body");
      const btnStart = node.querySelector('[data-role="start"]');

      icon.textContent = lv.thumb || lv.code;   // kana or fallback
      title.textContent = lv.title;
      btnStart.href = lv.href;

      // Expanded content
      const media = node.querySelector(".level-thumb");
      const desc  = node.querySelector(".level-desc");
      const tags  = node.querySelector(".level-tags");

      desc.textContent = lv.desc || "";

      // If you add lv.image (e.g. "assets/levels/1-1.png") we use <img>, else big kana
      if (lv.image && /\.(png|jpe?g|gif|svg)$/i.test(lv.image)) {
        media.classList.remove("kana-thumb");
        const img = document.createElement("img");
        img.src = lv.image;
        img.alt = lv.title;
        media.appendChild(img);
      } else {
        media.classList.add("kana-thumb");
        media.setAttribute("data-kana", lv.thumb || lv.code);
      }

      // Tags only in expanded view
      (lv.tags || []).forEach(t => {
        const span = document.createElement("span");
        span.className = "tag";
        span.textContent = t;
        tags.appendChild(span);
      });

      // Accordion toggle
      head.addEventListener("click", () => {
        const expanded = head.getAttribute("aria-expanded") === "true";
        head.setAttribute("aria-expanded", String(!expanded));
        body.hidden = expanded;
      });

      list.appendChild(node);
    });

    root.appendChild(wNode);
  });
}

window.renderWorlds = renderWorlds;
