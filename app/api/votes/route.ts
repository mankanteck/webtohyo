import { NextRequest, NextResponse } from "next/server";
import { voteStore, unitStore, agendaStore } from "@/lib/store";
import type { VoteChoice } from "@/lib/store";

export async function GET(req: NextRequest) {
  const unitId = req.nextUrl.searchParams.get("unitId");
  const agendaId = req.nextUrl.searchParams.get("agendaId");

  if (unitId && agendaId) {
    const vote = voteStore.getByUnitAndAgenda(unitId, agendaId);
    return NextResponse.json(vote ?? null);
  }
  if (unitId) return NextResponse.json(voteStore.getByUnitId(unitId));
  if (agendaId) return NextResponse.json(voteStore.getByAgendaId(agendaId));
  return NextResponse.json(voteStore.getAll());
}

/**
 * アトミック投票処理:
 * 1. unit の isVoted を確認（二重投票防止）
 * 2. Vote を一括保存
 * 3. Unit の isVoted, votedAt, votedSource を更新
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nanoid } = await import("nanoid");

  const {
    unitId,
    ballots, // [{ agendaId, choice, comment }]
    votedSource = "WEB",
    isProxyEntry = false,
    inputBy = "",
    forceOverwrite = false,
  } = body;

  if (!unitId || !ballots || !Array.isArray(ballots)) {
    return NextResponse.json({ error: "unitId and ballots are required" }, { status: 400 });
  }

  const unit = unitStore.getById(unitId);
  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  // 二重投票チェック（WEBからの場合はforceOverwriteがない限り拒否）
  if (unit.isVoted && !forceOverwrite) {
    return NextResponse.json(
      {
        error: "ALREADY_VOTED",
        votedSource: unit.votedSource,
        votedAt: unit.votedAt,
      },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();

  // 既存投票を削除（上書き時）
  const existingVotes = voteStore.getByUnitId(unitId);

  // 新しい Vote レコードを作成
  const newVotes = ballots.map((b: { agendaId: string; choice: VoteChoice; comment?: string }) => {
    const existing = existingVotes.find((v) => v.agendaId === b.agendaId);
    return {
      id: existing?.id ?? nanoid(),
      unitId,
      agendaId: b.agendaId,
      choice: b.choice,
      comment: b.comment ?? "",
      isProxyEntry,
      inputBy,
      createdAt: existing?.createdAt ?? now,
    };
  });

  voteStore.saveMany(newVotes);

  // Unit を更新
  unitStore.save({
    ...unit,
    isVoted: true,
    votedAt: now,
    votedSource,
  });

  return NextResponse.json({ ok: true, votes: newVotes });
}
