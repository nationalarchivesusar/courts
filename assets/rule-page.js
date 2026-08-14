(() => {
  const article = document.querySelector(".legal-document");
  const content = article?.querySelector(".rule-content");
  if (!article || !content) return;

  const set = document.querySelector(".rule-shell")?.dataset.ruleSet || "";
  const title = article.querySelector("h1")?.textContent.trim() || "Rule";
  const ruleNumber = title.match(/^Rule\s+([0-9]+(?:\.[0-9]+)?)/i)?.[1] || "";
  const citationPrefixes = {
    frcp: "Fed. R. Civ. P.",
    frap: "Fed. R. App. P.",
    fre: "Fed. R. Evid.",
    frcmp: "Fed. R. Crim. P.",
    supct: "Sup. Ct. R.",
  };
  const citation = `${citationPrefixes[set] || "Rule"} ${ruleNumber}`.trim();

  async function copyText(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    field.select();
    document.execCommand("copy");
    field.remove();
  }

  const citationButton = article.querySelector("[data-copy-citation]");
  citationButton?.addEventListener("click", async () => {
    try {
      await copyText(citation);
      citationButton.textContent = "Citation copied";
      citationButton.dataset.state = "copied";
      window.setTimeout(() => {
        citationButton.textContent = "Copy citation";
        delete citationButton.dataset.state;
      }, 1800);
    } catch {
      citationButton.textContent = citation;
    }
  });
  article.querySelector("[data-print-rule]")?.addEventListener("click", () => window.print());

  const headings = Array.from(content.querySelectorAll("h2, h3"));
  const toc = document.getElementById("rule-toc");
  const tocList = toc?.querySelector("ol");
  const usedIds = new Set();
  headings.forEach((heading, index) => {
    const headingText = heading.textContent.trim();
    let id = heading.id || headingText.toLocaleLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${index + 1}`;
    const baseId = id;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);
    heading.id = id;

    const anchor = document.createElement("a");
    anchor.className = "heading-anchor";
    anchor.href = `#${id}`;
    anchor.setAttribute("aria-label", `Link to ${headingText}`);
    anchor.textContent = "§";
    heading.append(anchor);

    if (tocList) {
      const item = document.createElement("li");
      if (heading.tagName === "H3") item.className = "toc-subsection";
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.textContent = headingText;
      item.append(link);
      tocList.append(item);
    }
  });
  if (toc && headings.length) toc.hidden = false;

  const ruleSets = {
    FRCP: "frcp",
    FRAP: "frap",
    FRE: "fre",
    FRCMP: "frcmp",
    FRCrP: "frcmp",
    SUPCT: "supct",
    SCR: "supct",
    SCT: "supct",
  };
  const basePath = window.location.pathname.split(`/${set}/`)[0];
  const citationPattern = /\b(FRCP|FRAP|FRE|FRCMP|FRCrP|SUPCT|SCR|SCT)\s+(\d+(?:\.\d+)?)\b/g;
  const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!citationPattern.test(node.textContent)) return NodeFilter.FILTER_SKIP;
      citationPattern.lastIndex = 0;
      if (node.parentElement?.closest("a, script, style")) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    citationPattern.lastIndex = 0;
    let match;
    while ((match = citationPattern.exec(node.textContent)) !== null) {
      fragment.append(document.createTextNode(node.textContent.slice(cursor, match.index)));
      const targetSet = ruleSets[match[1]] || ruleSets[match[1].toUpperCase()];
      const link = document.createElement("a");
      link.href = `${basePath}/${targetSet}/rule_${match[2]}/`;
      link.textContent = match[0];
      fragment.append(link);
      cursor = citationPattern.lastIndex;
    }
    fragment.append(document.createTextNode(node.textContent.slice(cursor)));
    node.replaceWith(fragment);
  });
})();
