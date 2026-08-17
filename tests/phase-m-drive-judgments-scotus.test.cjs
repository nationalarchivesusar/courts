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
  assert.doesNotMatch(casesPage, /phase-m-case-records\.js/);
});

test("document previews preserve the Google allowlist and route Drive HTML through the sandboxed JIS renderer", () => {
  assert.match(caseEnhancement, /url\.hostname !== "drive\.google\.com" && url\.hostname !== "docs\.google\.com"/);
  assert.match(caseEnhancement, /record\.externalProvider === "google_drive"/);
  assert.match(caseEnhancement, /mimeType === "text\/html"/);
  assert.match(caseEnhancement, /mimeType === "application\/xhtml\+xml"/);
  assert.match(caseEnhancement, /sourceFilename/);
  assert.match(caseEnhancement, /safeHtmlViewer/);
  assert.match(caseEnhancement, /\/api\/v1\/documents\/\$\{encodeURIComponent\(documentId\)\}\/html-preview/);
  assert.match(caseEnhancement, /const htmlViewerUrl = safeHtmlViewer\(record\);[\s\S]*const googleViewerUrl = htmlViewerUrl/);
  assert.match(caseEnhancement, /iframe\.setAttribute\("sandbox", ""\)/);
  assert.doesNotMatch(caseEnhancement, /allow-scripts|allow-forms|allow-popups|allow-same-origin|allow-top-navigation/);
  assert.match(caseEnhancement, /Sandboxed HTML preview/);
  assert.match(caseEnhancement, /instead of the Drive source-code viewer/);
  assert.match(caseEnhancement, /Preview document/);
  assert.match(caseEnhancement, /Open source/);
  assert.match(caseEnhancement, /referrerPolicy = "no-referrer"/);
  assert.match(css, /\.phase-m-viewer__security-note/);
  assert.match(css, /\.phase-m-viewer iframe/);
});

test("case enhancement obtains judgments and verified related proceedings from dedicated APIs", () => {
  assert.match(caseEnhancement, /\/judgments/);
  assert.match(caseEnhancement, /\/relations/);
  assert.match(caseEnhancement, /Only separately verified JIS legal facts are shown here/);
  assert.match(caseEnhancement, /Related proceedings/);
});

test("document search stays separate from the reusable template library", () => {
  assert.match(searchPage, /permalink: \/documents\/search\//);
  assert.match(searchPage, /title: Filed Document Search/);
  assert.match(searchPage, /breadcrumb_parent: Case Search/);
  assert.match(searchPage, /breadcrumb_parent_url: \/cases\//);
  assert.match(searchPage, /Document text is not a disposition/);
  assert.match(searchPage, /assets\/document-search\.js/);
  assert.match(documentSearch, /\/api\/v1\/documents\/search/);
  assert.match(documentSearch, /casePath/);
  assert.match(docsPage, /permalink: \/docs\//);
  assert.match(docsPage, /Forms & Templates/);
  assert.match(docsPage, /Search templates/);
  assert.doesNotMatch(docsPage, /Public Court Document Search/);
});

test("document search receives the same stable content shell spacing as other public data pages", () => {
  assert.match(shellFixes, /\.page-document-search \.content-shell/);
  assert.match(shellFixes, /\.page-document-search \.page-heading/);
});

test("Cases owns filed-document search while Forms and Templates remains reusable-only", () => {
  const header = fs.readFileSync("_includes/header.html", "utf8");
  assert.match(header, /<summary>Cases<\/summary>/);
  assert.match(header, /href="\{\{ '\/documents\/search\/' \| relative_url \}\}"[\s\S]*Filed Document Search/);
  assert.match(header, /href="\{\{ '\/docs\/' \| relative_url \}\}"[^>]*>Forms &amp; Templates<\/a>/);
  assert.doesNotMatch(header, /page\.url == '\/docs\/' or page\.url == '\/documents\/search\/'/);
});
