"use client";

import { useState, useRef, useEffect } from "react";
import Papa from "papaparse";

// ── 型定義 ──────────────────────────────────────────────────────────────────

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

interface Condo {
  id: string;
  name: string;
  condoCd: string;
  totalUnits: number;
  totalVotingRights: number;
  isDemo?: boolean;
}

interface Agenda {
  id: string;
  condoId: string;
  order: number;
  title: string;
  resolutionType: "ORDINARY" | "SPECIAL";
}

interface Unit {
  id: string;
  condoId: string;
  roomNo: string;
  ownerName: string;
  votingRights: number;
  isVoted: boolean;
}

// ── メインコンポーネント ────────────────────────────────────────────────────

export default function ImportPage() {
  const [activeTab, setActiveTab] = useState<"import" | "manage">("import");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">データ管理</h1>

      {/* タブ */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("import")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "import"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          新規インポート
        </button>
        <button
          onClick={() => setActiveTab("manage")}
          className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "manage"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          既存データ管理
        </button>
      </div>

      {activeTab === "import" ? <ImportTab /> : <ManageTab />}
    </div>
  );
}

// ── インポートタブ ─────────────────────────────────────────────────────────

function ImportTab() {
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
      prev.map((a, idx) => (idx === i ? { ...a, [field]: value } : a))
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
        body: JSON.stringify({ condoName, condoCd, csvData: csvRows, agendas: validAgendas }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      if (!res.ok) {
        throw new Error(data.detail || data.error || `サーバーエラー (${res.status})`);
      }
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

  if (result) {
    return (
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
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={downloadSample}
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          📄 サンプルCSVダウンロード
        </button>
      </div>

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
              <div className="text-xs text-slate-400 mt-1">列: roomNo, ownerName, votingRights</div>
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
              <span className="text-sm text-slate-500 w-8 shrink-0 text-right">第{i + 1}号</span>
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
                <button onClick={() => removeAgenda(i)} className="text-red-400 hover:text-red-600 px-2">
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
  );
}

// ── 既存データ管理タブ ────────────────────────────────────────────────────

function ManageTab() {
  const [condos, setCondos] = useState<Condo[]>([]);
  const [selectedCondoId, setSelectedCondoId] = useState("");
  const [agendaList, setAgendaList] = useState<Agenda[]>([]);
  const [unitList, setUnitList] = useState<Unit[]>([]);
  const [editingAgendaId, setEditingAgendaId] = useState<string | null>(null);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [showAddAgenda, setShowAddAgenda] = useState(false);
  const [showAddUnit, setShowAddUnit] = useState(false);

  // 議案編集フォームの一時値
  const [agendaEditValues, setAgendaEditValues] = useState<{ title: string; resolutionType: string }>({
    title: "",
    resolutionType: "ORDINARY",
  });

  // 部屋編集フォームの一時値
  const [unitEditValues, setUnitEditValues] = useState<{ roomNo: string; ownerName: string; votingRights: string }>({
    roomNo: "",
    ownerName: "",
    votingRights: "1",
  });

  // 議案追加フォーム
  const [newAgenda, setNewAgenda] = useState<{ title: string; resolutionType: string }>({
    title: "",
    resolutionType: "ORDINARY",
  });

  // 部屋追加フォーム
  const [newUnit, setNewUnit] = useState<{ roomNo: string; ownerName: string; votingRights: string }>({
    roomNo: "",
    ownerName: "",
    votingRights: "1",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // マンション一覧取得
  useEffect(() => {
    fetch("/api/condos")
      .then((r) => r.json())
      .then(setCondos)
      .catch(() => setError("マンション一覧の取得に失敗しました"));
  }, []);

  // マンション選択時に議案・部屋を取得
  useEffect(() => {
    if (!selectedCondoId) {
      setAgendaList([]);
      setUnitList([]);
      return;
    }
    loadAgendas();
    loadUnits();
  }, [selectedCondoId]);

  const loadAgendas = async () => {
    const res = await fetch(`/api/agendas?condoId=${selectedCondoId}`);
    const data = await res.json();
    setAgendaList(data);
  };

  const loadUnits = async () => {
    const res = await fetch(`/api/units?condoId=${selectedCondoId}`);
    const data = await res.json();
    setUnitList(data.sort((a: Unit, b: Unit) => a.roomNo.localeCompare(b.roomNo, "ja")));
  };

  // ── 議案操作 ──────────────────────────────────────────────────────────────

  const startEditAgenda = (agenda: Agenda) => {
    setEditingAgendaId(agenda.id);
    setAgendaEditValues({ title: agenda.title, resolutionType: agenda.resolutionType });
  };

  const saveAgenda = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/agendas", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...agendaEditValues }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      await loadAgendas();
      setEditingAgendaId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const deleteAgenda = async (id: string) => {
    if (!window.confirm("この議案を削除しますか？")) return;
    try {
      const res = await fetch(`/api/agendas?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      await loadAgendas();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const addAgenda = async () => {
    if (!newAgenda.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/agendas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condoId: selectedCondoId,
          order: agendaList.length + 1,
          title: newAgenda.title,
          resolutionType: newAgenda.resolutionType,
        }),
      });
      if (!res.ok) throw new Error("追加に失敗しました");
      await loadAgendas();
      setShowAddAgenda(false);
      setNewAgenda({ title: "", resolutionType: "ORDINARY" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  // ── 部屋操作 ──────────────────────────────────────────────────────────────

  const startEditUnit = (unit: Unit) => {
    setEditingUnitId(unit.id);
    setUnitEditValues({
      roomNo: unit.roomNo,
      ownerName: unit.ownerName,
      votingRights: String(unit.votingRights),
    });
  };

  const saveUnit = async (id: string) => {
    setSaving(true);
    try {
      const res = await fetch("/api/units", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, ...unitEditValues, votingRights: Number(unitEditValues.votingRights) }),
      });
      if (!res.ok) throw new Error("保存に失敗しました");
      await loadUnits();
      setEditingUnitId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const deleteUnit = async (unit: Unit) => {
    const msg = unit.isVoted
      ? `部屋 ${unit.roomNo} はすでに投票済みです。削除してもよいですか？`
      : `部屋 ${unit.roomNo} を削除しますか？`;
    if (!window.confirm(msg)) return;
    try {
      const res = await fetch(`/api/units?id=${unit.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("削除に失敗しました");
      await loadUnits();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    }
  };

  const addUnit = async () => {
    if (!newUnit.roomNo.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/units", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condoId: selectedCondoId,
          roomNo: newUnit.roomNo,
          ownerName: newUnit.ownerName,
          votingRights: Number(newUnit.votingRights) || 1,
        }),
      });
      if (!res.ok) throw new Error("追加に失敗しました");
      await loadUnits();
      setShowAddUnit(false);
      setNewUnit({ roomNo: "", ownerName: "", votingRights: "1" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "border border-slate-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  const selectedCondo = condos.find((c) => c.id === selectedCondoId);
  const isDemo = selectedCondo?.isDemo === true;

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}

      {/* マンション選択 */}
      <div className="bg-white rounded-xl p-5 shadow">
        <label className="block text-sm font-medium text-slate-700 mb-2">マンション選択</label>
        <select
          value={selectedCondoId}
          onChange={(e) => setSelectedCondoId(e.target.value)}
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">-- マンションを選択 --</option>
          {condos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.isDemo ? "[サンプル] " : ""}{c.name}（{c.condoCd}）
            </option>
          ))}
        </select>
      </div>

      {/* デモバナー */}
      {isDemo && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎭</span>
          <div>
            <div className="font-bold text-amber-800">サンプルデータを表示中</div>
            <div className="text-sm text-amber-700">このマンションはデモ用サンプルです。編集・削除はできません。</div>
          </div>
        </div>
      )}

      {selectedCondoId && (
        <>
          {/* 議案管理 */}
          <div className="bg-white rounded-xl p-5 shadow">
            <h2 className="font-bold text-slate-800 mb-4">議案管理</h2>
            <div className="space-y-2">
              {agendaList.map((agenda, i) => (
                <div key={agenda.id} className="border border-slate-100 rounded-lg p-3">
                  {editingAgendaId === agenda.id ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm text-slate-500 shrink-0">第{i + 1}号</span>
                      <input
                        type="text"
                        value={agendaEditValues.title}
                        onChange={(e) => setAgendaEditValues((v) => ({ ...v, title: e.target.value }))}
                        className={`flex-1 min-w-0 ${inputCls}`}
                      />
                      <select
                        value={agendaEditValues.resolutionType}
                        onChange={(e) => setAgendaEditValues((v) => ({ ...v, resolutionType: e.target.value }))}
                        className={inputCls}
                      >
                        <option value="ORDINARY">普通決議</option>
                        <option value="SPECIAL">特別決議</option>
                      </select>
                      <button
                        onClick={() => saveAgenda(agenda.id)}
                        disabled={saving}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                      >
                        保存
                      </button>
                      <button
                        onClick={() => setEditingAgendaId(null)}
                        className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200"
                      >
                        キャンセル
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-500 shrink-0 w-12">第{i + 1}号</span>
                      <span className="flex-1 text-sm text-slate-800">{agenda.title}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        {agenda.resolutionType === "ORDINARY" ? "普通決議" : "特別決議"}
                      </span>
                      {!isDemo && (
                        <>
                          <button
                            onClick={() => startEditAgenda(agenda)}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => deleteAgenda(agenda.id)}
                            className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                          >
                            削除
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {agendaList.length === 0 && !showAddAgenda && (
                <p className="text-sm text-slate-400 text-center py-4">議案がありません</p>
              )}

              {!isDemo && (showAddAgenda ? (
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-slate-500 shrink-0">第{agendaList.length + 1}号</span>
                    <input
                      type="text"
                      value={newAgenda.title}
                      onChange={(e) => setNewAgenda((v) => ({ ...v, title: e.target.value }))}
                      placeholder="議案タイトルを入力"
                      className={`flex-1 min-w-0 ${inputCls}`}
                    />
                    <select
                      value={newAgenda.resolutionType}
                      onChange={(e) => setNewAgenda((v) => ({ ...v, resolutionType: e.target.value }))}
                      className={inputCls}
                    >
                      <option value="ORDINARY">普通決議</option>
                      <option value="SPECIAL">特別決議</option>
                    </select>
                    <button
                      onClick={addAgenda}
                      disabled={saving || !newAgenda.title.trim()}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                    >
                      追加
                    </button>
                    <button
                      onClick={() => { setShowAddAgenda(false); setNewAgenda({ title: "", resolutionType: "ORDINARY" }); }}
                      className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddAgenda(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                >
                  + 議案を追加
                </button>
              ))}
            </div>
          </div>

          {/* 部屋管理 */}
          <div className="bg-white rounded-xl p-5 shadow">
            <h2 className="font-bold text-slate-800 mb-4">部屋管理</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs">
                    <th className="text-left p-2">部屋番号</th>
                    <th className="text-left p-2">氏名</th>
                    <th className="text-right p-2">議決権</th>
                    <th className="text-center p-2">投票</th>
                    <th className="text-right p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {unitList.map((unit) => (
                    <tr key={unit.id} className="border-b border-slate-100">
                      {editingUnitId === unit.id ? (
                        <>
                          <td className="p-2">
                            <input
                              type="text"
                              value={unitEditValues.roomNo}
                              onChange={(e) => setUnitEditValues((v) => ({ ...v, roomNo: e.target.value }))}
                              className={`w-20 ${inputCls}`}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={unitEditValues.ownerName}
                              onChange={(e) => setUnitEditValues((v) => ({ ...v, ownerName: e.target.value }))}
                              className={`w-32 ${inputCls}`}
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              value={unitEditValues.votingRights}
                              onChange={(e) => setUnitEditValues((v) => ({ ...v, votingRights: e.target.value }))}
                              className={`w-16 text-right ${inputCls}`}
                              step="0.5"
                              min="0"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <span className={`text-xs ${unit.isVoted ? "text-green-600" : "text-slate-400"}`}>
                              {unit.isVoted ? "済" : "未"}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => saveUnit(unit.id)}
                                disabled={saving}
                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => setEditingUnitId(null)}
                                className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200"
                              >
                                キャンセル
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2 font-medium">{unit.roomNo}</td>
                          <td className="p-2 text-slate-600">{unit.ownerName || "—"}</td>
                          <td className="p-2 text-right">{unit.votingRights}</td>
                          <td className="p-2 text-center">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${unit.isVoted ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
                              {unit.isVoted ? "済" : "未"}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {!isDemo && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => startEditUnit(unit)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50"
                                >
                                  編集
                                </button>
                                <button
                                  onClick={() => deleteUnit(unit)}
                                  className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50"
                                >
                                  削除
                                </button>
                              </div>
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  ))}

                  {unitList.length === 0 && !showAddUnit && (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-400 text-sm py-6">
                        部屋がありません
                      </td>
                    </tr>
                  )}

                  {showAddUnit && (
                    <tr className="bg-blue-50">
                      <td className="p-2">
                        <input
                          type="text"
                          value={newUnit.roomNo}
                          onChange={(e) => setNewUnit((v) => ({ ...v, roomNo: e.target.value }))}
                          placeholder="101"
                          className={`w-20 ${inputCls}`}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={newUnit.ownerName}
                          onChange={(e) => setNewUnit((v) => ({ ...v, ownerName: e.target.value }))}
                          placeholder="氏名"
                          className={`w-32 ${inputCls}`}
                        />
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          value={newUnit.votingRights}
                          onChange={(e) => setNewUnit((v) => ({ ...v, votingRights: e.target.value }))}
                          className={`w-16 text-right ${inputCls}`}
                          step="0.5"
                          min="0"
                        />
                      </td>
                      <td className="p-2"></td>
                      <td className="p-2 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={addUnit}
                            disabled={saving || !newUnit.roomNo.trim()}
                            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                          >
                            追加
                          </button>
                          <button
                            onClick={() => { setShowAddUnit(false); setNewUnit({ roomNo: "", ownerName: "", votingRights: "1" }); }}
                            className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs hover:bg-slate-200"
                          >
                            キャンセル
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {!isDemo && !showAddUnit && (
              <button
                onClick={() => setShowAddUnit(true)}
                className="mt-3 text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                + 部屋を追加
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
