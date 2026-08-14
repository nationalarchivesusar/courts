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
    historicalUsernames: [{ recordedUsername: "SameName", recordType: "historical_username" }],
  });
  assert.equal(classes.accounts.length, 1);
  assert.equal(classes.historicalUsernames.length, 1);
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
