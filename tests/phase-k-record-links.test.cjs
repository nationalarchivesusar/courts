const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const casePage = fs.readFileSync("case.html", "utf8");
const casesPage = fs.readFileSync("cases.html", "utf8");
const recordsPage = fs.readFileSync("records.html", "utf8");
const caseLinks = fs.readFileSync("assets/case-record-links.js", "utf8");
const recordLinks = fs.readFileSync("assets/records-case-links.js", "utf8");

test("case pages load Phase K styles in the head and the enhancement client after the base renderer", () => {
  for (const page of [casePage, casesPage]) {
    assert.match(page, /styles:\n(?:.|\n)*- \/assets\/phase-k-records\.css/);
    assert.match(page, /data-records-path=/);
    assert.match(page, /assets\/cases\.js[^\n]*\n<script src="\{\{ '\/assets\/case-record-links\.js'/);
    assert.doesNotMatch(page, /<link rel="stylesheet"/);
  }
});

test("case enhancement uses the enriched document index and links only verified parties to records", () => {
  assert.match(caseLinks, /\/document-index/);
  assert.match(caseLinks, /party\.identity\?\.status !== "verified"/);
  assert.match(caseLinks, /party\.identity\.robloxUserId/);
  assert.match(caseLinks, /Document type describes the filing or court record itself/);
  assert.match(caseLinks, /case-document--court-action/);
});

test("records page cross-links verified accounts to structured cases without touching historical username sections", () => {
  assert.match(recordsPage, /data-case-path=/);
  assert.match(recordsPage, /assets\/records-case-links\.js/);
  assert.match(recordLinks, /\/api\/v1\/people\/\$\{encodeURIComponent\(userId\)\}\/cases/);
  assert.match(recordLinks, /records-class--verified/);
  assert.doesNotMatch(recordLinks, /querySelectorAll\("\.records-class--historical"\)/);
  assert.match(recordLinks, /Historical username sections remain/);
});
