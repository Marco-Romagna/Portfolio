(function(){
  const root = window.Revo = window.Revo || {};
  const VOL_KEY = 'revo_volume';
  const MUTE_KEY= 'revo_muted';

  const AudioMgr = (() => {
    let ctx = null;
    let okEl = null, badEl = null;
    let muted = localStorage.getItem(MUTE_KEY) === '1';
    let volume = parseFloat(localStorage.getItem(VOL_KEY) ?? '0.5');
    if (isNaN(volume)) volume = 0.5;

    function ensureCtx(){
      if (!ctx) {
        try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e){}
      }
    }
    function loadTag(src){
      const a = new Audio();
      a.src = src;
      a.preload = 'auto';
      a.volume = muted ? 0 : volume;
      return a;
    }
    function init() {
      if (!okEl)  okEl  = loadTag('./assets/sfx/correct.mp3');
      if (!badEl) badEl = loadTag('./assets/sfx/wrong.mp3');
    }
    function setMuted(m){
      muted = !!m;
      localStorage.setItem(MUTE_KEY, m ? '1' : '0');
      if (okEl)  okEl.volume  = muted ? 0 : volume;
      if (badEl) badEl.volume = muted ? 0 : volume;
    }
    function setVolume(v){
      volume = Math.max(0, Math.min(1, Number(v)||0));
      localStorage.setItem(VOL_KEY, String(volume));
      if (okEl)  okEl.volume  = muted ? 0 : volume;
      if (badEl) badEl.volume = muted ? 0 : volume;
    }
    function beep(freq=880, durMs=140, type='sine'){
      if (muted) return;
      ensureCtx();
      if (!ctx) return;
      const g = ctx.createGain();
      g.gain.value = 0.09 * volume;
      g.connect(ctx.destination);
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.connect(g);
      o.start();
      setTimeout(()=>{ o.stop(); g.disconnect(); }, durMs);
    }
    function playOK(){
      if (okEl && okEl.readyState > 0) { try{ okEl.currentTime=0; okEl.play(); }catch{} }
      else beep(1040,130,'sine');
    }
    function playBad(){
      if (badEl && badEl.readyState > 0) { try{ badEl.currentTime=0; badEl.play(); }catch{} }
      else beep(220,170,'square');
    }
    return { init, setMuted, setVolume, playOK, playBad,
      get muted(){return muted}, get volume(){return volume} };
  })();

  function injectVolumeUI(audioRow){
    if (!audioRow) return;
    document.querySelectorAll('[data-revo-audio-ui]').forEach(n => n.remove());

    const wrap = document.createElement('span');
    wrap.setAttribute('data-revo-audio-ui','');
    wrap.style.display = 'inline-flex';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '8px';
    wrap.style.marginLeft = '8px';

    const btn = document.createElement('button');
    btn.textContent = AudioMgr.muted ? '🔇' : '🔊';
    btn.title = 'Toggle sound (M)';
    btn.className = 'mode-btn';
    btn.style.padding = '2px 8px';
    btn.style.fontSize = '12px';

    const rng = document.createElement('input');
    rng.type = 'range';
    rng.min = '0'; rng.max = '1'; rng.step = '0.05';
    rng.value = String(AudioMgr.volume);
    rng.title = 'Volume';
    rng.style.width = '140px';

    btn.addEventListener('click', () => {
      AudioMgr.setMuted(!AudioMgr.muted);
      btn.textContent = AudioMgr.muted ? '🔇' : '🔊';
    });
    rng.addEventListener('input', () => AudioMgr.setVolume(rng.value));

    wrap.appendChild(btn);
    wrap.appendChild(rng);
    audioRow.appendChild(wrap);

    window.addEventListener('keydown', (e)=>{
      if (e.key.toLowerCase() === 'm') { btn.click(); }
    });
  }

  root.Audio = { AudioMgr, injectVolumeUI };
})();
