(() => {
  "use strict";

  const root = document.getElementById("judges-experience");
  const list = document.getElementById("judges-list");
  const status = document.getElementById("judges-status");
  const search = document.getElementById("judge-search");
  const caseStatus = document.getElementById("judge-case-status");
  const expandAll = document.getElementById("judges-expand-all");
  const collapseAll = document.getElementById("judges-collapse-all");
  if (!root || !list || !status) return;

  const apiBase = String(root.dataset.apiBase || "").replace(/\/$/, "");
  const casePath = String(root.dataset.casePath || "/case/");
  let loadedJudges = [];

  function setStatus(message) {
    status.textContent = message;
  }

  function text(tag, value, className) {
    const node = document.createElement(tag);
    node.textContent = String(value ?? "");
    if (className) node.className = className;
    return node;
  }

  function matterLabel(count) {
    return `${count} current ${count === 1 ? "matter" : "matters"}`;
  }

  function statusLabel(value) {
    return String(value || "pending").replaceAll("_", " ");
  }

  function caseHref(docketNumber) {
    const docket = String(docketNumber || "").trim();
    if (!docket) return null;
    const separator = casePath.includes("?") ? "&" : "?";
    return `${casePath}${separator}docket=${encodeURIComponent(docket)}`;
  }

  function renderCase(row) {
    const item = document.createElement("li");
    const docketNumber = row.docketNumber || "No docket number";
    const href = caseHref(row.docketNumber);
    const caption = href ? document.createElement("a") : document.createElement("span");
    caption.className = "judge-docket-list__caption judge-docket-list__case";
    caption.textContent = row.caption || "Untitled matter";
    if (href) caption.href = href;
    item.append(
      text("span", docketNumber, "judge-docket-list__number"),
      caption,
      text("span", statusLabel(row.status), "judge-docket-list__status"),
    );
    return item;
  }

  function renderJudge(judge, visibleCases, filtered) {
    const details = document.createElement("details");
    details.className = "judge-record";
    if (filtered) details.open = true;

    const summary = document.createElement("summary");
    summary.className = "judge-record__header";
    const identity = document.createElement("div");
    identity.append(
      text("p", judge.court?.name || "United States District Court", "judge-record__court"),
      text("h3", judge.displayName || "District Judge"),
      text("p", judge.title || "District Judge", "judge-record__title"),
    );
    const count = visibleCases.length;
    const badge = text("div", matterLabel(count), "judge-record__count");
    summary.append(identity, badge);

    const body = document.createElement("div");
    body.className = "judge-record__body";
    body.append(text("h4", filtered ? "Matching public docket" : "Current public docket"));
    if (!visibleCases.length) {
      body.append(text("p", "No current public matters match these filters.", "judge-record__empty"));
    } else {
      const docket = document.createElement("ul");
      docket.className = "judge-docket-list";
      visibleCases.forEach((row) => docket.append(renderCase(row)));
      body.append(docket);
    }

    details.append(summary, body);
    return details;
  }

  function normalize(value) {
    return String(value || "").toLocaleLowerCase().trim();
  }

  function judgeMatchesName(judge, needle) {
    if (!needle) return true;
    const direct = [judge.displayName, judge.title, judge.court?.name]
      .some((value) => normalize(value).includes(needle));
    if (direct) return true;
    const cases = Array.isArray(judge.currentCases) ? judge.currentCases : [];
    return cases.some((row) => normalize(`${row.docketNumber || ""} ${row.caption || ""}`).includes(needle));
  }

  function filteredCases(judge, needle, wantedStatus) {
    const cases = Array.isArray(judge.currentCases) ? judge.currentCases : [];
    const directJudgeMatch = [judge.displayName, judge.title, judge.court?.name]
      .some((value) => needle && normalize(value).includes(needle));
    return cases.filter((row) => {
      const statusMatch = !wantedStatus || normalize(row.status) === wantedStatus;
      const textMatch = !needle || directJudgeMatch || normalize(`${row.docketNumber || ""} ${row.caption || ""}`).includes(needle);
      return statusMatch && textMatch;
    });
  }

  function render() {
    const needle = normalize(search?.value);
    const wantedStatus = normalize(caseStatus?.value);
    const filtering = Boolean(needle || wantedStatus);
    const matches = loadedJudges
      .filter((judge) => judgeMatchesName(judge, needle))
      .map((judge) => ({ judge, cases: filteredCases(judge, needle, wantedStatus) }))
      .filter((entry) => !wantedStatus || entry.cases.length > 0);

    list.replaceChildren();
    list.setAttribute("aria-busy", "false");
    if (!matches.length) {
      list.append(text("p", "No active District Court judges or current matters match these filters.", "judges-empty"));
      setStatus("No matching judges or current matters.");
      return;
    }
    matches.forEach(({ judge, cases }) => list.append(renderJudge(judge, cases, filtering)));
    const matterCount = matches.reduce((sum, entry) => sum + entry.cases.length, 0);
    setStatus(`${matches.length} ${matches.length === 1 ? "judge" : "judges"} · ${matterCount} current ${matterCount === 1 ? "matter" : "matters"} shown.`);
  }

  function unavailable(message) {
    list.replaceChildren(text("p", message, "judges-error"));
    list.setAttribute("aria-busy", "false");
    setStatus("Judge directory temporarily unavailable.");
  }

  function setAll(open) {
    list.querySelectorAll("details.judge-record").forEach((record) => {
      record.open = open;
    });
  }

  search?.addEventListener("input", render);
  caseStatus?.addEventListener("change", render);
  expandAll?.addEventListener("click", () => setAll(true));
  collapseAll?.addEventListener("click", () => setAll(false));

  async function load() {
    if (!apiBase) {
      unavailable("The Judicial Information System endpoint is not configured.");
      return;
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(`${apiBase}/api/v1/judges?court=usdc`, {
        method: "GET",
        credentials: "omit",
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`Judge directory request failed (${response.status})`);
      const payload = await response.json();
      loadedJudges = Array.isArray(payload?.data?.judges) ? payload.data.judges : [];
      render();
    } catch {
      unavailable("The District Court judge directory could not be loaded. Please try again later.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  void load();
})();
