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
  const usedIds = new Set(Array.from(document.querySelectorAll("[id]"), (node) => node.id));
  const provisions = [];
  let activeCitationSuffix = "";

  async function copyText(text) {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
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

  function showToast(message) {
    let toast = document.getElementById("rule-copy-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "rule-copy-toast";
      toast.className = "rule-copy-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.append(toast);
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 1600);
  }

  function setButtonFeedback(button, message, original) {
    button.textContent = message;
    button.dataset.state = "copied";
    window.setTimeout(() => {
      button.textContent = original;
      delete button.dataset.state;
    }, 1800);
  }

  const citationButton = article.querySelector("[data-copy-citation]");
  citationButton?.addEventListener("click", async () => {
    const pinpointCitation = `${citation}${activeCitationSuffix}`;
    try {
      await copyText(pinpointCitation);
      setButtonFeedback(citationButton, "Citation copied", "Copy citation");
    } catch {
      citationButton.textContent = pinpointCitation;
    }
  });

  const ruleLinkButton = article.querySelector("[data-copy-rule-link]");
  ruleLinkButton?.addEventListener("click", async () => {
    const url = new URL(window.location.href);
    url.hash = "";
    try {
      await copyText(url.toString());
      setButtonFeedback(ruleLinkButton, "Rule link copied", "Copy rule link");
    } catch {
      showToast("Unable to copy link");
    }
  });
  article.querySelector("[data-print-rule]")?.addEventListener("click", () => window.print());

  function uniqueId(preferred) {
    const base = preferred || "provision";
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    return id;
  }

  function slug(value) {
    return value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "provision";
  }

  function provisionType(token, depth) {
    if (/^\d+$/.test(token)) return "paragraph";
    if (/^[A-Z]+$/.test(token)) return depth <= 1 ? "subsection" : "subparagraph";
    if (/^[ivxlcdm]+$/.test(token) && depth >= 3) return "clause";
    if (/^[a-z]+$/.test(token)) return "subsection";
    return `level-${depth}`;
  }

  function ownText(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll("ol, ul, button.rule-marker").forEach((node) => node.remove());
    return clone.textContent.replace(/\s+/g, " ").trim();
  }

  function provisionLabel(element, displayMarker) {
    const text = ownText(element);
    const sentence = text.match(/^(.{1,90}?[.;:])(?:\s|$)/)?.[1] || text.slice(0, 90);
    return `${displayMarker}${sentence ? ` ${sentence}` : ""}${text.length > sentence.length ? "…" : ""}`;
  }

  function firstMarkerMatch(element) {
    const containingList = element.closest("ol, ul");
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const nodeList = node.parentElement?.closest("ol, ul");
        if (nodeList && nodeList !== containingList) return NodeFilter.FILTER_REJECT;
        return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
      },
    });
    const node = walker.nextNode();
    if (!node) return null;
    const match = node.textContent.match(/^\s*(?:\(\s*([A-Za-z0-9]+)\s*\)|([0-9]+)\.)\s*/);
    if (!match) return null;
    return { node, token: match[1] || match[2], raw: match[0] };
  }

  function stripMarker(match) {
    match.node.textContent = match.node.textContent.slice(match.raw.length);
  }

  function markerHost(element) {
    if (element.tagName !== "LI") return element;
    return Array.from(element.children).find((child) => child.tagName === "P") || element;
  }

  function addProvision(element, token, displayMarker, parent, depth, explicitMatch = null) {
    if (explicitMatch) stripMarker(explicitMatch);
    const type = provisionType(token, depth);
    const segment = `${type}-${slug(token)}`;
    const id = uniqueId(parent ? `${parent.id}-${segment}` : segment);
    const suffix = `${parent?.citationSuffix || ""}(${token})`;

    element.id = id;
    element.classList.add("rule-provision", `rule-provision--level-${Math.min(depth, 6)}`);
    element.dataset.citationSuffix = suffix;
    element.style.setProperty("--provision-depth", Math.min(depth, 6));

    const button = document.createElement("button");
    button.type = "button";
    button.className = "rule-marker";
    button.textContent = displayMarker;
    button.title = `Copy link to ${type} ${displayMarker}`;
    button.setAttribute("aria-label", `Copy link to ${type} ${displayMarker}`);
    markerHost(element).prepend(button);

    const info = { element, token, type, id, depth, citationSuffix: suffix, displayMarker };
    provisions.push(info);
    button.addEventListener("click", (event) => copyProvisionLink(event, info));
    return info;
  }

  function processList(list, parent, depth) {
    list.classList.add("rule-provision-list");
    const start = Number.parseInt(list.getAttribute("start") || "1", 10);
    Array.from(list.children).forEach((item, index) => {
      if (item.tagName !== "LI") return;
      const explicit = firstMarkerMatch(markerHost(item));
      const token = explicit?.token || (list.tagName === "OL" ? String(start + index) : "");
      let info = parent;
      if (token) {
        const display = explicit ? explicit.raw.trim() : `(${token})`;
        info = addProvision(item, token, display, parent, depth, explicit);
      }
      Array.from(item.children)
        .filter((child) => child.matches("ol, ul"))
        .forEach((nested) => processList(nested, info, depth + 1));
    });
  }

  function enhanceProvisions() {
    let active = null;
    Array.from(content.children).forEach((element) => {
      if (element.matches("p")) {
        const explicit = firstMarkerMatch(element);
        if (explicit) {
          active = addProvision(element, explicit.token, explicit.raw.trim(), null, 1, explicit);
        }
        return;
      }
      if (element.matches("ol, ul")) {
        processList(element, active, active ? 2 : 1);
      }
    });
  }

  function addHeadingAnchors(tocEntries) {
    const headings = Array.from(content.querySelectorAll("h2, h3"));
    headings.forEach((heading, index) => {
      const headingText = heading.textContent.trim();
      if (heading.id) usedIds.delete(heading.id);
      heading.id = uniqueId(
        heading.id || headingText.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `section-${index + 1}`,
      );
      const anchor = document.createElement("a");
      anchor.className = "heading-anchor";
      anchor.href = `#${heading.id}`;
      anchor.setAttribute("aria-label", `Link to ${headingText}`);
      anchor.textContent = "§";
      heading.append(anchor);
      tocEntries.push({ id: heading.id, label: headingText, depth: heading.tagName === "H3" ? 2 : 1 });
    });
  }

  function buildToc() {
    const toc = document.getElementById("rule-toc");
    const tocList = toc?.querySelector("ol");
    if (!toc || !tocList) return;
    const entries = provisions
      .filter((item) => item.depth === 1)
      .map((item) => ({ id: item.id, label: provisionLabel(item.element, item.displayMarker), depth: item.depth }));
    addHeadingAnchors(entries);
    entries.forEach((entry) => {
      const item = document.createElement("li");
      if (entry.depth > 1) item.className = "toc-subsection";
      const link = document.createElement("a");
      link.href = `#${entry.id}`;
      link.textContent = entry.label;
      item.append(link);
      tocList.append(item);
    });
    toc.hidden = entries.length === 0;
  }

  function flashProvision(element) {
    document.querySelectorAll(".is-pinpoint-highlighted").forEach((node) => node.classList.remove("is-pinpoint-highlighted"));
    element.classList.remove("is-pinpoint-highlighted");
    void element.offsetWidth;
    element.classList.add("is-pinpoint-highlighted");
    window.clearTimeout(flashProvision.timeout);
    flashProvision.timeout = window.setTimeout(() => element.classList.remove("is-pinpoint-highlighted"), 2200);
  }

  function revealHashTarget({ scroll = true } = {}) {
    const id = decodeURIComponent(window.location.hash.slice(1));
    const target = id ? document.getElementById(id) : null;
    const provision = target?.closest(".rule-provision");
    activeCitationSuffix = provision?.dataset.citationSuffix || "";
    if (!target || !article.contains(target)) return;
    flashProvision(provision || target);
    if (scroll) {
      window.requestAnimationFrame(() => target.scrollIntoView({ behavior: "smooth", block: "center" }));
    }
  }

  async function copyProvisionLink(event, info) {
    event.preventDefault();
    event.stopPropagation();
    const url = new URL(window.location.href);
    url.hash = info.id;
    try {
      await copyText(url.toString());
      window.history.pushState(null, "", url);
      activeCitationSuffix = info.citationSuffix;
      flashProvision(info.element);
      showToast("Link copied");
    } catch {
      showToast("Unable to copy link");
    }
  }

  function pinpointId(markers) {
    let id = "";
    markers.forEach((token, index) => {
      const segment = `${provisionType(token, index + 1)}-${slug(token)}`;
      id = id ? `${id}-${segment}` : segment;
    });
    return id;
  }

  function linkRuleCitations() {
    const ruleSets = {
      FRCP: "frcp",
      FRAP: "frap",
      FRE: "fre",
      FRCMP: "frcmp",
      FRCRP: "frcmp",
      SUPCT: "supct",
      SCR: "supct",
      SCT: "supct",
    };
    const basePath = window.location.pathname.split(`/${set}/`)[0];
    const pattern = /\b(?:(FRCP|FRAP|FRE|FRCMP|FRCrP|SUPCT|SCR|SCT)\s+|Rule\s+)(\d+(?:\.\d+)?)(\s*(?:\([A-Za-z0-9]+\))+)?/g;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        pattern.lastIndex = 0;
        if (!pattern.test(node.textContent)) return NodeFilter.FILTER_SKIP;
        if (node.parentElement?.closest("a, button, script, style")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      const fragment = document.createDocumentFragment();
      let cursor = 0;
      pattern.lastIndex = 0;
      let match;
      while ((match = pattern.exec(node.textContent)) !== null) {
        fragment.append(document.createTextNode(node.textContent.slice(cursor, match.index)));
        const targetSet = match[1] ? ruleSets[match[1].toUpperCase()] : set;
        const markers = Array.from(match[3]?.matchAll(/\(([A-Za-z0-9]+)\)/g) || [], (part) => part[1]);
        const link = document.createElement("a");
        link.href = `${basePath}/${targetSet}/rule_${match[2]}/${markers.length ? `#${pinpointId(markers)}` : ""}`;
        link.textContent = match[0];
        fragment.append(link);
        cursor = pattern.lastIndex;
      }
      fragment.append(document.createTextNode(node.textContent.slice(cursor)));
      node.replaceWith(fragment);
    });
  }

  enhanceProvisions();
  buildToc();
  linkRuleCitations();
  revealHashTarget();
  window.addEventListener("hashchange", () => revealHashTarget());
})();
