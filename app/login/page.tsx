"use client";

import { Authenticator, useAuthenticator } from "@aws-amplify/ui-react";
import "@aws-amplify/ui-react/styles.css";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

function LoginContent() {
  const router = useRouter();
  const { authStatus } = useAuthenticator();

  useEffect(() => {
    if (authStatus === "authenticated") {
      router.push("/dashboard");
    }
  }, [authStatus, router]);

  const services = {
    async validateCustomSignUp(formData: Record<string, string>) {
      const errors: Record<string, string> = {};
      if (formData.password && formData.password.length < 8) {
        errors.password = "パスワードは8文字以上で入力してください";
      }
      return errors;
    },
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center gap-6">
      <div className="text-center">
        <div className="text-5xl mb-2">🏢</div>
        <h1 className="text-xl font-bold text-slate-800">マンション総会</h1>
        <p className="text-sm text-slate-500">電子投票管理システム</p>
      </div>
      <Authenticator socialProviders={["google"]} services={services} />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Authenticator.Provider>
      <LoginContent />
    </Authenticator.Provider>
  );
}
