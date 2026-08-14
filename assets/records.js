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
    const heading = element("h3", "", arrest.arrestNumber || "Arrest record");
    article.append(heading);

    const notice = model.identityNotice(arrest);
    if (notice) article.append(element("p", "identity-unverified", notice));

    const details = element("dl", "public-arrest__details");
    addDefinition(details, "Date and time", formatDate(arrest.occurredAt));
    addDefinition(details, "Username at arrest", arrest.subjectUsernameAtArrest);
    addDefinition(details, "Officer", arrest.officer?.usernameAtArrest || null);
    addDefinition(details, "Agency at arrest", arrest.officer?.agencyNameAtArrest || null);
    addDefinition(details, "Location", arrest.location);
    article.append(details);

    const offensesHeading = element("h4", "", "Alleged offenses");
    article.append(offensesHeading);
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

  function accountSection(account) {
    const section = element("section", "records-class records-class--verified");
    section.append(element("p", "records-class__label", "Verified account records"));
    section.append(element("h2", "", account.currentUsername));
    const identity = element("dl", "records-account-identity");
    addDefinition(identity, "Username", account.currentUsername);
    addDefinition(identity, "Roblox UserId", account.robloxUserId);
    section.append(identity);
    section.append(element("h3", "records-subheading", "Arrest history"));
    const list = element("div", "public-arrest-list");
    section.append(list);
    void loadArrests(list, `/api/v1/people/${encodeURIComponent(account.robloxUserId)}/arrests`, null, null);
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
      `These records were originally recorded under ${spellings}. The historical source did not contain a Roblox UserId, and these records have not been independently linked to a current Roblox account.`,
    ));
    const list = element("div", "public-arrest-list");
    section.append(list);
    void loadArrests(list, `/api/v1/arrests/by-username/${encodeURIComponent(query)}`, null, null);
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
