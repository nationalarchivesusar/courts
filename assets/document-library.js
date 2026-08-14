(() => {
  const dataElement = document.getElementById("document-data");
  const container = document.getElementById("document-grid");
  const search = document.getElementById("document-search");
  const courtFilter = document.getElementById("court-filter");
  const count = document.getElementById("document-count");
  if (!dataElement || !container || !search || !courtFilter || !count) return;

  let documents = [];
  try {
    const parsed = JSON.parse(dataElement.textContent);
    if (Array.isArray(parsed)) documents = parsed;
  } catch {
    count.textContent = "The document catalog could not be loaded.";
    return;
  }

  function safeDocumentUrl(value) {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) ? url.toString() : null;
    } catch {
      return null;
    }
  }

  function cardFor(entry) {
    const article = document.createElement("article");
    article.className = "document-card";
    const heading = document.createElement("h2");
    heading.textContent = String(entry.title || "Untitled document");
    const description = document.createElement("p");
    description.textContent = String(entry.description || "");
    const footer = document.createElement("div");
    footer.className = "document-card__footer";
    const tags = document.createElement("div");
    tags.className = "document-tags";
    (Array.isArray(entry.tags) ? entry.tags : []).forEach((tag) => {
      const item = document.createElement("span");
      item.className = "document-tag";
      item.textContent = String(tag);
      tags.append(item);
    });
    footer.append(tags);
    const href = safeDocumentUrl(entry.url);
    if (href) {
      const link = document.createElement("a");
      link.href = href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "Open document";
      footer.append(link);
    }
    article.append(heading, description, footer);
    return article;
  }

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const court = courtFilter.value;
    const matches = documents
      .filter((document) => {
        const text = `${document.title || ""} ${document.description || ""}`.toLocaleLowerCase();
        const tags = Array.isArray(document.tags) ? document.tags : [];
        return (!query || text.includes(query)) && (court === "All" || tags.includes(court));
      })
      .sort((a, b) => String(a.title).localeCompare(String(b.title)));
    container.replaceChildren();
    matches.forEach((document) => container.append(cardFor(document)));
    count.textContent = `${matches.length} document${matches.length === 1 ? "" : "s"}.`;
  }

  search.addEventListener("input", render);
  courtFilter.addEventListener("change", render);
  render();
})();
