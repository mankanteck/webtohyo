import { NextResponse } from "next/server";

/** 一時的なデバッグエンドポイント（確認後削除する） */
export async function GET() {
  return NextResponse.json({
    MASK_NAMES: process.env.MASK_NAMES,
    NODE_ENV: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
}
