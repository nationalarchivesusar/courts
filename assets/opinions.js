(() => {
  "use strict";

  const list = document.getElementById("opinions-list");
  const query = document.getElementById("opinions-query");
  const typeFilter = document.getElementById("opinions-type");
  const yearFilter = document.getElementById("opinions-year");
  const status = document.getElementById("opinions-status");
  const empty = document.getElementById("opinions-empty");
  const total = document.getElementById("opinions-total");
  const opinionCount = document.getElementById("opinions-opinion-count");
  const orderCount = document.getElementById("opinions-order-count");
  if (!list || !query || !typeFilter || !yearFilter || !status) return;

  const records = Array.from(list.querySelectorAll("[data-opinion-name]"));

  function cleanName(name) {
    return String(name || "")
      .replace(/\.(pdf)$/i, "")
      .replace(/_/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function documentType(name) {
    const lower = name.toLocaleLowerCase();
    if (lower.includes("order list")) return "Order list";
    if (lower.includes("per curiam")) return "Per curiam decision";
    if (lower.includes("slip") && lower.includes("opinion")) return "Slip opinion";
    if (lower.includes("opinion")) return "Opinion";
    if (lower.includes("petition") || lower.includes("writ")) return "Archived filing";
    return "Court document";
  }

  function yearFrom(name) {
    const longYear = name.match(/\b(20\d{2})\b/);
    if (longYear) return longYear[1];
    const shortDate = name.match(/(?:\.|_|\(|\s)(\d{1,2})[._](\d{1,2})(?:[._]|\s|\))(\d{2})(?:\D|$)/);
    if (shortDate) return `20${shortDate[3]}`;
    return "";
  }

  function citationFrom(name) {
    const match = name.match(/\b\d+\s+U\.S\.\s+[_\d]+(?:\s*\(20\d{2}\))?/i);
    return match ? match[0].replace(/\s+/g, " ") : "";
  }

  function docketFrom(name) {
    const match = name.match(/^\s*(\d{1,3}-\d{1,4})\b/);
    return match ? match[1] : "";
  }

  function titleFrom(name, type) {
    let title = cleanName(name);
    if (type === "Opinion" || type === "Slip opinion") {
      title = title
        .replace(/^\s*Opinion\s*[-–—:]?\s*/i, "")
        .replace(/\s+Opinion(?:\s+Slip)?\s*$/i, "")
        .replace(/\s+Slip\s+Opinion\s*$/i, "");
    }
    if (/^\d{1,3}-\d{1,4}\s+(?:Opinion|Slip Opinion)$/i.test(title)) return title;
    return title || cleanName(name);
  }

  const metadata = records.map((record) => {
    const name = record.dataset.opinionName || "";
    const type = documentType(name);
    const year = yearFrom(name);
    const citation = citationFrom(name);
    const docket = docketFrom(name);
    const title = titleFrom(name, type);

    const typeNode = record.querySelector("[data-opinion-type]");
    const yearNode = record.querySelector("[data-opinion-year]");
    const titleNode = record.querySelector("[data-opinion-title]");
    const metaNode = record.querySelector("[data-opinion-meta]");
    if (typeNode) typeNode.textContent = type;
    if (yearNode && year) {
      yearNode.textContent = year;
      yearNode.hidden = false;
    }
    if (titleNode) titleNode.textContent = title;
    const pieces = [];
    if (docket) pieces.push(`Docket ${docket}`);
    if (citation) pieces.push(citation);
    if (year && !citation.includes(year)) pieces.push(year);
    pieces.push("Local archive");
    if (metaNode) metaNode.textContent = pieces.join(" · ");

    const searchText = [name, title, type, year, citation, docket].join(" ").toLocaleLowerCase();
    return { record, type, year, searchText };
  });

  const types = [...new Set(metadata.map((item) => item.type))].sort();
  types.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    typeFilter.append(option);
  });

  const years = [...new Set(metadata.map((item) => item.year).filter(Boolean))].sort((a, b) => b.localeCompare(a));
  years.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    yearFilter.append(option);
  });

  if (total) total.textContent = String(metadata.length);
  if (opinionCount) {
    opinionCount.textContent = String(metadata.filter((item) => ["Opinion", "Slip opinion", "Per curiam decision"].includes(item.type)).length);
  }
  if (orderCount) orderCount.textContent = String(metadata.filter((item) => item.type === "Order list").length);

  function render() {
    const needle = query.value.trim().toLocaleLowerCase();
    const type = typeFilter.value;
    const year = yearFilter.value;
    let shown = 0;
    metadata.forEach((item) => {
      const visible = (!needle || item.searchText.includes(needle))
        && (!type || item.type === type)
        && (!year || item.year === year);
      item.record.hidden = !visible;
      if (visible) shown += 1;
    });
    status.textContent = `${shown} archived document${shown === 1 ? "" : "s"} shown.`;
    if (empty) empty.hidden = shown !== 0;
  }

  query.addEventListener("input", render);
  typeFilter.addEventListener("change", render);
  yearFilter.addEventListener("change", render);
  render();
})();
