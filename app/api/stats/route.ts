import { NextRequest, NextResponse } from "next/server";
import { condoStore, unitStore, voteStore, agendaStore } from "@/lib/dynamodb";

export async function GET(req: NextRequest) {
  const condoId = req.nextUrl.searchParams.get("condoId");
  if (!condoId) return NextResponse.json({ error: "condoId required" }, { status: 400 });

  const [condo, units, agendas, allVotes] = await Promise.all([
    condoStore.getById(condoId),
    unitStore.getByCondoId(condoId),
    agendaStore.getByCondoId(condoId),
    voteStore.getAll(),
  ]);

  if (!condo) return NextResponse.json({ error: "Condo not found" }, { status: 404 });

  const sortedAgendas = agendas.sort((a, b) => a.order - b.order);

  const votedUnits    = units.filter((u) => u.isVoted);
  const webVoted      = votedUnits.filter((u) => u.votedSource === "WEB");
  const paperVoted    = votedUnits.filter((u) => u.votedSource === "PAPER");
  const notVoted      = units.filter((u) => !u.isVoted);

  const totalVotingRights  = units.reduce((s, u) => s + u.votingRights, 0);
  const votedVotingRights  = votedUnits.reduce((s, u) => s + u.votingRights, 0);
  const quorumTarget       = Math.ceil(units.length / 2);

  const agendaStats = sortedAgendas.map((agenda) => {
    const votes      = allVotes.filter((v) => v.agendaId === agenda.id);
    return {
      agendaId:       agenda.id,
      title:          agenda.title,
      order:          agenda.order,
      resolutionType: agenda.resolutionType,
      FOR:            votes.filter((v) => v.choice === "FOR").length,
      AGAINST:        votes.filter((v) => v.choice === "AGAINST").length,
      ABSTAIN:        votes.filter((v) => v.choice === "ABSTAIN").length,
      total:          votes.length,
    };
  });

  return NextResponse.json({
    condo,
    totalUnits:        units.length,
    votedCount:        votedUnits.length,
    webVotedCount:     webVoted.length,
    paperVotedCount:   paperVoted.length,
    notVotedCount:     notVoted.length,
    quorumTarget,
    remaining:         Math.max(0, quorumTarget - votedUnits.length),
    totalVotingRights,
    votedVotingRights,
    quorumReached:     votedUnits.length >= quorumTarget,
    notVotedUnits:     notVoted,
    allUnits:          units.map((u) => ({
      id:           u.id,
      roomNo:       u.roomNo,
      ownerName:    u.ownerName,
      accessToken:  u.accessToken,
      votingRights: u.votingRights,
    })),
    agendaStats,
  });
}
