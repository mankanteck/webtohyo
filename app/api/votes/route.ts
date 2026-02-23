import { NextRequest, NextResponse } from "next/server";
import { voteStore, unitStore } from "@/lib/dynamodb";
import type { VoteChoice } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  const unitId   = req.nextUrl.searchParams.get("unitId");
  const agendaId = req.nextUrl.searchParams.get("agendaId");

  if (unitId && agendaId) {
    return NextResponse.json(await voteStore.getByUnitAndAgenda(unitId, agendaId) ?? null);
  }
  if (unitId)   return NextResponse.json(await voteStore.getByUnitId(unitId));
  if (agendaId) return NextResponse.json(await voteStore.getByAgendaId(agendaId));
  return NextResponse.json(await voteStore.getAll());
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
    ballots,
    votedSource   = "WEB",
    isProxyEntry  = false,
    inputBy       = "",
    forceOverwrite = false,
  } = body;

  if (!unitId || !ballots || !Array.isArray(ballots)) {
    return NextResponse.json({ error: "unitId and ballots are required" }, { status: 400 });
  }

  const unit = await unitStore.getById(unitId);
  if (!unit) {
    return NextResponse.json({ error: "Unit not found" }, { status: 404 });
  }

  if (unit.isVoted && !forceOverwrite) {
    return NextResponse.json(
      { error: "ALREADY_VOTED", votedSource: unit.votedSource, votedAt: unit.votedAt },
      { status: 409 }
    );
  }

  const now = new Date().toISOString();
  const existingVotes = await voteStore.getByUnitId(unitId);

  const newVotes = ballots.map((b: { agendaId: string; choice: VoteChoice; comment?: string }) => {
    const existing = existingVotes.find((v) => v.agendaId === b.agendaId);
    return {
      id:          existing?.id ?? nanoid(),
      unitId,
      agendaId:    b.agendaId,
      choice:      b.choice,
      comment:     b.comment ?? "",
      isProxyEntry,
      inputBy,
      createdAt:   existing?.createdAt ?? now,
    };
  });

  try {
    await voteStore.saveMany(newVotes);
    await unitStore.save({
      ...unit,
      isVoted:     true,
      votedAt:     now,
      votedSource,
    });
  } catch (err) {
    console.error("[votes POST] DynamoDB write error:", err);
    return NextResponse.json(
      { error: "STORE_WRITE_ERROR", detail: String(err) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, votes: newVotes });
}
