(() => {
  const key = "courts-theme";
  const allowed = new Set(["system", "light", "dark"]);
  let choice = "system";

  try {
    const stored = localStorage.getItem(key);
    if (allowed.has(stored)) choice = stored;
  } catch {
    // Storage restrictions should not prevent the page from loading.
  }

  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
  document.documentElement.dataset.theme =
    choice === "dark" || (choice === "system" && prefersDark) ? "dark" : "light";
  document.documentElement.dataset.themePreference = choice;
})();
