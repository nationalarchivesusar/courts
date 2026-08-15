# United States Courts site architecture

This repository publishes the United States Courts website at
`https://nationalarchivesusar.github.io/courts/`.

## Current public surfaces

- Jekyll layouts and includes own document structure, metadata, navigation, and
  maintenance attribution.
- `_frap`, `_frcp`, `_frcmp`, `_fre`, and `_supct` remain the authoritative
  rule collections. Their established permalinks are preserved.
- Rule pages progressively enhance subdivision markers into stable hierarchical
  fragment links (for example, `#subsection-f-paragraph-2-subparagraph-C`).
  Clicking a marker copies its pinpoint URL; opening that URL highlights the
  provision. The same hierarchy also drives the on-page contents list.
- Rule-page Open Graph and Twitter metadata is generated from the rule title,
  ruleset, and opening text so shared rule and pinpoint URLs have useful embeds.
- `_data/documents.yml` is the document-library catalog.
- `assets/dockets.js` reads the two configured public docket boards for current
  proceedings on the home page and the dedicated `/docket/` page. District
  Court cards with a recognized docket number link into the JIS-backed docket
  case view rather than making Trello the normal public destination.
- `assets/docket-fallback.json` is a generated last-known-good cache. Run
  `node scripts/update-fallback.js` to refresh it; the scheduled workflow runs
  the same script.
- `/caselaw/` is a deliberately separate Supreme Court case-law research page.
  `assets/case-search.js` uses CourtListener's public endpoint and the `scotus`
  jurisdiction. No API credential is shipped to the browser.
- `search.json` is the generated local site index used by
  `assets/site-search.js`.
- `/records/` is the public JIS person-record client for arrests and convictions.
- `/docket/` is the public current-docket and JIS case-record surface. It first
  presents live Supreme Court and District Court docket listings and then
  provides JIS-backed District Court case search/detail records with parties,
  charges/dispositions, judge assignment metadata, public documents, and
  chronological docket entries.
- `/cases/` remains only as a compatibility redirect to `/docket/`.
- `/case-search.html` remains only as a compatibility redirect to `/caselaw/`.
- The public JIS API origin is configured once in `jis.public_api_base_url`.
  Browser clients contain no JIS secret.

## JIS case data flow

The District Court Trello remains a workflow/source system. Current-docket
panels may read the public board directly for immediate availability, while JIS
maintains the normalized structured case record.

```text
District Court Trello
        |
        +------------------------> current docket display
        |
        v
JIS worker / source records
        |
        +--> CourtCase
        +--> CaseParty / IdentityClaim
        +--> Judge / CaseJudgeAssignment
        +--> CourtDocument
        +--> DocketEntry
        +--> Charge / Disposition / Conviction when established
        |
        v
public_api allowlisted projections
        |
        v
GET /api/v1/cases...
        |
        v
/courts/docket/
```

The worker preserves changed Trello cards as immutable `SourceRecord` versions.
The case sync may derive public metadata directly visible in the card—docket,
caption, list-based judge assignment, filed-document links, and historical
username claims—but it may not infer a conviction merely because a case is
closed or moved to `Completed Criminal Cases`.

## Record namespaces and identity rules

Stable public namespaces include `/docket/`, `/caselaw/`, `/records/`, and the
JIS `/api/v1/` endpoints. Future backed services may add `/judges/`,
opinions/orders, and internal administrative surfaces without creating empty
placeholder pages.

Data models must preserve the distinction among allegation or arrest, charge,
conviction, acquittal, dismissal, pardon, vacatur, and other post-judgment
changes. A Roblox UserId is the canonical account identifier when verified.
Historical username-only evidence remains an unresolved `IdentityClaim` until
positively linked. A current account with the same username is a separate
result and must not be treated as the same person without a verified JIS
linkage.

## Development constraints

- All internal URLs must pass through Jekyll's `relative_url` or `absolute_url`
  filters so the `/courts/` project base path remains intact.
- Remote docket, case, and records data must be rendered with DOM text nodes,
  validated URLs, and `rel="noopener noreferrer"`; never insert remote strings
  through `innerHTML`.
- Public JIS projections are allowlists. Internal UUIDs, IdentityClaim IDs,
  SourceRecord payloads, notes, provenance, and review data do not belong in
  public browser responses.
- Keep the site progressively enhanced and dependency-light. Do not introduce a
  client framework merely to add a records feature.
- Docket/current-proceedings and Supreme Court case-law research are separate
  user experiences and should not be nested inside one another.
