document.addEventListener("DOMContentLoaded", () => {
  const toc = [
    { title: "Part 1 – Introduction", file: "CannonFodder-Part1.pdf" },
    { title: "Part 2 – Basic Training", file: "CannonFodder-Part2.pdf" },
    { title: "Part 3 – Soldier", file: "CannonFodder-Part3.pdf" },
    { title: "Part 4 – Firearm Basics", file: "CannonFodder-Part4.pdf" },
    { title: "Part 5 – Defense & Survival", file: "CannonFodder-Part5.pdf" },
    { title: "Part 6 – Firearm Management", file: "CannonFodder-Part6.pdf" },
    { title: "Part 7 – Advanced Combat", file: "CannonFodder-Part7.pdf" },
    { title: "Part 8 – Out of Combat", file: "CannonFodder-Part8.pdf" },
    { title: "Part 9 – Classes & Roles", file: "CannonFodder-Part9.pdf" },
    { title: "Part 10 – General Traits", file: "CannonFodder-Part10.pdf" },
    { title: "Part 11 – Guns & Gear", file: "CannonFodder-Part11.pdf" },
    { title: "Appendix – Personal Record", file: "CannonFodder-Appendix.pdf" }
  ];

  const list = document.getElementById("toc-list");
  const pdfViewer = document.querySelector(".pdf-viewer");

  // Build TOC links
  list.innerHTML = toc.map(
    (item, i) =>
      `<li><a href="${item.file}" data-index="${i}">${item.title}</a></li>`
  ).join("");

  const links = list.querySelectorAll("a");

  // Activate the first item by default
  links[0].classList.add("active");

  // Handle click events
  list.addEventListener("click", (e) => {
    if (e.target.tagName === "A") {
      e.preventDefault();

      // Update iframe
      const newFile = e.target.getAttribute("href");
      pdfViewer.src = newFile;

      // Remove active from all
      links.forEach(link => link.classList.remove("active"));

      // Highlight clicked one
      e.target.classList.add("active");
    }
  });
});
