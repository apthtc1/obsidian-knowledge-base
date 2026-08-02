/* Luminary-style effects for Quartz: spotlight grid + scroll reveal */
(function () {
  "use strict";

  // Gate reveal styles on JS being available (no JS => no hidden content)
  document.documentElement.classList.add("js");

  var revealSelector = ".page-header, article, .page-footer, footer";

  function createGrid() {
    var grid = document.createElement("div");
    grid.className = "spotlight-grid";
    grid.dataset.persist = "";
    return grid;
  }

  // ── Spotlight grid behind the cursor (top of the page) ──
  var grid = createGrid();
  document.body.appendChild(grid);

  var gx = 0,
    gy = 0,
    tx = 0,
    ty = 0;
  document.addEventListener(
    "mousemove",
    function (e) {
      tx = e.clientX;
      ty = e.clientY;
    },
    { passive: true },
  );

  function lerpGrid() {
    gx += (tx - gx) * 0.08;
    gy += (ty - gy) * 0.08;
    grid.style.setProperty("--mx", gx + "px");
    grid.style.setProperty("--my", gy + "px");
    requestAnimationFrame(lerpGrid);
  }
  requestAnimationFrame(lerpGrid);

  // ── Reveal on scroll ──
  function initReveal() {
    var els = document.querySelectorAll(revealSelector);
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) {
        el.classList.add("is-visible");
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) {
            en.target.classList.add("is-visible");
            io.unobserve(en.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: "0px 0px -30px 0px" },
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  initReveal();

  // ── Collapsible left sidebar (hamburger toggle, persisted) ──
  var SIDEBAR_KEY = "kb-sidebar-collapsed";

  function sidebarIsCollapsed() {
    var v = null;
    try {
      v = window.localStorage.getItem(SIDEBAR_KEY);
    } catch (e) {
      /* ignore */
    }
    return v === null ? true : v === "1";
  }

  function applySidebarState() {
    var root = document.documentElement;
    if (sidebarIsCollapsed()) {
      root.classList.add("sidebar-collapsed");
    } else {
      root.classList.remove("sidebar-collapsed");
    }
  }

  function initSidebarToggle() {
    if (!document.querySelector(".sidebar.left")) return;
    if (document.getElementById("sidebar-toggle")) return;
    var btn = document.createElement("button");
    btn.id = "sidebar-toggle";
    btn.type = "button";
    btn.setAttribute("aria-label", "Переключить меню");
    btn.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>';
    btn.addEventListener("click", function () {
      try {
        window.localStorage.setItem(
          SIDEBAR_KEY,
          sidebarIsCollapsed() ? "0" : "1",
        );
      } catch (e) {
        /* ignore */
      }
      applySidebarState();
    });
    document.body.appendChild(btn);
  }

  initSidebarToggle();
  applySidebarState();

  // ── Re-init after SPA navigation (new content) and restore the grid
  document.addEventListener(
    "nav",
    function () {
      if (!document.querySelector(".spotlight-grid")) {
        grid = createGrid();
        document.body.appendChild(grid);
      }
      initSidebarToggle();
      applySidebarState();
      initReveal();
    },
    { passive: true },
  );
})();
