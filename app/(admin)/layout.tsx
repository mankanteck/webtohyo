"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, deleteUser } from "aws-amplify/auth";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: "📊" },
  { href: "/import", label: "データ管理", icon: "📥" },
  { href: "/proxy", label: "代理入力", icon: "📝" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

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
              onClick={async () => {
                if (!window.confirm("アカウントを削除しますか？この操作は取り消せません。")) return;
                try {
                  await deleteUser();
                  window.location.href = "/login";
                } catch (error) {
                  console.error("削除エラー:", error);
                  alert("アカウントの削除に失敗しました。");
                }
              }}
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
    </div>
  );
}
