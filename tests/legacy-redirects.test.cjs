const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("case search is a first-class JIS page while the old case-law URL still redirects", () => {
  const cases = fs.readFileSync("cases.html", "utf8");
  const search = fs.readFileSync("case-search.html", "utf8");
  assert.match(cases, /permalink: \/cases\//);
  assert.match(cases, /id="cases-experience"/);
  assert.match(cases, /id="cases-search-form"/);
  assert.doesNotMatch(cases, /window\.location\.replace\(target/);
  assert.match(search, /\/caselaw\//);
  assert.doesNotMatch(search, /id="case-search-form"/);
});
