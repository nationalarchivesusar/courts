const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "_config.yml");
const outputPath = path.join(root, "assets", "docket-fallback.json");

function boardId(config, key) {
  const match = config.match(new RegExp(`^\\s*${key}:\\s*["']?([A-Za-z0-9]+)["']?\\s*$`, "m"));
  if (!match) throw new Error(`Missing ${key} in _config.yml`);
  return match[1];
}

function eligible(card) {
  const name = String(card?.name || "").trim();
  return Boolean(
    name &&
    Array.isArray(card.labels) &&
    card.labels.length &&
    !["____", "create template"].includes(name.toLowerCase()) &&
    !/^[-_—]+$/.test(name),
  );
}

async function fetchBoard(id) {
  const url = new URL(`https://api.trello.com/1/boards/${id}/lists`);
  url.searchParams.set("cards", "open");
  url.searchParams.set("card_fields", "name,desc,url,labels");
  url.searchParams.set("fields", "name");
  const response = await fetch(url, { headers: { "User-Agent": "USAR-Courts-Docket-Archive/1.0" } });
  if (!response.ok) throw new Error(`Trello returned ${response.status} for board ${id}`);
  const lists = await response.json();
  return lists
    .filter((list) => String(list.name || "").toLowerCase().includes("docket"))
    .flatMap((list) => (Array.isArray(list.cards) ? list.cards : []))
    .filter(eligible)
    .map(({ id: cardId, name, desc, url: cardUrl, labels }) => ({
      id: cardId,
      name,
      desc,
      url: cardUrl,
      labels: labels.map(({ name: labelName, color }) => ({ name: labelName, color })),
    }));
}

async function main() {
  const config = await fs.readFile(configPath, "utf8");
  const boards = [boardId(config, "supreme_court_board"), boardId(config, "district_court_board")];
  const entries = await Promise.all(boards.map(async (id) => [id, await fetchBoard(id)]));
  await fs.writeFile(outputPath, `${JSON.stringify(Object.fromEntries(entries), null, 2)}\n`, "utf8");
  for (const [id, cards] of entries) console.log(`${id}: archived ${cards.length} docket cards`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});

