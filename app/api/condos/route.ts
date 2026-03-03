import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore, agendaStore, voteStore } from "@/lib/dynamodb";
import { getUserSub } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserSub(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [myCondos, demoCondos] = await Promise.all([
    condoStore.getByOwnerUserId(userId),
    condoStore.getDemoCondos(),
  ]);

  const myIds = new Set(myCondos.map((c) => c.id));
  const combined = [...myCondos, ...demoCondos.filter((c) => !myIds.has(c.id))];
  combined.sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return NextResponse.json(combined);
}

export async function PUT(request: NextRequest) {
  const userId = await getUserSub(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, name } = await request.json();
  if (!id || !name?.trim()) {
    return NextResponse.json({ error: "id と name は必須です" }, { status: 400 });
  }

  const condo = await condoStore.getById(id);
  if (!condo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (condo.ownerUserId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const updated = await condoStore.save({ ...condo, name: name.trim() });
  return NextResponse.json(updated);
}

export async function DELETE(request: NextRequest) {
  const userId = await getUserSub(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id は必須です" }, { status: 400 });

  const condo = await condoStore.getById(id);
  if (!condo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (condo.ownerUserId !== userId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // 連鎖削除: 投票 → ユニット → 議案 → マンション
  const [units, agendas] = await Promise.all([
    unitStore.getByCondoId(id),
    agendaStore.getByCondoId(id),
  ]);

  const votes = (await Promise.all(units.map((u) => voteStore.getByUnitId(u.id)))).flat();

  await Promise.all([
    ...votes.map((v) => voteStore.deleteById(v.id)),
  ]);
  await Promise.all([
    ...units.map((u) => unitStore.deleteById(u.id)),
    ...agendas.map((a) => agendaStore.deleteById(a.id)),
  ]);
  await condoStore.deleteById(id);

  return NextResponse.json({ ok: true });
}
