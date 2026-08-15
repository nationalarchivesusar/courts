const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("docket.html", "utf8");

test("docket page loads dedicated shell and live docket client", () => {
  assert.match(page, /assets\/data-pages\.css/);
  assert.match(page, /assets\/cases\.css/);
  assert.match(page, /assets\/dockets\.js/);
  assert.doesNotMatch(page, /assets\/cases\.js/);
});
