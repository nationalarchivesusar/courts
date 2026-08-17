const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

const dataPages = [
  "docket.html",
  "cases.html",
  "case.html",
  "judges.html",
  "caselaw.html",
  "records.html",
];

test("page-specific styles are loaded from the document head", () => {
  const head = read("_includes/head.html");
  assert.match(head, /assets\/style\.css/);
  assert.match(head, /assets\/shell-fixes\.css/);
  assert.match(head, /assets\/navigation\.css/);
  assert.match(head, /page\.styles/);
  assert.match(head, /for stylesheet in page\.styles/);
});

test("data pages declare styles in front matter instead of loading CSS after body paint", () => {
  for (const file of dataPages) {
    const page = read(file);
    assert.match(page, /\nstyles:\n/);
    assert.doesNotMatch(page, /<link\s+rel="stylesheet"/i);
  }
});

test("new JIS pages receive the same padded court shell as established data pages", () => {
  const css = read("assets/shell-fixes.css");
  for (const slug of ["docket", "caselaw", "judges", "cases", "case"]) {
    assert.match(css, new RegExp(`\\.page-${slug} \\.content-shell`));
  }
});

test("responsive navigation uses task menus without horizontal-scroll dependence", () => {
  const header = read("_includes/header.html");
  const css = read("assets/navigation.css");
  const script = read("assets/site.js");

  assert.match(header, /<summary>Cases<\/summary>/);
  assert.match(header, /<summary>Rules<\/summary>/);
  assert.match(header, /Rules of Procedure/);
  assert.match(header, /Codes of Conduct/);
  assert.match(css, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(script, /querySelectorAll\("\.nav-menu"\)/);
  assert.match(script, /otherMenu\.open = false/);
});
