const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("primary navigation keeps Docket and Case Law separate", () => {
  const header = read("_includes/header.html");
  assert.match(header, /href="\{\{ '\/docket\/' \| relative_url \}\}"[^>]*>Docket<\/a>/);
  assert.match(header, /href="\{\{ '\/caselaw\/' \| relative_url \}\}"[^>]*>Case Law<\/a>/);
});

test("canonical docket page stays Trello-backed while linking into structured case files", () => {
  const page = read("docket.html");
  assert.match(page, /permalink: \/docket\//);
  assert.match(page, /data-docket-supreme=/);
  assert.match(page, /data-docket-district=/);
  assert.match(page, /data-case-path=/);
  assert.match(page, /Search District Court cases/);
  assert.doesNotMatch(page, /id="cases-experience"/);
  assert.doesNotMatch(page, /assets\/cases\.js/);
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

test("case-law page exclusively owns the CourtListener search", () => {
  const page = read("caselaw.html");
  assert.match(page, /permalink: \/caselaw\//);
  assert.match(page, /id="case-search-form"/);
  assert.match(page, /assets\/case-search\.js/);
  assert.doesNotMatch(page, /id="cases-experience"/);
  assert.doesNotMatch(read("docket.html"), /assets\/case-search\.js/);
  assert.doesNotMatch(read("cases.html"), /assets\/case-search\.js/);
});

test("only the retired case-law search URL redirects", () => {
  assert.doesNotMatch(read("cases.html"), /window\.location\.replace\(target/);
  assert.match(read("case-search.html"), /window\.location\.replace\(target/);
  assert.match(read("case-search.html"), /'\/caselaw\/'/);
});
