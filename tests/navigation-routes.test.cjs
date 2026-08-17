const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("primary navigation reflects user tasks instead of implementation history", () => {
  const header = read("_includes/header.html");
  assert.match(header, />Home<\/a>/);
  assert.match(header, /<summary>Cases<\/summary>/);
  assert.match(header, />Judges<\/a>/);
  assert.match(header, /<summary>Rules<\/summary>/);
  assert.match(header, />Forms &amp; Templates<\/a>/);
  assert.match(header, />Case Law<\/a>/);
  assert.match(header, />Records<\/a>/);
  assert.match(header, />U\.S\. Code/);
  assert.doesNotMatch(header, />Docket<\/a>\s*<a/);
  assert.doesNotMatch(header, /<summary>Rules &amp; Conduct<\/summary>/);
});

test("Cases menu groups case search, current dockets, and filed documents", () => {
  const header = read("_includes/header.html");
  assert.match(header, /nav-menu--cases/);
  assert.match(header, /href="\{\{ '\/cases\/' \| relative_url \}\}"[\s\S]*>Search Cases/);
  assert.match(header, /href="\{\{ '\/docket\/' \| relative_url \}\}"[\s\S]*>Current Dockets/);
  assert.match(header, /href="\{\{ '\/documents\/search\/' \| relative_url \}\}"[\s\S]*>Filed Document Search/);
  assert.ok(header.includes("page.url == '/docket/' or page.url == '/cases/' or page.url == '/case/' or page.url == '/documents/search/'"));
});

test("Rules menu preserves procedure and conduct as distinct sections", () => {
  const header = read("_includes/header.html");
  const rules = read("rules.html");
  assert.match(header, /nav-menu--rules/);
  assert.match(header, /<h2 id="procedure-menu-heading">Rules of Procedure<\/h2>/);
  assert.match(header, /<h2 id="conduct-menu-heading">Codes of Conduct<\/h2>/);
  assert.match(header, /href="\{\{ '\/rules\/' \| relative_url \}\}"/);
  assert.match(rules, /permalink: \/rules\//);
  assert.match(rules, /<h2 id="procedure-heading">Rules of Procedure<\/h2>/);
  assert.match(rules, /<h2 id="conduct-heading">Codes of Conduct<\/h2>/);
});

test("Forms and Templates remains the reusable resource library", () => {
  const header = read("_includes/header.html");
  const docs = read("docs.html");
  assert.match(header, /href="\{\{ '\/docs\/' \| relative_url \}\}"[^>]*>Forms &amp; Templates<\/a>/);
  assert.match(docs, /permalink: \/docs\//);
  assert.match(docs, /<h1>Forms &amp; Templates<\/h1>/);
  assert.match(docs, /Search templates/);
  assert.doesNotMatch(docs, /Public Court Document Search/);
});

test("case service pages use shallow contextual links instead of a second global subnav", () => {
  for (const file of ["cases.html", "case.html", "document-search.html", "judges.html"]) {
    assert.doesNotMatch(read(file), /class="case-subnav"/);
  }
  assert.match(read("cases.html"), /class="page-actions"/);
  assert.match(read("document-search.html"), /class="page-actions"/);
  assert.match(read("case.html"), /Back to Case Search/);
});

test("canonical docket page stays Trello-backed while linking into structured case files", () => {
  const page = read("docket.html");
  assert.match(page, /permalink: \/docket\//);
  assert.match(page, /<h1>Current Dockets<\/h1>/);
  assert.match(page, /data-docket-supreme=/);
  assert.match(page, /data-docket-district=/);
  assert.match(page, /data-case-path=/);
  assert.match(page, /Search Cases/);
  assert.doesNotMatch(page, /id="cases-experience"/);
  assert.doesNotMatch(page, /assets\/cases\.js/);
});

test("homepage docket uses the dedicated case route through Jekyll relative_url", () => {
  const page = read("index.html");
  assert.match(page, /data-case-path="\{\{ '\/case\/' \| relative_url \}\}"/);
  assert.doesNotMatch(page, /data-cases-path=/);
  assert.match(page, /Find Court Information/);
  assert.match(page, /Rules and legal resources/);
});

test("case directory and individual case file are distinct JIS routes", () => {
  const directory = read("cases.html");
  const detail = read("case.html");
  assert.match(directory, /permalink: \/cases\//);
  assert.match(directory, /id="cases-search-form"/);
  assert.match(directory, /data-cases-path="\{\{ '\/case\/'/);
  assert.match(detail, /permalink: \/case\//);
  assert.match(detail, /id="case-detail"/);
  assert.match(detail, /data-search-path="\{\{ '\/cases\/'/);
});

test("filed-document search remains a case-record service, not the template library", () => {
  const page = read("document-search.html");
  assert.match(page, /permalink: \/documents\/search\//);
  assert.match(page, /title: Filed Document Search/);
  assert.match(page, /breadcrumb_parent: Case Search/);
  assert.match(page, /breadcrumb_parent_url: \/cases\//);
  assert.match(page, /assets\/document-search\.js/);
});

test("case-law research stays separate and exposes the local opinions archive", () => {
  const page = read("caselaw.html");
  const opinions = read("opinions.html");
  assert.match(page, /permalink: \/caselaw\//);
  assert.match(page, /id="case-search-form"/);
  assert.match(page, /assets\/case-search\.js/);
  assert.match(page, /\/opinions\//);
  assert.match(opinions, /permalink: \/opinions\//);
  assert.match(opinions, /site\.static_files/);
  assert.doesNotMatch(page, /id="cases-experience"/);
});

test("only the retired case-law search URL redirects", () => {
  assert.doesNotMatch(read("cases.html"), /window\.location\.replace\(target/);
  assert.match(read("case-search.html"), /window\.location\.replace\(target/);
  assert.match(read("case-search.html"), /'\/caselaw\/'/);
});
