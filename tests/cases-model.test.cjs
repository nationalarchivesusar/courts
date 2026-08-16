const test = require("node:test");
const assert = require("node:assert/strict");

const model = require("../assets/cases-model.js");

test("builds shareable dedicated case links without exposing internal identifiers", () => {
  assert.equal(
    model.buildCaseHref("/courts/case/", "CR-072626-0066"),
    "/courts/case/?docket=CR-072626-0066",
  );
});

test("builds JIS case search URLs with allowlisted filters and pagination", () => {
  const url = new URL(model.buildSearchApiUrl("https://jis.example", {
    q: "18 U.S.C. § 111",
    caseType: "criminal",
    status: "pending",
    limit: 25,
    cursor: "abc123",
  }));
  assert.equal(url.pathname, "/api/v1/cases");
  assert.equal(url.searchParams.get("q"), "18 U.S.C. § 111");
  assert.equal(url.searchParams.get("caseType"), "criminal");
  assert.equal(url.searchParams.get("status"), "pending");
  assert.equal(url.searchParams.get("limit"), "25");
  assert.equal(url.searchParams.get("cursor"), "abc123");
});

test("ignores unsupported filter values", () => {
  const url = new URL(model.buildSearchApiUrl("https://jis.example", {
    caseType: "secret",
    status: "convicted",
  }));
  assert.equal(url.searchParams.has("caseType"), false);
  assert.equal(url.searchParams.has("status"), false);
});

test("extracts docket query parameter and groups charge revisions", () => {
  assert.equal(model.currentDocket("?docket=CR-041825-12"), "CR-041825-12");
  const grouped = model.groupCharges([
    { countNumber: 2, revision: 1, offenseName: "Old count two" },
    { countNumber: 1, revision: 1, offenseName: "Count one" },
    { countNumber: 2, revision: 2, offenseName: "Amended count two" },
  ]);
  assert.deepEqual(grouped.map((charge) => charge.offenseName), ["Count one", "Amended count two"]);
});

test("keeps identity and disposition language conservative", () => {
  assert.equal(
    model.identityLabel({ status: "unresolved_username", robloxUserId: null }),
    "Historical username — identity unverified",
  );
  assert.equal(model.dispositionLabel(null), "Pending");
  assert.equal(model.dispositionLabel({ result: "nolle_prosequi" }), "Nolle Prosequi");
});

test("rejects unsafe external URL schemes", () => {
  assert.equal(model.safeExternalUrl("javascript:alert(1)"), null);
  assert.equal(model.safeExternalUrl("https://example.com/file.pdf"), "https://example.com/file.pdf");
});
