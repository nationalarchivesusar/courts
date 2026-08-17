(() => {
  const dataElement = document.getElementById("document-data");
  const container = document.getElementById("document-grid");
  const search = document.getElementById("document-search");
  const courtFilter = document.getElementById("court-filter");
  const typeFilter = document.getElementById("document-type-filter");
  const count = document.getElementById("document-count");
  if (!dataElement || !container || !search || !courtFilter || !typeFilter || !count) return;

  let documents = [];
  try {
    const parsed = JSON.parse(dataElement.textContent);
    if (Array.isArray(parsed)) documents = parsed;
  } catch {
    count.textContent = "The document catalog could not be loaded.";
    return;
  }

  const siteBase = String(container.dataset.siteBase || "").replace(/\/$/, "");

  function safeDocumentUrl(entry) {
    const internalPath = String(entry?.internal_path || "").trim();
    if (internalPath.startsWith("/")) {
      const normalized = `${siteBase}${internalPath}`.replace(/\/{2,}/g, "/");
      return { href: normalized || "/", external: false };
    }
    try {
      const url = new URL(entry?.url);
      return ["https:", "http:"].includes(url.protocol) ? { href: url.toString(), external: true } : null;
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
    const tagValues = Array.isArray(entry.tags) ? entry.tags : [];
    [...tagValues, entry.type].filter(Boolean).forEach((tag) => {
      const item = document.createElement("span");
      item.className = "document-tag";
      item.textContent = String(tag);
      tags.append(item);
    });
    footer.append(tags);
    const destination = safeDocumentUrl(entry);
    if (destination) {
      const link = document.createElement("a");
      link.href = destination.href;
      if (destination.external) {
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "Open document ↗";
      } else {
        link.textContent = "Use template";
      }
      footer.append(link);
    }
    article.append(heading, description, footer);
    return article;
  }

  const types = [...new Set(documents.map((entry) => String(entry.type || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
  types.forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value;
    typeFilter.append(option);
  });

  function render() {
    const query = search.value.trim().toLocaleLowerCase();
    const court = courtFilter.value;
    const type = typeFilter.value;
    const matches = documents
      .filter((document) => {
        const tags = Array.isArray(document.tags) ? document.tags : [];
        const text = `${document.title || ""} ${document.description || ""} ${document.type || ""} ${tags.join(" ")}`.toLocaleLowerCase();
        return (!query || text.includes(query))
          && (court === "All" || tags.includes(court))
          && (type === "All" || document.type === type);
      })
      .sort((a, b) => String(a.title).localeCompare(String(b.title)));
    container.replaceChildren();
    matches.forEach((document) => container.append(cardFor(document)));
    count.textContent = `${matches.length} template${matches.length === 1 ? "" : "s"}.`;
  }

  search.addEventListener("input", render);
  courtFilter.addEventListener("change", render);
  typeFilter.addEventListener("change", render);
  render();
})();
