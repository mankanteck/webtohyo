import { NextRequest, NextResponse } from "next/server";
import { voteStore, unitStore } from "@/lib/dynamodb";
import { authorizeCondoAccess, getUserSub } from "@/lib/auth";
import type { VoteChoice } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  const unitId = req.nextUrl.searchParams.get("unitId");
  if (!unitId) {
    return NextResponse.json({ error: "unitId required" }, { status: 400 });
  }

  // unitId から condoId を取得して所有権を検証
  const unit = await unitStore.getById(unitId);
  if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await authorizeCondoAccess(req, unit.condoId);
  if (!auth.authorized) {
    return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  }

  return NextResponse.json(await voteStore.getByUnitId(unitId));
}

/**
 * アトミック投票処理:
 * 1. unit の isVoted を確認（二重投票防止）
 * 2. Vote を一括保存
 * 3. Unit の isVoted, votedAt, votedSource を更新
 *
 * 認証:
 * - isProxyEntry=true（管理者代理入力）: Cognito認証 + condoId所有権を検証
 * - isProxyEntry=false（WEB投票）: 投票者はCognitoアカウント不要のため認証スキップ
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

  // 管理者代理入力はCognito認証 + condoId所有権を検証
  if (isProxyEntry) {
    const userId = await getUserSub(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const auth = await authorizeCondoAccess(req, unit.condoId);
    if (!auth.authorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
    }
    if (auth.isDemo) {
      return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });
    }
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
