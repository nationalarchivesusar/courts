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
  proceedings on the home page and dedicated `/docket/` page. The Trello-backed
  current calendar remains deliberately independent of JIS so a structured API
  outage does not blank the live docket. Recognized District Court docket
  numbers link into their structured JIS case file while retaining a separate
  source-card link.
- `assets/docket-fallback.json` is a generated last-known-good cache. Run
  `node scripts/update-fallback.js` to refresh it; the scheduled workflow runs
  the same script.
- `/cases/` is the JIS-backed public District Court case directory. It can browse
  recent public matters or search by docket, caption, party, statute citation,
  or offense and filter by case type/status.
- `/case/?docket=...` is the dedicated public case-file surface. It presents the
  normalized case summary, parties, judge assignment, criminal counts and
  current dispositions where available, dated docket entries, and indexed
  public documents. Source Trello links remain separately visible.
- `/caselaw/` is a deliberately separate Supreme Court case-law research page.
  `assets/case-search.js` uses CourtListener's public endpoint and the `scotus`
  jurisdiction. No API credential is shipped to the browser.
- `search.json` is the generated local site index used by
  `assets/site-search.js`.
- `/records/` is the public JIS person-record client for arrests and convictions.
- `/judges/` is a JIS-backed District Court directory. It consumes only the
  allowlisted `GET /api/v1/judges?court=usdc` projection and displays active
  District judges plus current public matters derived from JIS assignments.
  Judge docket matters link to the corresponding public JIS case file.
  Individual Supreme Court justice profiles are intentionally not manually
  maintained by this feature.
- `/case-search.html` remains only as a compatibility redirect to `/caselaw/`.
- The public JIS API origin is configured once in `jis.public_api_base_url`.
  Browser clients contain no JIS secret.

## JIS case and judge data flow

The District Court Trello remains a workflow/source system. Current-docket
panels read the public board directly for immediate availability, while JIS
maintains normalized structured case and judge-assignment records.

```text
District Court Trello
        |
        +------------------------> current docket display
        |                                 |
        |                                 +--> /docket/
        |                                 |      |
        |                                 |      +--> /case/?docket=...
        |                                 |
        |                                 +--> source docket card
        |
        v
JIS worker / immutable source records
        |
        +--> CourtCase (criminal + civil)
        +--> CaseParty / IdentityClaim
        +--> Judge / CaseJudgeAssignment
        +--> CourtDocument
        +--> DocketEntry
        +--> Charge / Disposition / Conviction when independently established
        |
        v
public_api allowlisted projections
        |
        +--> GET /api/v1/cases...
        +--> GET /api/v1/judges?court=usdc
                    |
                    +--> /courts/cases/
                    +--> /courts/case/?docket=...
                    +--> /courts/judges/
```

The worker preserves changed Trello cards as immutable `SourceRecord` versions.
The case sync may derive public metadata directly visible in the card—docket,
caption, criminal/civil type, list-based judge assignment, filed-document links,
and historical username claims—but it may not infer a conviction merely because
a case is closed or moved to a completed-case list.

Older Trello cards sometimes contain a public document link without a reliable
filing timestamp. Such a link may become a `CourtDocument`, but JIS does not
manufacture a docket-entry date; a `DocketEntry` is created only when a filing
time is supported by the source.

The District judge directory does not create a second manually maintained judge
roster. It reflects active public `Judge` rows and current public
`CaseJudgeAssignment` rows already generated by the case synchronization layer.
Closed, restricted, archived, and Supreme Court records are excluded from its
public projection.

## Record namespaces and identity rules

Stable public namespaces include `/docket/`, `/cases/`, `/case/`, `/caselaw/`,
`/records/`, `/judges/`, and the JIS `/api/v1/` endpoints. Future backed services
may add opinions/orders without creating empty placeholder pages. The
authenticated JIS review console is an internal backend surface and does not
belong in the public Courts navigation.

Data models must preserve the distinction among allegation or arrest, charge,
conviction, acquittal, dismissal, pardon, vacatur, and other post-judgment
changes. A Roblox UserId is the canonical account identifier when verified.
Historical username-only evidence remains an unresolved `IdentityClaim` until
positively linked. A current account with the same username is a separate result
and must not be treated as the same person without a verified JIS linkage.

## Development constraints

- All internal URLs must pass through Jekyll's `relative_url` or `absolute_url`
  filters so the `/courts/` project base path remains intact.
- Remote docket, case, judge, and records data must be rendered with DOM text
  nodes, validated URLs where applicable, and `rel="noopener noreferrer"`;
  never insert remote strings through `innerHTML`.
- Public JIS projections are allowlists. Internal UUIDs, IdentityClaim IDs,
  SourceRecord payloads, notes, provenance, and review data do not belong in
  public browser responses.
- Keep the site progressively enhanced and dependency-light. Do not introduce a
  client framework merely to add a records feature.
- Docket/current-proceedings and Supreme Court case-law research are separate
  user experiences and should not be nested inside one another.
- Keep the Trello-backed current docket usable even when JIS is unavailable;
  richer structured case files may fail independently without taking down the
  calendar.
- Do not publish frontend features that require new JIS endpoints until the
  corresponding backend migration/routes are deployed and smoke-tested.
