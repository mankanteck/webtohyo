"use client";

import { Hub } from "aws-amplify/utils";
import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // signedIn イベントを先に登録（OAuth完了を取りこぼさないように）
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") {
        router.replace("/dashboard");
      }
    });

    // 認証済みなら dashboard へ、未認証なら login へ（常に）
    // OAuthが進行中でも一旦 /login へ行き、そこで signedIn を待つ
    getCurrentUser()
      .then(() => router.replace("/dashboard"))
      .catch(() => router.replace("/login"));

    return unsubscribe;
  }, [router]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center">
      <p className="text-slate-400 text-sm">読み込み中...</p>
    </div>
  );
}
