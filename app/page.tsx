"use client";

import { Hub } from "aws-amplify/utils";
import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // ?code=&state= がある場合はOAuthコールバック → getCurrentUserは呼ばず Hub経由で待機
    const params = new URLSearchParams(window.location.search);
    const isOAuthCallback = params.has("code") && params.has("state");

    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") {
        router.replace("/dashboard");
      }
      if (payload.event === "signInWithRedirect_failure") {
        router.replace("/login");
      }
    });

    if (!isOAuthCallback) {
      // 通常アクセス: 認証済みなら dashboard、未認証なら login へ
      getCurrentUser()
        .then(() => router.replace("/dashboard"))
        .catch(() => router.replace("/login"));
    }

    return unsubscribe;
  }, [router]);

  return null;
}
