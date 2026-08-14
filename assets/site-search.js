(() => {
  const script = document.currentScript;
  const indexUrl = script?.dataset.searchIndex;
  const input = document.getElementById("search-page-query");
  const results = document.getElementById("search-results");
  const count = document.getElementById("search-results-count");
  const filters = Array.from(document.querySelectorAll('#search-filters input[type="checkbox"]'));
  if (!indexUrl || !input || !results || !count) return;

  const params = new URLSearchParams(window.location.search);
  const query = params.get("q")?.trim() || "";
  input.value = query;
  let documents = [];

  function normalize(value) {
    return String(value || "").toLocaleLowerCase().replace(/[^a-z0-9.]+/g, " ").trim();
  }

  function snippet(content, terms) {
    const text = String(content || "").replace(/\s+/g, " ").trim();
    if (!text) return "";
    const lower = text.toLocaleLowerCase();
    const positions = terms.map((term) => lower.indexOf(term)).filter((index) => index >= 0);
    const center = positions.length ? Math.min(...positions) : 0;
    const start = Math.max(0, center - 70);
    const end = Math.min(text.length, start + 190);
    return `${start ? "…" : ""}${text.slice(start, end).trim()}${end < text.length ? "…" : ""}`;
  }

  function render() {
    results.replaceChildren();
    if (!query) {
      count.textContent = "Enter a search term.";
      return;
    }
    const terms = normalize(query).split(/\s+/).filter(Boolean);
    const selected = new Set(filters.filter((filter) => filter.checked).map((filter) => filter.value));
    const ranked = documents
      .filter((document) => selected.has(document.collection || ""))
      .map((document) => {
        const title = normalize(document.title);
        const content = normalize(document.content);
        const matched = terms.filter((term) => title.includes(term) || content.includes(term));
        const score = matched.length * 10 + matched.filter((term) => title.includes(term)).length * 18;
        return { document, score };
      })
      .filter((entry) => entry.score > 0 && entry.score >= terms.length * 10)
      .sort((a, b) => b.score - a.score || String(a.document.title).localeCompare(String(b.document.title)))
      .slice(0, 100);

    count.textContent = ranked.length
      ? `${ranked.length} result${ranked.length === 1 ? "" : "s"} for “${query}”.`
      : `No results for “${query}”.`;
    ranked.forEach(({ document: result }) => {
      const item = document.createElement("li");
      item.className = "search-result";
      const link = document.createElement("a");
      link.href = result.url;
      link.textContent = result.title || result.url;
      const meta = document.createElement("p");
      meta.className = "search-result__meta";
      meta.textContent = result.breadcrumb_parent || "United States Courts";
      const excerpt = document.createElement("p");
      excerpt.className = "search-result__snippet";
      excerpt.textContent = snippet(result.content, terms);
      item.append(link, meta, excerpt);
      results.append(item);
    });
  }

  filters.forEach((filter) => filter.addEventListener("change", render));
  if (!query) return;
  count.textContent = "Searching…";
  fetch(indexUrl, { credentials: "same-origin" })
    .then((response) => {
      if (!response.ok) throw new Error(`Search index failed (${response.status})`);
      return response.json();
    })
    .then((data) => {
      documents = Array.isArray(data) ? data : [];
      render();
    })
    .catch(() => {
      count.textContent = "The site search index could not be loaded.";
    });
})();
