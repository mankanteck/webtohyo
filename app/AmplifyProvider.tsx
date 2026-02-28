"use client";

import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import outputs from "@/amplify_outputs.json";

Amplify.configure(outputs, { ssr: true });
I18n.putVocabularies(translations);
I18n.putVocabularies({
  ja: {
    // パスワードバリデーション
    "Password must have special characters": "パスワードには特殊文字を含める必要があります",
    "Password must have upper case characters": "パスワードには大文字を含める必要があります",
    "Password must have lower case characters": "パスワードには小文字を含める必要があります",
    "Password must have at least 8 characters": "パスワードは8文字以上である必要があります",
    "Password must have numbers": "パスワードには数字を含める必要があります",
    // サインイン・サインアップ
    "User already exists": "既にユーザーが存在しています",
    "Incorrect username or password.": "メールアドレスまたはパスワードが正しくありません",
    "User does not exist.": "ユーザーが存在しません",
    // 認証コード・パスワードリセット
    "Invalid verification code provided, please try again.": "認証コードが正しくありません。再度お試しください",
    "Cannot reset password for the user as there is no registered/verified email or phone_number":
      "認証済みのメールアドレスがないため、再設定できません",
  },
});
I18n.setLanguage("ja");

export default function AmplifyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
