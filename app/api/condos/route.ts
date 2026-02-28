import { NextResponse } from "next/server";
import { condoStore } from "@/lib/dynamodb";

export async function GET() {
  const condos = await condoStore.getAll();
  condos.sort((a, b) => a.name.localeCompare(b.name, "ja"));
  return NextResponse.json(condos);
}
