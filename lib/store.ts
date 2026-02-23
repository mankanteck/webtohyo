/**
 * プロトタイプ用ローカルJSONストア
 * 本番はAmplify Gen 2 (AppSync + DynamoDB) に置き換える
 */
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data");

export type VotedSource = "WEB" | "PAPER";
export type ResolutionType = "ORDINARY" | "SPECIAL";
export type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

export interface Condo {
  id: string;
  condoCd: string;
  name: string;
  totalUnits: number;
  totalVotingRights: number;
  createdAt: string;
}

export interface Unit {
  id: string;
  condoId: string;
  roomNo: string;
  ownerName: string;
  votingRights: number;
  accessToken: string;
  isVoted: boolean;
  votedAt?: string;
  votedSource?: VotedSource;
  createdAt: string;
}

export interface Agenda {
  id: string;
  condoId: string;
  order: number;
  title: string;
  resolutionType: ResolutionType;
  createdAt: string;
}

export interface Vote {
  id: string;
  unitId: string;
  agendaId: string;
  choice: VoteChoice;
  comment?: string;
  isProxyEntry: boolean;
  inputBy?: string;
  createdAt: string;
}

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(filename: string, defaultValue: T): T {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) return defaultValue;
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8")) as T;
  } catch {
    return defaultValue;
  }
}

function writeJson<T>(filename: string, data: T): void {
  ensureDir();
  const filepath = path.join(DATA_DIR, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

// ── Condo ───────────────────────────────────────────────────────────────────
export const condoStore = {
  getAll: (): Condo[] => readJson<Condo[]>("condos.json", []),
  getById: (id: string): Condo | undefined =>
    condoStore.getAll().find((c) => c.id === id),
  save: (condo: Condo): Condo => {
    const all = condoStore.getAll();
    const idx = all.findIndex((c) => c.id === condo.id);
    if (idx >= 0) all[idx] = condo;
    else all.push(condo);
    writeJson("condos.json", all);
    return condo;
  },
};

// ── Unit ─────────────────────────────────────────────────────────────────────
export const unitStore = {
  getAll: (): Unit[] => readJson<Unit[]>("units.json", []),
  getByCondoId: (condoId: string): Unit[] =>
    unitStore.getAll().filter((u) => u.condoId === condoId),
  getByToken: (token: string): Unit | undefined =>
    unitStore.getAll().find((u) => u.accessToken === token),
  getById: (id: string): Unit | undefined =>
    unitStore.getAll().find((u) => u.id === id),
  save: (unit: Unit): Unit => {
    const all = unitStore.getAll();
    const idx = all.findIndex((u) => u.id === unit.id);
    if (idx >= 0) all[idx] = unit;
    else all.push(unit);
    writeJson("units.json", all);
    return unit;
  },
  saveMany: (units: Unit[]): void => {
    const all = unitStore.getAll();
    for (const unit of units) {
      const idx = all.findIndex((u) => u.id === unit.id);
      if (idx >= 0) all[idx] = unit;
      else all.push(unit);
    }
    writeJson("units.json", all);
  },
};

// ── Agenda ───────────────────────────────────────────────────────────────────
export const agendaStore = {
  getAll: (): Agenda[] => readJson<Agenda[]>("agendas.json", []),
  getByCondoId: (condoId: string): Agenda[] =>
    agendaStore.getAll().filter((a) => a.condoId === condoId),
  getById: (id: string): Agenda | undefined =>
    agendaStore.getAll().find((a) => a.id === id),
  save: (agenda: Agenda): Agenda => {
    const all = agendaStore.getAll();
    const idx = all.findIndex((a) => a.id === agenda.id);
    if (idx >= 0) all[idx] = agenda;
    else all.push(agenda);
    writeJson("agendas.json", all);
    return agenda;
  },
  saveMany: (agendas: Agenda[]): void => {
    const all = agendaStore.getAll();
    for (const agenda of agendas) {
      const idx = all.findIndex((a) => a.id === agenda.id);
      if (idx >= 0) all[idx] = agenda;
      else all.push(agenda);
    }
    writeJson("agendas.json", all);
  },
};

// ── Vote ─────────────────────────────────────────────────────────────────────
export const voteStore = {
  getAll: (): Vote[] => readJson<Vote[]>("votes.json", []),
  getByUnitId: (unitId: string): Vote[] =>
    voteStore.getAll().filter((v) => v.unitId === unitId),
  getByAgendaId: (agendaId: string): Vote[] =>
    voteStore.getAll().filter((v) => v.agendaId === agendaId),
  getByUnitAndAgenda: (unitId: string, agendaId: string): Vote | undefined =>
    voteStore.getAll().find((v) => v.unitId === unitId && v.agendaId === agendaId),
  save: (vote: Vote): Vote => {
    const all = voteStore.getAll();
    const idx = all.findIndex((v) => v.id === vote.id);
    if (idx >= 0) all[idx] = vote;
    else all.push(vote);
    writeJson("votes.json", all);
    return vote;
  },
  saveMany: (votes: Vote[]): void => {
    const all = voteStore.getAll();
    for (const vote of votes) {
      const idx = all.findIndex((v) => v.id === vote.id);
      if (idx >= 0) all[idx] = vote;
      else all.push(vote);
    }
    writeJson("votes.json", all);
  },
};
