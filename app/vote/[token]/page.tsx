"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface UnitInfo {
  id: string;
  roomNo: string;
  ownerName: string;
  votingRights: number;
  isVoted: boolean;
  votedSource?: "WEB" | "PAPER";
  votedAt?: string;
  accessToken: string;
}

interface CondoInfo {
  id: string;
  name: string;
  condoCd: string;
}

export default function VoteWelcomePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [unit, setUnit] = useState<UnitInfo | null>(null);
  const [condo, setCondo] = useState<CondoInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/units?token=${token}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((data) => {
        setUnit(data.unit);
        setCondo(data.condo);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-bounce">🏢</div>
          <p className="text-blue-700 font-medium">読み込み中...</p>
        </div>
      </div>
    );
  }

  if (notFound || !unit || !condo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-slate-800 mb-2">URLが無効です</h1>
          <p className="text-slate-500 text-sm">
            このURLは無効か、有効期限が切れています。
            <br />
            管理会社にお問い合わせください。
          </p>
        </div>
      </div>
    );
  }

  // 投票済みの場合は結果確認ページへ
  if (unit.isVoted) {
    router.push(`/vote/${token}/done`);
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-900 to-blue-700 flex items-start justify-center p-4 pt-12">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-blue-900 text-white px-6 py-5">
          <div className="text-xs text-blue-200 mb-1">総会 電子投票</div>
          <h1 className="text-xl font-bold leading-tight">{condo.name}</h1>
          <p className="text-blue-200 text-sm mt-1">令和{new Date().getFullYear() - 2018}年度 通常総会</p>
        </div>

        {/* 本人確認情報 */}
        <div className="px-6 py-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="text-xs text-blue-500 font-medium mb-3 flex items-center gap-1">
              🔒 本人確認情報
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">部屋番号</span>
                <span className="font-bold text-2xl text-slate-800">{unit.roomNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">氏名</span>
                <span className="font-medium text-slate-700">{unit.ownerName || "区分所有者様"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">議決権数</span>
                <span className="font-medium text-slate-700">{unit.votingRights} 口</span>
              </div>
            </div>
          </div>

          <div className="text-sm text-slate-600 mb-6 leading-relaxed">
            上記の内容が正しいことをご確認の上、「間違いありません」ボタンを押して投票を開始してください。
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 text-xs text-amber-700">
            ⚠️ 投票は一度のみ有効です。送信後は変更できません。
          </div>

          <button
            onClick={() => router.push(`/vote/${token}/ballot`)}
            className="w-full py-4 bg-blue-700 text-white rounded-xl font-bold text-lg hover:bg-blue-800 active:scale-95 transition-all shadow-lg"
          >
            間違いありません　→
          </button>

          <p className="text-center text-xs text-slate-400 mt-4">
            情報が間違っている場合は管理会社にご連絡ください
          </p>
        </div>
      </div>
    </div>
  );
}
