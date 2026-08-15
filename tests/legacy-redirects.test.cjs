const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("legacy case URLs redirect without reviving the old combined page", () => {
  const cases = fs.readFileSync("cases.html", "utf8");
  const search = fs.readFileSync("case-search.html", "utf8");
  assert.match(cases, /\/docket\//);
  assert.match(search, /\/caselaw\//);
  assert.doesNotMatch(cases, /id="cases-experience"/);
  assert.doesNotMatch(search, /id="case-search-form"/);
});
