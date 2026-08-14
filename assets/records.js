(() => {
  "use strict";

  const model = window.JISRecordsModel;
  const experience = document.getElementById("records-experience");
  const form = document.getElementById("records-search-form");
  const input = document.getElementById("records-query");
  const status = document.getElementById("records-status");
  const results = document.getElementById("records-results");
  if (!model || !experience || !form || !input || !status || !results) return;

  const apiBase = experience.dataset.apiBase || "";

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isFinite(date.getTime())
      ? new Intl.DateTimeFormat("en-US", {
          year: "numeric", month: "long", day: "numeric",
          hour: "numeric", minute: "2-digit", timeZoneName: "short",
        }).format(date)
      : "Date unavailable";
  }

  async function requestJson(path, parameters) {
    if (!apiBase) throw new Error("configuration");
    const response = await fetch(model.apiUrl(apiBase, path, parameters), {
      credentials: "omit",
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      const error = new Error(response.status === 400 ? "invalid" : "unavailable");
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  function addDefinition(list, term, value) {
    if (value === null || value === undefined || value === "") return;
    list.append(element("dt", "", term), element("dd", "", value));
  }

  function arrestElement(arrest) {
    const article = element("article", "public-arrest");
    article.append(element("h4", "", arrest.arrestNumber || "Arrest record"));

    const notice = model.identityNotice(arrest);
    if (notice) article.append(element("p", "identity-unverified", notice));

    const details = element("dl", "public-arrest__details");
    addDefinition(details, "Date and time", formatDate(arrest.occurredAt));
    addDefinition(details, "Username at arrest", arrest.subjectUsernameAtArrest);
    addDefinition(details, "Officer", arrest.officer?.usernameAtArrest || null);
    addDefinition(details, "Agency at arrest", arrest.officer?.agencyNameAtArrest || null);
    addDefinition(details, "Location", arrest.location);
    article.append(details);

    article.append(element("h5", "", "Alleged offenses"));
    const emptyLabel = model.allegedOffenseLabel(arrest);
    if (emptyLabel) {
      article.append(element("p", "public-arrest__empty", emptyLabel));
    } else {
      const list = element("ul", "public-arrest__offenses");
      arrest.allegedOffenses.forEach((offense) => {
        const text = offense.citationRaw
          ? `${offense.citationRaw} — ${offense.offenseName}`
          : offense.offenseName;
        list.append(element("li", "", text));
      });
      article.append(list);
    }
    return article;
  }

  function sentenceComponentText(component) {
    const amount = component?.amount === null || component?.amount === undefined
      ? ""
      : String(component.amount);
    const unit = component?.unit || component?.currency || "";
    const value = [amount, unit].filter(Boolean).join(" ");
    const label = String(component?.type || "other").replaceAll("_", " ");
    const detail = component?.details ? ` — ${component.details}` : "";
    return `${label.charAt(0).toUpperCase()}${label.slice(1)}${value ? `: ${value}` : ""}${detail}`;
  }

  function convictionCaseElement(group) {
    const article = element("article", "public-conviction");
    article.append(element("p", "public-conviction__docket", group.docketNumber));
    article.append(element("h4", "", group.caption));

    const notice = model.identityNotice({ identity: group.identity });
    if (notice) article.append(element("p", "identity-unverified", notice));

    const details = element("dl", "public-arrest__details public-conviction__details");
    addDefinition(details, "Defendant", group.defendantUsername);
    addDefinition(details, "Convicted", group.convictedAt ? formatDate(group.convictedAt) : null);
    addDefinition(details, "Disposition basis", model.dispositionBasisLabel(group.basis));
    addDefinition(details, "Current status", model.convictionStatusLabel(group.currentStatus));
    article.append(details);

    article.append(element("h5", "", "Convicted counts"));
    const counts = element("ol", "public-conviction__counts");
    group.counts.forEach((count) => {
      const prefix = Number.isFinite(Number(count.countNumber)) ? `Count ${count.countNumber}: ` : "";
      const citation = count.displayCitation ? `${count.displayCitation} — ` : "";
      counts.append(element("li", "", `${prefix}${citation}${count.offenseName}`));
    });
    article.append(counts);

    article.append(element("h5", "", "Sentence"));
    if (!Array.isArray(group.sentences) || group.sentences.length === 0) {
      article.append(element("p", "public-arrest__empty", "No public sentencing details are currently available for this conviction record."));
    } else {
      group.sentences.forEach((sentence) => {
        const block = element("div", "public-conviction__sentence");
        const dateLabel = sentence.imposedAt ? `Imposed ${formatDate(sentence.imposedAt)}` : "Sentencing order";
        block.append(element("p", "public-conviction__sentence-date", dateLabel));
        block.append(element("p", "public-conviction__sentence-text", sentence.rawText || "Sentence details unavailable."));
        if (Array.isArray(sentence.components) && sentence.components.length > 0) {
          const components = element("ul", "public-conviction__components");
          sentence.components.forEach((component) => {
            components.append(element("li", "", sentenceComponentText(component)));
          });
          block.append(components);
        }
        article.append(block);
      });
    }
    return article;
  }

  async function loadArrests(container, path, cursor, button) {
    if (button) button.disabled = true;
    try {
      const response = await requestJson(path, { limit: 25, cursor });
      const arrests = Array.isArray(response?.data?.arrests) ? response.data.arrests : [];
      arrests.forEach((arrest) => container.append(arrestElement(arrest)));
      const nextCursor = response?.meta?.pagination?.nextCursor || null;
      if (button) button.remove();
      if (nextCursor) {
        const loadMore = element("button", "records-load-more", "Load more arrests");
        loadMore.type = "button";
        loadMore.addEventListener("click", () => void loadArrests(container, path, nextCursor, loadMore));
        container.after(loadMore);
      } else if (arrests.length === 0 && cursor === null) {
        container.append(element("p", "records-empty", "No public arrest records are available in this category."));
      }
    } catch {
      if (button) button.disabled = false;
      container.append(element("p", "notice", "Arrest details are temporarily unavailable. Please try again later."));
    }
  }

  async function loadConvictions(container, path, cursor, button) {
    if (button) button.disabled = true;
    try {
      const response = await requestJson(path, { limit: 100, cursor });
      const convictions = Array.isArray(response?.data?.convictions) ? response.data.convictions : [];
      model.groupConvictions(convictions).forEach((group) => container.append(convictionCaseElement(group)));
      const nextCursor = response?.meta?.pagination?.nextCursor || null;
      if (button) button.remove();
      if (nextCursor) {
        const loadMore = element("button", "records-load-more", "Load more convictions");
        loadMore.type = "button";
        loadMore.addEventListener("click", () => void loadConvictions(container, path, nextCursor, loadMore));
        container.after(loadMore);
      } else if (convictions.length === 0 && cursor === null) {
        container.append(element("p", "records-empty", "No public conviction records are available in this category."));
      }
    } catch {
      if (button) button.disabled = false;
      container.append(element("p", "notice", "Conviction details are temporarily unavailable. Please try again later."));
    }
  }

  function addRecordHistories(section, convictionPath, arrestPath) {
    section.append(element("h3", "records-subheading", "Conviction history"));
    const convictions = element("div", "public-conviction-list");
    section.append(convictions);
    void loadConvictions(convictions, convictionPath, null, null);

    section.append(element("h3", "records-subheading", "Arrest history"));
    const arrests = element("div", "public-arrest-list");
    section.append(arrests);
    void loadArrests(arrests, arrestPath, null, null);
  }

  function accountSection(account) {
    const section = element("section", "records-class records-class--verified");
    section.append(element("p", "records-class__label", "Verified account records"));
    section.append(element("h2", "", account.currentUsername));
    const identity = element("dl", "records-account-identity");
    addDefinition(identity, "Username", account.currentUsername);
    addDefinition(identity, "Roblox UserId", account.robloxUserId);
    section.append(identity);
    addRecordHistories(
      section,
      `/api/v1/people/${encodeURIComponent(account.robloxUserId)}/convictions`,
      `/api/v1/people/${encodeURIComponent(account.robloxUserId)}/arrests`,
    );
    return section;
  }

  function historicalSection(query, historicalUsernames) {
    const section = element("section", "records-class records-class--historical");
    section.append(element("p", "records-class__label", "Historical username records"));
    section.append(element("h2", "", "Records under the source-recorded username"));
    const spellings = historicalUsernames.map((item) => `'${item.recordedUsername}'`).join(", ");
    section.append(element(
      "p",
      "historical-identity-explanation",
      `These records were originally recorded under ${spellings}. The historical sources did not establish a Roblox UserId, and these records have not been independently linked to a current Roblox account.`,
    ));
    addRecordHistories(
      section,
      `/api/v1/convictions/by-username/${encodeURIComponent(query)}`,
      `/api/v1/arrests/by-username/${encodeURIComponent(query)}`,
    );
    return section;
  }

  async function search(query) {
    results.replaceChildren();
    results.setAttribute("aria-busy", "true");
    status.textContent = "Searching public records…";
    try {
      const response = await requestJson("/api/v1/records/search", { q: query });
      const classes = model.resultClasses(response?.data);
      classes.accounts.forEach((account) => results.append(accountSection(account)));
      if (classes.historicalUsernames.length > 0) {
        results.append(historicalSection(query, classes.historicalUsernames));
      }
      if (classes.accounts.length === 0 && classes.historicalUsernames.length === 0) {
        status.textContent = `No public records were found for '${query}'.`;
        results.append(element("p", "records-empty", "Check the exact username or UserId and try again."));
      } else {
        status.textContent = "Public record categories are shown below.";
      }
    } catch (error) {
      const reason = error instanceof Error ? error.message : "unavailable";
      status.textContent = reason === "configuration"
        ? "Public records search is not configured for this site."
        : reason === "invalid"
          ? "Enter a valid Roblox username or positive UserId."
          : "The Judicial Information System is temporarily unavailable. Please try again later.";
    } finally {
      results.setAttribute("aria-busy", "false");
    }
  }

  function updateLocation(query) {
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    history.replaceState(null, "", url);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = model.normalizeQuery(input.value);
    if (model.queryKind(query) === "invalid") {
      status.textContent = "Enter 1–64 letters, numbers, or underscores.";
      input.setAttribute("aria-invalid", "true");
      return;
    }
    input.removeAttribute("aria-invalid");
    updateLocation(query);
    void search(query);
  });

  const initialQuery = model.normalizeQuery(new URLSearchParams(window.location.search).get("q"));
  if (initialQuery) {
    input.value = initialQuery;
    if (model.queryKind(initialQuery) === "invalid") {
      status.textContent = "Enter 1–64 letters, numbers, or underscores.";
      input.setAttribute("aria-invalid", "true");
    } else {
      void search(initialQuery);
    }
  }
})();
