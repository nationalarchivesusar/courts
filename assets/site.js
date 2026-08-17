(() => {
  const key = "courts-theme";
  const allowed = new Set(["system", "light", "dark"]);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const buttons = Array.from(document.querySelectorAll("[data-theme-choice]"));
  let choice = allowed.has(document.documentElement.dataset.themePreference)
    ? document.documentElement.dataset.themePreference
    : "system";

  function applyTheme() {
    const resolved = choice === "system" ? (media.matches ? "dark" : "light") : choice;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.dataset.themePreference = choice;
    buttons.forEach((button) => {
      const active = button.dataset.themeChoice === choice;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.themeChoice;
      if (!allowed.has(next)) return;
      choice = next;
      try {
        localStorage.setItem(key, choice);
      } catch {
        // The visual preference still applies for the current page.
      }
      applyTheme();
    });
  });

  const handleSystemChange = () => {
    if (choice === "system") applyTheme();
  };
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", handleSystemChange);
  } else if (typeof media.addListener === "function") {
    media.addListener(handleSystemChange);
  }
  applyTheme();

  const navMenus = Array.from(document.querySelectorAll(".nav-menu"));
  navMenus.forEach((navMenu) => {
    const summary = navMenu.querySelector(":scope > summary");
    const syncMenuState = () => summary?.setAttribute("aria-expanded", String(navMenu.open));

    summary?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      navMenu.open = !navMenu.open;
    });

    navMenu.addEventListener("toggle", () => {
      syncMenuState();
      if (!navMenu.open) return;
      navMenus.forEach((otherMenu) => {
        if (otherMenu !== navMenu) otherMenu.open = false;
      });
    });
    syncMenuState();
  });

  document.addEventListener("click", (event) => {
    navMenus.forEach((navMenu) => {
      if (navMenu.open && !navMenu.contains(event.target)) navMenu.open = false;
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const openMenu = navMenus.find((navMenu) => navMenu.open);
    if (!openMenu) return;
    const summary = openMenu.querySelector(":scope > summary");
    openMenu.open = false;
    summary?.focus();
  });
})();
