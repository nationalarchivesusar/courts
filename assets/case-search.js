(() => {
  const form = document.getElementById("case-search-form");
  const queryInput = document.getElementById("case-query");
  const topicInput = document.getElementById("case-category");
  const results = document.getElementById("case-results");
  const count = document.getElementById("case-results-count");
  if (!form || !queryInput || !results || !count) return;

  function plainText(value) {
    const parser = new DOMParser();
    return parser.parseFromString(String(value || ""), "text/html").body.textContent.trim();
  }

  function sourceUrl(path) {
    try {
      const url = new URL(path, "https://www.courtlistener.com/");
      return url.origin === "https://www.courtlistener.com" ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function resultCard(item) {
    const article = document.createElement("article");
    article.className = "case-result";
    const heading = document.createElement("h3");
    const href = sourceUrl(item.absolute_url);
    const title = plainText(item.caseName || item.caseNameFull || item.caption || "Untitled decision");
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = title;
      heading.append(link);
    } else {
      heading.textContent = title;
    }
    article.append(heading);

    const citations = Array.isArray(item.citation) ? item.citation.join(", ") : "";
    const metaParts = [item.court, item.dateFiled, item.docketNumber, citations].filter(Boolean);
    if (metaParts.length) {
      const meta = document.createElement("p");
      meta.className = "case-result__meta";
      meta.textContent = metaParts.join(" · ");
      article.append(meta);
    }

    const snippets = Array.isArray(item.opinions)
      ? item.opinions.map((opinion) => plainText(opinion.snippet)).filter(Boolean)
      : [];
    const snippetText = plainText(item.snippet) || snippets[0];
    if (snippetText) {
      const snippet = document.createElement("p");
      snippet.className = "case-result__snippet";
      snippet.textContent = snippetText;
      article.append(snippet);
    }
    return article;
  }

  async function search(query, topic) {
    results.replaceChildren();
    results.setAttribute("aria-busy", "true");
    count.textContent = "Searching Supreme Court case law…";
    const scopedQuery = `(${query}) AND court_id:scotus`;
    const url = new URL("https://www.courtlistener.com/api/rest/v4/search/");
    url.searchParams.set("q", scopedQuery);
    url.searchParams.set("type", "o");
    url.searchParams.set("order_by", "score desc");
    if (topic) url.searchParams.set("topic", topic);

    try {
      const response = await fetch(url, { credentials: "omit" });
      if (!response.ok) throw new Error(`Search failed (${response.status})`);
      const data = await response.json();
      const matches = Array.isArray(data.results)
        ? data.results.filter((item) => item.court_id === "scotus")
        : [];
      const total = Number.isFinite(data.count) ? data.count : matches.length;
      count.textContent = matches.length
        ? `Showing ${matches.length} of ${total.toLocaleString()} matching decisions.`
        : "No Supreme Court decisions matched this search.";
      matches.forEach((item) => results.append(resultCard(item)));
    } catch {
      count.textContent = "Case search is temporarily unavailable. Please try again later.";
      const notice = document.createElement("p");
      notice.className = "notice";
      notice.textContent = "The CourtListener public search service could not be reached.";
      results.append(notice);
    } finally {
      results.setAttribute("aria-busy", "false");
    }
  }

  function updateLocation(query, topic) {
    const url = new URL(window.location.href);
    url.searchParams.set("q", query);
    if (topic) url.searchParams.set("topic", topic);
    else url.searchParams.delete("topic");
    history.replaceState(null, "", url);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = queryInput.value.trim();
    const topic = topicInput?.value.trim() || "";
    if (!query) return;
    updateLocation(query, topic);
    search(query, topic);
  });

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get("q")?.trim();
  const initialTopic = params.get("topic")?.trim() || "";
  if (initialQuery) {
    queryInput.value = initialQuery;
    if (topicInput) topicInput.value = initialTopic;
    search(initialQuery, initialTopic);
  }
})();

