(() => {
  "use strict";

  const root = document.getElementById("judges-experience");
  const list = document.getElementById("judges-list");
  const status = document.getElementById("judges-status");
  if (!root || !list || !status) return;

  const apiBase = String(root.dataset.apiBase || "").replace(/\/$/, "");
  const casePath = String(root.dataset.casePath || "/case/");

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

  function renderJudge(judge) {
    const article = document.createElement("article");
    article.className = "judge-record";

    const header = document.createElement("header");
    header.className = "judge-record__header";
    const identity = document.createElement("div");
    identity.append(
      text("p", judge.court?.name || "United States District Court", "judge-record__court"),
      text("h3", judge.displayName || "District Judge"),
      text("p", judge.title || "District Judge", "judge-record__title"),
    );
    const cases = Array.isArray(judge.currentCases) ? judge.currentCases : [];
    const count = Number.isInteger(judge.currentCaseCount)
      ? judge.currentCaseCount
      : cases.length;
    header.append(identity, text("div", matterLabel(count), "judge-record__count"));

    const body = document.createElement("div");
    body.className = "judge-record__body";
    body.append(text("h4", "Current public docket"));
    if (!cases.length) {
      body.append(text("p", "No current public matters are recorded for this judge.", "judge-record__empty"));
    } else {
      const docket = document.createElement("ul");
      docket.className = "judge-docket-list";
      cases.forEach((row) => docket.append(renderCase(row)));
      body.append(docket);
    }

    article.append(header, body);
    return article;
  }

  function render(judges) {
    list.replaceChildren();
    list.setAttribute("aria-busy", "false");
    if (!judges.length) {
      list.append(text("p", "No active District Court judges are currently published by JIS.", "judges-empty"));
      setStatus("No active District Court judges are currently published.");
      return;
    }
    judges.forEach((judge) => list.append(renderJudge(judge)));
    setStatus(`${judges.length} active District Court ${judges.length === 1 ? "judge" : "judges"} published.`);
  }

  function unavailable(message) {
    list.replaceChildren(text("p", message, "judges-error"));
    list.setAttribute("aria-busy", "false");
    setStatus("Judge directory temporarily unavailable.");
  }

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
      const judges = Array.isArray(payload?.data?.judges) ? payload.data.judges : [];
      render(judges);
    } catch {
      unavailable("The District Court judge directory could not be loaded. Please try again later.");
    } finally {
      window.clearTimeout(timeout);
    }
  }

  void load();
})();
