import { NextRequest, NextResponse } from "next/server";
import { unitStore, condoStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  const token = req.nextUrl.searchParams.get("token");

  if (token) {
    const unit = unitStore.getByToken(token);
    if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const condo = condoStore.getById(unit.condoId);
    return NextResponse.json({ unit, condo });
  }

  if (condoId) {
    const units = unitStore.getByCondoId(condoId);
    return NextResponse.json(units);
  }

  return NextResponse.json(unitStore.getAll());
}
