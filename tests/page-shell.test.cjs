const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("docket.html", "utf8");

test("docket page loads dedicated shell and case styling", () => {
  assert.match(page, /assets\/data-pages\.css/);
  assert.match(page, /assets\/cases\.css/);
  assert.match(page, /assets\/dockets\.js/);
  assert.match(page, /assets\/cases\.js/);
});
