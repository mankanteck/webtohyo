"use client";

import { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { generateReminderPdf, generateQrSheetPdf } from "@/lib/pdf";

interface Stats {
  condo: { id: string; name: string; condoCd: string };
  totalUnits: number;
  votedCount: number;
  webVotedCount: number;
  paperVotedCount: number;
  notVotedCount: number;
  quorumTarget: number;
  remaining: number;
  totalVotingRights: number;
  votedVotingRights: number;
  quorumReached: boolean;
  allUnits: {
    id: string;
    roomNo: string;
    ownerName: string;
    accessToken: string;
    votingRights: number;
  }[];
  notVotedUnits: {
    id: string;
    roomNo: string;
    ownerName: string;
    accessToken: string;
    votingRights: number;
  }[];
  agendaStats: {
    agendaId: string;
    title: string;
    order: number;
    resolutionType: string;
    FOR: number;
    AGAINST: number;
    ABSTAIN: number;
    total: number;
  }[];
}

interface Condo {
  id: string;
  name: string;
  condoCd: string;
}

const VOTE_COLORS: Record<string, string> = {
  FOR: "#22c55e",
  AGAINST: "#ef4444",
  ABSTAIN: "#94a3b8",
};

export default function DashboardPage() {
  const [condos, setCondos] = useState<Condo[]>([]);
  const [selectedCondoId, setSelectedCondoId] = useState<string>("");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [qrPdfLoading, setQrPdfLoading] = useState(false);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    fetch("/api/units")
      .then((r) => r.json())
      .then((units: { condoId: string }[]) => {
        const ids = [...new Set(units.map((u) => u.condoId))];
        if (ids.length === 0) return;
        fetch("/api/stats?condoId=" + ids[0])
          .then((r) => r.json())
          .then((s) => {
            setCondos([s.condo]);
            setSelectedCondoId(s.condo.id);
            setStats(s);
          });
      });
  }, []);

  const loadStats = useCallback(
    (condoId: string) => {
      if (!condoId) return;
      setLoading(true);
      fetch(`/api/stats?condoId=${condoId}`)
        .then((r) => r.json())
        .then((s) => {
          setStats(s);
          setLoading(false);
        });
    },
    []
  );

  useEffect(() => {
    if (selectedCondoId) loadStats(selectedCondoId);
  }, [selectedCondoId, loadStats]);

  const voteUrl = (token: string) => `${origin}/vote/${token}`;

  const copyUrl = (token: string) => {
    navigator.clipboard.writeText(voteUrl(token));
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  };

  const handlePdfGenerate = async () => {
    if (!stats) return;
    setPdfLoading(true);
    try {
      await generateReminderPdf(stats.condo.name, stats.notVotedUnits, origin);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleQrSheetGenerate = async () => {
    if (!stats) return;
    setQrPdfLoading(true);
    try {
      await generateQrSheetPdf(stats.condo.name, stats.allUnits, origin);
    } finally {
      setQrPdfLoading(false);
    }
  };

  const progressPct = stats
    ? Math.min(100, Math.round((stats.votedCount / stats.totalUnits) * 100))
    : 0;

  return (
    <div className="space-y-6">
      {/* ページタイトル */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">管理ダッシュボード</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleQrSheetGenerate}
            disabled={qrPdfLoading || !stats}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {qrPdfLoading ? "⏳ 生成中..." : "📱 全戸QRコードPDF"}
          </button>
          <button
            onClick={() => selectedCondoId && loadStats(selectedCondoId)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-sm font-medium"
          >
            🔄 更新
          </button>
        </div>
      </div>

      {!stats && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-2">📭</div>
          <p className="text-amber-800 font-medium">まだデータがありません</p>
          <p className="text-amber-600 text-sm mt-1">
            「データ管理」からマンション情報をインポートしてください
          </p>
          <a
            href="/import"
            className="inline-block mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
          >
            データ管理へ →
          </a>
        </div>
      )}

      {stats && (
        <>
          {/* 定足数カード */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 定足数ゲージ */}
            <div
              className={`md:col-span-1 rounded-xl p-5 text-white shadow ${
                stats.quorumReached ? "bg-green-600" : "bg-blue-700"
              }`}
            >
              <div className="text-sm font-medium opacity-80 mb-1">定足数達成状況</div>
              <div className="text-4xl font-bold mb-1">
                {progressPct}%
              </div>
              <div className="text-sm opacity-90 mb-3">
                {stats.votedCount} / {stats.totalUnits} 戸
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-white h-3 rounded-full transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              {stats.quorumReached ? (
                <div className="mt-2 text-sm font-bold">✅ 定足数に達しました！</div>
              ) : (
                <div className="mt-2 text-sm">
                  あと <span className="font-bold text-lg">{stats.remaining}</span> 通で定足数
                </div>
              )}
            </div>

            {/* WEB / 紙 内訳 */}
            <div className="bg-white rounded-xl p-5 shadow">
              <div className="text-sm text-slate-500 mb-3 font-medium">提出方法内訳</div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">🌐 WEB回答</span>
                  <span className="font-bold text-blue-600">{stats.webVotedCount} 件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-slate-600">📄 紙（代理入力）</span>
                  <span className="font-bold text-orange-600">{stats.paperVotedCount} 件</span>
                </div>
                <div className="border-t pt-2 flex justify-between items-center">
                  <span className="text-sm font-medium text-slate-700">合計</span>
                  <span className="font-bold text-slate-800">{stats.votedCount} 件</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-500">未提出</span>
                  <span className="font-bold text-red-500">{stats.notVotedCount} 件</span>
                </div>
              </div>
            </div>

            {/* 議決権 */}
            <div className="bg-white rounded-xl p-5 shadow">
              <div className="text-sm text-slate-500 mb-3 font-medium">議決権行使状況</div>
              <div className="text-3xl font-bold text-slate-800 mb-1">
                {stats.totalVotingRights > 0
                  ? Math.round((stats.votedVotingRights / stats.totalVotingRights) * 100)
                  : 0}
                %
              </div>
              <div className="text-sm text-slate-500">
                {stats.votedVotingRights.toFixed(2)} / {stats.totalVotingRights.toFixed(2)} 口
              </div>
              <div className="mt-3 w-full bg-slate-100 rounded-full h-2.5">
                <div
                  className="bg-blue-500 h-2.5 rounded-full"
                  style={{
                    width: `${
                      stats.totalVotingRights > 0
                        ? Math.min(
                            100,
                            (stats.votedVotingRights / stats.totalVotingRights) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* 議案別集計グラフ */}
          {stats.agendaStats.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow">
              <h2 className="text-lg font-bold text-slate-800 mb-4">議案別 投票結果</h2>
              <div className="space-y-6">
                {stats.agendaStats.map((agenda) => {
                  const chartData = [
                    { name: "賛成", value: agenda.FOR, key: "FOR" },
                    { name: "反対", value: agenda.AGAINST, key: "AGAINST" },
                    { name: "棄権", value: agenda.ABSTAIN, key: "ABSTAIN" },
                  ];
                  const total = agenda.total;
                  return (
                    <div key={agenda.agendaId} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          第{agenda.order}号
                        </span>
                        <span className="font-medium text-slate-800">{agenda.title}</span>
                        <span className="ml-auto text-xs text-slate-400">{total} 票</span>
                      </div>
                      <div className="h-28">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={36} />
                            <Tooltip
                              formatter={(v: string | number | undefined) => {
                                const num = typeof v === "number" ? v : 0;
                                return [`${num} 票 (${total > 0 ? Math.round((num / total) * 100) : 0}%)`] as [string];
                              }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                              {chartData.map((entry) => (
                                <Cell
                                  key={entry.key}
                                  fill={VOTE_COLORS[entry.key]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 未提出者管理 */}
          <div className="bg-white rounded-xl p-5 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-800">
                未提出者一覧
                <span className="ml-2 bg-red-100 text-red-600 text-sm px-2 py-0.5 rounded-full">
                  {stats.notVotedCount} 件
                </span>
              </h2>
              <button
                onClick={handlePdfGenerate}
                disabled={pdfLoading || stats.notVotedCount === 0}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pdfLoading ? "⏳ 生成中..." : "📋 督促状PDF一括生成"}
              </button>
            </div>

            {stats.notVotedUnits.length === 0 ? (
              <div className="text-center py-8 text-green-600 font-medium">
                🎉 全戸が提出済みです！
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="text-left p-3 rounded-tl-lg">部屋番号</th>
                      <th className="text-left p-3">所有者名</th>
                      <th className="text-left p-3">議決権</th>
                      <th className="text-left p-3 rounded-tr-lg">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.notVotedUnits.map((unit) => (
                      <tr key={unit.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 font-bold text-slate-800">{unit.roomNo}</td>
                        <td className="p-3 text-slate-600">{unit.ownerName || "—"}</td>
                        <td className="p-3 text-slate-600">{unit.votingRights}</td>
                        <td className="p-3">
                          <button
                            onClick={() => copyUrl(unit.accessToken)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              copied === unit.accessToken
                                ? "bg-green-100 text-green-700"
                                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                            }`}
                          >
                            {copied === unit.accessToken ? "✅ コピー済み" : "🔗 URLコピー"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
