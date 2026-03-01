import { NextRequest, NextResponse } from "next/server";
import { agendaStore } from "@/lib/dynamodb";
import { authorizeCondoAccess, getUserSub } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const auth = await authorizeCondoAccess(req, condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });

  const agendas = await agendaStore.getByCondoId(condoId);
  return NextResponse.json(agendas.sort((a, b) => a.order - b.order));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const condoId = body.condoId as string;
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const auth = await authorizeCondoAccess(req, condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  if (auth.isDemo) return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });

  const { nanoid } = await import("nanoid");
  const agenda = {
    id: nanoid(),
    condoId,
    order: body.order,
    title: body.title,
    resolutionType: body.resolutionType || "ORDINARY",
    createdAt: new Date().toISOString(),
  };
  await agendaStore.save(agenda);
  return NextResponse.json(agenda, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const { id, title, resolutionType } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await agendaStore.getById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await authorizeCondoAccess(req, existing.condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  if (auth.isDemo) return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });

  const updated = { ...existing, title, resolutionType };
  await agendaStore.save(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const existing = await agendaStore.getById(id);
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const auth = await authorizeCondoAccess(req, existing.condoId);
  if (!auth.authorized) return NextResponse.json({ error: "Unauthorized" }, { status: auth.status });
  if (auth.isDemo) return NextResponse.json({ error: "DEMO_DATA_READONLY" }, { status: 403 });

  await agendaStore.deleteById(id);
  return NextResponse.json({ ok: true });
}
