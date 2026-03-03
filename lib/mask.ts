/**
 * 氏名マスク
 *
 * 環境変数 MASK_NAMES=true のとき、姓は残して名をマスクする。
 * 例: "田中 太郎" → "田中 ●●"
 *     "山田花子"  → "山田●●"
 *     ""          → ""
 *
 * 本番化時は Amplify コンソールで MASK_NAMES を false または削除する。
 */
export function maskName(name: string): string {
  if (process.env.MASK_NAMES !== "true") return name;
  if (!name) return name;

  const spaceIdx = name.search(/[\s　]/);
  if (spaceIdx !== -1) {
    // 姓 + 空白 + ●● に変換
    return name.slice(0, spaceIdx) + name[spaceIdx] + "●●";
  }
  // スペースなし: 先頭2文字を姓とみなして残りをマスク
  return name.slice(0, 2) + "●●";
}
