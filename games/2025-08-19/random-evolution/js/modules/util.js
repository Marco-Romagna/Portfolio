(function(){
  const root = window.Revo = window.Revo || {};

  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
  function now(){ return performance.now(); }
  function cap(s){ return s ? s[0].toUpperCase() + s.slice(1) : "—"; }

  function randInt(min, max){ return Math.floor(Math.random() * (max - min + 1)) + min; }
  function preloadImage(url){
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(true);
      im.onerror = reject;
      im.src = url;
    });
  }

  root.Util = { sleep, now, cap, randInt, preloadImage };
})();
