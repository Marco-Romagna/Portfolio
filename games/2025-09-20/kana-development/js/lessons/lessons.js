<script>
(() => {
  // ========= tiny helpers =========
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  const lesson = $('.lesson');
  if (!lesson) return;

  const lessonId   = String(lesson.dataset.lessonId || '1-1');
  const totalParts = Number(lesson.dataset.totalParts || 4);
  const parts      = $$('.lesson-part');
  const steps      = $$('.steps .step');
  const progress   = $('.progressbar');
  const fill       = $('.progressbar-fill');

  const cta = $('.lesson-cta [data-action="advance"]');
  const hideCTA = () => { cta?.closest('.lesson-cta')?.classList.add('is-hidden'); };
  const startBtn = $('#part-1 .actions [data-action="advance"]');

  function showPart(idx) {
    const current = Math.min(Math.max(idx, 1), totalParts);
    parts.forEach(p => p.classList.toggle('is-visible', Number(p.dataset.partIndex) === current));
    steps.forEach(s => s.classList.toggle('is-active', Number(s.dataset.part) === current));
    const pct = totalParts > 1 ? Math.round((current - 1) / (totalParts - 1) * 100) : 100;
    if (fill) fill.style.width = `${pct}%`;
    if (progress) progress.setAttribute('aria-valuenow', String(pct));
    hideCTA();
  }

  // ========= world datasets (scalable) =========
  // World 1 — vowels
  const H_VOW = ['あ','い','う','え','お'];
  const K_VOW = ['ア','イ','ウ','エ','オ'];

  // World 2 — K row + (dakuten) G row
  const H_KA  = ['か','き','く','け','こ'];
  const K_KA  = ['カ','キ','ク','ケ','コ'];
  const H_GA  = ['が','ぎ','ぐ','げ','ご'];
  const K_GA  = ['ガ','ギ','グ','ゲ','ゴ'];

  // ROMAJI dictionary (add more rows in future worlds)
  const ROMA = {
    // vowels
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',

    // ka / ga
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go'
  };

  // Cross-script pairs (hiragana ↔ katakana)
  const PAIR = {};
  [...H_VOW].forEach((h,i)=>{ PAIR[h] = K_VOW[i]; PAIR[K_VOW[i]] = h; });
  [...H_KA ].forEach((h,i)=>{ PAIR[h] = K_KA [i]; PAIR[K_KA [i]] = h; });
  [...H_GA ].forEach((h,i)=>{ PAIR[h] = K_GA [i]; PAIR[K_GA [i]] = h; });

  // ========= derive world + suffix behavior =========
  const [WORLD, SUFFIX] = (() => {
    const [w, s] = lessonId.split('-');
    return [Number(w), Number(s)];
  })();

  // Pick base/dakuten sets by world
  function getWorldSets(world) {
    if (world === 1) {
      return {
        H_BASE: H_VOW,
        K_BASE: K_VOW,
        H_DAKU: [], // none in world 1
        K_DAKU: []
      };
    }
    if (world === 2) {
      return {
        H_BASE: H_KA,
        K_BASE: K_KA,
        H_DAKU: H_GA,
        K_DAKU: K_GA
      };
    }
    // default empty (future worlds can be added similarly)
    return { H_BASE: [], K_BASE: [], H_DAKU: [], K_DAKU: [] };
  }

  const { H_BASE, K_BASE, H_DAKU, K_DAKU } = getWorldSets(WORLD);

  // Suffix roles (mirrored per world)
  // 1: H_BASE, 2: K_BASE, 3: Mixed (cross-script), 4: Typing (romaji)
  // 5: H_DAKU, 6: K_DAKU, 7: Mixed dakuten, 8: Typing dakuten
  const ROLE = (() => {
    const map = {
      1: 'hira-base',
      2: 'kata-base',
      3: 'mixed-base',
      4: 'type-base',
      5: 'hira-daku',
      6: 'kata-daku',
      7: 'mixed-daku',
      8: 'type-daku'
    };
    return map[SUFFIX] || 'hira-base';
  })();

  // Build KANA for this lesson
  let KANA = [];
  let MIXED_TYPE = false; // Part 2 prompt cross-script
  let IS_TYPING_ONLY = false; // Part 2 becomes typing when type-*
  if (ROLE === 'hira-base')         KANA = [...H_BASE];
  else if (ROLE === 'kata-base')    KANA = [...K_BASE];
  else if (ROLE === 'mixed-base') { KANA = [...H_BASE, ...K_BASE]; MIXED_TYPE = true; }
  else if (ROLE === 'type-base')  { KANA = [...H_BASE, ...K_BASE]; IS_TYPING_ONLY = true; }
  else if (ROLE === 'hira-daku')    KANA = [...H_DAKU];
  else if (ROLE === 'kata-daku')    KANA = [...K_DAKU];
  else if (ROLE === 'mixed-daku') { KANA = [...H_DAKU, ...K_DAKU]; MIXED_TYPE = true; }
  else if (ROLE === 'type-daku')  { KANA = [...H_DAKU, ...K_DAKU]; IS_TYPING_ONLY = true; }

  // Goals and combo spans
  const GOAL_IDENT = (MIXED_TYPE || IS_TYPING_ONLY) ? 20 : 15;
  const GOAL_TYPE  = (MIXED_TYPE || IS_TYPING_ONLY) ? 20 : 15;
  const COMBO_LAST = (MIXED_TYPE || IS_TYPING_ONLY) ? 10 : 5; // mixed/type → last 10, otherwise last 5

  // World 1 extra combo rules
  const WORLD1_COMBO_RULES = (WORLD === 1);
  const REQUIRE_MIXED_SCRIPTS_IN_COMBO = (WORLD === 1 && SUFFIX === 3); // 1-3 only

  // ========= Part 1 (Preview for mixed lessons only: -3, -7) =========
  (function initPart1() {
    if (!(SUFFIX === 3 || SUFFIX === 7)) return;
    const part1 = $('#part-1');
    if (!part1) return;
    const grid = $('.kana-grid', part1);
    if (!grid) return;

    const hiraganaPool = KANA.filter(g => /[\u3040-\u309F]/.test(g)); // Hira chars in current pool
    const pairs = hiraganaPool
      .map(h => ({ h, k: PAIR[h], r: ROMA[h] }))
      .filter(p => !!p.k);

    grid.innerHTML = '';
    pairs.forEach(p => {
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
    if (title) title.textContent = 'Preview — Script Pairs';
  })();

  startBtn?.addEventListener('click', () => showPart(2));

  // ========= Part 2 (Identify) OR Typing if IS_TYPING_ONLY =========
  (function initPart2() {
    const part2 = $('#part-2');
    if (!part2) return;

    if (IS_TYPING_ONLY) {
      // Typing panel in Part 2 (mirrors Part 3 typing flow)
      initTyping(part2, GOAL_TYPE, true /*isPart2*/);
      return;
    }

    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const promptText = $('.prompt-text', part2);
    const meter      = $('.quiz-progress .meter', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);

    const GOAL = GOAL_IDENT;
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
      for (let t = 0; t < 60; t++) {
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
      if (!MIXED_TYPE) {
        if (unseen.size > 0) {
          let choices = Array.from(unseen);
          if (choices.length > 1) choices = choices.filter(k => k !== lastPromptGlyph);
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return pickWeighted(weights, lastPromptGlyph);
      }
      const poolH = KANA.filter(g => /[\u3040-\u309F]/.test(g));
      const poolK = KANA.filter(g => /[\u30A0-\u30FF]/.test(g));
      const pool = Math.random() < 0.5 ? poolH : poolK;
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

      if (MIXED_TYPE) {
        const isH = /[\u3040-\u309F]/.test(promptGlyph);
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

      let options = [];
      if (MIXED_TYPE) {
        const correct = PAIR[promptGlyph];
        const pool = /[\u3040-\u309F]/.test(promptGlyph)
          ? KANA.filter(g => /[\u30A0-\u30FF]/.test(g))
          : KANA.filter(g => /[\u3040-\u309F]/.test(g));
        const distractors = sample(pool.filter(g => g !== correct), 3);
        options = [correct, ...distractors];
      } else {
        const correct = promptGlyph;
        const others  = sample(KANA.filter(k => k !== correct), 3);
        options = [correct, ...others];
      }

      const orderedOptions = arrangeOptionsNoSlotRepeat(options);
      const shuffledThemes = [...THEMES].sort(() => Math.random() - 0.5);

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

      const correct = MIXED_TYPE ? (choice === PAIR[promptGlyph]) : (choice === promptGlyph);

      if (correct) {
        btn.classList.add('is-correct');
        setFeedback('Nice! That’s correct.');

        progressPts = Math.min(GOAL, progressPts + 1);
        unseen.delete(promptGlyph);

        if (MIXED_TYPE) {
          const counterpart = PAIR[promptGlyph];
          if (weights[promptGlyph]  !== undefined) weights[promptGlyph]  = Math.max(1, weights[promptGlyph]  - 1);
          if (weights[counterpart]  !== undefined) weights[counterpart]  = Math.max(1, weights[counterpart]  - 1);
        } else {
          weights[promptGlyph] = Math.max(1, weights[promptGlyph] - 1);
        }

        updateMeter();

        setTimeout(() => {
          if (progressPts >= GOAL) {
            const nextBtn = $('[data-action="next-part"]', part2);
            nextBtn?.classList.remove('is-hidden');
            setFeedback('Part complete! Tap Next to continue.');
          } else {
            nextQuestion();
          }
        }, 320);
      } else {
        btn.classList.add('is-wrong');
        setFeedback('Try another.');

        progressPts = Math.max(0, progressPts - 1);
        if (MIXED_TYPE) {
          const counterpart = PAIR[promptGlyph];
          if (weights[promptGlyph]  !== undefined) weights[promptGlyph]  = (weights[promptGlyph]  || 1) + 2;
          if (weights[counterpart]  !== undefined) weights[counterpart]  = (weights[counterpart]  || 1) + 2;
        } else {
          weights[promptGlyph] = (weights[promptGlyph] || 1) + 2;
        }
        updateMeter();

        setTimeout(() => { nextQuestion(); }, 420);
      }
    }

    $('[data-action="next-part"]', part2)?.addEventListener('click', () => showPart(3));

    progressPts = 0; updateMeter(); nextQuestion();
  })();

  // ========= Part 3 (Typing) unless Part 2 already typed (IS_TYPING_ONLY) =========
  (function initPart3() {
    if (IS_TYPING_ONLY) return; // typing already handled in Part 2 for type-* lessons
    const part3 = $('#part-3');
    if (!part3) return;
    initTyping(part3, GOAL_TYPE, false /*isPart2*/);
  })();

  // ========= Part 4 (Speak placeholder) =========
  (function initPart4() {
    const part4 = $('#part-4');
    if (!part4) return;

    const panel = $('.speak-panel', part4);
    if (panel) {
      let sample = (KANA[0] || 'あ');
      panel.innerHTML = `
        <div class="speak-placeholder" style="
          display:grid;
          place-items:center;
          gap:10px;
          min-height:220px;
          padding:16px;
          text-align:center;
        ">
          <div class="kana-glyph speak-glyph" aria-hidden="true">${sample}</div>
          <p class="muted" style="margin:0;">Speaking practice is <strong>in progress</strong>.</p>
          <p class="muted" style="margin:0;">Thanks for testing! You can finish the lesson for now.</p>
        </div>
      `;
    }

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
    finishBtn?.addEventListener('click', () => { window.location.href = '../index.html'; });
  })();

  // ========= Typing engine (shared by Part 2 when type-* and Part 3 otherwise) =========
  function initTyping(scopeEl, GOAL, isPart2) {
    const wrapper    = $('.type-glyph-wrapper', scopeEl);
    const input      = $('#type-input', scopeEl);
    const meter      = $('.quiz-progress .meter', scopeEl);
    const meterFill  = $('.quiz-progress .meter-fill', scopeEl);
    const meterLabel = $('.quiz-progress .meter-label', scopeEl);

    let actionBtn = $('[data-action="next-part"]', scopeEl);
    if (!actionBtn) {
      const actions = document.createElement('div');
      actions.className = 'actions';
      actionBtn = document.createElement('button');
      actionBtn.className = 'btn primary is-hidden';
      actionBtn.dataset.action = 'next-part';
      actionBtn.textContent = isPart2 ? 'Next' : 'Next';
      actions.appendChild(actionBtn);
      scopeEl.appendChild(actions);
    } else {
      actionBtn.textContent = 'Next';
      actionBtn.classList.add('is-hidden');
    }

    const THEMES = ['theme-dark','theme-light','theme-sepia','theme-high'];
    const weights = Object.fromEntries(KANA.map(k => [k, 1]));
    const unseen  = new Set(KANA);

    const COMBO_THRESHOLD = GOAL - COMBO_LAST;

    let progressPts = 0;
    let roundLocked = false;
    let lastKana = null;

    let comboActive = false;
    let comboSeq = [];
    let comboIdx = 0;
    let lastComboKey = null;

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

    function renderGlyph(kana) {
      wrapper.innerHTML = '';
      const span = document.createElement('span');
      span.className = 'kana-glyph type-glyph';
      span.dataset.currentKana = kana;
      span.textContent = kana;
      wrapper.appendChild(span);
    }

    function pickNextKana() {
      const unseenArr = Array.from(unseen);
      if (unseenArr.length) {
        let choices = unseenArr;
        if (choices.length > 1) choices = choices.filter(k => k !== lastKana);
        return choices[Math.floor(Math.random()*choices.length)];
      }
      return pickWeighted(weights, lastKana);
    }

    const isH = g => /[\u3040-\u309F]/.test(g);
    const isK = g => /[\u30A0-\u30FF]/.test(g);

    function makeCombo() {
      for (let attempt = 0; attempt < 80; attempt++) {
        const seq = [];
        let first = pickNextKana();
        seq.push(first);

        let second = pickWeighted(weights);
        for (let t=0; t<12 && second === seq[seq.length-1]; t++) second = pickWeighted(weights);
        seq.push(second);

        let third = pickWeighted(weights);
        for (let t=0; t<12 && third === seq[seq.length-1]; t++) third = pickWeighted(weights);
        seq.push(third);

        if (WORLD1_COMBO_RULES) {
          if (new Set(seq).size !== 3) { continue; } // all different in world 1
          if (REQUIRE_MIXED_SCRIPTS_IN_COMBO) {
            const hasH = seq.some(isH);
            const hasK = seq.some(isK);
            if (!(hasH && hasK)) continue;
          }
        }

        const key = seq.join('');
        if (key !== lastComboKey) return { seq, key };
      }
      const seq = [pickNextKana(), pickWeighted(weights), pickWeighted(weights)];
      return { seq, key: seq.join('') };
    }

    function renderComboDisplay() {
      const cont = document.createElement('div');
      cont.className = 'combo-seq';
      comboSeq.forEach((k, idx) => {
        const s = document.createElement('span');
        s.className = 'kana-glyph type-glyph';
        s.textContent = k;
        cont.appendChild(s);
        if (idx < comboSeq.length - 1) {
          const spacer = document.createElement('span');
          spacer.textContent = ' ';
          spacer.style.opacity = '0';
          cont.appendChild(spacer);
        }
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
      input?.focus();
    }

    function startSingleRound() {
      comboActive = false;
      input?.classList.remove('is-locked');
      if (input) input.value = '';

      const kana = pickNextKana();
      setThemeRandom();
      renderGlyph(kana);
      lastKana = kana;
      input?.focus();
    }

    function newRound() {
      roundLocked = false;
      input?.classList.remove('is-locked');
      if (input) input.value = '';
      if (progressPts >= COMBO_THRESHOLD) startComboRound();
      else startSingleRound();
    }

    function expectedComboRemaining() {
      return comboSeq.slice(comboIdx).map(k => ROMA[k]).join('');
    }

    function evaluate() {
      if (roundLocked) return;
      const val = (input?.value || '').trim().toLowerCase();
      if (!val) return;

      roundLocked = true;
      input?.classList.add('is-locked');

      if (!comboActive) {
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
              actionBtn?.classList.remove('is-hidden');
            } else {
              newRound();
            }
          }, 200);
        } else {
          progressPts = Math.max(0, progressPts - 1);
          weights[kana] = (weights[kana] || 1) + 2;
          updateMeter();
          setTimeout(() => { newRound(); }, 300);
        }
      } else {
        const currentKana = comboSeq[comboIdx];
        const expectedOne = ROMA[currentKana];
        const expectedAll = expectedComboRemaining();

        if (val === expectedAll) {
          comboActive = false;
          comboSeq.forEach(k => {
            unseen.delete(k);
            weights[k] = Math.max(1, (weights[k] || 1) - 1);
          });
          progressPts = Math.min(GOAL, progressPts + 1);
          updateMeter();

          setTimeout(() => {
            if (progressPts >= GOAL) {
              actionBtn?.classList.remove('is-hidden');
            } else {
              newRound();
            }
          }, 200);
        } else if (val === expectedOne) {
          comboIdx += 1;
          if (comboIdx < 3) {
            renderComboDisplay();
            lastKana = comboSeq[comboIdx];
            setTimeout(() => {
              roundLocked = false;
              input?.classList.remove('is-locked');
              if (input) { input.value = ''; input.focus(); }
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
                actionBtn?.classList.remove('is-hidden');
              } else {
                newRound();
              }
            }, 200);
          }
        } else {
          weights[currentKana] = (weights[currentKana] || 1) + 2;
          progressPts = Math.max(0, progressPts - 1);
          updateMeter();
          comboActive = false;
          setTimeout(() => { newRound(); }, 300);
        }
      }
    }

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        evaluate();
      }
    });

    actionBtn?.addEventListener('click', () => {
      // If we typed in Part 2 (type-*), go to Part 3; otherwise to Part 4
      if (isPart2) showPart(3);
      else showPart(4);
    });

    progressPts = 0; updateMeter(); newRound();
  }

  // ========= boot =========
  showPart(1);
})();
</script>
