import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const [condo, allUnits] = await Promise.all([
    condoStore.getById(condoId),
    unitStore.getByCondoId(condoId),
  ]);

  if (!condo) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notVotedUnits = allUnits
    .filter((u) => !u.isVoted)
    .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }));

  return NextResponse.json({ condo, notVotedUnits });
}
