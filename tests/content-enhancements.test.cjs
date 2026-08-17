const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("opinions archive is searchable and classifies preserved files without inventing legal metadata", () => {
  const page = read("opinions.html");
  const script = read("assets/opinions.js");
  assert.match(page, /id="opinions-query"/);
  assert.match(page, /id="opinions-type"/);
  assert.match(page, /id="opinions-year"/);
  assert.match(page, /data-opinion-name=/);
  assert.match(page, /assets\/opinions\.js/);
  assert.match(page, /does not infer/i);
  assert.match(script, /Order list/);
  assert.match(script, /Per curiam decision/);
  assert.match(script, /Slip opinion/);
});

test("forms library includes useful District Court starter templates and keeps filed documents separate", () => {
  const page = read("docs.html");
  const data = read("_data/documents.yml");
  const script = read("assets/document-library.js");
  assert.match(page, /id="document-type-filter"/);
  assert.match(page, /Filed Document Search/);
  assert.match(data, /title: "General Motion"/);
  assert.match(data, /title: "Notice of Appearance"/);
  assert.match(data, /title: "Proposed Order"/);
  assert.match(data, /title: "Criminal Motion"/);
  assert.match(data, /title: "Sentencing Memorandum"/);
  assert.match(data, /title: "Subpoena Request \/ Proposed Process"/);
  assert.match(data, /internal_path: "\/docs\/templates\/general-motion\/"/);
  assert.match(script, /entry\?\.internal_path/);
  assert.match(script, /document-type-filter/);
  assert.ok(fs.existsSync("docs/templates/general-motion.md"));
  assert.ok(fs.existsSync("docs/templates/subpoena-request.md"));
});

test("judge directory supports filtering and collapsible dockets", () => {
  const page = read("judges.html");
  const script = read("assets/judges.js");
  assert.match(page, /id="judge-search"/);
  assert.match(page, /id="judge-case-status"/);
  assert.match(page, /id="judges-expand-all"/);
  assert.match(script, /document\.createElement\("details"\)/);
  assert.match(script, /details\.open = true/);
  assert.match(script, /\/api\/v1\/judges\?court=usdc/);
  assert.doesNotMatch(script, /innerHTML/);
});

test("case search and case files provide faster browsing and section navigation", () => {
  const search = read("cases.html");
  const detail = read("case.html");
  const nav = read("assets/case-file-navigation.js");
  assert.match(search, /case-search-shortcuts/);
  assert.match(search, /\?type=criminal/);
  assert.match(search, /\?status=closed/);
  assert.match(search, /assets\/case-polish\.css/);
  assert.match(detail, /id="case-section-nav"/);
  assert.match(detail, /assets\/case-file-navigation\.js/);
  assert.match(detail, /assets\/case-polish\.css/);
  assert.match(nav, /case-detail-section/);
  assert.match(nav, /MutationObserver/);
});

test("rules directory preserves procedure and conduct separation while improving collection context", () => {
  const rules = read("rules.html");
  const listLayout = read("_layouts/rules-list.html");
  const ruleLayout = read("_layouts/rule.html");
  assert.match(rules, /Rules of Procedure/);
  assert.match(rules, /Codes of Conduct/);
  assert.match(rules, /site\.frcp \| size/);
  assert.match(rules, /judge_conduct \| size/);
  assert.match(listLayout, /rule-context-nav/);
  assert.match(listLayout, /All Court Rules/);
  assert.match(ruleLayout, /legal-document__context/);
  assert.match(ruleLayout, /rule-source-strip/);
});

test("shared enhancement stylesheet is loaded through the document head", () => {
  const head = read("_includes/head.html");
  assert.match(head, /assets\/content-enhancements\.css/);
});
