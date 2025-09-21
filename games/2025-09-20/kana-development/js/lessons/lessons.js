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

  // ------- master sets -------
  const H_VOW = ['あ','い','う','え','お'];
  const K_VOW = ['ア','イ','ウ','エ','オ'];

  const H_KA  = ['か','き','く','け','こ'];
  const K_KA  = ['カ','キ','ク','ケ','コ'];

  const H_GA  = ['が','ぎ','ぐ','げ','ご'];
  const K_GA  = ['ガ','ギ','グ','ゲ','ゴ'];

  // Romaji map (merge all we need)
  const ROMA = {
    // vowels
    'あ':'a','い':'i','う':'u','え':'e','お':'o',
    'ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
    // ka row
    'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko',
    'カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
    // ga row
    'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go',
    'ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go'
  };

  // Cross-script pairs we need (for mixed identify)
  const PAIR = {
    // vowels
    'あ':'ア','い':'イ','う':'ウ','え':'エ','お':'オ',
    'ア':'あ','イ':'い','ウ':'う','エ':'え','オ':'お',
    // ka
    'か':'カ','き':'キ','く':'ク','け':'ケ','こ':'コ',
    'カ':'か','キ':'き','ク':'く','ケ':'け','コ':'こ',
    // ga
    'が':'ガ','ぎ':'ギ','ぐ':'グ','げ':'ゲ','ご':'ゴ',
    'ガ':'が','ギ':'ぎ','グ':'ぐ','ゲ':'げ','ゴ':'ご'
  };

  // ------- pick datasets per lesson -------
  let KANA = H_VOW.slice();     // default 1-1
  let MIXED_TYPE = false;       // mixed identify (needs PAIR)
  let GOAL_IDENT = 15;          // part 2 goal
  let GOAL_TYPE  = 15;          // part 3 goal
  let COMBO_LAST = 5;           // part 3 last N points use combos
  let WORLD1_COMBO_RULES = false; // world 1 extra rules for combos
  let REQUIRE_MIXED_SCRIPTS_IN_COMBO = false; // 1-3 only

  // World 1
  if (lessonId === '1-1') {                 // H vowels
    KANA = H_VOW.slice();
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
    WORLD1_COMBO_RULES = true;
  } else if (lessonId === '1-2') {          // K vowels
    KANA = K_VOW.slice();
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
    WORLD1_COMBO_RULES = true;
  } else if (lessonId === '1-3') {          // mixed vowels
    KANA = [...H_VOW, ...K_VOW];
    MIXED_TYPE = true;
    GOAL_IDENT = 20; GOAL_TYPE = 20; COMBO_LAST = 10; // per your spec
    WORLD1_COMBO_RULES = true;
    REQUIRE_MIXED_SCRIPTS_IN_COMBO = true;
  } else if (lessonId === '1-4') {  // Type vowels
    KANA = [...H_VOW, ...K_VOW]; 
    GOAL_IDENT = 0;               // no identify
    GOAL_TYPE  = 15;              // typing to 15
    COMBO_LAST = 5;               // last 5 use combos
  }


  // World 2 (K row + dakuten G row)
  else if (lessonId === '2-1') {            // H ka-row
    KANA = H_KA.slice();
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
  } else if (lessonId === '2-2') {          // K ka-row
    KANA = K_KA.slice();
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
  } else if (lessonId === '2-3') {          // Mixed ka-row
    KANA = [...H_KA, ...K_KA];
    MIXED_TYPE = true;
    GOAL_IDENT = 20; GOAL_TYPE = 20; COMBO_LAST = 10; // mirror mixed difficulty
  } else if (lessonId === '2-4') {          // Type ka-row
    KANA = [...H_KA, ...K_KA]; // typing can show either script
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
  } else if (lessonId === '2-5') {          // H ga-row
    KANA = H_GA.slice();
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
  } else if (lessonId === '2-6') {          // K ga-row
    KANA = K_GA.slice();
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
  } else if (lessonId === '2-7') {          // Mixed ga-row
    KANA = [...H_GA, ...K_GA];
    MIXED_TYPE = true;
    GOAL_IDENT = 20; GOAL_TYPE = 20; COMBO_LAST = 10;
  } else if (lessonId === '2-8') {          // Type ga-row
    KANA = [...H_GA, ...K_GA];
    GOAL_IDENT = 15; GOAL_TYPE = 15; COMBO_LAST = 5;
  }

  // ------- state -------
  let current   = 1;

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
  // Part 1 — Preview (make pairs when MIXED_TYPE)
  // --------------------------------------------
  (function initPart1() {
    if (!MIXED_TYPE) return; // only show fancy pairs on mixed lessons
    const part1 = $('#part-1');
    if (!part1) return;
    const grid = $('.kana-grid', part1);
    if (!grid) return;

    // Build pairs from the hiragana half in KANA that also has a katakana pair
    const hOnly = KANA.filter(g => /[\u3040-\u309F]/.test(g)); // hiragana range
    const rows = hOnly.map(h => ({ h, k: PAIR[h], r: ROMA[h] })).filter(p => !!p.k);

    grid.innerHTML = '';
    rows.forEach(p => {
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
    if (title) title.textContent = 'Mixed — Preview';
  })();

  // Part 1 → Part 2
  startBtn?.addEventListener('click', () => showPart(2));

  // ==========================================================
  // Part 2 — Identify (±1 meter, lock per round)
  // mixed lessons: cross-script match (use PAIR)
  // anti-repeat: no same prompt twice; no per-slot repeats
  // ==========================================================
  (function initPart2() {
    const part2 = $('#part-2');
    if (!part2) return;

    const grid       = $('.quiz-options', part2);
    const feedback   = $('.quiz-feedback .feedback-text', part2);
    const promptEl   = $('.prompt-text .prompt-target', part2);
    const promptText = $('.prompt-text', part2);
    const meter      = $('.quiz-progress .meter', part2);
    const meterFill  = $('.quiz-progress .meter-fill', part2);
    const meterLabel = $('.quiz-progress .meter-label', part2);
    const nextBtn    = $('[data-action="next-part"]', part2);

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
      if (!MIXED_TYPE) {
        if (unseen.size > 0) {
          let choices = Array.from(unseen);
          if (choices.length > 1) choices = choices.filter(k => k !== lastPromptGlyph);
          return choices[Math.floor(Math.random() * choices.length)];
        }
        return pickWeighted(weights, lastPromptGlyph);
      }
      // mixed: prompt from one script, answer from the other
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

      // Build options
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

      let isCorrect = MIXED_TYPE ? (choice === PAIR[promptGlyph]) : (choice === promptGlyph);

      if (isCorrect) {
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
        }, 360);
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

        setTimeout(() => { nextQuestion(); }, 480);
      }
    }

    $('[data-action="next-part"]', part2)?.addEventListener('click', () => showPart(3));

    progressPts = 0; updateMeter(); nextQuestion();
  })();

  // ==========================================================
  // Part 3 — Type (romaji) with combo mode
  // 1-1/1-2: GOAL 15, combos last 5
  // 1-3:    GOAL 20, combos last 10, 3 glyphs must be distinct + mixed scripts
  // World 1 combos: all three glyphs must be different
  // No same glyph twice in a row; weighted by mistakes; locked per round
  // ==========================================================
  (function initPart3() {
    const part3 = $('#part-3');
    if (!part3) return;

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

    const GOAL = GOAL_TYPE;
    const COMBO_THRESHOLD = GOAL - COMBO_LAST;

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

    // weighted pick with avoidance
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

    // single pick with no immediate repeat; unseen first
    function pickNextKana() {
      const unseenArr = Array.from(unseen);
      if (unseenArr.length) {
        let choices = unseenArr;
        if (choices.length > 1) choices = choices.filter(k => k !== lastKana);
        return choices[Math.floor(Math.random()*choices.length)];
      }
      return pickWeighted(weights, lastKana);
    }

    // helpers for script detection
    const isH = g => /[\u3040-\u309F]/.test(g);
    const isK = g => /[\u30A0-\u30FF]/.test(g);

    // build a 3-kana combo under rules:
    // - first avoids lastKana
    // - no adjacent duplicates
    // - World 1 combos: all three glyphs must be different
    // - For 1-3 specifically: include at least one H and at least one K
    // - not equal to lastComboKey
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
          // all distinct
          if (new Set(seq).size !== 3) continue;
          if (REQUIRE_MIXED_SCRIPTS_IN_COMBO) {
            const hasH = seq.some(isH);
            const hasK = seq.some(isK);
            if (!(hasH && hasK)) continue;
          }
        }

        const key = seq.join('');
        if (key !== lastComboKey) return { seq, key };
      }
      // fallback (looser)
      const seq = [pickNextKana(), pickWeighted(weights), pickWeighted(weights)];
      return { seq, key: seq.join('') };
    }

    // render combo (all same color/fonts; invisible spacers)
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
  })();

  // ==========================================================
  // Part 4 — Speak (placeholder for now, all lessons)
  // ==========================================================
  (function initPart4() {
    const part4 = $('#part-4');
    if (!part4) return;

    const panel = $('.speak-panel', part4);
    if (panel) {
      // Pick a sample glyph that fits the lesson vibe
      let sample = 'あ';
      if (lessonId.startsWith('1-2')) sample = 'ア';
      else if (lessonId === '1-3') sample = Math.random() < 0.5 ? 'あ' : 'ア';
      else if (lessonId === '2-2') sample = 'カ';
      else if (lessonId === '2-3') sample = Math.random() < 0.5 ? 'か' : 'カ';
      else if (lessonId === '2-4') sample = 'く';
      else if (lessonId === '2-5') sample = 'が';
      else if (lessonId === '2-6') sample = 'ガ';
      else if (lessonId === '2-7') sample = Math.random() < 0.5 ? 'ぎ' : 'ギ';
      else if (lessonId === '2-8') sample = 'ぐ';

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
          <p class="muted" style="margin:0;">
            Speaking practice is <strong>in progress</strong>.
          </p>
          <p class="muted" style="margin:0;">
            Thanks for testing! You can finish the lesson for now.
          </p>
        </div>
      `;
    }

    // Local Finish button at bottom (same place as Part 2/3 Next)
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
  })();

  // Boot on Part 1
  showPart(1);
})();
