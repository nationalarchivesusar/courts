(() => {
  "use strict";

  const detail = document.getElementById("case-detail");
  const nav = document.getElementById("case-section-nav");
  const links = document.getElementById("case-section-nav-links");
  if (!detail || !nav || !links) return;

  let scheduled = false;

  function slug(value) {
    return String(value || "")
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "section";
  }

  function rebuild() {
    scheduled = false;
    const sections = Array.from(detail.querySelectorAll(":scope > .case-detail-section"));
    links.replaceChildren();
    const used = new Set();

    sections.forEach((section) => {
      const heading = section.querySelector(":scope > .case-detail-section__heading");
      const label = String(heading?.textContent || "").trim();
      if (!heading || !label) return;
      let id = `case-${slug(label)}`;
      let suffix = 2;
      while (used.has(id)) {
        id = `case-${slug(label)}-${suffix}`;
        suffix += 1;
      }
      used.add(id);
      section.id = id;
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.textContent = label;
      links.append(link);
    });

    nav.hidden = links.childElementCount < 2;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(rebuild);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(detail, { childList: true, subtree: true, characterData: true });
  schedule();
})();
