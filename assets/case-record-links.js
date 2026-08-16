(() => {
  "use strict";

  const root = document.getElementById("cases-experience");
  const detailRoot = document.getElementById("case-detail");
  if (!root || !detailRoot) return;

  const apiBase = String(root.dataset.apiBase || "").trim();
  const recordsPath = String(root.dataset.recordsPath || "/records/");
  if (!apiBase) return;

  let activeDocket = "";
  let enrichmentRun = 0;

  function clean(value) {
    return String(value ?? "").trim();
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(clean(value));
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function apiUrl(docket, suffix = "") {
    return new URL(`/api/v1/cases/${encodeURIComponent(docket)}${suffix}`, apiBase).toString();
  }

  async function fetchJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error(`JIS request failed (${response.status})`);
      return response.json();
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function titleCase(value) {
    return clean(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "Filing date not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Filing date not recorded";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function formatBytes(value) {
    const bytes = Number(value);
    if (!Number.isFinite(bytes) || bytes < 0) return null;
    if (bytes < 1024) return `${bytes} B`;
    const units = ["KB", "MB", "GB"];
    let size = bytes / 1024;
    let unit = 0;
    while (size >= 1024 && unit < units.length - 1) {
      size /= 1024;
      unit += 1;
    }
    return `${size >= 10 ? size.toFixed(0) : size.toFixed(1)} ${units[unit]}`;
  }

  function documentGroupLabel(group) {
    switch (group) {
      case "court_action": return "Court action";
      case "disposition_record": return "Disposition-related record";
      case "party_filing": return "Party filing";
      default: return "Court record";
    }
  }

  function recordsHref(userId) {
    const url = new URL(recordsPath, window.location.origin);
    url.searchParams.set("q", userId);
    return url.pathname + url.search;
  }

  function renderedDocket() {
    const fromHeading = detailRoot.querySelector(".case-file-heading__docket")?.textContent;
    if (clean(fromHeading)) return clean(fromHeading);
    const fromQuery = new URLSearchParams(window.location.search).get("docket");
    return clean(fromQuery);
  }

  function enrichParties(caseData) {
    const partyNodes = [...detailRoot.querySelectorAll(".case-party")];
    const parties = Array.isArray(caseData?.parties) ? caseData.parties : [];
    partyNodes.forEach((node, index) => {
      const party = parties[index];
      if (!party || party.isGovernment || party.identity?.status !== "verified" || !party.identity.robloxUserId) return;
      if (node.querySelector(".case-party__record-link")) return;
      const link = document.createElement("a");
      link.className = "case-party__record-link";
      link.href = recordsHref(String(party.identity.robloxUserId));
      link.textContent = "View public record →";
      node.append(link);
    });
  }

  function findDocumentSection() {
    return [...detailRoot.querySelectorAll(".case-detail-section")]
      .find((section) => clean(section.querySelector(".case-detail-section__heading")?.textContent) === "Documents") || null;
  }

  function renderDocument(documentRecord) {
    const article = document.createElement("article");
    article.className = "case-document";
    if (documentRecord.documentGroup === "court_action") {
      article.classList.add("case-document--court-action");
    }

    const eyebrow = document.createElement("p");
    eyebrow.className = "case-document__eyebrow";
    const docketPrefix = Number.isInteger(documentRecord.docketSequence)
      ? `Docket #${documentRecord.docketSequence} · `
      : "";
    eyebrow.textContent = `${docketPrefix}${documentGroupLabel(documentRecord.documentGroup)}`;
    article.append(eyebrow);

    const sourceUrl = safeExternalUrl(documentRecord.sourceUrl);
    const title = sourceUrl ? document.createElement("a") : document.createElement("span");
    title.className = "case-document__title";
    title.textContent = clean(documentRecord.title) || "Untitled filing";
    if (sourceUrl) {
      title.href = sourceUrl;
      title.target = "_blank";
      title.rel = "noopener noreferrer";
    }
    article.append(title);

    const metadata = document.createElement("p");
    metadata.className = "case-document__metadata";
    const pieces = [titleCase(documentRecord.documentType), formatDate(documentRecord.filedAt)];
    if (documentRecord.filingParty) pieces.push(`Filed by ${documentRecord.filingParty}`);
    if (documentRecord.mimeType) pieces.push(documentRecord.mimeType);
    const bytes = formatBytes(documentRecord.byteSize);
    if (bytes) pieces.push(bytes);
    metadata.textContent = pieces.join(" · ");
    article.append(metadata);

    if (documentRecord.sha256) {
      const integrity = document.createElement("p");
      integrity.className = "case-document__integrity";
      integrity.append(document.createTextNode("SHA-256: "));
      const code = document.createElement("code");
      code.textContent = documentRecord.sha256;
      integrity.append(code);
      article.append(integrity);
    }

    return article;
  }

  function enrichDocuments(indexData) {
    const section = findDocumentSection();
    if (!section) return;
    const documents = Array.isArray(indexData?.documents) ? indexData.documents : [];
    const existing = section.querySelector(".case-documents");
    if (!existing) return;

    let note = section.querySelector(".case-document-index-note");
    if (!note) {
      note = document.createElement("p");
      note.className = "case-document-index-note";
      note.textContent = "Document type describes the filing or court record itself. It does not, by itself, establish a charge disposition or conviction.";
      section.querySelector(".case-detail-section__heading")?.after(note);
    }

    existing.replaceChildren();
    if (!documents.length) {
      const empty = document.createElement("p");
      empty.className = "case-empty";
      empty.textContent = "No separately indexed public documents are available.";
      existing.append(empty);
      return;
    }
    documents.forEach((record) => existing.append(renderDocument(record)));
  }

  async function enrich() {
    const docket = renderedDocket();
    if (!docket || !detailRoot.querySelector(".case-file-heading")) return;
    if (docket === activeDocket && detailRoot.dataset.phaseKEnriched === "true") return;
    activeDocket = docket;
    detailRoot.dataset.phaseKEnriched = "loading";
    const run = ++enrichmentRun;

    try {
      const [casePayload, documentPayload] = await Promise.all([
        fetchJson(apiUrl(docket)),
        fetchJson(apiUrl(docket, "/document-index")),
      ]);
      if (run !== enrichmentRun || renderedDocket() !== docket) return;
      enrichParties(casePayload?.data);
      enrichDocuments(documentPayload?.data);
      detailRoot.dataset.phaseKEnriched = "true";
    } catch {
      // Phase K is an enhancement layer. Preserve the already-rendered Phase J case file if
      // the richer document/link endpoints are temporarily unavailable.
      if (run === enrichmentRun) detailRoot.dataset.phaseKEnriched = "failed";
    }
  }

  const observer = new MutationObserver(() => {
    if (detailRoot.querySelector(".case-file-heading")) void enrich();
  });
  observer.observe(detailRoot, { childList: true, subtree: true });
  void enrich();
})();
