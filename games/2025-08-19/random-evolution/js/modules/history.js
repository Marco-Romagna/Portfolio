(function(){
  const root = window.Revo = window.Revo || {};

  const History = {
    entries: [],
    capacity: 0,
    computeCapacity(historyWrap){
      if (!historyWrap) return 0;
      const wrapRect = historyWrap.getBoundingClientRect();
      const cs = getComputedStyle(document.documentElement);
      const thumb = parseFloat(cs.getPropertyValue('--hist-thumb')) || 40;
      const gap = parseFloat(cs.getPropertyValue('--hist-gap')) || 8;
      const labelH = 14;
      const tileH = thumb + labelH + gap;
      const padding = gap * 2;
      const innerHeight = wrapRect.height - padding;
      return Math.max(1, Math.floor(innerHeight / tileH));
    },
    trimDOM(track){
      const items = track?.querySelectorAll('.hist-item');
      if (!items) return;
      for (let i = items.length - 1; i >= this.capacity; i--) items[i]?.remove();
    },
    clear(dom){
      this.entries = [];
      if (dom.historyTrack) dom.historyTrack.innerHTML = "";
    },
    setCapacity(dom){
      const newCap = this.computeCapacity(dom.historyWrap);
      if (newCap !== this.capacity){
        this.capacity = newCap;
        this.trimDOM(dom.historyTrack);
        this.entries = this.entries.slice(0, this.capacity);
      }
    },
    push(dom, urlFor, entry /* {id, action, correct} */){
      const track = dom.historyTrack;
      if (!track || !entry) return;

      const item = document.createElement('div');
      item.className = 'hist-item';
      item.title = `#${entry.id} • ${entry.action === 'accept' ? 'Accepted' : 'Canceled'} • ${entry.correct ? 'Correct' : 'Incorrect'}`;

      const wrap = document.createElement('div');
      wrap.className = 'hist-imgwrap';
      wrap.setAttribute('data-action', entry.action);
      wrap.setAttribute('data-correct', entry.correct ? 'true' : 'false');

      const img = document.createElement('img');
      img.className = 'hist-thumb';
      img.alt = `#${entry.id} Pokémon`;
      img.src = urlFor(entry.id);

      wrap.appendChild(img);

      const label = document.createElement('div');
      label.className = 'hist-label';
      label.textContent = `#${entry.id}`;

      item.appendChild(wrap);
      item.appendChild(label);

      track.insertBefore(item, track.firstChild);
      this.entries.unshift(entry);

      const items = track.querySelectorAll('.hist-item');
      if (items.length > this.capacity) {
        for (let i = items.length - 1; i >= this.capacity; i--) items[i]?.remove();
        this.entries = this.entries.slice(0, this.capacity);
      }
    }
  };

  window.addEventListener('resize', () => requestAnimationFrame(() => History.setCapacity(window.Revo.DOM)));

  root.History = History;
})();
