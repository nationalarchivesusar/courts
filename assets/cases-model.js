(function exposeCasesModel(global) {
  "use strict";

  const allowedStatuses = new Set(["filed", "pending", "stayed", "closed", "archived"]);
  const allowedCaseTypes = new Set(["criminal", "civil", "other"]);

  function cleanText(value) {
    return String(value ?? "").trim();
  }

  function formatDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not recorded";
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }).format(date);
  }

  function formatDateTime(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return "Not recorded";
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

  function titleCase(value) {
    return cleanText(value)
      .replace(/[_-]+/g, " ")
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  function statusLabel(value) {
    const status = cleanText(value).toLowerCase();
    return allowedStatuses.has(status) ? titleCase(status) : "Unknown";
  }

  function caseTypeLabel(value) {
    const caseType = cleanText(value).toLowerCase();
    return allowedCaseTypes.has(caseType) ? titleCase(caseType) : "Other";
  }

  function dispositionLabel(disposition) {
    if (!disposition || !disposition.result) return "Pending";
    return titleCase(disposition.result);
  }

  function identityLabel(identity) {
    switch (identity?.status) {
      case "verified": return identity.robloxUserId ? `Verified account · UserId ${identity.robloxUserId}` : "Verified identity";
      case "unresolved_username": return "Historical username — identity unverified";
      default: return "Identity not linked to a Roblox account";
    }
  }

  function buildCaseHref(basePath, docketNumber) {
    const base = cleanText(basePath) || "/cases/";
    const params = new URLSearchParams({ docket: cleanText(docketNumber) });
    return `${base}?${params.toString()}`;
  }

  function buildSearchApiUrl(apiBase, state) {
    const url = new URL("/api/v1/cases", apiBase);
    const q = cleanText(state?.q);
    const caseType = cleanText(state?.caseType).toLowerCase();
    const status = cleanText(state?.status).toLowerCase();
    const cursor = cleanText(state?.cursor);
    if (q) url.searchParams.set("q", q);
    if (allowedCaseTypes.has(caseType)) url.searchParams.set("caseType", caseType);
    if (allowedStatuses.has(status)) url.searchParams.set("status", status);
    url.searchParams.set("limit", String(Math.min(100, Math.max(1, Number(state?.limit) || 25))));
    if (cursor) url.searchParams.set("cursor", cursor);
    return url.toString();
  }

  function buildCaseApiUrl(apiBase, docketNumber, suffix = "") {
    const docket = encodeURIComponent(cleanText(docketNumber));
    return new URL(`/api/v1/cases/${docket}${suffix}`, apiBase).toString();
  }

  function currentDocket(search) {
    const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
    return cleanText(params.get("docket"));
  }

  function groupCharges(charges) {
    const grouped = new Map();
    for (const charge of Array.isArray(charges) ? charges : []) {
      const key = Number(charge.countNumber) || 0;
      const existing = grouped.get(key);
      if (!existing || Number(charge.revision) > Number(existing.revision)) grouped.set(key, charge);
    }
    return [...grouped.values()].sort((a, b) => Number(a.countNumber) - Number(b.countNumber));
  }

  function safeExternalUrl(value) {
    try {
      const url = new URL(String(value || ""));
      return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  const api = {
    buildCaseApiUrl,
    buildCaseHref,
    buildSearchApiUrl,
    caseTypeLabel,
    cleanText,
    currentDocket,
    dispositionLabel,
    formatDate,
    formatDateTime,
    groupCharges,
    identityLabel,
    safeExternalUrl,
    statusLabel,
    titleCase,
  };

  global.CourtsCasesModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
