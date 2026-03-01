"use client";

import { Hub } from "aws-amplify/utils";
import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const isOAuthCallback = params.has("code") && params.has("state");

    // Hubリスナーを先に登録（signedInイベントを見逃さないために）
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") {
        router.replace("/dashboard");
      }
      if (payload.event === "signInWithRedirect_failure") {
        router.replace("/login");
      }
    });

    // Hubリスナー登録後にgetCurrentUserを呼ぶ
    // → OAuth完了がuseEffect実行より先だった場合でもここで捕捉できる
    getCurrentUser()
      .then(() => router.replace("/dashboard"))
      .catch(() => {
        // OAuthコールバック中は認証完了を待つ（Hubイベントに任せる）
        // 通常アクセスで未認証ならloginへ
        if (!isOAuthCallback) {
          router.replace("/login");
        }
      });

    return unsubscribe;
  }, [router]);

  return null;
}
