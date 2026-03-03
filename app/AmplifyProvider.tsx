"use client";

import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import outputs from "@/amplify_outputs.json";

Amplify.configure(outputs, { ssr: true });
I18n.putVocabularies(translations);
I18n.putVocabularies({
  ja: {
    // ログイン画面
    "Sign In": "ログイン",
    "Sign Up": "新規登録",
    "Sign Out": "ログアウト",
    "Sign in": "ログイン",
    "Create Account": "アカウント作成",
    "Email": "メールアドレス",
    "Password": "パスワード",
    "Confirm Password": "パスワード（確認）",
    "Enter your email": "メールアドレスを入力",
    "Enter your password": "パスワードを入力",
    "Please confirm your Password": "パスワードを再入力",
    "Forgot your password?": "パスワードをお忘れですか？",
    "Reset Password": "パスワードをリセット",
    "Send code": "コードを送信",
    "Back to Sign In": "ログインに戻る",
    "Confirmation Code": "確認コード",
    "Enter your code": "確認コードを入力",
    "Confirm": "確認",
    "Submit": "送信",
    "Or": "または",
    "Sign in with Google": "Googleでログイン",
    "Sign In with Google": "Googleでログイン",
    "Sign Up with Google": "Googleで登録",
    "New Password": "新しいパスワード",
    "We Emailed You": "確認メールを送信しました",
    "Your code is on the way. To log in, enter the code we emailed to": "確認コードを送信しました。次のアドレスに届いたコードを入力してください：",
    "It may take a minute to arrive.": "届くまで少し時間がかかる場合があります。",
    // パスワードバリデーション（条件は8文字以上のみ）
    "Password must have at least 8 characters": "パスワードは8文字以上で入力してください",
    "Password must have special characters": "パスワードは8文字以上で入力してください",
    "Password must have upper case characters": "パスワードは8文字以上で入力してください",
    "Password must have lower case characters": "パスワードは8文字以上で入力してください",
    "Password must have numbers": "パスワードは8文字以上で入力してください",
    "Password did not conform with policy: Password must have symbol characters": "パスワードは8文字以上で入力してください",
    "Password did not conform with policy: Password must have uppercase characters": "パスワードは8文字以上で入力してください",
    "Password did not conform with policy: Password must have lowercase characters": "パスワードは8文字以上で入力してください",
    "Password did not conform with policy: Password must have numeric characters": "パスワードは8文字以上で入力してください",
    // エラーメッセージ
    "User already exists": "このメールアドレスはすでに登録されています",
    "An account with the given email already exists.": "このメールアドレスはすでに登録されています",
    "Incorrect username or password.": "メールアドレスまたはパスワードが正しくありません",
    "User does not exist.": "ユーザーが存在しません",
    "Invalid verification code provided, please try again.": "認証コードが正しくありません。再度お試しください",
    "Cannot reset password for the user as there is no registered/verified email or phone_number":
      "認証済みのメールアドレスがないため、再設定できません",
    "Your passwords must match": "パスワードが一致しません",
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
