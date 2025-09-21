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
    thumb: "あ"
  },
  {
    code: "1-2",
    title: "1-2 — Katakana Vowels",
    href: "lessons/1-2.html",
    thumb: "ア"
  },
  {
    code: "1-3",
    title: "1-3 — Mixed Vowels (Both Scripts)",
    href: "lessons/1-3.html",
    thumb: "あ+ア",
    class: "icon-sm"
  },
  {
    code: "1-4",
    title: "1-4 — Mixed Vowels (No Hints)",
    href: "lessons/1-4.html",
    thumb: "あ+ア",
    class: "icon-sm"
  }
]

};
