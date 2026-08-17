const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const casePage = fs.readFileSync("case.html", "utf8");
const casesPage = fs.readFileSync("cases.html", "utf8");
const docsPage = fs.readFileSync("docs.html", "utf8");
const searchPage = fs.readFileSync("document-search.html", "utf8");
const caseEnhancement = fs.readFileSync("assets/phase-m-case-records.js", "utf8");
const documentSearch = fs.readFileSync("assets/document-search.js", "utf8");
const css = fs.readFileSync("assets/phase-m-court-records.css", "utf8");
const shellFixes = fs.readFileSync("assets/shell-fixes.css", "utf8");

test("case files load the Phase M enhancement after the stable base renderer", () => {
  assert.match(casePage, /- \/assets\/phase-m-court-records\.css/);
  assert.match(casePage, /assets\/cases\.js[\s\S]*assets\/phase-m-case-records\.js/);
  assert.match(casePage, /\/documents\/search\//);
  assert.doesNotMatch(casesPage, /phase-m-case-records\.js/);
});

test("Drive preview embedding is allowlisted to Google provider hosts and keeps source links", () => {
  assert.match(caseEnhancement, /url\.hostname !== "drive\.google\.com" && url\.hostname !== "docs\.google\.com"/);
  assert.match(caseEnhancement, /record\.externalProvider === "google_drive"/);
  assert.match(caseEnhancement, /Preview document/);
  assert.match(caseEnhancement, /Open source/);
  assert.match(caseEnhancement, /referrerPolicy = "no-referrer"/);
  assert.match(css, /\.phase-m-viewer iframe/);
});

test("case enhancement obtains judgments and verified related proceedings from dedicated APIs", () => {
  assert.match(caseEnhancement, /\/judgments/);
  assert.match(caseEnhancement, /\/relations/);
  assert.match(caseEnhancement, /Only separately verified JIS legal facts are shown here/);
  assert.match(caseEnhancement, /Related proceedings/);
});

test("document search is a separate public filing search rather than replacing the template library", () => {
  assert.match(searchPage, /permalink: \/documents\/search\//);
  assert.match(searchPage, /Document text is not a disposition/);
  assert.match(searchPage, /assets\/document-search\.js/);
  assert.match(documentSearch, /\/api\/v1\/documents\/search/);
  assert.match(documentSearch, /casePath/);
  assert.match(docsPage, /Public Court Document Search/);
  assert.match(docsPage, /Search templates/);
});

test("document search receives the same stable content shell spacing as other public data pages", () => {
  assert.match(shellFixes, /\.page-document-search \.content-shell/);
  assert.match(shellFixes, /\.page-document-search \.page-heading/);
});

test("navigation remains compact while Documents owns the document-search route", () => {
  const header = fs.readFileSync("_includes/header.html", "utf8");
  assert.match(header, /page\.url == '\/docs\/' or page\.url == '\/documents\/search\/'/);
  assert.doesNotMatch(header, />Document Search<\/a>\s*<a class="primary-nav/);
});
