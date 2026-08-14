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

  function identityNotice(record) {
    return record?.identity?.status === "unresolved_username"
      ? "Identity unverified — this record reflects the username contained in the historical source."
      : null;
  }

  function sentenceKey(sentence) {
    const components = Array.isArray(sentence?.components)
      ? sentence.components.map((component) => [
          component?.type ?? null,
          component?.amount ?? null,
          component?.unit ?? null,
          component?.currency ?? null,
          component?.details ?? null,
        ])
      : [];
    return JSON.stringify([
      sentence?.imposedAt ?? null,
      sentence?.rawText ?? null,
      sentence?.status ?? null,
      components,
    ]);
  }

  function groupConvictions(convictions) {
    const groups = [];
    const byKey = new Map();
    (Array.isArray(convictions) ? convictions : []).forEach((conviction) => {
      const key = JSON.stringify([
        conviction?.docketNumber ?? "",
        conviction?.defendantUsername ?? "",
        conviction?.convictedAt ?? "",
      ]);
      let group = byKey.get(key);
      if (!group) {
        group = {
          docketNumber: conviction?.docketNumber || "Criminal case",
          caption: conviction?.caption || conviction?.docketNumber || "Criminal case",
          defendantUsername: conviction?.defendantUsername || "Unknown defendant",
          convictedAt: conviction?.convictedAt || null,
          currentStatus: conviction?.currentStatus || null,
          statusEffectiveAt: conviction?.statusEffectiveAt || null,
          basis: conviction?.basis || null,
          identity: conviction?.identity || { status: "unresolved_username", robloxUserId: null },
          counts: [],
          sentences: [],
          _sentenceKeys: new Set(),
        };
        byKey.set(key, group);
        groups.push(group);
      }
      group.counts.push({
        countNumber: conviction?.countNumber,
        displayCitation: conviction?.displayCitation || null,
        offenseName: conviction?.offenseName || "Offense unavailable",
      });
      (Array.isArray(conviction?.sentences) ? conviction.sentences : []).forEach((sentence) => {
        const sKey = sentenceKey(sentence);
        if (!group._sentenceKeys.has(sKey)) {
          group._sentenceKeys.add(sKey);
          group.sentences.push(sentence);
        }
      });
    });
    groups.forEach((group) => {
      group.counts.sort((a, b) => Number(a.countNumber || 0) - Number(b.countNumber || 0));
      delete group._sentenceKeys;
    });
    return groups;
  }

  function dispositionBasisLabel(value) {
    return ({
      accepted_plea: "Accepted plea",
      verdict: "Verdict",
      court_order: "Court order",
    })[value] || value || null;
  }

  function convictionStatusLabel(value) {
    return ({
      active: "Active",
      vacated: "Vacated",
      reversed: "Reversed",
      pardoned: "Pardoned",
      superseded: "Superseded",
    })[value] || value || null;
  }

  const model = {
    normalizeQuery,
    queryKind,
    apiUrl,
    resultClasses,
    allegedOffenseLabel,
    identityNotice,
    groupConvictions,
    dispositionBasisLabel,
    convictionStatusLabel,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = model;
  global.JISRecordsModel = model;
})(typeof window !== "undefined" ? window : globalThis);
