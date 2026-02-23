"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";

interface UnitInfo {
  id: string;
  roomNo: string;
  ownerName: string;
  votingRights: number;
  condoId: string;
  isVoted: boolean;
  accessToken: string;
}

interface Agenda {
  id: string;
  order: number;
  title: string;
  resolutionType: "ORDINARY" | "SPECIAL";
}

type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

const CHOICE_CONFIG: { key: VoteChoice; label: string; emoji: string; active: string }[] = [
  { key: "FOR", label: "賛成", emoji: "✅", active: "bg-green-600 text-white border-green-600" },
  { key: "AGAINST", label: "反対", emoji: "❌", active: "bg-red-600 text-white border-red-600" },
  { key: "ABSTAIN", label: "棄権", emoji: "⬜", active: "bg-slate-500 text-white border-slate-500" },
];

const LS_KEY = (token: string) => `vote_draft_${token}`;

export default function BallotPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [agendas, setAgendas] = useState<Agenda[]>([]);
  const [ballots, setBallots] = useState<Record<string, VoteChoice>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [restoredDraft, setRestoredDraft] = useState(false);

  // localStorageに下書き保存
  const saveDraft = useCallback(
    (newBallots: Record<string, VoteChoice>) => {
      localStorage.setItem(LS_KEY(token), JSON.stringify(newBallots));
    },
    [token]
  );

  useEffect(() => {
    const load = async () => {
      // 本人情報取得
      const unitRes = await fetch(`/api/units?token=${token}`);
      if (!unitRes.ok) {
        router.push(`/vote/${token}`);
        return;
      }
      const { unit: u } = await unitRes.json();

      if (u.isVoted) {
        router.push(`/vote/${token}/done`);
        return;
      }

      setUnit(u);

      // 議案取得
      const agendaRes = await fetch(`/api/agendas?condoId=${u.condoId}`);
      const aList: Agenda[] = await agendaRes.json();
      setAgendas(aList);

      // localStorage から下書き復元
      const saved = localStorage.getItem(LS_KEY(token));
      if (saved) {
        try {
          setBallots(JSON.parse(saved));
          setRestoredDraft(true);
        } catch {
          // ignore
        }
      }

      setLoading(false);
    };
    load();
  }, [token, router]);

  const handleChoice = (agendaId: string, choice: VoteChoice) => {
    setBallots((prev) => {
      const next = { ...prev, [agendaId]: choice };
      saveDraft(next);
      return next;
    });
    if (restoredDraft) setRestoredDraft(false);
  };

  const answeredCount = agendas.filter((a) => ballots[a.id]).length;
  const allAnswered = answeredCount === agendas.length && agendas.length > 0;

  const handleSubmit = async () => {
    if (!unit || !allAnswered) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          unitId: unit.id,
          ballots: agendas.map((a) => ({
            agendaId: a.id,
            choice: ballots[a.id],
          })),
          votedSource: "WEB",
          isProxyEntry: false,
          forceOverwrite: false,
        }),
      });

      if (res.status === 409) {
        // 既に投票済み
        localStorage.removeItem(LS_KEY(token));
        router.push(`/vote/${token}/done`);
        return;
      }

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        const detail = errBody?.detail ?? errBody?.error ?? `HTTP ${res.status}`;
        throw new Error(`送信に失敗しました (${detail})`);
      }

      // 下書き削除
      localStorage.removeItem(LS_KEY(token));
      router.push(`/vote/${token}/done`);
    } catch (e) {
      alert(e instanceof Error ? e.message : "エラーが発生しました。もう一度お試しください。");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">📋</div>
          <p className="text-blue-700">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (!unit) return null;

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* ヘッダー */}
      <div className="bg-blue-900 text-white px-4 py-4 sticky top-0 z-10 shadow">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <button
            onClick={() => router.push(`/vote/${token}`)}
            className="text-blue-200 hover:text-white text-sm"
          >
            ← 戻る
          </button>
          <div className="text-center">
            <div className="text-sm font-bold">投票用紙</div>
            <div className="text-xs text-blue-200">{unit.roomNo} 号室</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-blue-200">回答済み</div>
            <div className="text-sm font-bold">
              {answeredCount}/{agendas.length}
            </div>
          </div>
        </div>

        {/* 進捗バー */}
        <div className="mt-2 max-w-lg mx-auto">
          <div className="w-full bg-blue-800 rounded-full h-1.5">
            <div
              className="bg-white h-1.5 rounded-full transition-all"
              style={{
                width: `${agendas.length > 0 ? (answeredCount / agendas.length) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* 下書き復元通知 */}
        {restoredDraft && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-center gap-2 text-sm text-blue-700">
            <span>💾</span>
            <span>前回の入力内容を復元しました</span>
          </div>
        )}

        {/* 議案カード */}
        {agendas.map((agenda, idx) => (
          <div key={agenda.id} className="bg-white rounded-2xl shadow p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full shrink-0">
                第{agenda.order}号
              </div>
              <div className="flex-1">
                <div className="font-bold text-slate-800 leading-snug">
                  {agenda.title}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {agenda.resolutionType === "SPECIAL" ? "特別決議" : "普通決議"}
                </div>
              </div>
              {ballots[agenda.id] && (
                <span className="text-lg">
                  {CHOICE_CONFIG.find((c) => c.key === ballots[agenda.id])?.emoji}
                </span>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CHOICE_CONFIG.map((cfg) => (
                <button
                  key={cfg.key}
                  onClick={() => handleChoice(agenda.id, cfg.key)}
                  className={`py-3 border-2 rounded-xl text-sm font-bold transition-all active:scale-95 ${
                    ballots[agenda.id] === cfg.key
                      ? cfg.active
                      : "border-slate-200 text-slate-500 hover:border-slate-300 bg-white"
                  }`}
                >
                  <div className="text-lg mb-0.5">{cfg.emoji}</div>
                  {cfg.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* 未回答の案内 */}
        {!allAnswered && answeredCount > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-sm">
            あと {agendas.length - answeredCount} 件の議案に回答してください
          </div>
        )}
      </div>

      {/* 送信ボタン（固定） */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-lg">
        <div className="max-w-lg mx-auto">
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
              allAnswered && !submitting
                ? "bg-blue-700 text-white hover:bg-blue-800 active:scale-98 shadow-lg"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            {submitting
              ? "⏳ 送信中..."
              : allAnswered
              ? "✉️ 投票を送信する"
              : `残り ${agendas.length - answeredCount} 件を回答してください`}
          </button>
          <p className="text-center text-xs text-slate-400 mt-2">
            送信後は変更できません。内容をご確認ください。
          </p>
        </div>
      </div>
    </div>
  );
}
