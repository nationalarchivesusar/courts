# Docket / Case Law hotfix

This hotfix separates two different public functions that were previously presented as one experience:

- `/docket/` — current Supreme Court and District Court matters plus JIS-backed District Court case records.
- `/caselaw/` — Supreme Court case-law research through CourtListener.

Legacy `/cases/` and `/case-search.html` URLs redirect to the new canonical pages.

The docket page now displays live Trello-backed current matters before the JIS record search so the page remains useful even when the structured case API is unavailable. The page shell, forms, buttons, responsive behavior, and case-record presentation receive dedicated styling.
