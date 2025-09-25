const book1Toc = [
  { title: "Part 1: Introduction", file: "pdfs/book1-part1-intro.pdf" },
  { title: "Part 2: Basic Training", file: "pdfs/book1-part2-basic-training.pdf" },
  { title: "Part 3: Soldier", file: "pdfs/book1-part3-soldier.pdf" },
  { title: "Part 4: Firearm Basics", file: "pdfs/book1-part4-firearm-basics.pdf" },
  { title: "Part 5: Defense & Survival", file: "pdfs/book1-part5-defense.pdf" },
  { title: "Part 6: Firearm Management", file: "pdfs/book1-part6-firearm-management.pdf" },
  { title: "Part 7: Advanced Combat", file: "pdfs/book1-part7-advanced-combat.pdf" },
  { title: "Part 8: Out of Combat", file: "pdfs/book1-part8-out-of-combat.pdf" },
  { title: "Part 9: Classes & Roles", file: "pdfs/book1-part9-classes-roles.pdf" },
  { title: "Part 10: General Traits", file: "pdfs/book1-part10-traits.pdf" }
];

const book2Toc = [
  { title: "Intro to Guns & Gear", file: "pdfs/book2-part11a-intro.pdf" },
  { title: "Modern & Global Era Guns", file: "pdfs/book2-part11b-modern-global.pdf" },
  { title: "Cold War Era Guns", file: "pdfs/book2-part11c-cold-war.pdf" },
  { title: "Second World War Guns", file: "pdfs/book2-part11d-ww2.pdf" },
  { title: "Great War Guns", file: "pdfs/book2-part11e-great-war.pdf" },
  { title: "Industrial Era Guns", file: "pdfs/book2-part11f-industrial.pdf" },
  { title: "Equipment", file: "pdfs/book2-part11g-equipment.pdf" },
  { title: "Gun Mods & Attachments", file: "pdfs/book2-part11h-mods.pdf" },
  { title: "Appendix: Personal Record (1)", file: "pdfs/book2-appendix1.pdf" },
  { title: "Appendix: Personal Record (2)", file: "pdfs/book2-appendix2.pdf" }
];

let currentBook = "book1";

function renderToc(book) {
  const toc = document.getElementById("toc");
  toc.innerHTML = "";

  const entries = book === "book1" ? book1Toc : book2Toc;
  entries.forEach(entry => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.href = "#";
    a.textContent = entry.title;
    a.addEventListener("click", (e) => {
      e.preventDefault();
      loadPdf(entry.file);
    });
    li.appendChild(a);
    toc.appendChild(li);
  });

  // load first PDF by default
  if (entries.length > 0) loadPdf(entries[0].file);

  // update active button
  document.getElementById("book1-btn").classList.toggle("active", book === "book1");
  document.getElementById("book2-btn").classList.toggle("active", book === "book2");

  currentBook = book;
}

function loadPdf(file) {
  const viewer = document.getElementById("pdf-viewer");
  viewer.src = file;

  // reset scroll to top
  viewer.scrollIntoView({ behavior: "instant", block: "start" });
}

document.getElementById("book1-btn").addEventListener("click", () => renderToc("book1"));
document.getElementById("book2-btn").addEventListener("click", () => renderToc("book2"));

// start with Book 1
renderToc("book1");
