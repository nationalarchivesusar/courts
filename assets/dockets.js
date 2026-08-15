(() => {
  "use strict";

  const root = document.querySelector("[data-docket-supreme][data-docket-district]");
  const model = window.CourtsDocketModel;
  if (!root || !model) return;

  const docketTypes = {
    supreme: root.dataset.docketSupreme,
    district: root.dataset.docketDistrict,
  };
  const fallbackUrl = root.dataset.fallbackUrl;
  const casesPath = root.dataset.casesPath;
  const maxFallbackAge = 7 * 24 * 60 * 60 * 1000;
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

  function districtCaseUrl(card) {
    const docketNumber = model.docketNumberFromCardName(card.name);
    if (!docketNumber || !casesPath) return null;
    return `${casesPath}?${new URLSearchParams({ docket: docketNumber }).toString()}`;
  }

  function renderCard(type, card) {
    const article = document.createElement("article");
    article.className = "docket-entry";
    const internalUrl = type === "district" ? districtCaseUrl(card) : null;
    const externalUrl = safeExternalUrl(card.url);
    const titleUrl = internalUrl || externalUrl;
    const title = titleUrl ? document.createElement("a") : document.createElement("span");
    title.className = "docket-entry__title";
    title.textContent = model.cleanCardName(card.name) || "Untitled matter";
    if (titleUrl) {
      title.href = titleUrl;
      if (!internalUrl) {
        title.target = "_blank";
        title.rel = "noopener noreferrer";
      }
    }
    article.append(title);

    if (Array.isArray(card.labels) && card.labels.length) {
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
    }

    const description = createDescription(descriptionLines(card.desc));
    if (description) article.append(description);
    return article;
  }

  function setStatus(type, text) {
    const status = document.getElementById(`docket-status-${type}`);
    if (status) status.textContent = text;
  }

  function render(type, docket, source) {
    const container = document.getElementById(`docket-cards-${type}`);
    const error = document.getElementById(`docket-error-${type}`);
    if (!container) return;
    container.replaceChildren();
    if (error) error.hidden = true;
    container.setAttribute("aria-busy", "false");

    const groups = Array.isArray(docket?.groups) ? docket.groups : [];
    const activeGroups = groups.filter((group) => Array.isArray(group.cards) && group.cards.length);
    if (!activeGroups.length) {
      const empty = document.createElement("p");
      empty.className = "docket-empty";
      empty.textContent = model.emptyMessage(type, Number(docket?.qualifyingListCount || 0));
      container.append(empty);
      setStatus(type, model.statusLabel(source));
      return;
    }

    activeGroups.forEach((group) => {
      if (type === "district") {
        const details = document.createElement("details");
        details.className = "judge-docket";
        details.open = true;

        const summary = document.createElement("summary");
        summary.className = "judge-docket__summary";
        const identity = document.createElement("span");
        identity.className = "judge-docket__identity";
        const eyebrow = document.createElement("span");
        eyebrow.className = "judge-docket__eyebrow";
        eyebrow.textContent = "District Judge";
        const name = document.createElement("span");
        name.className = "judge-docket__name";
        name.textContent = String(group.sourceListName || "").trim();
        identity.append(eyebrow, name);

        const count = document.createElement("span");
        count.className = "judge-docket__count";
        count.textContent = model.matterCountLabel(group.cards.length);
        summary.append(identity, count);

        const cases = document.createElement("div");
        cases.className = "judge-docket__cases";
        group.cards.forEach((card) => cases.append(renderCard(type, card)));
        details.append(summary, cases);
        container.append(details);
      } else {
        group.cards.forEach((card) => container.append(renderCard(type, card)));
      }
    });
    setStatus(type, model.statusLabel(source));
  }

  async function fetchBoard(type, boardId, signal) {
    const url = new URL(`https://api.trello.com/1/boards/${encodeURIComponent(boardId)}/lists`);
    url.searchParams.set("cards", "open");
    url.searchParams.set("card_fields", "id,name,desc,url,labels,closed");
    url.searchParams.set("fields", "id,name,closed");
    url.searchParams.set("filter", "open");
    const response = await fetch(url, { signal, credentials: "omit" });
    if (!response.ok) throw new Error(`Docket request failed (${response.status})`);
    const lists = await response.json();
    if (!Array.isArray(lists)) throw new Error("Unexpected docket response");
    return model.selectDocketData(type, lists);
  }

  async function fetchFallback(boardId) {
    if (!fallbackUrl) return null;
    const response = await fetch(fallbackUrl, { credentials: "same-origin" });
    if (!response.ok) return null;
    const data = await response.json();
    if (!model.fallbackIsFresh(data?.generatedAt, Date.now(), maxFallbackAge)) return null;
    const docket = data?.boards?.[boardId];
    return docket && Array.isArray(docket.groups) ? docket : null;
  }

  function showUnavailable(type, container, error) {
    container.replaceChildren();
    container.setAttribute("aria-busy", "false");
    if (error) {
      const message = error.querySelector("p");
      if (message) {
        message.textContent = model.unavailableMessage(type);
      }
      error.hidden = false;
    }
    setStatus(type, "Unavailable");
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
      const docket = await fetchBoard(type, boardId, controller.signal);
      render(type, docket, "live");
    } catch {
      try {
        const fallback = await fetchFallback(boardId);
        if (!fallback) throw new Error("No current cached docket data");
        render(type, fallback, "fallback");
      } catch {
        showUnavailable(type, container, error);
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
