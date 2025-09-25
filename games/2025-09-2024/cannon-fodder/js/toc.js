document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById("pdfFrame");

  document.querySelectorAll(".toc a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const pdf = link.getAttribute("data-pdf");
      if (pdf && frame) {
        frame.src = pdf;

        // Highlight active section
        document.querySelectorAll(".toc a").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  });
});
