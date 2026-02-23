import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore } from "@/lib/store";

// 督促状PDF生成用データ取得
export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const condo = condoStore.getById(condoId);
  if (!condo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notVotedUnits = unitStore
    .getByCondoId(condoId)
    .filter((u) => !u.isVoted)
    .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }));

  return NextResponse.json({ condo, notVotedUnits });
}
