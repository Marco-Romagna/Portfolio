// Worlds + Levels data
window.KANA_STAGES = {
  worlds: [
    { code: "1", title: "World 1 — Vowels", desc: "Start here. Learn the five core vowels in both scripts.", levels: ["1-1","1-2","1-3","1-4"] },
    { code: "2", title: "World 2 — K / G Rows", desc: "Learn the K-row and its dakuten variations.", levels: ["2-1","2-2","2-3","2-4","2-5","2-6","2-7","2-8"] },
    { code: "3", title: "World 3 — S / Z Rows", desc: "Learn the S-row and its dakuten variations.", levels: ["3-1","3-2","3-3","3-4","3-5","3-6","3-7","3-8"] },
    { code: "4", title: "World 4 — T / D Rows", desc: "Learn the T-row and its dakuten variations.", levels: ["4-1","4-2","4-3","4-4","4-5","4-6","4-7","4-8"] },
    { code: "5", title: "World 5 — N Row", desc: "Practice the N-row.", levels: ["5-1","5-2","5-3","5-4"] },
    { code: "6", title: "World 6 — H / B / P Rows", desc: "Learn the H-row and its dakuten/handaku variations.", levels: ["6-1","6-2","6-3","6-4","6-5","6-6","6-7","6-8","6-9","6-10","6-11","6-12"] },
    { code: "7", title: "World 7 — M Row", desc: "Practice the M-row.", levels: ["7-1","7-2","7-3","7-4"] },
    { code: "8", title: "World 8 — Y Row", desc: "Practice the Y-row (やゆよ).", levels: ["8-1","8-2","8-3","8-4"] },
    { code: "9", title: "World 9 — R Row", desc: "Practice the R-row.", levels: ["9-1","9-2","9-3","9-4"] },
    { code: "10", title: "World 10 — W + ん", desc: "Finish kana with WA/WO and ん.", levels: ["10-1","10-2","10-3","10-4"] }
  ],

  levels: [
    // ===== World 1 =====
    { code: "1-1", title: "1-1 — Hiragana Vowels", href: "lessons/lesson.html?id=1-1", thumb: "あ" },
    { code: "1-2", title: "1-2 — Katakana Vowels", href: "lessons/lesson.html?id=1-2", thumb: "ア" },
    { code: "1-3", title: "1-3 — Mixed Vowels (Both Scripts)", href: "lessons/lesson.html?id=1-3", thumb: "あ+ア", class: "icon-sm" },
    { code: "1-4", title: "1-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=1-4", thumb: "語" },

    // ===== World 2 =====
    { code: "2-1", title: "2-1 — Hiragana K (かきくけこ)", href: "lessons/lesson.html?id=2-1", thumb: "か" },
    { code: "2-2", title: "2-2 — Katakana K (カキクケコ)", href: "lessons/lesson.html?id=2-2", thumb: "カ" },
    { code: "2-3", title: "2-3 — Mixed K (Hira + Kata)", href: "lessons/lesson.html?id=2-3", thumb: "か+カ", class: "icon-sm" },
    { code: "2-4", title: "2-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=2-4", thumb: "語" },
    { code: "2-5", title: "2-5 — Hiragana G (がぎぐげご)", href: "lessons/lesson.html?id=2-5", thumb: "が" },
    { code: "2-6", title: "2-6 — Katakana G (ガギグゲゴ)", href: "lessons/lesson.html?id=2-6", thumb: "ガ" },
    { code: "2-7", title: "2-7 — Mixed G (Hira + Kata)", href: "lessons/lesson.html?id=2-7", thumb: "が+ガ", class: "icon-sm" },
    { code: "2-8", title: "2-8 — Vocabulary Challenge", href: "lessons/lesson.html?id=2-8", thumb: "語" },

    // ===== World 3 =====
    { code: "3-1", title: "3-1 — Hiragana S (さしすせそ)", href: "lessons/lesson.html?id=3-1", thumb: "さ" },
    { code: "3-2", title: "3-2 — Katakana S (サシスセソ)", href: "lessons/lesson.html?id=3-2", thumb: "サ" },
    { code: "3-3", title: "3-3 — Mixed S (Hira + Kata)", href: "lessons/lesson.html?id=3-3", thumb: "さ+サ", class: "icon-sm" },
    { code: "3-4", title: "3-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=3-4", thumb: "語" },
    { code: "3-5", title: "3-5 — Hiragana Z (ざじずぜぞ)", href: "lessons/lesson.html?id=3-5", thumb: "ざ" },
    { code: "3-6", title: "3-6 — Katakana Z (ザジズゼゾ)", href: "lessons/lesson.html?id=3-6", thumb: "ザ" },
    { code: "3-7", title: "3-7 — Mixed Z (Hira + Kata)", href: "lessons/lesson.html?id=3-7", thumb: "ざ+ザ", class: "icon-sm" },
    { code: "3-8", title: "3-8 — Vocabulary Challenge", href: "lessons/lesson.html?id=3-8", thumb: "語" },

    // ===== World 4 =====
    { code: "4-1", title: "4-1 — Hiragana T (たちつてと)", href: "lessons/lesson.html?id=4-1", thumb: "た" },
    { code: "4-2", title: "4-2 — Katakana T (タチツテト)", href: "lessons/lesson.html?id=4-2", thumb: "タ" },
    { code: "4-3", title: "4-3 — Mixed T (Hira + Kata)", href: "lessons/lesson.html?id=4-3", thumb: "た+タ", class: "icon-sm" },
    { code: "4-4", title: "4-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=4-4", thumb: "語" },
    { code: "4-5", title: "4-5 — Hiragana D (だぢづでど)", href: "lessons/lesson.html?id=4-5", thumb: "だ" },
    { code: "4-6", title: "4-6 — Katakana D (ダヂヅデド)", href: "lessons/lesson.html?id=4-6", thumb: "ダ" },
    { code: "4-7", title: "4-7 — Mixed D (Hira + Kata)", href: "lessons/lesson.html?id=4-7", thumb: "だ+ダ", class: "icon-sm" },
    { code: "4-8", title: "4-8 — Vocabulary Challenge", href: "lessons/lesson.html?id=4-8", thumb: "語" },

    // ===== World 5 =====
    { code: "5-1", title: "5-1 — Hiragana N (なにぬねの)", href: "lessons/lesson.html?id=5-1", thumb: "な" },
    { code: "5-2", title: "5-2 — Katakana N (ナニヌネノ)", href: "lessons/lesson.html?id=5-2", thumb: "ナ" },
    { code: "5-3", title: "5-3 — Mixed N (Hira + Kata)", href: "lessons/lesson.html?id=5-3", thumb: "な+ナ", class: "icon-sm" },
    { code: "5-4", title: "5-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=5-4", thumb: "語" },

    // ===== World 6 =====
    { code: "6-1", title: "6-1 — Hiragana H (はひふへほ)", href: "lessons/lesson.html?id=6-1", thumb: "は" },
    { code: "6-2", title: "6-2 — Katakana H (ハヒフヘホ)", href: "lessons/lesson.html?id=6-2", thumb: "ハ" },
    { code: "6-3", title: "6-3 — Mixed H (Hira + Kata)", href: "lessons/lesson.html?id=6-3", thumb: "は+ハ", class: "icon-sm" },
    { code: "6-4", title: "6-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=6-4", thumb: "語" },
    { code: "6-5", title: "6-5 — Hiragana B (ばびぶべぼ)", href: "lessons/lesson.html?id=6-5", thumb: "ば" },
    { code: "6-6", title: "6-6 — Katakana B (バビブベボ)", href: "lessons/lesson.html?id=6-6", thumb: "バ" },
    { code: "6-7", title: "6-7 — Mixed B (Hira + Kata)", href: "lessons/lesson.html?id=6-7", thumb: "ば+バ", class: "icon-sm" },
    { code: "6-8", title: "6-8 — Vocabulary Challenge", href: "lessons/lesson.html?id=6-8", thumb: "語" },
    { code: "6-9",  title: "6-9 — Hiragana P (ぱぴぷぺぽ)", href: "lessons/lesson.html?id=6-9",  thumb: "ぱ" },
    { code: "6-10", title: "6-10 — Katakana P (パピプペポ)", href: "lessons/lesson.html?id=6-10", thumb: "パ" },
    { code: "6-11", title: "6-11 — Mixed P (Hira + Kata)",   href: "lessons/lesson.html?id=6-11", thumb: "ぱ+パ", class: "icon-sm" },
    { code: "6-12", title: "6-12 — Vocabulary Challenge",   href: "lessons/lesson.html?id=6-12", thumb: "語" },


    // ===== World 7 =====
    { code: "7-1", title: "7-1 — Hiragana M (まみむめも)", href: "lessons/lesson.html?id=7-1", thumb: "ま" },
    { code: "7-2", title: "7-2 — Katakana M (マミムメモ)", href: "lessons/lesson.html?id=7-2", thumb: "マ" },
    { code: "7-3", title: "7-3 — Mixed M (Hira + Kata)", href: "lessons/lesson.html?id=7-3", thumb: "ま+マ", class: "icon-sm" },
    { code: "7-4", title: "7-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=7-4", thumb: "語" },

    // ===== World 8 =====
    { code: "8-1", title: "8-1 — Hiragana Y (やゆよ)", href: "lessons/lesson.html?id=8-1", thumb: "や" },
    { code: "8-2", title: "8-2 — Katakana Y (ヤユヨ)", href: "lessons/lesson.html?id=8-2", thumb: "ヤ" },
    { code: "8-3", title: "8-3 — Mixed Y (Hira + Kata)", href: "lessons/lesson.html?id=8-3", thumb: "や+ヤ", class: "icon-sm" },
    { code: "8-4", title: "8-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=8-4", thumb: "語" },

    // ===== World 9 =====
    { code: "9-1", title: "9-1 — Hiragana R (らりるれろ)", href: "lessons/lesson.html?id=9-1", thumb: "ら" },
    { code: "9-2", title: "9-2 — Katakana R (ラリルレロ)", href: "lessons/lesson.html?id=9-2", thumb: "ラ" },
    { code: "9-3", title: "9-3 — Mixed R (Hira + Kata)", href: "lessons/lesson.html?id=9-3", thumb: "ら+ラ", class: "icon-sm" },
    { code: "9-4", title: "9-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=9-4", thumb: "語" },

    // ===== World 10 =====
    { code: "10-1", title: "10-1 — Hiragana W + ん (わをん)", href: "lessons/lesson.html?id=10-1", thumb: "わ" },
    { code: "10-2", title: "10-2 — Katakana W + ン (ワヲン)", href: "lessons/lesson.html?id=10-2", thumb: "ワ" },
    { code: "10-3", title: "10-3 — Mixed W/N (Hira + Kata)", href: "lessons/lesson.html?id=10-3", thumb: "わ+ワ", class: "icon-sm" },
    { code: "10-4", title: "10-4 — Vocabulary Challenge", href: "lessons/lesson.html?id=10-4", thumb: "語" }
  ]
};
