/**
 * DynamoDB データストア（本番用）
 *
 * 環境変数:
 *   DYNAMODB_REGION            - リージョン（デフォルト: ap-northeast-1）
 *   DYNAMODB_TABLE_CONDOS      - Condoテーブル名
 *   DYNAMODB_TABLE_UNITS       - Unitテーブル名
 *   DYNAMODB_TABLE_AGENDAS     - Agendaテーブル名
 *   DYNAMODB_TABLE_VOTES       - Voteテーブル名
 *
 * 認証情報:
 *   Lambda（Amplify Hosting）: IAMロールから自動取得
 *   ローカル開発: ~/.aws/credentials または AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  ScanCommand,
  BatchWriteCommand,
} from "@aws-sdk/lib-dynamodb";

// ── クライアント初期化 ─────────────────────────────────────────────────────────
const ddbClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION ?? process.env.AWS_REGION ?? "ap-northeast-1",  // AWS_REGION is set automatically in Lambda
});

export const doc = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true },
});

// ── テーブル名 ────────────────────────────────────────────────────────────────
const TABLES = {
  condos:  process.env.DYNAMODB_TABLE_CONDOS   ?? "webtohyo-condos-prod",
  units:   process.env.DYNAMODB_TABLE_UNITS    ?? "webtohyo-units-prod",
  agendas: process.env.DYNAMODB_TABLE_AGENDAS  ?? "webtohyo-agendas-prod",
  votes:   process.env.DYNAMODB_TABLE_VOTES    ?? "webtohyo-votes-prod",
};

// ── 型定義（lib/store.ts と共通） ─────────────────────────────────────────────
export type VotedSource   = "WEB" | "PAPER";
export type ResolutionType = "ORDINARY" | "SPECIAL";
export type VoteChoice    = "FOR" | "AGAINST" | "ABSTAIN";

export interface Condo {
  id: string; condoCd: string; name: string;
  totalUnits: number; totalVotingRights: number; createdAt: string;
}
export interface Unit {
  id: string; condoId: string; roomNo: string; ownerName: string;
  votingRights: number; accessToken: string; isVoted: boolean;
  votedAt?: string; votedSource?: VotedSource; createdAt: string;
}
export interface Agenda {
  id: string; condoId: string; order: number; title: string;
  resolutionType: ResolutionType; createdAt: string;
}
export interface Vote {
  id: string; unitId: string; agendaId: string; choice: VoteChoice;
  comment?: string; isProxyEntry: boolean; inputBy?: string; createdAt: string;
}

// ── ユーティリティ ─────────────────────────────────────────────────────────────
/** 25件ずつ BatchWrite する（DynamoDB の上限対策） */
async function batchPut(tableName: string, items: Record<string, unknown>[]) {
  for (let i = 0; i < items.length; i += 25) {
    const chunk = items.slice(i, i + 25);
    await doc.send(
      new BatchWriteCommand({
        RequestItems: {
          [tableName]: chunk.map((item) => ({ PutRequest: { Item: item } })),
        },
      })
    );
  }
}

// ── condoStore ───────────────────────────────────────────────────────────────
export const condoStore = {
  async getAll(): Promise<Condo[]> {
    const res = await doc.send(new ScanCommand({ TableName: TABLES.condos }));
    return (res.Items ?? []) as Condo[];
  },

  async getById(id: string): Promise<Condo | undefined> {
    const res = await doc.send(
      new GetCommand({ TableName: TABLES.condos, Key: { id } })
    );
    return res.Item as Condo | undefined;
  },

  async save(condo: Condo): Promise<Condo> {
    await doc.send(new PutCommand({ TableName: TABLES.condos, Item: condo }));
    return condo;
  },
};

// ── unitStore ────────────────────────────────────────────────────────────────
export const unitStore = {
  async getAll(): Promise<Unit[]> {
    const res = await doc.send(new ScanCommand({ TableName: TABLES.units }));
    return (res.Items ?? []) as Unit[];
  },

  async getByCondoId(condoId: string): Promise<Unit[]> {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLES.units,
        IndexName: "condoId-index",
        KeyConditionExpression: "condoId = :cid",
        ExpressionAttributeValues: { ":cid": condoId },
      })
    );
    return (res.Items ?? []) as Unit[];
  },

  async getByToken(token: string): Promise<Unit | undefined> {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLES.units,
        IndexName: "accessToken-index",
        KeyConditionExpression: "accessToken = :tok",
        ExpressionAttributeValues: { ":tok": token },
        Limit: 1,
      })
    );
    return (res.Items?.[0]) as Unit | undefined;
  },

  async getById(id: string): Promise<Unit | undefined> {
    const res = await doc.send(
      new GetCommand({ TableName: TABLES.units, Key: { id } })
    );
    return res.Item as Unit | undefined;
  },

  async save(unit: Unit): Promise<Unit> {
    await doc.send(new PutCommand({ TableName: TABLES.units, Item: unit }));
    return unit;
  },

  async saveMany(units: Unit[]): Promise<void> {
    await batchPut(TABLES.units, units as unknown as Record<string, unknown>[]);
  },
};

// ── agendaStore ──────────────────────────────────────────────────────────────
export const agendaStore = {
  async getAll(): Promise<Agenda[]> {
    const res = await doc.send(new ScanCommand({ TableName: TABLES.agendas }));
    return (res.Items ?? []) as Agenda[];
  },

  async getByCondoId(condoId: string): Promise<Agenda[]> {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLES.agendas,
        IndexName: "condoId-index",
        KeyConditionExpression: "condoId = :cid",
        ExpressionAttributeValues: { ":cid": condoId },
      })
    );
    return (res.Items ?? []) as Agenda[];
  },

  async getById(id: string): Promise<Agenda | undefined> {
    const res = await doc.send(
      new GetCommand({ TableName: TABLES.agendas, Key: { id } })
    );
    return res.Item as Agenda | undefined;
  },

  async save(agenda: Agenda): Promise<Agenda> {
    await doc.send(new PutCommand({ TableName: TABLES.agendas, Item: agenda }));
    return agenda;
  },

  async saveMany(agendas: Agenda[]): Promise<void> {
    await batchPut(TABLES.agendas, agendas as unknown as Record<string, unknown>[]);
  },
};

// ── voteStore ────────────────────────────────────────────────────────────────
export const voteStore = {
  async getAll(): Promise<Vote[]> {
    const res = await doc.send(new ScanCommand({ TableName: TABLES.votes }));
    return (res.Items ?? []) as Vote[];
  },

  async getByUnitId(unitId: string): Promise<Vote[]> {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLES.votes,
        IndexName: "unitId-index",
        KeyConditionExpression: "unitId = :uid",
        ExpressionAttributeValues: { ":uid": unitId },
      })
    );
    return (res.Items ?? []) as Vote[];
  },

  async getByAgendaId(agendaId: string): Promise<Vote[]> {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLES.votes,
        IndexName: "agendaId-index",
        KeyConditionExpression: "agendaId = :aid",
        ExpressionAttributeValues: { ":aid": agendaId },
      })
    );
    return (res.Items ?? []) as Vote[];
  },

  async getByUnitAndAgenda(unitId: string, agendaId: string): Promise<Vote | undefined> {
    const res = await doc.send(
      new QueryCommand({
        TableName: TABLES.votes,
        IndexName: "unitId-index",
        KeyConditionExpression: "unitId = :uid",
        FilterExpression: "agendaId = :aid",
        ExpressionAttributeValues: { ":uid": unitId, ":aid": agendaId },
        Limit: 1,
      })
    );
    return (res.Items?.[0]) as Vote | undefined;
  },

  async save(vote: Vote): Promise<Vote> {
    await doc.send(new PutCommand({ TableName: TABLES.votes, Item: vote }));
    return vote;
  },

  async saveMany(votes: Vote[]): Promise<void> {
    await batchPut(TABLES.votes, votes as unknown as Record<string, unknown>[]);
  },
};
