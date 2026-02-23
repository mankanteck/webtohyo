import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore, voteStore, agendaStore } from "@/lib/store";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const condo = condoStore.getById(condoId);
  if (!condo) return NextResponse.json({ error: "Condo not found" }, { status: 404 });

  const units = unitStore.getByCondoId(condoId);
  const agendas = agendaStore.getByCondoId(condoId).sort((a, b) => a.order - b.order);
  const allVotes = voteStore.getAll();

  const totalUnits = units.length;
  const votedUnits = units.filter((u) => u.isVoted);
  const webVoted = votedUnits.filter((u) => u.votedSource === "WEB");
  const paperVoted = votedUnits.filter((u) => u.votedSource === "PAPER");
  const notVoted = units.filter((u) => !u.isVoted);

  const totalVotingRights = units.reduce((sum, u) => sum + u.votingRights, 0);
  const votedVotingRights = votedUnits.reduce((sum, u) => sum + u.votingRights, 0);

  const quorumTarget = Math.ceil(totalUnits / 2);
  const remaining = Math.max(0, quorumTarget - votedUnits.length);

  // 議案別集計
  const agendaStats = agendas.map((agenda) => {
    const votes = allVotes.filter((v) => v.agendaId === agenda.id);
    const forCount = votes.filter((v) => v.choice === "FOR").length;
    const againstCount = votes.filter((v) => v.choice === "AGAINST").length;
    const abstainCount = votes.filter((v) => v.choice === "ABSTAIN").length;
    return {
      agendaId: agenda.id,
      title: agenda.title,
      order: agenda.order,
      resolutionType: agenda.resolutionType,
      FOR: forCount,
      AGAINST: againstCount,
      ABSTAIN: abstainCount,
      total: votes.length,
    };
  });

  return NextResponse.json({
    condo,
    totalUnits,
    votedCount: votedUnits.length,
    webVotedCount: webVoted.length,
    paperVotedCount: paperVoted.length,
    notVotedCount: notVoted.length,
    quorumTarget,
    remaining,
    totalVotingRights,
    votedVotingRights,
    quorumReached: votedUnits.length >= quorumTarget,
    notVotedUnits: notVoted,
    agendaStats,
  });
}
