// render.js — header-only rows, whole row navigates to lv.href
function renderWorlds(worlds) {
  const root = document.getElementById("worlds-root");
  const worldTpl = document.getElementById("tpl-world");
  const rowTpl = document.getElementById("tpl-level-row");
  root.innerHTML = "";

  worlds.forEach(w => {
    const wNode = worldTpl.content.cloneNode(true);
    wNode.querySelector(".world-title").textContent = w.title;
    wNode.querySelector(".world-desc").textContent = w.desc || "";
    const list = wNode.querySelector(".levels-list");

    (w.levels || []).forEach(lv => {
      const node = rowTpl.content.cloneNode(true);

      // Bits we keep
      const head  = node.querySelector(".level-head");
      const icon  = node.querySelector(".level-icon");
      const title = node.querySelector(".level-title");
      
      // If a special class was set in stages.js, apply it
      if (lv.class) {
        icon.classList.add(lv.class);
      }
      // Optional bits we remove (collapse UI)
      node.querySelector(".level-body")?.remove();
      node.querySelector(".chev")?.remove();

      // Fill header
      icon.textContent = lv.thumb || lv.code || "";
      title.textContent = lv.title || lv.code || "";

      // Make the entire header act like a link
      const href = lv.href || "#";
      head.setAttribute("role", "link");
      head.setAttribute("aria-expanded", "false"); // no accordion behavior
      head.tabIndex = 0;
      if (href && href !== "#") head.title = `Open: ${lv.title || lv.code}`;

      // Click/keyboard navigate
      function go() {
        if (href && href !== "#") window.location.href = href;
      }
      head.addEventListener("click", go);
      head.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          go();
        }
      });

      list.appendChild(node);
    });

    root.appendChild(wNode);
  });
}

window.renderWorlds = renderWorlds;
