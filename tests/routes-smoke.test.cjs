const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const docket = fs.readFileSync("docket.html", "utf8");
const caselaw = fs.readFileSync("caselaw.html", "utf8");

test("docket and case law have distinct canonical routes", () => {
  assert.match(docket, /permalink: \/docket\//);
  assert.match(caselaw, /permalink: \/caselaw\//);
  assert.doesNotMatch(caselaw, /data-docket-district/);
});
