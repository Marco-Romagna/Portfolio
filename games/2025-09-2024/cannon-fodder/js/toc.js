document.addEventListener("DOMContentLoaded", () => {
  const frame = document.getElementById("pdfFrame");
  const sidebar = document.getElementById("sidebar");
  const toggleBtn = document.getElementById("toggleSidebar");

  // PDF switching
  document.querySelectorAll(".toc a").forEach(link => {
    link.addEventListener("click", e => {
      e.preventDefault();
      const pdf = link.getAttribute("data-pdf");
      if (pdf && frame) {
        frame.src = pdf;

        // Highlight active
        document.querySelectorAll(".toc a").forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  });

  // Sidebar toggle
  toggleBtn.addEventListener("click", () => {
    sidebar.classList.toggle("collapsed");
  });
});
