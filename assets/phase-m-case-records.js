(() => {
  "use strict";

  const root = document.getElementById("cases-experience");
  const detail = document.getElementById("case-detail");
  if (!root || !detail) return;

  const apiBase = String(root.dataset.apiBase || "").trim();
  const casePath = String(root.dataset.casesPath || "/case/");
  if (!apiBase) return;

  let activeDocket = "";
  let enrichmentRun = 0;

  function clean(value) {
    return String(value ?? "").trim();
  }

  function titleCase(value) {
    return clean(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDateTime(value) {
    if (!value) return "Date not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Date not recorded";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "UTC",
      timeZoneName: "short",
    }).format(date);
  }

  function safeHttps(value) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" ? url.href : "";
    } catch {
      return "";
    }
  }

  function safeGoogleViewer(value) {
    const safe = safeHttps(value);
    if (!safe) return "";
    try {
      const url = new URL(safe);
      if (url.hostname !== "drive.google.com" && url.hostname !== "docs.google.com") return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function isHtmlDocument(record) {
    const mimeType = clean(record?.mimeType).split(";", 1)[0].toLowerCase();
    if (mimeType === "text/html" || mimeType === "application/xhtml+xml") return true;

    const sourceFilename = clean(record?.sourceFilename).toLowerCase();
    if (/\.(?:html?|xhtml)$/.test(sourceFilename)) return true;

    return [record?.viewerUrl, record?.sourceUrl].some((value) => {
      const safe = safeHttps(value);
      if (!safe) return false;
      try {
        return /\.(?:html?|xhtml)$/.test(new URL(safe).pathname.toLowerCase());
      } catch {
        return false;
      }
    });
  }

  function safeHtmlViewer(record) {
    if (!isHtmlDocument(record)) return "";

    const documentId = clean(record?.documentId);
    const safeApiBase = safeHttps(apiBase);
    if (record?.externalProvider === "google_drive" && documentId && safeApiBase) {
      try {
        return new URL(
          `/api/v1/documents/${encodeURIComponent(documentId)}/html-preview`,
          safeApiBase,
        ).href;
      } catch {
        return "";
      }
    }

    for (const candidate of [record?.sourceUrl, record?.viewerUrl]) {
      const safe = safeHttps(candidate);
      if (safe) return safe;
    }
    return "";
  }

  async function fetchOptional(path) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(new URL(path, apiBase), {
        credentials: "omit",
        headers: { accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) return null;
      return response.json();
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  function section(title) {
    const wrapper = document.createElement("section");
    wrapper.className = "case-detail-section";
    wrapper.dataset.phaseM = "true";
    const heading = document.createElement("h2");
    heading.className = "case-detail-section__heading";
    heading.textContent = title;
    wrapper.append(heading);
    return wrapper;
  }

  function metaLine(className, text) {
    const p = document.createElement("p");
    p.className = className;
    p.textContent = text;
    return p;
  }

  function findLegacySection(title) {
    return [...detail.querySelectorAll(".case-detail-section")].find((candidate) => {
      const heading = candidate.querySelector(".case-detail-section__heading");
      return clean(heading?.textContent) === title && candidate.dataset.phaseM !== "true";
    }) || null;
  }

  function documentGroupLabel(group) {
    if (group === "court_action") return "Court action";
    if (group === "party_filing") return "Party filing";
    if (group === "disposition_record") return "Disposition record";
    return "Court document";
  }

  function renderDocuments(records) {
    const wrapper = section("Documents");
    const notice = metaLine(
      "phase-m-provider-note",
      "Public files remain hosted by their source provider. Google Drive and Google Docs files can be previewed here when the source permits embedding. Public HTML files are rendered through a restricted JIS preview instead of the Drive source-code viewer; the original source link remains authoritative.",
    );
    wrapper.append(notice);

    if (!records.length) {
      wrapper.append(metaLine("case-empty", "No separately indexed public documents are available."));
      return wrapper;
    }

    const list = document.createElement("div");
    list.className = "phase-m-document-list";
    records.forEach((record) => {
      const item = document.createElement("article");
      item.className = `phase-m-document phase-m-document--${clean(record.documentGroup) || "other"}`;

      const top = document.createElement("div");
      top.className = "phase-m-document__topline";
      const title = document.createElement("p");
      title.className = "phase-m-document__title";
      title.textContent = record.title || "Untitled filing";
      const badge = document.createElement("span");
      badge.className = "phase-m-document__badge";
      badge.textContent = documentGroupLabel(record.documentGroup);
      top.append(title, badge);
      item.append(top);

      const pieces = [];
      if (Number.isInteger(record.docketSequence)) pieces.push(`Docket entry #${record.docketSequence}`);
      pieces.push(titleCase(record.documentType || "other"));
      pieces.push(record.filedAt ? formatDateTime(record.filedAt) : "Filing date not recorded");
      if (record.filingParty) pieces.push(`Filed by ${record.filingParty}`);
      if (record.externalProvider === "google_drive") pieces.push("Google Drive");
      item.append(metaLine("phase-m-document__meta", pieces.join(" · ")));

      const integrity = [];
      if (record.mimeType) integrity.push(record.mimeType);
      if (Number.isFinite(record.byteSize)) integrity.push(`${Number(record.byteSize).toLocaleString()} bytes`);
      if (record.sha256) integrity.push(`SHA-256 ${record.sha256}`);
      if (record.textAvailable) integrity.push("Searchable text available");
      if (integrity.length) item.append(metaLine("phase-m-document__integrity", integrity.join(" · ")));

      const actions = document.createElement("div");
      actions.className = "phase-m-document__actions";
      const htmlViewerUrl = safeHtmlViewer(record);
      const googleViewerUrl = htmlViewerUrl
        ? ""
        : (record.externalProvider === "google_drive" ? safeGoogleViewer(record.viewerUrl) : "");
      const viewerUrl = htmlViewerUrl || googleViewerUrl;
      if (viewerUrl) {
        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.textContent = "Preview document";
        toggle.setAttribute("aria-expanded", "false");

        const viewer = document.createElement("div");
        viewer.className = htmlViewerUrl ? "phase-m-viewer phase-m-viewer--html" : "phase-m-viewer";
        viewer.hidden = true;
        if (htmlViewerUrl) {
          viewer.append(metaLine(
            "phase-m-viewer__security-note",
            "Sandboxed HTML preview — scripts, forms, popups, same-origin privileges, and top-level navigation are disabled.",
          ));
        }

        const iframe = document.createElement("iframe");
        iframe.loading = "lazy";
        iframe.referrerPolicy = "no-referrer";
        iframe.title = `Document preview: ${record.title || "court filing"}`;
        iframe.dataset.src = viewerUrl;
        if (htmlViewerUrl) iframe.setAttribute("sandbox", "");
        viewer.append(iframe);

        toggle.addEventListener("click", () => {
          const opening = viewer.hidden;
          viewer.hidden = !opening;
          toggle.setAttribute("aria-expanded", opening ? "true" : "false");
          toggle.textContent = opening ? "Close preview" : "Preview document";
          if (opening && !iframe.src) iframe.src = iframe.dataset.src;
        });
        actions.append(toggle);
        item.append(actions, viewer);
      }

      const sourceUrl = safeHttps(record.sourceUrl);
      if (sourceUrl) {
        if (!item.contains(actions)) item.append(actions);
        const source = document.createElement("a");
        source.href = sourceUrl;
        source.target = "_blank";
        source.rel = "noopener noreferrer";
        source.textContent = "Open source ↗";
        actions.append(source);
      }

      list.append(item);
    });
    wrapper.append(list);
    return wrapper;
  }

  function componentText(component) {
    const pieces = [titleCase(component.componentType)];
    if (component.amount !== null && component.amount !== undefined) {
      pieces.push(`${Number(component.amount).toLocaleString()}${component.unit ? ` ${component.unit}` : ""}`);
    } else if (component.unit) {
      pieces.push(component.unit);
    }
    if (component.currency) pieces.push(component.currency);
    if (component.details) pieces.push(component.details);
    return pieces.join(" · ");
  }

  function sourceLink(documentRecord) {
    const url = safeHttps(documentRecord?.viewerUrl) || safeHttps(documentRecord?.sourceUrl);
    if (!url) return null;
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = documentRecord?.title ? `Source: ${documentRecord.title} ↗` : "Open source ↗";
    return link;
  }

  function renderJudgments(history) {
    const sentences = Array.isArray(history?.sentences) ? history.sentences : [];
    const actions = Array.isArray(history?.postJudgmentActions) ? history.postJudgmentActions : [];
    if (!sentences.length && !actions.length) return null;

    const wrapper = section("Sentencing and post-judgment history");
    wrapper.append(metaLine(
      "case-section-note",
      "Only separately verified JIS legal facts are shown here. A filing title, document classification, or docket workflow state does not itself establish a sentence or post-judgment result.",
    ));
    const list = document.createElement("div");
    list.className = "phase-m-judgment-list";

    sentences.forEach((sentence) => {
      const item = document.createElement("article");
      item.className = "phase-m-judgment";
      item.append(metaLine("phase-m-action-type", "Sentence"));
      const title = document.createElement("h3");
      title.className = "phase-m-judgment__title";
      title.textContent = `Count ${sentence.countNumber} — ${sentence.offenseName}`;
      item.append(title);
      item.append(metaLine(
        "phase-m-judgment__meta",
        `${sentence.defendant} · ${titleCase(sentence.status)} · Imposed ${formatDateTime(sentence.imposedAt)}`,
      ));
      item.append(metaLine("phase-m-judgment__meta", sentence.rawText));
      if (Array.isArray(sentence.components) && sentence.components.length) {
        const components = document.createElement("ul");
        components.className = "phase-m-sentence-components";
        sentence.components.forEach((component) => {
          const li = document.createElement("li");
          li.textContent = componentText(component);
          components.append(li);
        });
        item.append(components);
      }
      const source = sourceLink(sentence.sourceDocument);
      if (source) {
        const line = document.createElement("p");
        line.className = "phase-m-judgment__source";
        line.append(source);
        item.append(line);
      }
      list.append(item);
    });

    actions.forEach((action) => {
      const item = document.createElement("article");
      item.className = "phase-m-judgment";
      item.append(metaLine("phase-m-action-type", titleCase(action.actionType)));
      const title = document.createElement("h3");
      title.className = "phase-m-judgment__title";
      title.textContent = `Count ${action.countNumber} — ${action.offenseName}`;
      item.append(title);
      item.append(metaLine(
        "phase-m-judgment__meta",
        `${action.defendant} · Effective ${formatDateTime(action.effectiveAt)} · Conviction status: ${titleCase(action.convictionStatus)}`,
      ));
      item.append(metaLine("phase-m-judgment__meta", action.summary));
      const source = sourceLink(action.sourceDocument);
      if (source) {
        const line = document.createElement("p");
        line.className = "phase-m-judgment__source";
        line.append(source);
        item.append(line);
      }
      list.append(item);
    });

    wrapper.append(list);
    return wrapper;
  }

  function caseHref(docket) {
    const url = new URL(casePath, window.location.origin);
    url.searchParams.set("docket", docket);
    return url.pathname + url.search;
  }

  function renderRelations(payload) {
    const relations = Array.isArray(payload?.relatedCases) ? payload.relatedCases : [];
    if (!relations.length) return null;
    const wrapper = section("Related proceedings");
    const list = document.createElement("div");
    list.className = "phase-m-relations-list";
    relations.forEach((relation) => {
      const item = document.createElement("article");
      item.className = "phase-m-relation";
      const top = document.createElement("div");
      top.className = "phase-m-relation__topline";
      const court = document.createElement("span");
      court.className = "phase-m-relation__court";
      court.textContent = relation.courtName || titleCase(relation.courtSlug);
      const docket = document.createElement("a");
      docket.href = caseHref(relation.docketNumber);
      docket.textContent = relation.docketNumber;
      top.append(court, docket);
      item.append(top);
      const caption = document.createElement("p");
      caption.className = "phase-m-relation__caption";
      caption.textContent = relation.caption;
      item.append(caption);
      const meta = [titleCase(relation.relationshipType)];
      if (relation.supremeProceedingType) meta.push(titleCase(relation.supremeProceedingType));
      if (relation.supremeCertStatus && relation.supremeCertStatus !== "not_applicable") {
        meta.push(`Certiorari: ${titleCase(relation.supremeCertStatus)}`);
      }
      if (relation.supremeDecisionAt) meta.push(`Decision ${formatDateTime(relation.supremeDecisionAt)}`);
      if (relation.supremeMandateAt) meta.push(`Mandate ${formatDateTime(relation.supremeMandateAt)}`);
      item.append(metaLine("phase-m-relation__meta", meta.join(" · ")));
      list.append(item);
    });
    wrapper.append(list);
    return wrapper;
  }

  function insertBeforeDocket(node) {
    const docketSection = [...detail.querySelectorAll(".case-detail-section")].find((candidate) => {
      return clean(candidate.querySelector(".case-detail-section__heading")?.textContent) === "Docket entries";
    });
    if (docketSection) docketSection.before(node);
    else detail.append(node);
  }

  async function enrich(docket) {
    const run = ++enrichmentRun;
    const encoded = encodeURIComponent(docket);
    const [documentPayload, judgmentPayload, relationPayload] = await Promise.all([
      fetchOptional(`/api/v1/cases/${encoded}/document-experience`),
      fetchOptional(`/api/v1/cases/${encoded}/judgments`),
      fetchOptional(`/api/v1/cases/${encoded}/relations`),
    ]);
    if (run !== enrichmentRun || activeDocket !== docket) return;

    detail.querySelectorAll('[data-phase-m="true"]').forEach((node) => node.remove());

    const documentRecords = Array.isArray(documentPayload?.data?.documents) ? documentPayload.data.documents : [];
    if (documentPayload) {
      const legacyDocuments = findLegacySection("Documents");
      const richerDocuments = renderDocuments(documentRecords);
      if (legacyDocuments) legacyDocuments.replaceWith(richerDocuments);
      else detail.append(richerDocuments);
    }

    const relations = renderRelations(relationPayload?.data);
    if (relations) insertBeforeDocket(relations);

    const judgments = renderJudgments(judgmentPayload?.data);
    if (judgments) {
      const legacyDocuments = [...detail.querySelectorAll(".case-detail-section")].find((candidate) => {
        return clean(candidate.querySelector(".case-detail-section__heading")?.textContent) === "Documents";
      });
      if (legacyDocuments) legacyDocuments.before(judgments);
      else detail.append(judgments);
    }
  }

  function scan() {
    const docket = clean(detail.querySelector(".case-file-heading__docket")?.textContent);
    if (!docket || docket === activeDocket) return;
    activeDocket = docket;
    void enrich(docket);
  }

  const observer = new MutationObserver(scan);
  observer.observe(detail, { childList: true, subtree: true });
  scan();
})();