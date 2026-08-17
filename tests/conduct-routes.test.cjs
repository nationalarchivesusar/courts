const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("codes of conduct remain distinct and reachable through the Rules directory", () => {
  const header = read("_includes/header.html");
  const rules = read("rules.html");
  const overview = read("conduct.html");
  const config = read("_config.yml");

  assert.match(header, /<summary>Rules<\/summary>/);
  assert.match(header, /<h2 id="procedure-menu-heading">Rules of Procedure<\/h2>/);
  assert.match(header, /<h2 id="conduct-menu-heading">Codes of Conduct<\/h2>/);
  assert.match(rules, /href="\{\{ '\/conduct\/' \| relative_url \}\}"/);
  assert.match(overview, /breadcrumb_parent: Court Rules/);
  assert.match(overview, /breadcrumb_parent_url: \/rules\//);
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

test("rule and conduct layouts preserve meaningful hierarchical breadcrumbs", () => {
  const ruleLayout = read("_layouts/rule.html");
  const listLayout = read("_layouts/rules-list.html");
  assert.match(ruleLayout, /href="\{\{ '\/rules\/' \| relative_url \}\}">Court Rules<\/a>/);
  assert.match(ruleLayout, /Codes of Conduct/);
  assert.match(listLayout, /href="\{\{ '\/rules\/' \| relative_url \}\}">Court Rules<\/a>/);
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
