import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore, agendaStore, voteStore } from "@/lib/dynamodb";
import { getUserSub } from "@/lib/auth";

/** アカウント削除前にユーザーの全データを削除する */
export async function DELETE(request: NextRequest) {
  const userId = await getUserSub(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // 自分が所有するマンションを全取得（デモ除く）
  const myCondos = await condoStore.getByOwnerUserId(userId);

  for (const condo of myCondos) {
    const [units, agendas] = await Promise.all([
      unitStore.getByCondoId(condo.id),
      agendaStore.getByCondoId(condo.id),
    ]);

    const votes = (await Promise.all(units.map((u) => voteStore.getByUnitId(u.id)))).flat();

    await Promise.all(votes.map((v) => voteStore.deleteById(v.id)));
    await Promise.all([
      ...units.map((u) => unitStore.deleteById(u.id)),
      ...agendas.map((a) => agendaStore.deleteById(a.id)),
    ]);
    await condoStore.deleteById(condo.id);
  }

  return NextResponse.json({ ok: true, deletedCondos: myCondos.length });
}
