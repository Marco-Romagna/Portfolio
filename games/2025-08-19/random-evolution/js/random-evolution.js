window.addEventListener("DOMContentLoaded", () => {
  (async function () {
    // Debug toggle (same behavior as before)
    const qp = new URLSearchParams(location.search).get("debug");
    const stored = localStorage.getItem("revo_debug");
    let DEBUG = true;
    if (qp === "1" || stored === "1") DEBUG = true;
    if (qp === "0" || stored === "0") DEBUG = false;

    window.revoDebug = {
      on()    { localStorage.setItem("revo_debug","1"); location.reload(); },
      off()   { localStorage.setItem("revo_debug","0"); location.reload(); },
      toggle(){ (localStorage.getItem("revo_debug")==="1") ? this.off() : this.on(); },
      state(){ return { DEBUG, qp, stored }; }
    };

    window.Revo?.Game.boot(DEBUG);
    await window.Revo?.Game.init();
  })();
});
