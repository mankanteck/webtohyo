"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";

interface AgendaInput {
  title: string;
  resolutionType: "ORDINARY" | "SPECIAL";
}

interface CsvRow {
  roomNo: string;
  ownerName: string;
  votingRights: number;
}

interface ImportResult {
  condo: { id: string; name: string; condoCd: string };
  unitsCreated: number;
  agendasCreated: number;
}

export default function ImportPage() {
  const [condoName, setCondoName] = useState("");
  const [condoCd, setCondoCd] = useState("");
  const [csvRows, setCsvRows] = useState<CsvRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [agendas, setAgendas] = useState<AgendaInput[]>([
    { title: "", resolutionType: "ORDINARY" },
  ]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = (result.data as Record<string, string>[]).map((row) => ({
          roomNo: String(row["roomNo"] || row["部屋番号"] || row["room_no"] || ""),
          ownerName: String(row["ownerName"] || row["氏名"] || row["owner_name"] || ""),
          votingRights: Number(row["votingRights"] || row["議決権"] || row["voting_rights"] || 1),
        }));
        setCsvRows(rows.filter((r) => r.roomNo));
      },
    });
  };

  const addAgenda = () => {
    setAgendas((prev) => [...prev, { title: "", resolutionType: "ORDINARY" }]);
  };

  const removeAgenda = (i: number) => {
    setAgendas((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateAgenda = (i: number, field: keyof AgendaInput, value: string) => {
    setAgendas((prev) =>
      prev.map((a, idx) =>
        idx === i ? { ...a, [field]: value } : a
      )
    );
  };

  const handleImport = async () => {
    setError("");
    if (!condoName || !condoCd) {
      setError("マンション名とコードを入力してください");
      return;
    }
    if (csvRows.length === 0) {
      setError("CSVファイルをアップロードしてください");
      return;
    }
    const validAgendas = agendas.filter((a) => a.title.trim());
    if (validAgendas.length === 0) {
      setError("少なくとも1つの議案を入力してください");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condoName,
          condoCd,
          csvData: csvRows,
          agendas: validAgendas,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "インポートに失敗しました");
      }
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const downloadSample = () => {
    const csv = `roomNo,ownerName,votingRights
101,田中 太郎,1
102,鈴木 花子,1
103,佐藤 次郎,1.5
201,山田 三郎,1
202,伊藤 四郎,1`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sample_units.csv";
    a.click();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">データ管理</h1>
        <button
          onClick={downloadSample}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          📄 サンプルCSVダウンロード
        </button>
      </div>

      {result ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="text-green-800 font-bold text-lg mb-2">✅ インポート完了</div>
          <div className="space-y-1 text-green-700 text-sm">
            <p>マンション名: <strong>{result.condo.name}</strong></p>
            <p>コード: {result.condo.condoCd}</p>
            <p>登録部屋数: <strong>{result.unitsCreated} 戸</strong></p>
            <p>登録議案数: <strong>{result.agendasCreated} 件</strong></p>
          </div>
          <div className="mt-4 flex gap-3">
            <a
              href="/dashboard"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              ダッシュボードへ →
            </a>
            <button
              onClick={() => {
                setResult(null);
                setCsvRows([]);
                setFileName("");
                setCondoName("");
                setCondoCd("");
                setAgendas([{ title: "", resolutionType: "ORDINARY" }]);
              }}
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              再インポート
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* マンション情報 */}
          <div className="bg-white rounded-xl p-5 shadow">
            <h2 className="font-bold text-slate-800 mb-4">① マンション情報</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-600 mb-1">マンション名 *</label>
                <input
                  type="text"
                  value={condoName}
                  onChange={(e) => setCondoName(e.target.value)}
                  placeholder="〇〇マンション"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-600 mb-1">管理コード *</label>
                <input
                  type="text"
                  value={condoCd}
                  onChange={(e) => setCondoCd(e.target.value)}
                  placeholder="MN-001"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* CSV アップロード */}
          <div className="bg-white rounded-xl p-5 shadow">
            <h2 className="font-bold text-slate-800 mb-4">② 部屋情報CSVアップロード</h2>
            <div
              className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="text-4xl mb-2">📂</div>
              {fileName ? (
                <>
                  <div className="font-medium text-blue-600">{fileName}</div>
                  <div className="text-sm text-slate-500 mt-1">{csvRows.length} 行読み込み済み</div>
                </>
              ) : (
                <>
                  <div className="text-slate-500">CSVファイルをクリックして選択</div>
                  <div className="text-xs text-slate-400 mt-1">
                    列: roomNo, ownerName, votingRights
                  </div>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFile}
                className="hidden"
              />
            </div>

            {csvRows.length > 0 && (
              <div className="mt-4 max-h-48 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500">
                      <th className="text-left p-2">部屋番号</th>
                      <th className="text-left p-2">氏名</th>
                      <th className="text-left p-2">議決権</th>
                    </tr>
                  </thead>
                  <tbody>
                    {csvRows.slice(0, 10).map((row, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        <td className="p-2">{row.roomNo}</td>
                        <td className="p-2">{row.ownerName || "—"}</td>
                        <td className="p-2">{row.votingRights}</td>
                      </tr>
                    ))}
                    {csvRows.length > 10 && (
                      <tr>
                        <td colSpan={3} className="p-2 text-slate-400 text-center">
                          ...他 {csvRows.length - 10} 件
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 議案設定 */}
          <div className="bg-white rounded-xl p-5 shadow">
            <h2 className="font-bold text-slate-800 mb-4">③ 議案設定</h2>
            <div className="space-y-3">
              {agendas.map((agenda, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-slate-500 w-8 shrink-0 text-right">
                    第{i + 1}号
                  </span>
                  <input
                    type="text"
                    value={agenda.title}
                    onChange={(e) => updateAgenda(i, "title", e.target.value)}
                    placeholder="議案タイトルを入力"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={agenda.resolutionType}
                    onChange={(e) => updateAgenda(i, "resolutionType", e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ORDINARY">普通決議</option>
                    <option value="SPECIAL">特別決議</option>
                  </select>
                  {agendas.length > 1 && (
                    <button
                      onClick={() => removeAgenda(i)}
                      className="text-red-400 hover:text-red-600 px-2"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addAgenda}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                + 議案を追加
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              ⚠️ {error}
            </div>
          )}

          <button
            onClick={handleImport}
            disabled={loading}
            className="w-full py-3 bg-blue-700 text-white rounded-xl font-bold text-base hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "⏳ インポート中..." : "📥 インポート実行"}
          </button>
        </div>
      )}
    </div>
  );
}
