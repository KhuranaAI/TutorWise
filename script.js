(function () {
  /* ===== Mobile nav toggle ===== */
  const toggle = document.getElementById("menu-toggle");
  const links  = document.getElementById("nav-links");

  if (!toggle || !links) return;

  function closeMenu() {
    links.classList.remove("active");
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "☰";
  }

  function openMenu() {
    links.classList.add("active");
    toggle.setAttribute("aria-expanded", "true");
    toggle.textContent = "✕";
  }

  toggle.addEventListener("click", () => {
    links.classList.contains("active") ? closeMenu() : openMenu();
  });

  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => closeMenu());
  });

  document.addEventListener("click", (e) => {
    const nav = document.querySelector("nav");
    if (nav && !nav.contains(e.target)) closeMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeMenu();
  });

  /* ===== Active nav link ===== */
  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  links.querySelectorAll("a").forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    if (currentFile.startsWith("blog-post") && href === "blog.html") {
      a.classList.add("active");
    } else if (href === currentFile) {
      a.classList.add("active");
    } else if ((currentFile === "" || currentFile === "/") && href === "index.html") {
      a.classList.add("active");
    }
  });
})();
