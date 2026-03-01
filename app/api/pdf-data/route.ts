import { NextRequest, NextResponse } from "next/server";
import { unitStore } from "@/lib/dynamodb";
import { authorizeCondoAccess } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const auth = await authorizeCondoAccess(req, condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const condo = auth.condo;
  const allUnits = await unitStore.getByCondoId(condoId);

  const notVotedUnits = allUnits
    .filter((u) => !u.isVoted)
    .sort((a, b) => a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true }));

  return NextResponse.json({ condo, notVotedUnits });
}
