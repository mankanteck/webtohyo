"use client";

import { useEffect, useState } from "react";

interface Unit {
  id: string;
  roomNo: string;
  ownerName: string;
  votingRights: number;
  isVoted: boolean;
  votedSource?: "WEB" | "PAPER";
  votedAt?: string;
  accessToken: string;
}

interface Agenda {
  id: string;
  order: number;
  title: string;
  resolutionType: string;
}

interface Condo {
  id: string;
  name: string;
  condoCd: string;
  isDemo?: boolean;
}

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

const CHOICE_LABELS: Record<VoteChoice, { label: string; color: string }> = {
  FOR: { label: "賛成", color: "bg-green-100 text-green-700 border-green-300" },
  AGAINST: { label: "反対", color: "bg-red-100 text-red-700 border-red-300" },
  ABSTAIN: { label: "棄権", color: "bg-slate-100 text-slate-600 border-slate-300" },
};

export default function ProxyPage() {
  const [condos, setCondos] = useState<Condo[]>([]);
  const [selectedCondoId, setSelectedCondoId] = useState("");
  const [units, setUnits] = useState<Unit[]>([]);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
  const [ballots, setBallots] = useState<Record<string, VoteChoice>>({});
  const [inputBy, setInputBy] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [warning, setWarning] = useState<{
    show: boolean;
    votedSource?: string;
    votedAt?: string;
  }>({ show: false });

  // マンション一覧取得
  useEffect(() => {
    fetch("/api/condos")
      .then((r) => r.json())
      .then((cs: Condo[]) => {
        setCondos(cs);
        if (cs.length > 0) setSelectedCondoId(cs[0].id);
      });
  }, []);

  // 部屋・議案取得
  useEffect(() => {
    if (!selectedCondoId) return;
    Promise.all([
      fetch(`/api/units?condoId=${selectedCondoId}`).then((r) => r.json()),
      fetch(`/api/agendas?condoId=${selectedCondoId}`).then((r) => r.json()),
    ]).then(([u, a]) => {
      setUnits(u.sort((a: Unit, b: Unit) =>
        a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })
      ));
      setAgendas(a);
      setSelectedUnit(null);
      setBallots({});
      setSuccess(false);
    });
  }, [selectedCondoId]);

  const handleUnitSelect = async (unit: Unit) => {
    setSuccess(false);
    setSelectedUnit(unit);
    setBallots({});

    if (unit.isVoted && unit.votedSource === "WEB") {
      setWarning({
        show: true,
        votedSource: "WEB",
        votedAt: unit.votedAt,
      });
    } else {
      setWarning({ show: false });
    }

    // 既存投票内容を読み込む
    const votes = await fetch(`/api/votes?unitId=${unit.id}`).then((r) => r.json());
    const existing: Record<string, VoteChoice> = {};
    for (const v of votes) {
      existing[v.agendaId] = v.choice;
    }
    setBallots(existing);
  };

  const handleChoiceChange = (agendaId: string, choice: VoteChoice) => {
    setBallots((prev) => ({ ...prev, [agendaId]: choice }));
  };

  const handleSubmit = async (forceOverwrite = false) => {
    if (!selectedUnit) return;
    if (!inputBy.trim()) {
      alert("入力担当者名を記入してください");
      return;
    }

    const incomplete = agendas.filter((a) => !ballots[a.id]);
    if (incomplete.length > 0) {
      alert(`未回答の議案があります: ${incomplete.map((a) => `第${a.order}号`).join(", ")}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: selectedUnit.id,
          ballots: agendas.map((a) => ({
            agendaId: a.id,
            choice: ballots[a.id],
          })),
          votedSource: "PAPER",
          isProxyEntry: true,
          inputBy: inputBy.trim(),
          forceOverwrite,
        }),
      });

      if (res.status === 409 && !forceOverwrite) {
        const data = await res.json();
        setWarning({
          show: true,
          votedSource: data.votedSource,
          votedAt: data.votedAt,
        });
        setLoading(false);
        return;
      }

      if (!res.ok) throw new Error("投票保存に失敗しました");

      setSuccess(true);
      setWarning({ show: false });

      // ユニット一覧を更新
      const updatedUnits = await fetch(`/api/units?condoId=${selectedCondoId}`).then((r) =>
        r.json()
      );
      setUnits(
        updatedUnits.sort((a: Unit, b: Unit) =>
          a.roomNo.localeCompare(b.roomNo, undefined, { numeric: true })
        )
      );
      setSelectedUnit(
        updatedUnits.find((u: Unit) => u.id === selectedUnit.id) || null
      );
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const selectedCondo = condos.find((c) => c.id === selectedCondoId);
  const isDemo = selectedCondo?.isDemo === true;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">代理入力（紙回答）</h1>

      {/* マンション選択 */}
      {condos.length > 1 && (
        <div className="bg-white rounded-xl p-4 shadow flex items-center gap-3">
          <label className="text-sm font-medium text-slate-600 whitespace-nowrap">管理組合：</label>
          <select
            value={selectedCondoId}
            onChange={(e) => setSelectedCondoId(e.target.value)}
            className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {condos.map((c) => (
              <option key={c.id} value={c.id}>
                {c.isDemo ? "[サンプル] " : ""}{c.name}（{c.condoCd}）
              </option>
            ))}
          </select>
        </div>
      )}

      {/* デモバナー */}
      {isDemo && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎭</span>
          <div>
            <div className="font-bold text-amber-800">サンプルデータを表示中</div>
            <div className="text-sm text-amber-700">このマンションはデモ用サンプルです。代理入力の保存はできません。</div>
          </div>
        </div>
      )}

      {units.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-700">データがありません。先にデータ管理からインポートしてください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* 部屋一覧 */}
          <div className="md:col-span-2 bg-white rounded-xl shadow overflow-hidden">
            <div className="bg-slate-50 px-4 py-3 border-b">
              <p className="text-sm font-medium text-slate-600">部屋を選択</p>
            </div>
            <div className="divide-y max-h-[calc(100vh-220px)] overflow-y-auto">
              {units.map((unit) => (
                <button
                  key={unit.id}
                  onClick={() => handleUnitSelect(unit)}
                  className={`w-full text-left px-4 py-3 flex items-center justify-between hover:bg-blue-50 transition-colors ${
                    selectedUnit?.id === unit.id ? "bg-blue-50 border-l-4 border-blue-600" : ""
                  }`}
                >
                  <div>
                    <span className="font-bold text-slate-800">{unit.roomNo}</span>
                    <span className="text-slate-500 text-sm ml-2">{unit.ownerName || "—"}</span>
                  </div>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      unit.isVoted
                        ? unit.votedSource === "WEB"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-orange-100 text-orange-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {unit.isVoted
                      ? unit.votedSource === "WEB"
                        ? "WEB済"
                        : "紙済"
                      : "未提出"}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* 入力フォーム */}
          <div className="md:col-span-3">
            {!selectedUnit ? (
              <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl h-48 flex items-center justify-center text-slate-400">
                左のリストから部屋を選択してください
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow p-5 space-y-4">
                {/* 部屋情報 */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-slate-800">
                      {selectedUnit.roomNo}
                    </span>
                    <span className="ml-2 text-slate-500">{selectedUnit.ownerName}</span>
                  </div>
                  <span className="text-sm text-slate-400">
                    議決権 {selectedUnit.votingRights} 口
                  </span>
                </div>

                {/* 重複警告 */}
                {warning.show && (
                  <div className="bg-amber-50 border border-amber-300 rounded-lg p-4">
                    <div className="font-bold text-amber-800 mb-1">⚠️ 投票済みの部屋です</div>
                    <p className="text-amber-700 text-sm">
                      この部屋は既に{" "}
                      <strong>
                        {warning.votedSource === "WEB" ? "WEB" : "紙（代理入力）"}
                      </strong>{" "}
                      で回答済みです。
                      {warning.votedAt && (
                        <span>
                          （{new Date(warning.votedAt).toLocaleString("ja-JP")}）
                        </span>
                      )}
                    </p>
                    <p className="text-amber-700 text-sm mt-1">
                      上書きしますか？（上書きした場合、元の回答は削除されます）
                    </p>
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleSubmit(true)}
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700"
                      >
                        上書きして保存
                      </button>
                      <button
                        onClick={() => setWarning({ show: false })}
                        className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
                      >
                        キャンセル
                      </button>
                    </div>
                  </div>
                )}

                {/* 成功メッセージ */}
                {success && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm font-medium">
                    ✅ 代理入力を保存しました
                  </div>
                )}

                {/* 担当者名 */}
                {!isDemo && (
                  <div>
                    <label className="block text-sm text-slate-600 mb-1">
                      入力担当者名 * <span className="text-xs text-slate-400">（監査ログに記録されます）</span>
                    </label>
                    <input
                      type="text"
                      value={inputBy}
                      onChange={(e) => setInputBy(e.target.value)}
                      placeholder="担当者名を入力"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* 議案ごとの選択 */}
                <div className="space-y-3">
                  {agendas.map((agenda) => (
                    <div key={agenda.id} className="border border-slate-100 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          第{agenda.order}号
                        </span>
                        <span className="text-sm font-medium text-slate-800">
                          {agenda.title}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        {(["FOR", "AGAINST", "ABSTAIN"] as VoteChoice[]).map((choice) => (
                          <button
                            key={choice}
                            onClick={() => !isDemo && handleChoiceChange(agenda.id, choice)}
                            disabled={isDemo}
                            className={`flex-1 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                              isDemo
                                ? "border-slate-100 text-slate-400 cursor-not-allowed"
                                : ballots[agenda.id] === choice
                                  ? `${CHOICE_LABELS[choice].color} border-current font-bold scale-105`
                                  : "border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                          >
                            {CHOICE_LABELS[choice].label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 送信ボタン */}
                {!warning.show && !isDemo && (
                  <button
                    onClick={() => handleSubmit(false)}
                    disabled={loading}
                    className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold hover:bg-blue-800 disabled:opacity-50"
                  >
                    {loading ? "⏳ 保存中..." : "📝 代理入力を保存"}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
