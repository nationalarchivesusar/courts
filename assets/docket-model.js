(function exposeDocketModel(global) {
  "use strict";

  const definitions = {
    supreme: {
      requireLabels: true,
      listMatches(name) {
        return name.includes("docket");
      },
    },
    district: {
      requireLabels: false,
      listMatches(name) {
        return name.startsWith("the honorable");
      },
    },
  };

  function normalizedListName(value) {
    return String(value || "").trim().toLowerCase();
  }

  function cleanCardName(value) {
    return String(value || "")
      .replace(/[\u200B-\u200F\u2060\uFEFF]/g, "")
      .trim();
  }

  function listBelongsToDocket(type, list) {
    const definition = definitions[type];
    if (!definition || list?.closed === true) return false;
    return definition.listMatches(normalizedListName(list?.name));
  }

  function cardBelongsToDocket(type, card) {
    const definition = definitions[type];
    const name = cleanCardName(card?.name);
    if (!definition || card?.closed === true || !name) return false;
    if (/^create template\b/i.test(name)) return false;
    if (name.toLowerCase() === "____" || /^[-_—–\s]+$/.test(name)) return false;
    if (definition.requireLabels && (!Array.isArray(card?.labels) || card.labels.length === 0)) return false;
    return true;
  }

  function emptyMessage(type, qualifyingListCount) {
    if (type === "district" && qualifyingListCount === 0) {
      return "No District Court judge dockets are configured at this time.";
    }
    if (type === "district") return "No active District Court matters are listed at this time.";
    return "No active Supreme Court matters are listed at this time.";
  }

  function unavailableMessage(type) {
    return type === "district"
      ? "District Court docket information is temporarily unavailable."
      : "Supreme Court docket information is temporarily unavailable.";
  }

  function fallbackIsFresh(generatedAt, now = Date.now(), maxAge = 7 * 24 * 60 * 60 * 1000) {
    const timestamp = Date.parse(String(generatedAt || ""));
    return Number.isFinite(timestamp) && now >= timestamp && now - timestamp <= maxAge;
  }

  function statusLabel(source) {
    return source === "fallback" ? "Cached" : "Current";
  }

  function selectDocketData(type, lists) {
    const qualifyingLists = Array.isArray(lists)
      ? lists.filter((list) => listBelongsToDocket(type, list))
      : [];

    const groups = qualifyingLists.map((list) => {
      const sourceListName = String(list.name || "").trim();
      const cards = (Array.isArray(list.cards) ? list.cards : [])
        .filter((card) => cardBelongsToDocket(type, card))
        .map((card) => ({
          ...card,
          name: cleanCardName(card.name),
          labels: Array.isArray(card.labels) ? card.labels : [],
          sourceListName,
        }));
      return { sourceListName, cards };
    });

    return {
      type,
      qualifyingListCount: qualifyingLists.length,
      groups,
    };
  }

  const api = {
    cardBelongsToDocket,
    cleanCardName,
    definitions,
    emptyMessage,
    fallbackIsFresh,
    listBelongsToDocket,
    normalizedListName,
    selectDocketData,
    statusLabel,
    unavailableMessage,
  };

  global.CourtsDocketModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
