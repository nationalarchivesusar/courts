const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("docket page does not embed the CourtListener case-law search", () => {
  const page = fs.readFileSync("docket.html", "utf8");
  assert.doesNotMatch(page, /case-search\.js/);
  assert.doesNotMatch(page, /CourtListener/);
});
