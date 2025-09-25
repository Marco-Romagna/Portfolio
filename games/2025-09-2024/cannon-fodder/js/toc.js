document.addEventListener("DOMContentLoaded", () => {
  const tocData = {
    book1: [
      { title: "Part 1: Introduction", file: "book1-part1-intro.pdf" },
      { title: "Part 2: Basic Training", file: "book1-part2-basic-training.pdf" },
      { title: "Part 3: Soldier", file: "book1-part3-soldier.pdf" },
      { title: "Part 4: Firearm Basics", file: "book1-part4-firearm-basics.pdf" },
      { title: "Part 5: Defense & Survival", file: "book1-part5-defense.pdf" },
      { title: "Part 6: Firearm Management", file: "book1-part6-firearm-management.pdf" },
      { title: "Part 7: Advanced Combat", file: "book1-part7-advanced-combat.pdf" },
      { title: "Part 8: Out of Combat", file: "book1-part8-out-of-combat.pdf" },
      { title: "Part 9: Classes & Roles", file: "book1-part9-classes-roles.pdf" },
      { title: "Part 10: General Traits", file: "book1-part10-traits.pdf" },
    ],
    book2: [
      { title: "Intro to Guns & Gear", file: "book2-part11a-intro.pdf" },
      { title: "Modern & Global Era Guns", file: "book2-part11b-modern-global.pdf" },
      { title: "Cold War Era Guns", file: "book2-part11c-cold-war.pdf" },
      { title: "Second World War Guns", file: "book2-part11d-ww2.pdf" },
      { title: "Great War Guns", file: "book2-part11e-great-war.pdf" },
      { title: "Industrial Era Guns", file: "book2-part11f-industrial.pdf" },
      { title: "Equipment", file: "book2-part11g-equipment.pdf" },
      { title: "Gun Mods & Attachments", file: "book2-part11h-mods.pdf" },
      { title: "Appendix: Personal Record (1)", file: "book2-appendix1.pdf" },
      { title: "Appendix: Personal Record (2)", file: "book2-appendix2.pdf" },
    ]
  };

  const tocContainer = document.getElementById("toc");
  const viewer = document.getElementById("pdf-viewer");

  function renderTOC(bookKey) {
    tocContainer.innerHTML = "";
    tocData[bookKey].forEach(item => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#";
      a.textContent = item.title;
      a.addEventListener("click", e => {
        e.preventDefault();
        viewer.src = `pdfs/${item.file}`;
      });
      li.appendChild(a);
      tocContainer.appendChild(li);
    });
    // Load first item by default
    viewer.src = `pdfs/${tocData[bookKey][0].file}`;
  }

  // Buttons to switch between Book 1 and Book 2
  document.getElementById("book1-btn").addEventListener("click", () => renderTOC("book1"));
  document.getElementById("book2-btn").addEventListener("click", () => renderTOC("book2"));

  // Initialize with Book 1
  renderTOC("book1");
});
