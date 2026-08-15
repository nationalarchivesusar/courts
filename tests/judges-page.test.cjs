const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const page = fs.readFileSync("judges.html", "utf8");
const script = fs.readFileSync("assets/judges.js", "utf8");
const header = fs.readFileSync("_includes/header.html", "utf8");

test("judges page is a dedicated JIS-backed District Court directory", () => {
  assert.match(page, /permalink: \/judges\//);
  assert.match(page, /id="judges-experience"/);
  assert.match(page, /data-api-base=/);
  assert.match(page, /assets\/judges\.js/);
  assert.match(header, /'\/judges\/' \| relative_url/);
});

test("judge directory uses only the District Court public endpoint", () => {
  assert.match(script, /\/api\/v1\/judges\?court=usdc/);
  assert.doesNotMatch(script, /scotus/i);
  assert.doesNotMatch(script, /innerHTML/);
});

test("Supreme Court justice profiles are not fabricated or manually enumerated", () => {
  assert.match(page, /Individual Supreme Court justice profiles are not manually maintained here/);
  assert.doesNotMatch(page, /Chief Justice [A-Z]/);
  assert.doesNotMatch(page, /Associate Justice [A-Z]/);
});
