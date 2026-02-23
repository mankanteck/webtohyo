import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore, agendaStore } from "@/lib/dynamodb";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { nanoid } = await import("nanoid");

  const { condoName, condoCd, csvData, agendas = [] } = body;

  if (!condoName || !condoCd || !csvData?.length) {
    return NextResponse.json(
      { error: "condoName, condoCd, csvData are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Condo 作成または更新
  const existingCondos = await condoStore.getAll();
  let condo = existingCondos.find((c) => c.condoCd === condoCd);

  const totalVotingRights = csvData.reduce(
    (sum: number, r: { votingRights: number }) => sum + Number(r.votingRights),
    0
  );

  if (!condo) {
    condo = {
      id: nanoid(),
      condoCd,
      name:             condoName,
      totalUnits:       csvData.length,
      totalVotingRights,
      createdAt:        now,
    };
  } else {
    condo = { ...condo, name: condoName, totalUnits: csvData.length, totalVotingRights };
  }
  await condoStore.save(condo);

  // Unit 作成（accessToken = roomNo-nanoid(8)）
  const units = csvData.map(
    (row: { roomNo: string; ownerName: string; votingRights: number }) => ({
      id:           nanoid(),
      condoId:      condo!.id,
      roomNo:       String(row.roomNo),
      ownerName:    String(row.ownerName || ""),
      votingRights: Number(row.votingRights) || 1,
      accessToken:  `${String(row.roomNo)}-${nanoid(8)}`,
      isVoted:      false,
      createdAt:    now,
    })
  );
  await unitStore.saveMany(units);

  // 議案を保存
  const validAgendas = (agendas as { title: string; resolutionType?: string }[]).filter(
    (a) => a.title?.trim()
  );
  if (validAgendas.length > 0) {
    const agendaRecords = validAgendas.map((a, i) => ({
      id:             nanoid(),
      condoId:        condo!.id,
      order:          i + 1,
      title:          a.title,
      resolutionType: (a.resolutionType || "ORDINARY") as "ORDINARY" | "SPECIAL",
      createdAt:      now,
    }));
    await agendaStore.saveMany(agendaRecords);
  }

  return NextResponse.json({
    condo,
    unitsCreated:   units.length,
    agendasCreated: validAgendas.length,
  });
}
