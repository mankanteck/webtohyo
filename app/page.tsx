"use client";

import { Hub } from "aws-amplify/utils";
import { getCurrentUser } from "aws-amplify/auth";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // OAuthコールバック完了を待機してからリダイレクト
    const unsubscribe = Hub.listen("auth", ({ payload }) => {
      if (payload.event === "signedIn") {
        router.replace("/dashboard");
      }
    });

    // すでに認証済みの場合は即リダイレクト
    getCurrentUser()
      .then(() => router.replace("/dashboard"))
      .catch(() => router.replace("/login"));

    return unsubscribe;
  }, [router]);

  return null;
}
