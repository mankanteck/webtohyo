"use client";

import { Amplify } from "aws-amplify";
import { I18n } from "aws-amplify/utils";
import { translations } from "@aws-amplify/ui-react";
import outputs from "@/amplify_outputs.json";

Amplify.configure(outputs, { ssr: true });
I18n.putVocabularies(translations);
I18n.setLanguage("ja");

export default function AmplifyProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
