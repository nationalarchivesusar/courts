# Courts Phase M Frontend Handoff

Date: 2026-08-16

Branch: `agent/phase-m-drive-judgments-scotus`

Baseline main commit: `33e9373d1a37e28b2286b67dea79a9f9728fc39b`

The detailed system/database/deployment handoff lives in the JIS backend repository at `docs/PHASE-M-BIG-PASS.md`. This file records the website portion so a future session can locate the public UI work immediately.

## What Phase M adds

### Individual case files — `/case/?docket=...`

`assets/phase-m-case-records.js` runs after the existing stable case renderer. It requests:

- `/api/v1/cases/{docket}/document-experience`
- `/api/v1/cases/{docket}/judgments`
- `/api/v1/cases/{docket}/relations`

It enriches a structured case with:

- public document cards;
- Google Drive/Docs provider-hosted previews;
- source links and integrity/search metadata;
- separately verified sentence/post-judgment history;
- verified related District/Supreme Court proceedings.

It never infers legal effect from a filing title or document classification.

The embedded viewer is intentionally strict: only records marked `google_drive` whose preview URL is HTTPS on exactly `drive.google.com` or `docs.google.com` receive an iframe. Arbitrary external URLs remain ordinary outbound source links.

### Public filed-document search — `/documents/search/`

New files:

- `document-search.html`
- `assets/document-search.js`
- `assets/phase-m-court-records.css`

The page searches public filing metadata and available extracted text through `/api/v1/documents/search`. It can optionally filter by docket and links results back to structured case files.

This is separate from `/docs/`, which remains the reusable court form/template library. The template library now links to Public Court Document Search for users seeking actual filed documents.

### Case Search

`/cases/` explains that normal case search can also match indexed public filing titles/text once the Phase M backend is deployed. The dedicated Document Search remains the way to see which filing matched.

### Navigation

No new top-level nav item was added. Public Document Search lives under the existing Documents information architecture and in the case subnavigation, avoiding another crowded-header regression.

## Styling

`assets/phase-m-court-records.css` follows the existing institutional visual system and adds only the styles necessary for:

- document cards;
- provider preview frames;
- judgment history;
- related proceedings;
- document search results.

No sitewide cosmetic redesign is part of Phase M.

## Regression test

`tests/phase-m-drive-judgments-scotus.test.cjs` protects:

- head-time stylesheet loading;
- case-only enhancement placement;
- Google viewer hostname/provider allowlist;
- source links;
- no-inference language;
- judgment/relation API integration;
- filed-document search remaining separate from template search;
- compact primary navigation.

## Deployment order

Do not publish this frontend before the Phase M JIS backend is live and its public GET endpoints pass production smoke tests.

After the backend feature branch is production-validated and merged:

1. merge this Courts branch/PR;
2. require fresh main validation success;
3. wait for GitHub Pages deployment success;
4. smoke `/case/`, `/documents/search/`, `/cases/`, `/docs/`, `/docket/`, `/records/`, `/judges/`, and `/caselaw/`;
5. visually verify at least one public Google Drive-backed document if production has one whose Google permissions allow preview embedding.

## Separate known issue

Incomplete older Trello-case ingestion remains a separate backend/source-coverage problem. Do not compensate in this frontend by creating fake cases or merging records by raw username text.
