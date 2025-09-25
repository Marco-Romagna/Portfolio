document.addEventListener("DOMContentLoaded", () => {
  const books = {
    book1: [
      { title: "Part 1 – Introduction", file: "CannonFodder-Part1.pdf" },
      { title: "Part 2 – Basic Training", file: "CannonFodder-Part2.pdf" },
      { title: "Part 3 – Soldier", file: "CannonFodder-Part3.pdf" },
      { title: "Part 4 – Firearm Basics", file: "CannonFodder-Part4.pdf" },
      { title: "Part 5 – Defense & Survival", file: "CannonFodder-Part5.pdf" },
      { title: "Part 6 – Firearm Management", file: "CannonFodder-Part6.pdf" },
      { title: "Part 7 – Advanced Combat", file: "CannonFodder-Part7.pdf" },
      { title: "Part 8 – Out of Combat", file: "CannonFodder-Part8.pdf" },
      { title: "Part 9 – Classes & Roles", file: "CannonFodder-Part9.pdf" },
      { title: "Part 10 – General Traits", file: "CannonFodder-Part10.pdf" }
    ],
    book2: [
      { title: "Modern Era Guns", file: "CannonFodder2-Modern.pdf" },
      { title: "Global Era Guns", file: "CannonFodder2-Global.pdf" },
      { title: "Cold War Era Guns", file: "CannonFodder2-ColdWar.pdf" },
      { title: "Second World War Guns", file: "CannonFodder2-WW2.pdf" },
      { title: "Great War Guns", file: "CannonFodder2-GreatWar.pdf" },
      { title: "Industrial Era Guns", file: "CannonFodder2-Industrial.pdf" },
      { title: "Equipment", file: "CannonFodder2-Equipment.pdf" },
      { title: "Gun Mods & Attachments", file: "CannonFodder2-Mods.pdf" },
      { title: "Appendix – Personal Record", file: "CannonFodder2-Appendix.pdf" }
    ]
  };

  const tocContainer = document.getElementById("toc-list");
  const pdfViewer = document.querySelector(".pdf-viewer");

  function renderTOC(bookKey) {
    const toc = books[bookKey];
    tocContainer.innerHTML = toc.map(
      (item, i) => `<li><a href="${item.file}" data-index="${i}">${item.title}</a></li>`
    ).join("");

    const links = tocContainer.querySelectorAll("a");
    if (links.length > 0) {
      links[0].classList.add("active");
      pdfViewer.src = links[0].getAttribute("href");
    }

    tocContainer.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        pdfViewer.src = e.target.getAttribute("href");

        tocContainer.querySelectorAll("a").forEach(l => l.classList.remove("active"));
        e.target.classList.add("active");
      });
    });
  }

  // Buttons to toggle book
  document.getElementById("book1-btn").addEventListener("click", () => renderTOC("book1"));
  document.getElementById("book2-btn").addEventListener("click", () => renderTOC("book2"));

  // Default: Book 1
  renderTOC("book1");
});
