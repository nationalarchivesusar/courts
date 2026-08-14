(() => {
  const root = document.querySelector("[data-docket-supreme][data-docket-district]");
  if (!root) return;

  const docketTypes = {
    supreme: root.dataset.docketSupreme,
    district: root.dataset.docketDistrict,
  };
  const fallbackUrl = root.dataset.fallbackUrl;
  const colorNames = new Set(["blue", "green", "orange", "red", "purple", "yellow", "black", "pink", "sky", "lime", "gray"]);

  function safeExternalUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function appendMarkdownLinks(parent, text) {
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
    let cursor = 0;
    let match;
    while ((match = linkPattern.exec(text)) !== null) {
      parent.append(document.createTextNode(text.slice(cursor, match.index)));
      const href = safeExternalUrl(match[2]);
      if (href) {
        const link = document.createElement("a");
        link.href = href;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = match[1];
        parent.append(link);
      } else {
        parent.append(document.createTextNode(match[0]));
      }
      cursor = linkPattern.lastIndex;
    }
    parent.append(document.createTextNode(text.slice(cursor)));
  }

  function descriptionLines(value) {
    return String(value || "")
      .replace(/\\([*_`>])/g, "$1")
      .replace(/^\s*>+\s?/gm, "")
      .split(/\n|\\n/)
      .map((line) => line.trim().replace(/^[-*•]\s+/, "• "))
      .filter((line) => line && !/^[-_*~`=]{5,}$/.test(line));
  }

  function createDescription(lines) {
    if (!lines.length) return null;
    const wrapper = document.createElement("div");
    wrapper.className = "docket-entry__summary";
    const first = document.createElement("p");
    appendMarkdownLinks(first, lines[0]);
    wrapper.append(first);

    if (lines.length > 1) {
      const details = document.createElement("details");
      const summary = document.createElement("summary");
      summary.textContent = "More docket details";
      details.append(summary);
      lines.slice(1).forEach((line) => {
        const paragraph = document.createElement("p");
        appendMarkdownLinks(paragraph, line);
        details.append(paragraph);
      });
      wrapper.append(details);
    }
    return wrapper;
  }

  function eligible(card) {
    const name = String(card?.name || "").trim();
    return Boolean(
      name &&
      Array.isArray(card.labels) &&
      card.labels.length &&
      !["____", "create template"].includes(name.toLowerCase()) &&
      !/^[-_—]+$/.test(name),
    );
  }

  function renderCard(card) {
    const article = document.createElement("article");
    article.className = "docket-entry";
    const titleUrl = safeExternalUrl(card.url);
    const title = titleUrl ? document.createElement("a") : document.createElement("span");
    title.className = "docket-entry__title";
    title.textContent = String(card.name || "Untitled matter").trim();
    if (titleUrl) {
      title.href = titleUrl;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    article.append(title);

    const labels = document.createElement("div");
    labels.className = "docket-entry__labels";
    card.labels.forEach((label) => {
      const item = document.createElement("span");
      const color = colorNames.has(label.color) ? label.color : "gray";
      item.className = `docket-label docket-label--${color}`;
      item.textContent = String(label.name || "Status");
      labels.append(item);
    });
    article.append(labels);

    const description = createDescription(descriptionLines(card.desc));
    if (description) article.append(description);
    return article;
  }

  function setStatus(type, text) {
    const status = document.getElementById(`docket-status-${type}`);
    if (status) status.textContent = text;
  }

  function render(type, cards, source) {
    const container = document.getElementById(`docket-cards-${type}`);
    const error = document.getElementById(`docket-error-${type}`);
    if (!container) return;
    container.replaceChildren();
    if (error) error.hidden = true;
    container.setAttribute("aria-busy", "false");
    const usableCards = cards.filter(eligible);

    if (!usableCards.length) {
      const empty = document.createElement("p");
      empty.className = "docket-empty";
      empty.textContent = "No active matters are listed at this time.";
      container.append(empty);
      setStatus(type, source === "fallback" ? "Cached" : "Current");
      return;
    }

    usableCards.forEach((card) => container.append(renderCard(card)));
    setStatus(type, source === "fallback" ? "Cached" : "Current");
  }

  async function fetchBoard(boardId, signal) {
    const url = new URL(`https://api.trello.com/1/boards/${encodeURIComponent(boardId)}/lists`);
    url.searchParams.set("cards", "open");
    url.searchParams.set("card_fields", "name,desc,url,labels");
    url.searchParams.set("fields", "name");
    const response = await fetch(url, { signal, credentials: "omit" });
    if (!response.ok) throw new Error(`Docket request failed (${response.status})`);
    const lists = await response.json();
    if (!Array.isArray(lists)) throw new Error("Unexpected docket response");
    return lists
      .filter((list) => String(list.name || "").toLowerCase().includes("docket"))
      .flatMap((list) => (Array.isArray(list.cards) ? list.cards : []));
  }

  async function fetchFallback(boardId) {
    if (!fallbackUrl) return [];
    const response = await fetch(fallbackUrl, { credentials: "same-origin" });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.[boardId]) ? data[boardId] : [];
  }

  async function load(type) {
    const boardId = docketTypes[type];
    const container = document.getElementById(`docket-cards-${type}`);
    const error = document.getElementById(`docket-error-${type}`);
    if (!boardId || !container) return;

    container.setAttribute("aria-busy", "true");
    container.replaceChildren();
    const loading = document.createElement("p");
    loading.className = "docket-placeholder";
    loading.textContent = "Loading current matters…";
    container.append(loading);
    if (error) error.hidden = true;
    setStatus(type, "Loading");

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const cards = await fetchBoard(boardId, controller.signal);
      render(type, cards, "live");
    } catch {
      try {
        const fallback = await fetchFallback(boardId);
        if (fallback.length) {
          render(type, fallback, "fallback");
        } else {
          throw new Error("No cached docket data");
        }
      } catch {
        container.replaceChildren();
        container.setAttribute("aria-busy", "false");
        if (error) error.hidden = false;
        setStatus(type, "Unavailable");
      }
    } finally {
      window.clearTimeout(timeout);
    }
  }

  document.querySelectorAll("[data-retry-docket]").forEach((button) => {
    button.addEventListener("click", () => load(button.dataset.retryDocket));
  });
  Object.keys(docketTypes).forEach(load);
})();

