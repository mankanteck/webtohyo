import { NextRequest, NextResponse } from "next/server";
import { unitStore, condoStore } from "@/lib/dynamodb";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nanoid } = await import("nanoid");
  const unit = {
    id: nanoid(),
    condoId: body.condoId,
    roomNo: body.roomNo,
    ownerName: body.ownerName || "",
    votingRights: Number(body.votingRights) || 1,
    accessToken: `${body.roomNo}-${nanoid(8)}`,
    isVoted: false,
    createdAt: new Date().toISOString(),
  };
  await unitStore.save(unit);
  return NextResponse.json(unit, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, roomNo, ownerName, votingRights } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await unitStore.getById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const updated = { ...existing, roomNo, ownerName, votingRights: Number(votingRights) };
  await unitStore.save(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await unitStore.deleteById(id);
  return NextResponse.json({ ok: true });
}

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
