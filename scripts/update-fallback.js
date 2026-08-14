const fs = require("node:fs/promises");
const path = require("node:path");
const docketModel = require("../assets/docket-model.js");

const root = path.resolve(__dirname, "..");
const configPath = path.join(root, "_config.yml");
const outputPath = path.join(root, "assets", "docket-fallback.json");

function boardId(config, key) {
  const match = config.match(new RegExp(`^\\s*${key}:\\s*["']?([A-Za-z0-9]+)["']?\\s*$`, "m"));
  if (!match) throw new Error(`Missing ${key} in _config.yml`);
  return match[1];
}

function storedCard(card) {
  return {
    id: card.id,
    name: card.name,
    desc: card.desc || "",
    url: card.url || "",
    labels: (Array.isArray(card.labels) ? card.labels : []).map(({ name, color }) => ({ name, color })),
    sourceListName: card.sourceListName,
  };
}

async function fetchBoard(type, id) {
  const url = new URL(`https://api.trello.com/1/boards/${id}/lists`);
  url.searchParams.set("cards", "open");
  url.searchParams.set("card_fields", "id,name,desc,url,labels,closed");
  url.searchParams.set("fields", "id,name,closed");
  url.searchParams.set("filter", "open");
  const response = await fetch(url, { headers: { "User-Agent": "USAR-Courts-Docket-Archive/2.0" } });
  if (!response.ok) throw new Error(`Trello returned ${response.status} for board ${id}`);
  const lists = await response.json();
  if (!Array.isArray(lists)) throw new Error(`Unexpected Trello response for board ${id}`);
  const selected = docketModel.selectDocketData(type, lists);
  return {
    type,
    qualifyingListCount: selected.qualifyingListCount,
    groups: selected.groups.map((group) => ({
      sourceListName: group.sourceListName,
      cards: group.cards.map(storedCard),
    })),
  };
}

async function main() {
  const config = await fs.readFile(configPath, "utf8");
  const definitions = [
    ["supreme", boardId(config, "supreme_court_board")],
    ["district", boardId(config, "district_court_board")],
  ];
  const entries = await Promise.all(definitions.map(async ([type, id]) => [id, await fetchBoard(type, id)]));
  const data = {
    generatedAt: new Date().toISOString(),
    boards: Object.fromEntries(entries),
  };
  await fs.writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");

  for (const [id, docket] of entries) {
    const cardCount = docket.groups.reduce((total, group) => total + group.cards.length, 0);
    console.log(`${docket.type} ${id}: ${docket.qualifyingListCount} qualifying lists, ${cardCount} open docket cards`);
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
