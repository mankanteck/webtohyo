import { NextRequest, NextResponse } from "next/server";
import { condoStore } from "@/lib/dynamodb";
import { getUserSub } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const userId = await getUserSub(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [myCondos, demoCondos] = await Promise.all([
    condoStore.getByOwnerUserId(userId),
    condoStore.getDemoCondos(),
  ]);

  const myIds = new Set(myCondos.map((c) => c.id));
  const combined = [...myCondos, ...demoCondos.filter((c) => !myIds.has(c.id))];
  combined.sort((a, b) => a.name.localeCompare(b.name, "ja"));

  return NextResponse.json(combined);
}
