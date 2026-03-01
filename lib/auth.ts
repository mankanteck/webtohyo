import { fetchAuthSession } from "aws-amplify/auth/server";
import { createServerRunner } from "@aws-amplify/adapter-nextjs";
import { NextRequest, NextResponse } from "next/server";
import outputs from "@/amplify_outputs.json";
import { condoStore, type Condo } from "@/lib/dynamodb";

const { runWithAmplifyServerContext } = createServerRunner({ config: outputs });

/** Cognito userSub を取得（未認証は null） */
export async function getUserSub(request: NextRequest): Promise<string | null> {
  try {
    return await runWithAmplifyServerContext({
      nextServerContext: { request, response: new NextResponse() },
      operation: async (contextSpec) => {
        const { tokens } = await fetchAuthSession(contextSpec, { forceRefresh: false });
        const sub = tokens?.idToken?.payload?.sub;
        return typeof sub === "string" ? sub : null;
      },
    });
  } catch {
    return null;
  }
}

export type AuthorizeCondoResult =
  | { authorized: true; condo: Condo; isDemo: false }
  | { authorized: true; condo: Condo; isDemo: true }
  | { authorized: false; status: 401 | 403 | 404 };

/** condoId の所有者が自分か、デモか検証する */
export async function authorizeCondoAccess(
  request: NextRequest,
  condoId: string
): Promise<AuthorizeCondoResult> {
  const userId = await getUserSub(request);
  if (!userId) return { authorized: false, status: 401 };

  const condo = await condoStore.getById(condoId);
  if (!condo) return { authorized: false, status: 404 };

  if (condo.ownerUserId === userId) return { authorized: true, condo, isDemo: false };
  if (condo.isDemo) return { authorized: true, condo, isDemo: true };

  return { authorized: false, status: 403 };
}
