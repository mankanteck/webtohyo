import { NextRequest, NextResponse } from "next/server";
import { unitStore, condoStore } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  const token   = req.nextUrl.searchParams.get("token");

  if (token) {
    const unit = await unitStore.getByToken(token);
    if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const condo = await condoStore.getById(unit.condoId);
    return NextResponse.json({ unit, condo });
  }

  if (condoId) {
    const units = await unitStore.getByCondoId(condoId);
    return NextResponse.json(units);
  }

  return NextResponse.json(await unitStore.getAll());
}
