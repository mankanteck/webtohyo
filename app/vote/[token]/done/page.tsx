"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface Vote {
  agendaId: string;
  choice: "FOR" | "AGAINST" | "ABSTAIN";
}

interface Agenda {
  id: string;
  order: number;
  title: string;
}

interface UnitInfo {
  id: string;
  roomNo: string;
  ownerName: string;
  votedAt?: string;
  votedSource?: "WEB" | "PAPER";
  condoId: string;
}

const CHOICE_DISPLAY: Record<string, { label: string; color: string; emoji: string }> = {
  FOR: { label: "賛成", color: "text-green-700 bg-green-50 border-green-200", emoji: "✅" },
  AGAINST: { label: "反対", color: "text-red-700 bg-red-50 border-red-200", emoji: "❌" },
  ABSTAIN: { label: "棄権", color: "text-slate-600 bg-slate-50 border-slate-200", emoji: "⬜" },
};

export default function DonePage() {
  const { token } = useParams<{ token: string }>();
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const unitRes = await fetch(`/api/units?token=${token}`);
      if (!unitRes.ok) { setLoading(false); return; }
      const { unit: u } = await unitRes.json();
      setUnit(u);

      const [voteRes, agendaRes] = await Promise.all([
        fetch(`/api/votes?unitId=${u.id}`).then((r) => r.json()),
        fetch(`/api/agendas?condoId=${u.condoId}`).then((r) => r.json()),
      ]);
      setVotes(voteRes);
      setAgendas(agendaRes.sort((a: Agenda, b: Agenda) => a.order - b.order));
      setLoading(false);
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center">
        <div className="text-4xl animate-bounce">✅</div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-slate-500">情報を読み込めませんでした</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-700 to-green-500 flex items-start justify-center p-4 pt-12">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-green-700 text-white px-6 py-6 text-center">
          <div className="text-5xl mb-3">✅</div>
          <h1 className="text-2xl font-bold">投票完了</h1>
          <p className="text-green-100 text-sm mt-1">
            {unit.votedAt
              ? new Date(unit.votedAt).toLocaleString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "受付完了"}
          </p>
        </div>

        <div className="px-6 py-6 space-y-5">
          {/* 部屋情報 */}
          <div className="bg-slate-50 rounded-xl p-4 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-slate-500">部屋番号</span>
              <span className="font-bold text-slate-800">{unit.roomNo}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-slate-500">氏名</span>
              <span className="text-slate-700">{unit.ownerName || "区分所有者様"}</span>
            </div>
            {unit.votedSource === "PAPER" && (
              <div className="mt-2 text-xs text-orange-600 bg-orange-50 rounded px-2 py-1">
                📄 紙回答として代理入力済み
              </div>
            )}
          </div>

          {/* 回答内容（読み取り専用） */}
          <div>
            <h2 className="font-bold text-slate-700 text-sm mb-3">
              📋 回答内容（変更不可）
            </h2>
            <div className="space-y-2">
              {agendas.map((agenda) => {
                const vote = votes.find((v) => v.agendaId === agenda.id);
                const display = vote ? CHOICE_DISPLAY[vote.choice] : null;
                return (
                  <div
                    key={agenda.id}
                    className="flex items-center justify-between border border-slate-100 rounded-xl px-4 py-3"
                  >
                    <div className="text-sm text-slate-700">
                      <span className="text-xs text-slate-400 mr-1">第{agenda.order}号</span>
                      {agenda.title}
                    </div>
                    {display ? (
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-full border ${display.color}`}
                      >
                        {display.emoji} {display.label}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 text-center">
            ご参加ありがとうございました。
            <br />
            このページを閉じて構いません。
          </div>
        </div>
      </div>
    </div>
  );
}
