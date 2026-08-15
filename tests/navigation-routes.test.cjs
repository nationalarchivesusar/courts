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

test("canonical docket page is independent of JIS case routes", () => {
  const page = read("docket.html");
  assert.match(page, /permalink: \/docket\//);
  assert.match(page, /data-docket-supreme=/);
  assert.match(page, /data-docket-district=/);
  assert.doesNotMatch(page, /id="cases-experience"/);
  assert.doesNotMatch(page, /assets\/cases\.js/);
});

test("case-law page owns the CourtListener search", () => {
  const page = read("caselaw.html");
  assert.match(page, /permalink: \/caselaw\//);
  assert.match(page, /id="case-search-form"/);
  assert.match(page, /assets\/case-search\.js/);
  assert.doesNotMatch(page, /id="cases-experience"/);
});

test("legacy routes redirect to the new canonical pages", () => {
  assert.match(read("cases.html"), /window\.location\.replace\(target/);
  assert.match(read("cases.html"), /'\/docket\/'/);
  assert.match(read("case-search.html"), /window\.location\.replace\(target/);
  assert.match(read("case-search.html"), /'\/caselaw\/'/);
});
