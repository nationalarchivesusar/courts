# United States Courts site architecture

This repository publishes the Phase I United States Courts website at
`https://nationalarchivesusar.github.io/courts/`.

## Current public surfaces

- Jekyll layouts and includes own document structure, metadata, navigation, and
  maintenance attribution.
- `_frap`, `_frcp`, `_frcmp`, `_fre`, and `_supct` remain the authoritative
  rule collections. Their established permalinks are preserved.
- `_data/documents.yml` is the document-library catalog.
- `assets/dockets.js` reads the two configured public docket boards. The board
  identifiers and related-site URLs live in `_config.yml`.
- `assets/docket-fallback.json` is a generated last-known-good cache. Run
  `node scripts/update-fallback.js` to refresh it; the scheduled workflow runs
  the same script.
- `assets/case-search.js` uses CourtListener's public search endpoint and limits
  results to the `scotus` jurisdiction. No API credential is shipped to the
  browser.
- `search.json` is the generated local site index used by
  `assets/site-search.js`.

## Future route namespaces

Future court-information work should add real, backed services beneath stable
namespaces such as `/cases/`, `/dockets/`, `/people/`, `/records/`, `/arrests/`,
`/judges/`, and `/api/v1/`. Phase I deliberately does not expose empty pages or
mock APIs for those concepts.

Data models must preserve the distinction among allegation or arrest, charge,
conviction, acquittal, dismissal, pardon, vacatur, and other post-judgment
changes. A Roblox UserId may later serve as a stable person identifier, but
identity, history, and disposition records require a governed data source
before they are published.

## Development constraints

- All internal URLs must pass through Jekyll's `relative_url` or `absolute_url`
  filters so the `/courts/` project base path remains intact.
- Remote docket and search data must be rendered with DOM text nodes, validated
  URLs, and `rel="noopener noreferrer"`; never insert remote strings through
  `innerHTML`.
- Keep the site progressively enhanced and dependency-light. Do not introduce a
  client framework merely to add a records feature.

