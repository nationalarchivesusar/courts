const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../assets/docket-model.js");

test("District list matching is case-insensitive, trim-safe, and prefix-based", () => {
  assert.equal(model.listBelongsToDocket("district", { name: "   The Honorable Example Judge   " }), true);
  assert.equal(model.listBelongsToDocket("district", { name: "tHe HoNoRaBlE Jane Doe" }), true);
  assert.equal(model.listBelongsToDocket("district", { name: "Former The Honorable Judge" }), false);
  assert.equal(model.listBelongsToDocket("district", { name: "Docket Archive" }), false);
});

test("Supreme matching preserves the docket-name convention", () => {
  assert.equal(model.listBelongsToDocket("supreme", { name: "Regular Docket" }), true);
  assert.equal(model.listBelongsToDocket("supreme", { name: "Orders" }), false);
});

test("District cards do not require labels while Supreme cards still do", () => {
  const unlabeled = { name: "United States v. Example", labels: [] };
  assert.equal(model.cardBelongsToDocket("district", unlabeled), true);
  assert.equal(model.cardBelongsToDocket("supreme", unlabeled), false);
  assert.equal(model.cardBelongsToDocket("supreme", { ...unlabeled, labels: [{ name: "Pending" }] }), true);
});

test("Placeholders, dividers, archived cards, and archived lists are excluded", () => {
  for (const name of ["", "‎", "____", "---", "Create Template", "Create Template — Criminal"]) {
    assert.equal(model.cardBelongsToDocket("district", { name }), false, name);
  }
  assert.equal(model.cardBelongsToDocket("district", { name: "Live Case", closed: true }), false);
  assert.equal(model.listBelongsToDocket("district", { name: "The Honorable Archived", closed: true }), false);
});

test("District selection retains the source judge/list association", () => {
  const selected = model.selectDocketData("district", [
    { name: "Templates", cards: [{ name: "Wrong list" }] },
    {
      name: "  The Honorable Example Judge  ",
      cards: [
        { name: "United States v. Example", labels: [] },
        { name: "---", labels: [] },
      ],
    },
  ]);
  assert.equal(selected.qualifyingListCount, 1);
  assert.equal(selected.groups.length, 1);
  assert.equal(selected.groups[0].sourceListName, "The Honorable Example Judge");
  assert.equal(selected.groups[0].cards.length, 1);
  assert.equal(selected.groups[0].cards[0].sourceListName, "The Honorable Example Judge");
});

test("No matching lists and matching empty lists remain distinguishable", () => {
  const none = model.selectDocketData("district", [{ name: "Notes", cards: [] }]);
  const empty = model.selectDocketData("district", [{ name: "The Honorable Empty Judge", cards: [] }]);
  assert.equal(none.qualifyingListCount, 0);
  assert.equal(none.groups.length, 0);
  assert.equal(empty.qualifyingListCount, 1);
  assert.equal(empty.groups.length, 1);
  assert.deepEqual(empty.groups[0].cards, []);
});

test("District empty and request-failure states use distinct messages", () => {
  assert.equal(model.emptyMessage("district", 0), "No District Court judge dockets are configured at this time.");
  assert.equal(model.emptyMessage("district", 2), "No active District Court matters are listed at this time.");
  assert.equal(model.unavailableMessage("district"), "District Court docket information is temporarily unavailable.");
});

test("Fallback data is accepted only within its freshness window", () => {
  const now = Date.parse("2026-08-13T12:00:00.000Z");
  assert.equal(model.fallbackIsFresh("2026-08-12T12:00:00.000Z", now), true);
  assert.equal(model.fallbackIsFresh("2026-08-01T12:00:00.000Z", now), false);
  assert.equal(model.fallbackIsFresh("invalid", now), false);
  assert.equal(model.statusLabel("fallback"), "Cached");
  assert.equal(model.statusLabel("live"), "Current");
});

test("Judge docket counts use correct singular and plural grammar", () => {
  assert.equal(model.matterCountLabel(0), "0 active matters");
  assert.equal(model.matterCountLabel(1), "1 active matter");
  assert.equal(model.matterCountLabel(4), "4 active matters");
});
