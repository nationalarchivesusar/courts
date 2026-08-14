(function exposeRecordsModel(global) {
  "use strict";

  const queryPattern = /^[A-Za-z0-9_]{1,64}$/;
  const userIdPattern = /^[1-9][0-9]{0,19}$/;

  function normalizeQuery(value) {
    return String(value || "").trim();
  }

  function queryKind(value) {
    const query = normalizeQuery(value);
    if (!queryPattern.test(query)) return "invalid";
    return userIdPattern.test(query) ? "roblox_user_id" : "username";
  }

  function apiUrl(baseUrl, path, parameters = {}) {
    const base = new URL(String(baseUrl || ""));
    if (base.protocol !== "https:" && base.hostname !== "127.0.0.1" && base.hostname !== "localhost") {
      throw new Error("The JIS API must use HTTPS.");
    }
    const url = new URL(path.replace(/^\//, ""), `${base.toString().replace(/\/?$/, "/")}`);
    Object.entries(parameters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") url.searchParams.set(key, String(value));
    });
    return url;
  }

  function resultClasses(searchData) {
    return {
      accounts: Array.isArray(searchData?.accounts) ? searchData.accounts : [],
      historicalUsernames: Array.isArray(searchData?.historicalUsernames)
        ? searchData.historicalUsernames
        : [],
    };
  }

  function allegedOffenseLabel(arrest) {
    return Array.isArray(arrest?.allegedOffenses) && arrest.allegedOffenses.length > 0
      ? null
      : "No charges were recorded in the historical arrest log.";
  }

  function identityNotice(arrest) {
    return arrest?.identity?.status === "unresolved_username"
      ? "Identity unverified — this record reflects the username contained in the historical source."
      : null;
  }

  const model = { normalizeQuery, queryKind, apiUrl, resultClasses, allegedOffenseLabel, identityNotice };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  global.JISRecordsModel = model;
})(typeof window !== "undefined" ? window : globalThis);
