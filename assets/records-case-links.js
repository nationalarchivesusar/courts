(() => {
  "use strict";

  const experience = document.getElementById("records-experience");
  const resultsRoot = document.getElementById("records-results");
  if (!experience || !resultsRoot) return;

  const apiBase = String(experience.dataset.apiBase || "").trim();
  const casePath = String(experience.dataset.casePath || "/case/");
  if (!apiBase) return;

  function clean(value) {
    return String(value ?? "").trim();
  }

  function titleCase(value) {
    return clean(value).replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function formatDate(value) {
    if (!value) return "Filed date not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Filed date not recorded";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function caseHref(docketNumber) {
    const url = new URL(casePath, window.location.origin);
    url.searchParams.set("docket", docketNumber);
    return url.pathname + url.search;
  }

  function userIdFromSection(section) {
    const terms = [...section.querySelectorAll(".records-account-identity dt")];
    const term = terms.find((node) => clean(node.textContent) === "Roblox UserId");
    const value = term?.nextElementSibling?.textContent;
    return /^[1-9][0-9]{0,19}$/.test(clean(value)) ? clean(value) : "";
  }

  async function fetchCases(userId) {
    const url = new URL(`/api/v1/people/${encodeURIComponent(userId)}/cases`, apiBase);
    url.searchParams.set("limit", "100");
    const response = await fetch(url, { credentials: "omit", headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`JIS request failed (${response.status})`);
    const payload = await response.json();
    return Array.isArray(payload?.data?.cases) ? payload.data.cases : [];
  }

  function renderCase(record) {
    const article = document.createElement("article");
    article.className = "records-related-case";

    const docket = document.createElement("p");
    docket.className = "records-related-case__docket";
    docket.textContent = record.docketNumber;

    const heading = document.createElement("p");
    heading.className = "records-related-case__caption";
    const link = document.createElement("a");
    link.href = caseHref(record.docketNumber);
    link.textContent = record.caption || record.docketNumber;
    heading.append(link);

    const meta = document.createElement("p");
    meta.className = "records-related-case__meta";
    const pieces = [
      titleCase(record.partyRole),
      titleCase(record.caseType),
      titleCase(record.status),
      formatDate(record.filedAt),
    ];
    if (Array.isArray(record.assignedJudges) && record.assignedJudges.length) {
      pieces.push(`Judge: ${record.assignedJudges.join(", ")}`);
    }
    meta.textContent = pieces.join(" · ");

    article.append(docket, heading, meta);
    return article;
  }

  async function enrichSection(section) {
    if (section.dataset.caseLinksState) return;
    const userId = userIdFromSection(section);
    if (!userId) return;
    section.dataset.caseLinksState = "loading";

    try {
      const cases = await fetchCases(userId);
      const block = document.createElement("div");
      block.className = "records-related-cases";
      const heading = document.createElement("h3");
      heading.className = "records-subheading";
      heading.textContent = "Court cases";
      block.append(heading);
      const list = document.createElement("div");
      list.className = "records-related-cases__list";
      if (cases.length) {
        cases.forEach((record) => list.append(renderCase(record)));
      } else {
        const empty = document.createElement("p");
        empty.className = "records-empty";
        empty.textContent = "No public court cases are linked to this verified account.";
        list.append(empty);
      }
      block.append(list);

      const firstHistoryHeading = section.querySelector(".records-subheading");
      if (firstHistoryHeading) firstHistoryHeading.before(block);
      else section.append(block);
      section.dataset.caseLinksState = "done";
    } catch {
      section.dataset.caseLinksState = "failed";
    }
  }

  function scan() {
    // Deliberately enrich verified-account sections only. Historical username sections remain
    // separate until JIS has a manually verified Roblox identity association.
    resultsRoot.querySelectorAll(".records-class--verified").forEach((section) => {
      void enrichSection(section);
    });
  }

  const observer = new MutationObserver(scan);
  observer.observe(resultsRoot, { childList: true, subtree: true });
  scan();
})();
