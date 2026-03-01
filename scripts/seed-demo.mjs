/**
 * デモデータ登録スクリプト
 *
 * 使い方:
 *   node scripts/seed-demo.mjs
 *
 * data/*.json を読み、ownerUserId: "DEMO", isDemo: true を付与してDynamoDBに登録する。
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local を読み込む
const __dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dir, "../.env.local");
if (existsSync(envPath)) {
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const match = line.match(/^([^#=\s]+)\s*=\s*(.*)$/);
    if (match) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const TABLES = {
  condos:  process.env.DYNAMODB_TABLE_CONDOS   ?? "webtohyo-condos-prod",
  units:   process.env.DYNAMODB_TABLE_UNITS    ?? "webtohyo-units-prod",
  agendas: process.env.DYNAMODB_TABLE_AGENDAS  ?? "webtohyo-agendas-prod",
  votes:   process.env.DYNAMODB_TABLE_VOTES    ?? "webtohyo-votes-prod",
};

const client = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION ?? process.env.AWS_REGION ?? "ap-northeast-1",
});
const doc = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const DATA_DIR = join(__dir, "../data");

function readJson(filename) {
  const path = join(DATA_DIR, filename);
  if (!existsSync(path)) { console.log(`  スキップ: ${filename} が存在しません`); return []; }
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function batchWrite(tableName, items) {
  if (items.length === 0) return;
  let total = 0;
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await doc.send(new BatchWriteCommand({
      RequestItems: {
        [tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
      },
    }));
    total += chunk.length;
  }
  console.log(`  ✅ ${tableName}: ${total} 件を書き込みました`);
}

async function main() {
  console.log("=== webtohyo デモデータ登録 ===\n");
  console.log("テーブル設定:");
  for (const [k, v] of Object.entries(TABLES)) console.log(`  ${k}: ${v}`);
  console.log("");

  const condos  = readJson("condos.json");
  const units   = readJson("units.json");
  const agendas = readJson("agendas.json");
  const votes   = readJson("votes.json");

  // Condoにデモフラグを付与
  const demoCondos = condos.map((c) => ({
    ...c,
    ownerUserId: "DEMO",
    isDemo: true,
  }));

  console.log("書き込み中...");
  await batchWrite(TABLES.condos,  demoCondos);
  await batchWrite(TABLES.units,   units);
  await batchWrite(TABLES.agendas, agendas);
  await batchWrite(TABLES.votes,   votes);

  console.log("\n✅ デモデータ登録完了");
  console.log(`登録したデモCondo: ${demoCondos.map((c) => c.name).join(", ")}`);
}

main().catch((err) => {
  console.error("❌ エラー:", err.message ?? err);
  process.exit(1);
});
