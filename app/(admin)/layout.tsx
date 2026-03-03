"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, deleteUser } from "aws-amplify/auth";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
  { href: "/import", label: "データ管理", icon: "📥" },
  { href: "/proxy", label: "代理入力", icon: "📝" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteAccount = async () => {
    setDeleting(true);
    setDeleteError("");
    try {
      // 先にDynamoDBの全データを削除
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error("データの削除に失敗しました");

      // Cognitoアカウントを削除
      await deleteUser();
      window.location.href = "/login";
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "削除に失敗しました");
      setDeleting(false);
    }
  };

  const closeModal = () => {
    setShowDeleteModal(false);
    setConfirmText("");
    setDeleteError("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🏢</span>
            <div>
              <div className="font-bold text-lg leading-tight">マンション総会</div>
              <div className="text-blue-200 text-xs">電子投票管理システム</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-white text-blue-900"
                      : "text-blue-100 hover:bg-blue-800"
                  }`}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-800 hover:text-white transition-colors"
            >
              アカウント削除
            </button>
            <button
              onClick={async () => {
                await signOut();
                window.location.href = "/login";
              }}
              className="ml-2 px-3 py-2 rounded-lg text-sm font-medium text-blue-200 hover:bg-blue-800 hover:text-white transition-colors"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="max-w-7xl mx-auto px-4 py-6">{children}</main>

      {/* アカウント削除モーダル */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
            {/* モーダルヘッダー */}
            <div className="bg-red-600 px-6 py-4">
              <h2 className="text-white font-bold text-lg">⚠️ アカウント削除の確認</h2>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 警告メッセージ */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-red-800 font-bold text-sm">以下のデータがすべて削除されます：</p>
                <ul className="text-red-700 text-sm space-y-1 list-disc list-inside">
                  <li>登録したマンション情報</li>
                  <li>部屋・所有者データ</li>
                  <li>議案データ</li>
                  <li>投票データ（WEB・紙回答）</li>
                </ul>
                <p className="text-red-800 font-bold text-sm mt-2">この操作は取り消せません。</p>
              </div>

              {/* 確認入力 */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  確認のため <span className="font-bold text-red-600">「削除」</span> と入力してください
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="削除"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  disabled={deleting}
                />
              </div>

              {/* エラー */}
              {deleteError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                  ⚠️ {deleteError}
                </div>
              )}

              {/* ボタン */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={closeModal}
                  disabled={deleting}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 disabled:opacity-50"
                >
                  キャンセル
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={confirmText !== "削除" || deleting}
                  className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deleting ? "⏳ 削除中..." : "アカウントを削除する"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
