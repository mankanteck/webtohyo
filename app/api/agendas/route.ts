import { NextRequest, NextResponse } from "next/server";
import { agendaStore } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (condoId) {
    const agendas = await agendaStore.getByCondoId(condoId);
    return NextResponse.json(agendas.sort((a, b) => a.order - b.order));
  }
  return NextResponse.json(await agendaStore.getAll());
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nanoid } = await import("nanoid");
  const agenda = {
    id: nanoid(),
    condoId: body.condoId,
    order: body.order,
    title: body.title,
    resolutionType: body.resolutionType || "ORDINARY",
    createdAt: new Date().toISOString(),
  };
  await agendaStore.save(agenda);
  return NextResponse.json(agenda, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const all = (await agendaStore.getAll()).filter((a) => a.id !== id);
  await agendaStore.saveMany(all);
  return NextResponse.json({ ok: true });
}
