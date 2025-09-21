// Worlds + Levels data
window.KANA_STAGES = {
  worlds: [
    {
      code: "1",
      title: "World 1 — Vowels",
      desc: "Start here. Learn the five core vowels in both scripts.",
      levels: ["1-1", "1-2", "1-3", "1-4"]   // ← added
    }
  ],
  levels: [
    {
      code: "1-1",
      title: "1-1 — Hiragana Vowels",
      href: "lessons/1-1.html",
      thumb: "あ",
      tags: ["Beginner"],
      desc: "あ い う え お — recognize and pronounce the five hiragana vowels."
    },
    {
      code: "1-2",
      title: "1-2 — Katakana Vowels",
      href: "lessons/1-2.html",
      thumb: "ア",
      tags: ["Beginner"],
      desc: "ア イ ウ エ オ — learn the katakana counterparts."
    },
    {
      code: "1-3",
      title: "1-3 — Mixed Vowels (Both Scripts)",
      href: "lessons/1-3.html",
      thumb: "あ/ア",
      tags: ["Practice"],
      desc: "Mix of hiragana and katakana vowels for quick discrimination drills."
    },
    {
      code: "1-4",
      title: "1-4 — Mixed Vowels (No Hints)",
      href: "lessons/1-4.html",
      thumb: "あ/ア",
      tags: ["Challenge"],
      desc: "Same mix as 1-3, but without extra cues to test mastery."
    }
  ]
};
