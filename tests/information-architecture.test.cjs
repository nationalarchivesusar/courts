const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const read = (file) => fs.readFileSync(file, "utf8");

test("site search covers conduct, reusable forms, and locally archived opinions", () => {
  const page = read("search.html");
  const index = read("search.json");

  assert.match(page, /value="conduct" checked/);
  assert.match(page, /value="forms" checked/);
  assert.match(page, /value="opinions" checked/);
  assert.match(page, /Search Cases/);
  assert.match(page, /Search Filed Documents/);
  assert.match(page, /Search Person Records/);

  assert.match(index, /site\.data\.documents/);
  assert.match(index, /site\.static_files/);
  assert.match(index, /file\.path contains '\/rulings\/'/);
  assert.match(index, /"collection": "forms"/);
  assert.match(index, /"collection": "opinions"/);
});

test("About and Help describe the current service boundaries", () => {
  const about = read("about.html");
  const help = read("help.html");

  assert.match(about, /Case Search/);
  assert.match(about, /Filed Document Search/);
  assert.match(about, /Forms &amp; Templates/);
  assert.match(about, /USAR Opinions &amp; Orders/);
  assert.match(help, /Case Search/);
  assert.match(help, /Current Dockets/);
  assert.match(help, /Forms &amp; Templates/);
  assert.match(help, /Court Rules/);
  assert.doesNotMatch(about, /Case Search uses CourtListener/);
  assert.doesNotMatch(help, /current tool searches Supreme Court of the United States case law/);
});

test("the homepage exposes high-value tasks without conflating dockets and case search", () => {
  const home = read("index.html");
  assert.match(home, /<h2 id="dockets-heading">Current Dockets<\/h2>/);
  assert.match(home, /Search Cases/);
  assert.match(home, /Filed Document Search/);
  assert.match(home, /Arrest &amp; Conviction Records/);
  assert.match(home, /Court Rules/);
  assert.match(home, /Forms &amp; Templates/);
  assert.doesNotMatch(home, /Docket &amp; Case Records/);
});
