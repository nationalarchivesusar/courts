(() => {
  "use strict";

  const root = document.getElementById("document-search-experience");
  if (!root) return;
  const apiBase = String(root.dataset.apiBase || "").trim();
  const casePath = String(root.dataset.casePath || "/case/");
  const form = document.getElementById("document-search-form");
  const query = document.getElementById("document-search-query");
  const docket = document.getElementById("document-search-docket");
  const results = document.getElementById("document-search-results");
  const status = document.getElementById("document-search-status");
  if (!apiBase || !form || !query || !results || !status) return;

  function clean(value) {
    return String(value ?? "").trim();
  }

  function titleCase(value) {
    return clean(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "Filing date not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Filing date not recorded";
    return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(date);
  }

  function safeHttps(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function caseHref(docketNumber) {
    const url = new URL(casePath, window.location.origin);
    url.searchParams.set("docket", docketNumber);
    return url.pathname + url.search;
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { credentials: "omit", headers: { accept: "application/json" }, signal: controller.signal });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error?.message || `JIS request failed (${response.status})`);
      }
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function renderRecord(record) {
    const article = document.createElement("article");
    article.className = "document-search-result";

    const top = document.createElement("div");
    top.className = "document-search-result__topline";
    const badge = document.createElement("span");
    badge.className = "document-search-result__badge";
    badge.textContent = titleCase(record.documentType || "document");
    const caseLink = document.createElement("a");
    caseLink.href = caseHref(record.docketNumber);
    caseLink.textContent = record.docketNumber;
    top.append(badge, caseLink);

    const heading = document.createElement("h2");
    heading.className = "document-search-result__title";
    heading.textContent = record.title || "Untitled filing";

    const meta = document.createElement("p");
    meta.className = "document-search-result__meta";
    const pieces = [record.caption || "Case caption not recorded", formatDate(record.filedAt)];
    if (record.externalProvider === "google_drive") pieces.push("Google Drive");
    if (record.textExtractionStatus) pieces.push(`Text: ${titleCase(record.textExtractionStatus)}`);
    meta.textContent = pieces.join(" · ");

    const snippet = document.createElement("p");
    snippet.className = "document-search-result__snippet";
    snippet.textContent = clean(record.snippet) || "Matched document metadata.";

    const actions = document.createElement("div");
    actions.className = "document-search-result__actions";
    const viewer = safeHttps(record.viewerUrl);
    const source = safeHttps(record.sourceUrl);
    if (viewer && record.externalProvider === "google_drive") {
      const link = document.createElement("a");
      link.href = viewer;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Preview document ↗";
      actions.append(link);
    }
    if (source) {
      const link = document.createElement("a");
      link.href = source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open source ↗";
      actions.append(link);
    }

    article.append(top, heading, meta, snippet);
    if (actions.childNodes.length) article.append(actions);
    return article;
  }

  function writeLocation() {
    const url = new URL(window.location.href);
    const q = clean(query.value);
    const d = clean(docket?.value);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    if (d) url.searchParams.set("docket", d); else url.searchParams.delete("docket");
    window.history.replaceState({}, "", url);
  }

  async function search() {
    const q = clean(query.value);
    if (q.length < 2) {
      results.replaceChildren();
      status.textContent = "Enter at least two characters to search public court documents.";
      return;
    }
    writeLocation();
    status.textContent = "Searching public document metadata and available extracted text…";
    results.setAttribute("aria-busy", "true");
    try {
      const url = new URL("/api/v1/documents/search", apiBase);
      url.searchParams.set("q", q);
      const d = clean(docket?.value);
      if (d) url.searchParams.set("docketNumber", d);
      url.searchParams.set("limit", "50");
      const payload = await fetchJson(url);
      const records = Array.isArray(payload?.data?.documents) ? payload.data.documents : [];
      results.replaceChildren();
      if (!records.length) {
        const empty = document.createElement("p");
        empty.className = "case-empty";
        empty.textContent = "No public court documents matched this search.";
        results.append(empty);
      } else {
        records.forEach((record) => results.append(renderRecord(record)));
      }
      status.textContent = `${records.length.toLocaleString()} ${records.length === 1 ? "document" : "documents"} matched.`;
    } catch (error) {
      results.replaceChildren();
      const notice = document.createElement("div");
      notice.className = "case-system-notice case-system-notice--error";
      notice.textContent = error.name === "AbortError" ? "The document search timed out. Try again." : error.message;
      results.append(notice);
      status.textContent = "Document search is unavailable.";
    } finally {
      results.setAttribute("aria-busy", "false");
    }
  }

  const params = new URLSearchParams(window.location.search);
  query.value = params.get("q") || "";
  if (docket) docket.value = params.get("docket") || "";
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    void search();
  });
  if (clean(query.value).length >= 2) void search();
})();
