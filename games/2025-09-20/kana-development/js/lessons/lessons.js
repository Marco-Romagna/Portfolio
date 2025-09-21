(() => {
  // ------- helpers -------
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const lesson = $('.lesson');
  if (!lesson) return;

  const lessonId   = lesson.dataset.lessonId || '1-1';
  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts      = $$('.lesson-part');
  const steps      = $$('.steps .step');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  // We use local buttons at the bottom; keep global CTA hidden
  const cta = $('.lesson-cta [data-action="advance"]');
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };

  const startBtn = $('#part-1 .actions [data-action="advance"]');

  // ------- data sets -------
  const H = ['あ','い','う','え','お'];
  const K = ['ア','イ','ウ','エ','オ'];
  const ROMA_ALL = {
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o'
  };
  const PAIR = { 'あ':'ア','い':'イ','う':'ウ','え':'エ','お':'オ', 'ア':'あ','イ':'い','ウ':'う','エ':'え','オ':'お' };

  let KANA = H;
  let ROMA = { 'あ':'a','い':'i','う':'u','え':'e','お':'o' };
  if (lessonId === '1-2') {
    KANA = K;
    ROMA = { 'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o' };
  } else if (lessonId === '1-3') {
    KANA = [...H, ...K]; // mixed
    ROMA = ROMA_ALL;
  }

  // ------- state -------
  let current   = 1;
  let part2Done = false;
  let part3Done = false;

  // ------- nav / progress -------
  function showPart(idx) {
    current = Math.min(Math.max(idx, 1), totalParts);

    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));

    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));

    hideCTA(); // always use local buttons
  }

  // --------------------------------------------
  // Part 1 — Preview (for 1-3, show pairs)
  // --------------------------------------------
  (function initPart1() {
    if (lessonId !== '1-3') return;
    const part1 = $('#part-1');
    if (!part1) return;
    const grid = $('.kana-grid', part1);
    if (!grid) return;

    const PAIRS = [
      { h:'あ', k:'ア', r:'a' },
      { h:'い', k:'イ', r:'i' },
      { h:'う', k:'ウ', r:'u' },
      { h:'え', k:'エ', r:'e' },
      { h:'お', k:'オ', r:'o' },
    ];

    grid.innerHTML = '';
    PAIRS.forEach(p => {
      const card = document.createElement('article');
      card.className = 'pair-card';
      card.innerHTML = `
        <div class="pair-row">
          <span class="glyph h">${p.h}</span>
          <span class="link">⇄</span>
          <span class="glyph k">${p.k}</span>
        </div>
        <div class="pair-romaji">${p.r}</div>
      `;
      grid.appendChild(card);
    });

    const title = $('#part-1 .part-title');
    if (title) title.textContent = 'Mixed Vowels — Preview';
  })();

  // Part 1 → Part 2
  startBtn?.addEventListener('click', () => showPart(2));

  // ==========================================================
  // Part 2 — Identify
  // 1-1/1-2: same-script identify to 15
  // 1-3: cross-script identify to 20 (H ↔ K counterpart)
  // Anti-repeat: no same prompt twice; no per-slot option repeats
  // Weighted by errors; lock each round (no correction)
  // ==========================================================
  const part2 = $('#part-2');
  if (part2) {
    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const promptText = $('.prompt-text', part2);
    const meter      = $('.quiz-progress .meter', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);
    const nextBtn    = $('[data-action="next-part"]', part2);

    const GOAL = (lessonId === '1-3') ? 20 : 15;
    let progressPts = 0;

    const THEMES = ['theme-dark', 'theme-light', 'theme-sepia', 'theme-high'];

    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    let lastPromptGlyph = null;
    let prevOptionAtIndex = [null, null, null, null];
    let roundLocked = false;

    function pickWeighted(map, avoid=null, tries=10) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [, w]) => s + w, 0);
      let best = entries[entries.length - 1][0];
      for (let t = 0; t < tries; t++) {
        let r = Math.random() * total;
        for (const [key, w] of entries) { r -= w; if (r <= 0) { best = key; break; } }
        if (!avoid || best !== avoid) return best;
      }
      return best;
    }

    function sample(arr, n) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a.slice(0, n);
    }

    function setFeedback(t) { if (feedback) feedback.textContent = t; }

    function updateMeter() {
      const clamped = Math.max(0, Math.min(GOAL, progressPts));
      const pct = Math.round((clamped / GOAL) * 100);
      meter?.setAttribute('aria-valuenow', String(clamped));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${clamped} / ${GOAL}`;
    }

    function arrangeOptionsNoSlotRepeat(opts) {
      const attempts = 50;
      for (let t = 0; t < attempts; t++) {
        const perm = sample(opts, opts.length);
        let ok = true;
        for (let i = 0; i < perm.length; i++) {
          if (prevOptionAtIndex[i] === perm[i]) { ok = false; break; }
        }
        if (ok) return perm;
      }
      // fallback swap
      const perm = [...opts];
      for (let i = 0; i < perm.length; i++) {
        if (perm[i] === prevOptionAtIndex[i]) {
          for (let j = i + 1; j < perm.length; j++) {
            if (perm[j] !== prevOptionAtIndex[i] && perm[i] !== prevOptionAtIndex[j]) {
              [perm[i], perm[j]] = [perm[j], perm[i]];
              break;
            }
          }
        }
      }
      return perm;
    }

    function pickPromptGlyph() {
      if (lessonId !== '1-3') {
        if (unseen.size > 0) {
          let choices = Array.from(unseen);
          if (choices.length > 1) choices = choices.filter(k => k !== lastPromptGlyph);
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return pickWeighted(weights, lastPromptGlyph);
      }
      // mixed: prompt from one script, answer from the other
      const pool = Math.random() < 0.5 ? H : K;
      const poolWeights = Object.fromEntries(pool.map(g => [g, weights[g] || 1]));
      const unseenPool = pool.filter(g => unseen.has(g));
      if (unseenPool.length) {
        let choices = unseenPool;
        if (choices.length > 1) choices = choices.filter(k => k !== lastPromptGlyph);
        return choices[Math.floor(Math.random()*choices.length)];
      }
      return pickWeighted(poolWeights, lastPromptGlyph);
    }

    function nextQuestion() {
      roundLocked = false;
      grid.innerHTML = '';

      const promptGlyph = pickPromptGlyph();
      lastPromptGlyph = promptGlyph;

      if (lessonId === '1-3') {
        const isH = H.includes(promptGlyph);
        const otherLabel = isH ? 'katakana' : 'hiragana';
        if (promptText) {
          promptText.innerHTML = `Which <strong>${otherLabel}</strong> matches <strong class="prompt-target">“${promptGlyph}”</strong>?`;
        }
      } else {
        if (promptEl) {
          promptEl.dataset.type = 'romaji';
          promptEl.textContent = `“${ROMA[promptGlyph]}”`;
        }
      }

      // Build options
      let options = [];
      if (lessonId === '1-3') {
        const correct = PAIR[promptGlyph];
        const pool = H.includes(promptGlyph) ? K : H;
        const distractors = sample(pool.filter(g => g !== correct), 3);
        options = [correct, ...distractors];
      } else {
        const correct = promptGlyph;
        const others  = sample(KANA.filter(k => k !== correct), 3);
        options = [correct, ...others];
      }

      const orderedOptions = arrangeOptionsNoSlotRepeat(options);
      const shuffledThemes = ['theme-dark','theme-light','theme-sepia','theme-high'].sort(() => Math.random() - 0.5);

      orderedOptions.forEach((glyph, i) => {
        const b = document.createElement('button');
        b.className = `option ${shuffledThemes[i % shuffledThemes.length]}`;
        b.dataset.value = glyph;
        b.textContent = glyph;
        b.addEventListener('click', () => onPick(glyph, promptGlyph, b));
        grid.appendChild(b);
      });

      prevOptionAtIndex = orderedOptions.slice();
      setFeedback('Pick the right one to continue…');
    }

    function onPick(choice, promptGlyph, btn) {
      if (roundLocked) return;
      roundLocked = true;

      const all = $$('.option', part2);
      all.forEach(b => { b.classList.add('is-disabled'); b.disabled = true; });

      let isCorrect = false;
      if (lessonId === '1-3') {
        isCorrect = (choice === PAIR[promptGlyph]);
      } else {
        isCorrect = (choice === promptGlyph);
      }

      if (isCorrect) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');

        const GOAL = (lessonId === '1-3') ? 20 : 15;
        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(promptGlyph);

        if (lessonId === '1-3') {
          const counterpart = PAIR[promptGlyph];
          if (weights[promptGlyph]  !== undefined) weights[promptGlyph]  = Math.max(1, weights[promptGlyph]  - 1);
          if (weights[counterpart]  !== undefined) weights[counterpart]  = Math.max(1, weights[counterpart]  - 1);
        } else {
          weights[promptGlyph] = Math.max(1, weights[promptGlyph] - 1);
        }

        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            part2Done = true;
            nextBtn?.classList.remove('is-hidden');
            setFeedback('Part complete! Tap Next to continue.');
          } else {
            nextQuestion();
          }
        }, 360);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');

        progressPts = Math.max(0, progressPts - 1);
        if (lessonId === '1-3') {
          const counterpart = PAIR[promptGlyph];
          if (weights[promptGlyph]  !== undefined) weights[promptGlyph]  = (weights[promptGlyph]  || 1) + 2;
          if (weights[counterpart]  !== undefined) weights[counterpart]  = (weights[counterpart]  || 1) + 2;
        } else {
          weights[promptGlyph] = (weights[promptGlyph] || 1) + 2;
        }
        updateMeter();

        setTimeout(() => { nextQuestion(); }, 480);
      }
    }

    nextBtn?.addEventListener('click', () => showPart(3));

    progressPts = 0; updateMeter(); nextQuestion();
  }

  // ==========================================================
  // Part 3 — Type (romaji) with COMBO MODE
  // Goals: 1-1/1-2 → 15 (combos start at 10), 1-3 → 20 (combos start at 10; last 10)
  // No same glyph twice in a row (single mode); weighted by mistakes
  // Combo mode: 3 kana displayed together (same style); user can type the
  // full remaining string OR one-by-one across Enter presses. Never repeat
  // the exact previous combo. For ALL lessons: 3 are DISTINCT.
  // For 1-3: combo must include at least 1 hiragana and 1 katakana.
  // ==========================================================
  const part3 = $('#part-3');
  if (part3) {
    const wrapper    = $('.type-glyph-wrapper', part3);
    const input      = $('#type-input', part3);
    const meter      = $('.quiz-progress .meter', part3);
    const meterFill  = $('.quiz-progress .meter-fill', part3);
    const meterLabel = $('.quiz-progress .meter-label', part3);

    // local action button
    let actionBtn = $('[data-action="next-part"]', part3);
    if (!actionBtn) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      actionBtn = document.createElement('button');
      actionBtn.className = 'btn primary is-hidden';
      actionBtn.dataset.action = 'next-part';
      actionBtn.textContent = 'Next';
      actions.appendChild(actionBtn);
      part3.appendChild(actions);
    } else {
      actionBtn.textContent = 'Next';
      actionBtn.classList.add('is-hidden');
    }

    const GOAL = (lessonId === '1-3') ? 20 : 15;
    // IMPORTANT: 1-3 uses last 10 points for combos; others last 5
    const COMBO_THRESHOLD = (lessonId === '1-3') ? (GOAL - 10) : (GOAL - 5);

    let progressPts = 0;
    let roundLocked = false;
    let lastKana = null;

    // Combo state
    let comboActive = false;
    let comboSeq = [];       // array of 3 kana
    let comboIdx = 0;        // 0..2
    let lastComboKey = null; // prevent exact repeat

    // weights + unseen
    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];

    function pickWeighted(map, avoid=null, tries=10) {
      const entries = Object.entries(map);
      const total = entries.reduce((s, [,w]) => s + w, 0);
      let best = entries[entries.length - 1][0];
      for (let t = 0; t < tries; t++) {
        let r = Math.random() * total;
        for (const [key, w] of entries) { r -= w; if (r <= 0) { best = key; break; } }
        if (!avoid || best !== avoid) return best;
      }
      return best;
    }

    function updateMeter() {
      const clamped = Math.max(0, Math.min(GOAL, progressPts));
      const pct = Math.round((clamped / GOAL) * 100);
      meter?.setAttribute('aria-valuenow', String(clamped));
      if (meterFill) meterFill.style.width = `${pct}%`;
      if (meterLabel) meterLabel.textContent = `Progress: ${clamped} / ${GOAL}`;
    }

    function setThemeRandom() {
      if (!wrapper) return;
      wrapper.classList.remove('theme-dark','theme-light','theme-sepia','theme-high');
      const pick = THEMES[Math.floor(Math.random() * THEMES.length)];
      wrapper.classList.add(pick);
    }

    function renderGlyph(kana) {
      wrapper.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'kana-glyph type-glyph';
      span.dataset.currentKana = kana;
      span.textContent = kana;
      wrapper.appendChild(span);
    }

    // Helpers to detect script
    function isHiragana(ch) {
      const code = ch.charCodeAt(0);
      return code >= 0x3040 && code <= 0x309F;
    }
    function isKatakana(ch) {
      const code = ch.charCodeAt(0);
      return (code >= 0x30A0 && code <= 0x30FF) || (code >= 0x31F0 && code <= 0x31FF);
    }

    // --- single pick with no immediate repeat ---
    function pickNextKana() {
      const unseenArr = Array.from(unseen);
      if (unseenArr.length) {
        let choices = unseenArr;
        if (choices.length > 1) choices = choices.filter(k => k !== lastKana);
        return choices[Math.floor(Math.random()*choices.length)];
      }
      return pickWeighted(weights, lastKana);
    }

    // --- combo generation:
    //   • ALL lessons: 3 DISTINCT kana (no duplicates anywhere)
    //   • 1-3: must include at least 1 hiragana and 1 katakana
    //   • first avoids lastKana
    //   • not equal to lastComboKey
    function makeCombo() {
      const needMixedScripts = (lessonId === '1-3');
      for (let attempt = 0; attempt < 80; attempt++) {
        // first avoids lastKana
        const pool = [...KANA];
        const firstChoices = pool.filter(k => k !== lastKana);
        const first = firstChoices[Math.floor(Math.random() * firstChoices.length)];

        // pick remaining two from remaining pool (to force all distinct)
        const remaining1 = pool.filter(k => k !== first);
        const second = remaining1[Math.floor(Math.random() * remaining1.length)];
        const remaining2 = remaining1.filter(k => k !== second);
        const third  = remaining2[Math.floor(Math.random() * remaining2.length)];

        const seq = [first, second, third];

        // enforce "distinct" for ALL lessons
        if (new Set(seq).size !== 3) continue;

        // for 1-3, require at least one H and one K
        if (needMixedScripts) {
          const hasH = seq.some(isHiragana);
          const hasK = seq.some(isKatakana);
          if (!hasH || !hasK) continue;
        }

        const key = seq.join('');
        if (key === lastComboKey) continue;

        return { seq, key };
      }
      // Fallback: best-effort distinct trio
      const distinct = [...new Set(KANA)];
      const seq = distinct.slice(0, 3);
      return { seq, key: seq.join('') };
    }

    // render combo (all same color/fonts; spaced clearly)
    function renderComboDisplay() {
      const cont = document.createElement('div');
      cont.className = 'combo-seq';
      cont.style.display = 'flex';
      cont.style.gap = '18px';
      cont.style.alignItems = 'center';
      comboSeq.forEach(k => {
        const s = document.createElement('span');
        s.className = 'kana-glyph type-glyph';
        s.textContent = k;
        cont.appendChild(s);
      });
      wrapper.innerHTML = '';
      wrapper.appendChild(cont);
    }

    function startComboRound() {
      const { seq, key } = makeCombo();
      comboActive = true;
      comboSeq = seq;
      comboIdx = 0;
      lastComboKey = key;

      setThemeRandom();
      renderComboDisplay();

      lastKana = comboSeq[0];
      input.focus();
    }

    function startSingleRound() {
      comboActive = false;
      input.classList.remove('is-locked');
      input.value = '';

      const kana = pickNextKana();
      setThemeRandom();
      renderGlyph(kana);
      lastKana = kana;

      input.focus();
    }

    function newRound() {
      roundLocked = false;
      input.classList.remove('is-locked');
      input.value = '';

      if (progressPts >= COMBO_THRESHOLD) {
        startComboRound();
      } else {
        startSingleRound();
      }
    }

    function expectedComboRemaining() {
      return comboSeq.slice(comboIdx).map(k => ROMA[k]).join('');
    }

    function evaluate() {
      if (roundLocked) return;
      const val = (input.value || '').trim().toLowerCase();
      if (!val) return;

      roundLocked = true;
      input.classList.add('is-locked');

      if (!comboActive) {
        // single-kana
        const currentSpan = wrapper.querySelector('.type-glyph');
        const kana = currentSpan?.dataset.currentKana || currentSpan?.textContent || '';
        const expected = ROMA[kana];

        if (val === expected) {
          progressPts = Math.min(GOAL, progressPts + 1);
          unseen.delete(kana);
          weights[kana] = Math.max(1, (weights[kana] || 1) - 1);
          updateMeter();

          setTimeout(() => {
            if (progressPts >= GOAL) {
              part3Done = true;
              actionBtn?.classList.remove('is-hidden');
            } else {
              newRound();
            }
          }, 200);
        } else {
          progressPts = Math.max(0, progressPts - 1);
          weights[kana] = (weights[kana] || 1) + 2;
          updateMeter();
          setTimeout(() => { newRound(); }, 320);
        }
      } else {
        // combo mode: accept full remaining string OR step-by-step
        const currentKana = comboSeq[comboIdx];
        const expectedOne = ROMA[currentKana];
        const expectedAll = expectedComboRemaining();

        if (val === expectedAll) {
          // whole remaining combo correct
          comboActive = false;
          comboSeq.forEach(k => {
            unseen.delete(k);
            weights[k] = Math.max(1, (weights[k] || 1) - 1);
          });
          progressPts = Math.min(GOAL, progressPts + 1);
          updateMeter();

          setTimeout(() => {
            if (progressPts >= GOAL) {
              part3Done = true;
              actionBtn?.classList.remove('is-hidden');
            } else {
              newRound();
            }
          }, 200);
        } else if (val === expectedOne) {
          // step-by-step advancement
          comboIdx += 1;
          if (comboIdx < 3) {
            renderComboDisplay();
            lastKana = comboSeq[comboIdx];
            setTimeout(() => {
              roundLocked = false;
              input.classList.remove('is-locked');
              input.value = '';
              input.focus();
            }, 100);
          } else {
            comboActive = false;
            comboSeq.forEach(k => {
              unseen.delete(k);
              weights[k] = Math.max(1, (weights[k] || 1) - 1);
            });
            progressPts = Math.min(GOAL, progressPts + 1);
            updateMeter();

            setTimeout(() => {
              if (progressPts >= GOAL) {
                part3Done = true;
                actionBtn?.classList.remove('is-hidden');
              } else {
                newRound();
              }
            }, 200);
          }
        } else {
          // wrong
          weights[currentKana] = (weights[currentKana] || 1) + 2;
          progressPts = Math.max(0, progressPts - 1);
          updateMeter();
          comboActive = false;
          setTimeout(() => { newRound(); }, 320);
        }
      }
    }

    // Enter submits; no other buttons
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        evaluate();
      }
    });

    // Next → Part 4
    actionBtn?.addEventListener('click', () => showPart(4));

    progressPts = 0; updateMeter(); newRound();
  }

  // ==========================================================
  // Part 4 — Speak (placeholder for ALL lessons for now)
  // ==========================================================
  const part4 = $('#part-4');
  if (part4) {
    const panel = $('.speak-panel', part4);
    if (panel) {
      const sampleGlyph =
        lessonId === '1-2' ? 'ア' :
        lessonId === '1-3' ? (Math.random() < 0.5 ? 'あ' : 'ア') :
        'あ';
      panel.innerHTML = `
        <div class="speak-placeholder" style="
          display:grid;
          place-items:center;
          gap:10px;
          min-height:220px;
          padding:16px;
          text-align:center;
        ">
          <div class="kana-glyph speak-glyph" aria-hidden="true">${sampleGlyph}</div>
          <p class="muted" style="margin:0;">
            Speaking practice is <strong>in progress</strong>.
          </p>
          <p class="muted" style="margin:0;">
            Thanks for testing! You can finish the lesson for now.
          </p>
        </div>
      `;
    }

    // Local Finish button at bottom
    let finishBtn = $('[data-action="finish-lesson"]', part4);
    if (!finishBtn) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      finishBtn = document.createElement('button');
      finishBtn.className = 'btn primary';
      finishBtn.dataset.action = 'finish-lesson';
      finishBtn.textContent = 'Finish';
      actions.appendChild(finishBtn);
      part4.appendChild(actions);
    }

    finishBtn?.addEventListener('click', () => {
      window.location.href = '../index.html';
    });
  }

  // Boot on Part 1
  showPart(1);
})();
