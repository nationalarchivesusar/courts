const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("codes of conduct remain reachable through the consolidated court navigation", () => {
  const header = read("_includes/header.html");
  const overview = read("conduct.html");
  const config = read("_config.yml");
  assert.match(header, /<summary>Rules &amp; Conduct<\/summary>/);
  assert.match(header, /href="\{\{ '\/conduct\/' \| relative_url \}\}"[^>]*>Codes of Conduct<\/a>/);
  assert.match(overview, /\/conduct\/judges\//);
  assert.match(overview, /\/conduct\/judicial-employees\//);
  assert.match(overview, /\/conduct\/federal-public-defenders\//);
  assert.match(config, /\n  conduct:\n    output: true\n    permalink: \/conduct\/:path\//);
});

test("all requested conduct canons are locally hosted", () => {
  for (let canon = 1; canon <= 5; canon += 1) {
    assert.ok(fs.existsSync(path.join(root, `_conduct/judges/canon-${canon}.md`)));
    assert.ok(fs.existsSync(path.join(root, `_conduct/judicial-employees/canon-${canon}.md`)));
  }
  for (let canon = 1; canon <= 7; canon += 1) {
    assert.ok(fs.existsSync(path.join(root, `_conduct/federal-public-defenders/canon-${canon}.md`)));
  }
});

test("conduct pages support source provenance and pinpoint citations", () => {
  const layout = read("_layouts/rule.html");
  const script = read("assets/rule-page.js");
  assert.match(layout, /data-citation="\{\{ page\.citation \| escape \}\}"/);
  assert.match(layout, /Official source:/);
  assert.match(script, /const isConduct = set === "conduct"/);
  assert.match(script, /\(\[A-Z\]\+\)\\\./);
  assert.match(script, /enhanceConductProvisions/);
});
