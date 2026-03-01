import { NextRequest, NextResponse } from "next/server";
import { unitStore, condoStore } from "@/lib/dynamodb";
import { authorizeCondoAccess } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  const token   = req.nextUrl.searchParams.get("token");

  // token は投票者向け（認証不要）
  if (token) {
    const unit = await unitStore.getByToken(token);
    if (!unit) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const condo = await condoStore.getById(unit.condoId);
    return NextResponse.json({ unit, condo });
  }

  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const auth = await authorizeCondoAccess(req, condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const units = await unitStore.getByCondoId(condoId);
  return NextResponse.json(units);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const condoId = body.condoId as string;
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const auth = await authorizeCondoAccess(req, condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  if (auth.isDemo) return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });

  const { nanoid } = await import("nanoid");
  const unit = {
    id: nanoid(),
    condoId,
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

  const auth = await authorizeCondoAccess(req, existing.condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  if (auth.isDemo) return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });

  const updated = { ...existing, roomNo, ownerName, votingRights: Number(votingRights) };
  await unitStore.save(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await unitStore.getById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await authorizeCondoAccess(req, existing.condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  if (auth.isDemo) return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });

  await unitStore.deleteById(id);
  return NextResponse.json({ ok: true });
}
