(() => {
  "use strict";

  const root = document.getElementById("cases-experience");
  const model = window.CourtsCasesModel;
  if (!root || !model) return;

  const apiBase = String(root.dataset.apiBase || "").trim();
  const casesPath = String(root.dataset.casesPath || "/case/");
  const searchPath = String(root.dataset.searchPath || "/cases/");
  const searchForm = document.getElementById("cases-search-form");
  const queryInput = document.getElementById("cases-query");
  const typeInput = document.getElementById("cases-type");
  const statusInput = document.getElementById("cases-status-filter");
  const results = document.getElementById("cases-results");
  const detail = document.getElementById("case-detail");
  const statusLine = document.getElementById("cases-status");
  const loadMore = document.getElementById("cases-load-more");
  const backButton = document.getElementById("case-back-to-search");
  let nextCursor = null;

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = text;
    return element;
  }

  function setStatus(text) {
    if (statusLine) statusLine.textContent = text;
  }

  function setBusy(value) {
    if (results) results.setAttribute("aria-busy", value ? "true" : "false");
    if (detail) detail.setAttribute("aria-busy", value ? "true" : "false");
  }

  function showSearchError(message) {
    if (!results) return;
    results.replaceChildren();
    const notice = textElement("div", "case-system-notice case-system-notice--error", message);
    notice.setAttribute("role", "alert");
    results.append(notice);
    if (loadMore) loadMore.hidden = true;
    setStatus("Case information is unavailable.");
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        const message = payload?.error?.message || `JIS request failed (${response.status})`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function appendMeta(parent, label, value) {
    const item = document.createElement("div");
    item.className = "case-meta__item";
    item.append(textElement("dt", "case-meta__label", label));
    item.append(textElement("dd", "case-meta__value", value));
    parent.append(item);
  }

  function renderStatusPill(status) {
    const normalized = String(status || "unknown").toLowerCase();
    return textElement("span", `case-status-pill case-status-pill--${normalized}`, model.statusLabel(status));
  }

  function renderCaseResult(record) {
    const article = document.createElement("article");
    article.className = "case-result";

    const top = document.createElement("div");
    top.className = "case-result__topline";
    top.append(textElement("p", "case-result__docket", record.docketNumber));
    top.append(renderStatusPill(record.status));

    const heading = textElement("h3", "case-result__caption", "");
    const link = document.createElement("a");
    link.href = model.buildCaseHref(casesPath, record.docketNumber);
    link.textContent = record.caption || record.docketNumber;
    heading.append(link);

    const meta = document.createElement("dl");
    meta.className = "case-result__meta case-meta";
    appendMeta(meta, "Court", record.court?.shortName || "Court not recorded");
    appendMeta(meta, "Case type", model.caseTypeLabel(record.caseType));
    appendMeta(meta, "Filed", model.formatDate(record.filedAt));
    if (Array.isArray(record.assignedJudges) && record.assignedJudges.length) {
      appendMeta(meta, "Assigned judge", record.assignedJudges.join(", "));
    }

    article.append(top, heading, meta);
    return article;
  }

  function renderSearchResults(records, append = false) {
    if (!results) return;
    if (!append) results.replaceChildren();
    if (!records.length && !append) {
      results.append(textElement("p", "case-empty", "No public cases matched this search."));
      return;
    }
    records.forEach((record) => results.append(renderCaseResult(record)));
  }

  function readSearchState(cursor = null) {
    return {
      q: queryInput?.value || "",
      caseType: typeInput?.value || "",
      status: statusInput?.value || "",
      limit: 25,
      cursor,
    };
  }

  function writeSearchLocation(state) {
    if (!searchForm) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("docket");
    const fields = [
      ["q", state.q],
      ["type", state.caseType],
      ["status", state.status],
    ];
    fields.forEach(([key, value]) => {
      const clean = String(value || "").trim();
      if (clean) url.searchParams.set(key, clean);
      else url.searchParams.delete(key);
    });
    window.history.replaceState({}, "", url);
  }

  async function runSearch({ append = false, updateLocation = true } = {}) {
    if (!apiBase) {
      showSearchError("The Judicial Information System API is not configured.");
      return;
    }
    const state = readSearchState(append ? nextCursor : null);
    if (!append && updateLocation) writeSearchLocation(state);
    setBusy(true);
    setStatus(state.q ? "Searching public cases…" : "Loading recent public cases…");
    try {
      const payload = await fetchJson(model.buildSearchApiUrl(apiBase, state));
      const records = Array.isArray(payload?.data?.cases) ? payload.data.cases : [];
      renderSearchResults(records, append);
      nextCursor = payload?.meta?.pagination?.nextCursor || null;
      if (loadMore) loadMore.hidden = !nextCursor;
      const action = state.q ? "matched" : "loaded";
      setStatus(`${records.length.toLocaleString()} ${records.length === 1 ? "case" : "cases"} ${action}${nextCursor ? " · more available" : ""}.`);
    } catch (error) {
      showSearchError(error.name === "AbortError" ? "The case search timed out. Try again." : error.message);
    } finally {
      setBusy(false);
    }
  }

  function section(title) {
    const wrapper = document.createElement("section");
    wrapper.className = "case-detail-section";
    wrapper.append(textElement("h2", "case-detail-section__heading", title));
    return wrapper;
  }

  function renderParties(parties) {
    const wrapper = section("Parties");
    if (!Array.isArray(parties) || !parties.length) {
      wrapper.append(textElement("p", "case-empty", "No public party information is recorded."));
      return wrapper;
    }
    const list = document.createElement("div");
    list.className = "case-parties";
    parties.forEach((party) => {
      const item = document.createElement("div");
      item.className = "case-party";
      item.append(textElement("p", "case-party__role", model.titleCase(party.role)));
      item.append(textElement("p", "case-party__name", party.displayName));
      if (!party.isGovernment) {
        item.append(textElement("p", "case-party__identity", model.identityLabel(party.identity)));
      }
      list.append(item);
    });
    wrapper.append(list);
    return wrapper;
  }

  function renderCharges(charges) {
    const wrapper = section("Charges and dispositions");
    wrapper.append(textElement("p", "case-section-note", "A filed charge is an allegation. It is not a conviction unless the count has a convicted disposition."));
    const current = model.groupCharges(charges);
    if (!current.length) {
      wrapper.append(textElement("p", "case-empty", "No public structured charges are recorded for this case."));
      return wrapper;
    }
    const list = document.createElement("div");
    list.className = "case-charges";
    current.forEach((charge) => {
      const article = document.createElement("article");
      article.className = "case-charge";
      article.append(textElement("h3", "case-charge__heading", `Count ${charge.countNumber} — ${charge.offenseName}`));
      if (charge.displayCitation) article.append(textElement("p", "case-charge__citation", charge.displayCitation));
      const line = textElement("p", "case-charge__disposition", `Disposition: ${model.dispositionLabel(charge.disposition)}`);
      if (charge.convictionStatus) {
        line.append(document.createTextNode(` · Conviction status: ${model.titleCase(charge.convictionStatus)}`));
      }
      article.append(line);
      list.append(article);
    });
    wrapper.append(list);
    return wrapper;
  }

  function renderDocuments(documents) {
    const wrapper = section("Documents");
    if (!Array.isArray(documents) || !documents.length) {
      wrapper.append(textElement("p", "case-empty", "No separately indexed public documents are available."));
      return wrapper;
    }
    const list = document.createElement("div");
    list.className = "case-documents";
    documents.forEach((documentRecord) => {
      const item = document.createElement("article");
      item.className = "case-document";
      const safeUrl = model.safeExternalUrl(documentRecord.sourceUrl);
      const title = safeUrl ? document.createElement("a") : document.createElement("span");
      title.className = "case-document__title";
      title.textContent = documentRecord.title;
      if (safeUrl) {
        title.href = safeUrl;
        title.target = "_blank";
        title.rel = "noopener noreferrer";
      }
      item.append(title);
      const date = documentRecord.filedAt ? model.formatDate(documentRecord.filedAt) : "Filing date not recorded";
      item.append(textElement("p", "case-document__meta", `${model.titleCase(documentRecord.documentType)} · ${date}`));
      list.append(item);
    });
    wrapper.append(list);
    return wrapper;
  }

  function renderDocket(entries) {
    const wrapper = section("Docket entries");
    if (!Array.isArray(entries) || !entries.length) {
      wrapper.append(textElement("p", "case-empty", "No dated public docket entries are available."));
      return wrapper;
    }
    const ordered = [...entries].sort((a, b) => {
      const byDate = String(a.entryDate || "").localeCompare(String(b.entryDate || ""));
      return byDate || Number(a.sequence) - Number(b.sequence);
    });
    const tableWrap = document.createElement("div");
    tableWrap.className = "case-docket-wrap";
    const table = document.createElement("table");
    table.className = "case-docket-table";
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Date", "Entry", "Document"].forEach((label) => headRow.append(textElement("th", "", label)));
    head.append(headRow);
    const body = document.createElement("tbody");
    ordered.forEach((entry) => {
      const row = document.createElement("tr");
      row.append(textElement("td", "case-docket-table__date", model.formatDateTime(entry.entryDate)));
      const entryCell = document.createElement("td");
      entryCell.append(textElement("span", "case-docket-table__number", `#${entry.sequence}`));
      entryCell.append(document.createTextNode(entry.title));
      row.append(entryCell);
      const documentCell = document.createElement("td");
      const safeUrl = model.safeExternalUrl(entry.sourceUrl);
      if (safeUrl) {
        const link = document.createElement("a");
        link.href = safeUrl;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "View filing";
        documentCell.append(link);
      } else {
        documentCell.textContent = "—";
      }
      row.append(documentCell);
      body.append(row);
    });
    table.append(head, body);
    tableWrap.append(table);
    wrapper.append(tableWrap);
    return wrapper;
  }

  function renderDetail(record, documents) {
    if (!detail) return;
    detail.replaceChildren();
    const summary = record.case;
    const header = document.createElement("header");
    header.className = "case-file-heading";
    header.append(textElement("p", "eyebrow", summary.court?.name || "United States Courts"));

    const docketLine = document.createElement("div");
    docketLine.className = "case-file-heading__topline";
    docketLine.append(textElement("p", "case-file-heading__docket", summary.docketNumber));
    docketLine.append(renderStatusPill(summary.status));
    header.append(docketLine);
    header.append(textElement("h1", "", summary.caption));

    const meta = document.createElement("dl");
    meta.className = "case-file-meta case-meta";
    appendMeta(meta, "Case type", model.caseTypeLabel(summary.caseType));
    appendMeta(meta, "Filed", model.formatDate(summary.filedAt));
    if (summary.closedAt) appendMeta(meta, "Closed", model.formatDate(summary.closedAt));
    appendMeta(meta, "Assigned judge", summary.assignedJudges?.length ? summary.assignedJudges.join(", ") : "Not recorded");
    header.append(meta);

    const actions = document.createElement("div");
    actions.className = "case-file-actions";
    const searchLink = document.createElement("a");
    searchLink.href = searchPath;
    searchLink.textContent = "Search all cases";
    actions.append(searchLink);
    const sourceUrl = model.safeExternalUrl(summary.sourceUrl);
    if (sourceUrl) {
      const source = document.createElement("a");
      source.href = sourceUrl;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.textContent = "View source docket card ↗";
      actions.append(source);
    }
    header.append(actions);

    detail.append(
      header,
      renderParties(record.parties),
      summary.caseType === "criminal" ? renderCharges(record.charges) : document.createDocumentFragment(),
      renderDocket(record.docket),
      renderDocuments(documents),
    );
  }

  async function loadCase(docketNumber) {
    if (!apiBase) {
      if (detail) detail.replaceChildren(textElement("div", "case-system-notice case-system-notice--error", "The Judicial Information System API is not configured."));
      setStatus("Case information is unavailable.");
      return;
    }
    if (results) results.hidden = true;
    if (loadMore) loadMore.hidden = true;
    if (detail) detail.hidden = false;
    if (backButton) backButton.hidden = false;
    setBusy(true);
    setStatus(`Loading ${docketNumber}…`);
    try {
      const [casePayload, documentPayload] = await Promise.all([
        fetchJson(model.buildCaseApiUrl(apiBase, docketNumber)),
        fetchJson(model.buildCaseApiUrl(apiBase, docketNumber, "/documents")),
      ]);
      const documents = Array.isArray(documentPayload?.data?.documents) ? documentPayload.data.documents : [];
      renderDetail(casePayload.data, documents);
      document.title = `${casePayload.data.case.docketNumber} — ${casePayload.data.case.caption} | United States Courts`;
      setStatus(`Public case file ${casePayload.data.case.docketNumber}.`);
    } catch (error) {
      if (detail) {
        detail.replaceChildren(textElement(
          "div",
          "case-system-notice case-system-notice--error",
          error.status === 404 ? "This public case could not be found." : "The case record could not be loaded.",
        ));
      }
      setStatus("Case information is unavailable.");
    } finally {
      setBusy(false);
    }
  }

  function restoreSearchFromLocation() {
    if (!searchForm) return;
    const params = new URLSearchParams(window.location.search);
    if (queryInput) queryInput.value = params.get("q") || "";
    if (typeInput) typeInput.value = ["criminal", "civil", "other"].includes(params.get("type")) ? params.get("type") : "";
    if (statusInput) statusInput.value = ["filed", "pending", "stayed", "closed", "archived"].includes(params.get("status")) ? params.get("status") : "";
  }

  function showSearch({ pushHistory = true } = {}) {
    if (!searchForm) {
      window.location.assign(searchPath);
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("docket");
    if (pushHistory) window.history.pushState({}, "", url);
    if (detail) {
      detail.hidden = true;
      detail.replaceChildren();
    }
    if (results) results.hidden = false;
    if (backButton) backButton.hidden = true;
    document.title = "Case Search | United States Courts";
    void runSearch({ updateLocation: false });
  }

  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (detail) detail.hidden = true;
    if (results) results.hidden = false;
    void runSearch();
  });

  loadMore?.addEventListener("click", () => {
    if (nextCursor) void runSearch({ append: true, updateLocation: false });
  });
  backButton?.addEventListener("click", () => showSearch());
  window.addEventListener("popstate", () => {
    const docket = model.currentDocket(window.location.search);
    if (docket) void loadCase(docket);
    else if (searchForm) {
      restoreSearchFromLocation();
      showSearch({ pushHistory: false });
    }
  });

  const docket = model.currentDocket(window.location.search);
  if (docket) {
    void loadCase(docket);
  } else if (searchForm) {
    restoreSearchFromLocation();
    if (detail) detail.hidden = true;
    if (backButton) backButton.hidden = true;
    void runSearch({ updateLocation: false });
  } else if (detail) {
    detail.hidden = false;
    detail.replaceChildren(textElement("div", "case-system-notice case-system-notice--error", "No docket number was supplied. Use Case Search to locate a public case file."));
    setStatus("No case selected.");
  }
})();
