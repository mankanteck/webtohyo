/**
 * ローカル JSON → DynamoDB マイグレーションスクリプト
 *
 * 使い方:
 *   1. .env.local を設定（下記の環境変数を参照）
 *   2. node scripts/migrate-to-dynamo.mjs
 *
 * 必要な環境変数（.env.local またはシェル変数）:
 *   DYNAMODB_REGION           = ap-northeast-1
 *   DYNAMODB_TABLE_CONDOS     = webtohyo-condos-prod
 *   DYNAMODB_TABLE_UNITS      = webtohyo-units-prod
 *   DYNAMODB_TABLE_AGENDAS    = webtohyo-agendas-prod
 *   DYNAMODB_TABLE_VOTES      = webtohyo-votes-prod
 *   AWS_ACCESS_KEY_ID         = （IAMロールがない場合）
 *   AWS_SECRET_ACCESS_KEY     = （IAMロールがない場合）
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local を読み込む（dotenv が使えない環境向けに簡易実装）
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
  console.log("=== webtohyo JSON → DynamoDB マイグレーション ===\n");
  console.log("テーブル設定:");
  for (const [k, v] of Object.entries(TABLES)) console.log(`  ${k}: ${v}`);
  console.log("");

  const condos  = readJson("condos.json");
  const units   = readJson("units.json");
  const agendas = readJson("agendas.json");
  const votes   = readJson("votes.json");

  console.log("書き込み中...");
  await batchWrite(TABLES.condos,  condos);
  await batchWrite(TABLES.units,   units);
  await batchWrite(TABLES.agendas, agendas);
  await batchWrite(TABLES.votes,   votes);

  console.log("\n✅ マイグレーション完了");
}

main().catch((err) => {
  console.error("❌ エラー:", err.message ?? err);
  process.exit(1);
});
