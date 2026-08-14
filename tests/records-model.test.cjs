const test = require("node:test");
const assert = require("node:assert/strict");
const model = require("../assets/records-model.js");

test("record queries distinguish positive UserIds from exact usernames", () => {
  assert.equal(model.queryKind("123456"), "roblox_user_id");
  assert.equal(model.queryKind("Example_User"), "username");
  assert.equal(model.queryKind("Example User"), "invalid");
  assert.equal(model.queryKind(""), "invalid");
  assert.equal(model.queryKind("a".repeat(65)), "invalid");
});

test("JIS URLs preserve exact values and require HTTPS outside local development", () => {
  const url = model.apiUrl("https://jis.example.test", "/api/v1/records/search", { q: "Example_User" });
  assert.equal(url.toString(), "https://jis.example.test/api/v1/records/search?q=Example_User");
  assert.throws(() => model.apiUrl("http://jis.example.test", "/api/v1/records/search"), /HTTPS/);
  assert.doesNotThrow(() => model.apiUrl("http://127.0.0.1:3000", "/health"));
});

test("verified accounts and historical usernames remain separate classes", () => {
  const classes = model.resultClasses({
    accounts: [{ robloxUserId: "123", recordType: "verified_account" }],
    historicalUsernames: [{
      recordedUsername: "SameName",
      recordType: "historical_username",
      arrestCount: 1,
      convictionCount: 2,
    }],
  });
  assert.equal(classes.accounts.length, 1);
  assert.equal(classes.historicalUsernames.length, 1);
  assert.equal(classes.historicalUsernames[0].convictionCount, 2);
  assert.notStrictEqual(classes.accounts, classes.historicalUsernames);
});

test("historical identity and empty allegation notices are explicit", () => {
  assert.match(
    model.identityNotice({ identity: { status: "unresolved_username" } }),
    /Identity unverified/,
  );
  assert.equal(model.identityNotice({ identity: { status: "verified" } }), null);
  assert.match(model.allegedOffenseLabel({ allegedOffenses: [] }), /No charges were recorded/);
  assert.equal(model.allegedOffenseLabel({ allegedOffenses: [{ offenseName: "Example" }] }), null);
});

test("count-level conviction rows are grouped into one case without duplicating sentences", () => {
  const sentence = {
    imposedAt: "2025-05-02T00:00:00.000Z",
    rawText: "28 days imprisonment.",
    status: "imposed",
    components: [{ type: "imprisonment", amount: 28, unit: "days", currency: null, details: null }],
  };
  const groups = model.groupConvictions([
    {
      docketNumber: "CR-041825-12",
      caption: "United States v. RXXSTER2",
      defendantUsername: "RXXSTER2",
      convictedAt: "2025-05-01T00:00:00.000Z",
      currentStatus: "active",
      basis: "accepted_plea",
      identity: { status: "unresolved_username", robloxUserId: null },
      countNumber: 2,
      displayCitation: "18 U.S.C. § 930",
      offenseName: "Possession of a firearm within a Federal facility",
      sentences: [sentence],
    },
    {
      docketNumber: "CR-041825-12",
      caption: "United States v. RXXSTER2",
      defendantUsername: "RXXSTER2",
      convictedAt: "2025-05-01T00:00:00.000Z",
      currentStatus: "active",
      basis: "accepted_plea",
      identity: { status: "unresolved_username", robloxUserId: null },
      countNumber: 1,
      displayCitation: "18 U.S.C. § 1111",
      offenseName: "Second Degree Murder",
      sentences: [sentence],
    },
  ]);

  assert.equal(groups.length, 1);
  assert.deepEqual(groups[0].counts.map((count) => count.countNumber), [1, 2]);
  assert.equal(groups[0].sentences.length, 1);
  assert.equal(groups[0].identity.robloxUserId, null);
});

test("disposition and conviction status labels are public-facing", () => {
  assert.equal(model.dispositionBasisLabel("accepted_plea"), "Accepted plea");
  assert.equal(model.dispositionBasisLabel("verdict"), "Verdict");
  assert.equal(model.convictionStatusLabel("pardoned"), "Pardoned");
});
