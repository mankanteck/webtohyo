# webtohyo システム詳細仕様書

**作成日**: 2026-02-27
**バージョン**: 1.0

---

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| **プロジェクト名** | webtohyo（マンション総会 電子投票システム） |
| **タイプ** | Next.js 16 (TypeScript + React 19) フルスタックWebアプリ |
| **言語** | 日本語 |
| **ホスティング** | AWS Amplify (Lambda + DynamoDB) |
| **リポジトリ** | `/home/kita/webtohyo/web` |

### システム目的

マンション管理組合の総会における電子投票を実現するシステム。区分所有者へQRコード付きURLを配布し、スマートフォン等からWeb投票を行う。紙回答の代理入力にも対応。

---

## 2. ディレクトリ構造

```
/home/kita/webtohyo/web/
├── app/                          # Next.js App Router
│   ├── (admin)/                  # 管理画面グループ
│   │   ├── dashboard/            # ダッシュボード
│   │   ├── import/               # データインポート
│   │   ├── proxy/                # 代理投票入力
│   │   └── layout.tsx            # 管理画面共通レイアウト
│   ├── api/                      # API Routes
│   │   ├── units/                # 部屋情報 CRUD
│   │   ├── votes/                # 投票 CRUD
│   │   ├── agendas/              # 議案 CRUD
│   │   ├── stats/                # 統計情報
│   │   ├── import/               # CSV一括インポート
│   │   └── pdf-data/             # PDF生成用データ
│   ├── vote/[token]/             # 投票ページ（トークンベース）
│   │   ├── page.tsx              # 本人確認
│   │   ├── ballot/               # 投票用紙
│   │   └── done/                 # 完了画面
│   ├── layout.tsx                # ルートレイアウト
│   ├── page.tsx                  # リダイレクト（→/dashboard）
│   └── globals.css               # グローバルスタイル
├── components/                   # React コンポーネント
│   ├── admin/
│   └── vote/
├── lib/                          # ユーティリティ
│   ├── dynamodb.ts               # DynamoDB データストア（本番）
│   ├── store.ts                  # ローカルJSON ストア（開発用）
│   └── pdf.ts                    # PDF生成
├── data/                         # サンプルデータ（開発用）
│   ├── condos.json
│   ├── units.json
│   ├── agendas.json
│   └── votes.json
├── infrastructure/
│   └── dynamodb.yaml             # CloudFormation テンプレート
├── amplify/                      # AWS Amplify 設定
├── public/                       # 静的アセット
├── package.json
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
└── eslint.config.mjs
```

---

## 3. 技術スタック

| カテゴリ | 技術 | バージョン |
|---------|------|----------|
| フロントエンド | React | 19.2.3 |
| フレームワーク | Next.js | 16.1.6 |
| 言語 | TypeScript | ^5 |
| スタイリング | Tailwind CSS | ^4 |
| グラフ | Recharts | ^3.7.0 |
| PDF生成 | html2canvas + jsPDF | 1.4.1 / ^4.2.0 |
| QRコード | qrcode | ^1.5.4 |
| CSV処理 | PapaParse | ^5.5.3 |
| ID生成 | nanoid | ^5.1.6 |
| データベース | AWS DynamoDB | SDK v3 |
| ホスティング | AWS Amplify | - |
| IaC | CloudFormation | - |
| Lint | ESLint | ^9 |

---

## 4. 依存関係（package.json）

### プロダクション依存

```json
{
  "@aws-sdk/client-dynamodb": "^3.995.0",
  "@aws-sdk/lib-dynamodb": "^3.995.0",
  "html2canvas": "^1.4.1",
  "jspdf": "^4.2.0",
  "nanoid": "^5.1.6",
  "next": "16.1.6",
  "papaparse": "^5.5.3",
  "qrcode": "^1.5.4",
  "react": "19.2.3",
  "react-dom": "19.2.3",
  "recharts": "^3.7.0"
}
```

### ビルドスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run start` | 本番サーバー起動 |
| `npm run lint` | ESLint 実行 |

---

## 5. ルーティング構造

### ページルート

| パス | ファイル | 説明 |
|------|---------|------|
| `/` | `app/page.tsx` | リダイレクト → `/dashboard` |
| `/dashboard` | `app/(admin)/dashboard/page.tsx` | 管理ダッシュボード |
| `/import` | `app/(admin)/import/page.tsx` | CSV インポート・議案設定 |
| `/proxy` | `app/(admin)/proxy/page.tsx` | 代理投票入力 |
| `/vote/[token]` | `app/vote/[token]/page.tsx` | 本人確認ページ |
| `/vote/[token]/ballot` | `app/vote/[token]/ballot/page.tsx` | 投票用紙 |
| `/vote/[token]/done` | `app/vote/[token]/done/page.tsx` | 完了画面 |

### レイアウトグループ

- `(admin)` - 管理画面：共通ヘッダー・ナビゲーション付き
- `vote` - 投票ページ：独立したレイアウト（シンプル）

---

## 6. API ルート仕様

### GET /api/units

```
クエリパラメータ:
  condoId?: string    // マンションID で絞り込み
  token?: string      // accessToken で1部屋取得

レスポンス:
  Unit[]
```

### POST /api/votes

```
Body: {
  unitId: string
  ballots: Array<{ agendaId: string, choice: "FOR"|"AGAINST"|"ABSTAIN", comment?: string }>
  votedSource: "WEB" | "PAPER"
  isProxyEntry: boolean
  inputBy?: string         // 代理入力の場合：入力者名
  forceOverwrite?: boolean // 既投票時の上書き許可
}

レスポンス:
  200 - 成功
  409 - 既投票（forceOverwrite=false の場合）
  500 - 書き込みエラー
```

**ロジック**:
1. `unit.isVoted` を確認（二重投票防止）
2. 既投票かつ `forceOverwrite=false` → 409 返却
3. Vote を一括保存（既存と同じ ID を再利用）
4. Unit を更新（`isVoted=true`, `votedAt`, `votedSource`）

### GET /api/agendas

```
クエリパラメータ:
  condoId?: string    // マンションID で絞り込み

レスポンス:
  Agenda[]
```

### POST /api/agendas

```
Body: { condoId, order, title, resolutionType }
```

### DELETE /api/agendas

```
クエリパラメータ:
  id: string          // 議案 ID
```

### GET /api/stats

```
クエリパラメータ:
  condoId: string

レスポンス: {
  condo: { id, name, condoCd }
  totalUnits: number
  votedCount: number
  webVotedCount: number
  paperVotedCount: number
  notVotedCount: number
  quorumTarget: number          // Math.ceil(units.length / 2)
  remaining: number             // 定足数まで残り
  totalVotingRights: number
  votedVotingRights: number
  quorumReached: boolean
  notVotedUnits: Unit[]
  allUnits: Unit[]
  agendaStats: Array<{
    agendaId, title, order, resolutionType
    FOR: number, AGAINST: number, ABSTAIN: number, total: number
  }>
}
```

### GET /api/pdf-data

```
クエリパラメータ:
  condoId: string

レスポンス: {
  condo: { id, name, condoCd }
  notVotedUnits: Unit[]
}
```

### POST /api/import

```
Body: {
  condoName: string
  condoCd: string
  csvData: Array<{ roomNo, ownerName, votingRights }>
  agendas: Array<{ title, resolutionType }>
}

レスポンス: {
  condo: Condo
  unitsCreated: number
  agendasCreated: number
}
```

**ロジック**:
1. Condo を作成/更新（`condoCd` で一意キー）
2. Unit を作成（`accessToken = {roomNo}-{nanoid(8)}`）
3. Agenda を作成（`order` は配列順）

---

## 7. データモデル・型定義

### Condo（マンション）

```typescript
interface Condo {
  id: string;               // nanoid()
  condoCd: string;          // 管理コード（一意）
  name: string;             // マンション名
  totalUnits: number;       // 総戸数
  totalVotingRights: number; // 総議決権数
  createdAt: string;        // ISO 8601
}
```

### Unit（部屋）

```typescript
interface Unit {
  id: string;               // nanoid()
  condoId: string;          // 親マンション ID
  roomNo: string;           // 部屋番号（例：101）
  ownerName: string;        // 所有者名
  votingRights: number;     // 議決権数（小数対応）
  accessToken: string;      // QRコード用トークン（{roomNo}-{nanoid(8)}）
  isVoted: boolean;         // 投票済みフラグ
  votedAt?: string;         // 投票時刻（ISO 8601）
  votedSource?: "WEB" | "PAPER"; // 投票方法
  createdAt: string;        // ISO 8601
}
```

### Agenda（議案）

```typescript
interface Agenda {
  id: string;               // nanoid()
  condoId: string;          // 親マンション ID
  order: number;            // 議案番号（1, 2, 3...）
  title: string;            // 議案タイトル
  resolutionType: "ORDINARY" | "SPECIAL"; // 普通/特別決議
  createdAt: string;        // ISO 8601
}
```

### Vote（投票結果）

```typescript
type VoteChoice = "FOR" | "AGAINST" | "ABSTAIN";

interface Vote {
  id: string;               // nanoid()
  unitId: string;           // 部屋 ID
  agendaId: string;         // 議案 ID
  choice: VoteChoice;       // 投票選択（賛成/反対/棄権）
  comment?: string;         // 備考（代理入力時）
  isProxyEntry: boolean;    // 代理入力フラグ
  inputBy?: string;         // 代理入力者名
  createdAt: string;        // ISO 8601
}
```

---

## 8. 認証・認可の仕組み

### 投票者向け（トークンベース認証）

- **方式**: URL パスパラメータに `accessToken` を含める
- **例**: `/vote/101-nIZo_blL`
- **トークン形式**: `{roomNo}-{nanoid(8)}`（インポート時に自動生成）
- **検証フロー**:
  1. `/api/units?token={token}` で該当 Unit を取得
  2. 見つからない → 404「URLが無効です」
  3. `unit.isVoted=true` → `/vote/{token}/done` へリダイレクト
  4. 正常 → 本人確認ページ表示

### 管理画面

現在、認証機構なし。全員がダッシュボード・インポート・代理入力にアクセス可能。

---

## 9. データベース設計（DynamoDB）

### テーブル一覧

#### webtohyo-condos-{Env}

| 属性 | 型 | キー |
|------|------|------|
| id | String | PK |
| condoCd | String | - |
| name | String | - |
| totalUnits | Number | - |
| totalVotingRights | Number | - |
| createdAt | String | - |

設定: PITR有効、Pay-Per-Request課金

#### webtohyo-units-{Env}

| 属性 | 型 | キー |
|------|------|------|
| id | String | PK |
| condoId | String | GSI1（condoId-index） |
| accessToken | String | GSI2（accessToken-index） |
| roomNo | String | - |
| ownerName | String | - |
| votingRights | Number | - |
| isVoted | Boolean | - |
| votedAt | String | - |
| votedSource | String | - |
| createdAt | String | - |

#### webtohyo-agendas-{Env}

| 属性 | 型 | キー |
|------|------|------|
| id | String | PK |
| condoId | String | GSI1（condoId-index） |
| order | Number | - |
| title | String | - |
| resolutionType | String | - |
| createdAt | String | - |

#### webtohyo-votes-{Env}

| 属性 | 型 | キー |
|------|------|------|
| id | String | PK |
| unitId | String | GSI1（unitId-index） |
| agendaId | String | GSI2（agendaId-index） |
| choice | String | - |
| comment | String | - |
| isProxyEntry | Boolean | - |
| inputBy | String | - |
| createdAt | String | - |

### DynamoDB 初期化

```typescript
// lib/dynamodb.ts
const ddbClient = new DynamoDBClient({
  region: process.env.DYNAMODB_REGION ?? process.env.AWS_REGION ?? "ap-northeast-1"
});

const doc = DynamoDBDocumentClient.from(ddbClient, {
  marshallOptions: { removeUndefinedValues: true }
});
```

### ローカル開発用 JSON ストア

- Lambda 環境 → `/tmp/webtohyo-data` に保存
- 開発環境 → `process.cwd()/data` に保存

---

## 10. 環境変数

| 変数名 | 説明 | デフォルト |
|--------|------|----------|
| `DYNAMODB_REGION` | AWS リージョン | `ap-northeast-1` |
| `DYNAMODB_TABLE_CONDOS` | Condos テーブル名 | `webtohyo-condos-prod` |
| `DYNAMODB_TABLE_UNITS` | Units テーブル名 | `webtohyo-units-prod` |
| `DYNAMODB_TABLE_AGENDAS` | Agendas テーブル名 | `webtohyo-agendas-prod` |
| `DYNAMODB_TABLE_VOTES` | Votes テーブル名 | `webtohyo-votes-prod` |
| `AWS_REGION` | Lambda 自動設定 | - |
| `AWS_ACCESS_KEY_ID` | AWS 認証情報（ローカル） | - |
| `AWS_SECRET_ACCESS_KEY` | AWS 認証情報（ローカル） | - |

---

## 11. 主要ページ・機能詳細

### ダッシュボード（/dashboard）

- 定足数進捗表示（ゲージ）
- WEB vs 紙 投票内訳
- 議決権行使状況（%）
- 議案別投票結果（横棒グラフ、Recharts）
- 未提出者一覧（テーブル）
- URLコピーボタン（未提出者向け）
- PDF生成機能

### インポート（/import）

- マンション基本情報入力（名前、コード）
- CSV アップロード（roomNo, ownerName, votingRights）
- CSV プレビュー（先頭10行）
- 議案設定（タイトル、普通/特別決議）
- 一括インポート実行
- サンプルCSVダウンロード

**CSV列仕様**:
- `roomNo`: 部屋番号（必須）
- `ownerName`: 所有者名（任意）
- `votingRights`: 議決権数（デフォルト: 1）

### 代理投票（/proxy）

- マンション選択（複数管理対応）
- 部屋リスト表示（ステータス：WEB済/紙済/未提出）
- 投票内容表示・編集
- 既投票時の警告と上書き確認（WEB投票を紙で上書き時に警告）
- 入力担当者名の記録（監査ログ用）

### 投票フロー（/vote/[token]）

1. **本人確認ページ**: 部屋番号・氏名・議決権を表示。「間違いありません」で投票開始
2. **投票用紙**: 議案ごとに賛成/反対/棄権を選択。進捗バー表示。下書きはlocalStorageに保存
3. **完了画面**: 投票時刻・回答内容を表示

**localStorage キー**: `vote_draft_{token}`

---

## 12. PDF生成機能（lib/pdf.ts）

### generateReminderPdf() - 督促状 PDF

```
入力:
  condoName: string       // マンション名
  units: Unit[]           // 未投票者リスト
  baseUrl: string         // ベースURL

出力:
  ファイル名: 督促状_{マンション名}_{日付}.pdf
  サイズ: A4 (210×297mm)
  1部屋 = 1ページ

各ページの内容:
  - ヘッダー（マンション名、タイトル）
  - 宛名（部屋番号、氏名、議決権数）
  - 本文（投票促進文）
  - QRコード（160×160px）
  - URL（手動入力用）
  - 投票手順の説明
  - フッター（日付、ページ番号）

実装方法:
  1. html2canvas でHTMLレンダリング → キャンバス化
  2. QRCode.toDataURL() でQR生成
  3. jsPDF に image として追加
```

### generateQrSheetPdf() - QRコード配布シート PDF

```
出力:
  ファイル名: QRコード配布物_{マンション名}_{日付}.pdf
  サイズ: A4 (210×297mm)
  配置: 上下2戸ずつ（切り取り線付き）

各カードの内容:
  - 部屋番号（大きく表示）
  - 所有者名
  - 議決権数
  - QRコード（160×160px）
  - URL（手動入力用）
  - 「このカードはお部屋専用です」警告文
```

---

## 13. セキュリティ

### 実装済み

- 二重投票防止（`isVoted` フラグ + 409 ステータス）
- トークンベース認証（accessToken による本人確認）
- 代理入力の監査ログ（`inputBy` フィールド）

### 未実装（課題）

- 管理画面認証なし（全員アクセス可能）
- レート制限なし
- 投票内容の暗号化なし（DynamoDB に平文保存）

### 本番化推奨事項

1. Cognito / IAM ロールで管理画面認証
2. VPC 内の DynamoDB アクセス
3. CloudFront + WAF でHTTPS・レート制限
4. AWS KMS で投票内容を暗号化
5. CloudTrail で全アクセスを監査

---

## 14. ローカル開発セットアップ

```bash
# 1. 環境変数設定
cp .env.local.example .env.local
# .env.local を編集（AWS 認証情報を追加）

# 2. 依存インストール
npm install

# 3. 開発サーバー起動
npm run dev
# http://localhost:3000 でアクセス可能

# 4. ビルド
npm run build

# 5. 本番起動
npm run start
```

---

## 15. Next.js 設定

### next.config.ts

```typescript
{
  reactCompiler: true  // React Compiler 有効化
}
```

### tsconfig.json

- Target: ES2017
- Module: ESNext（bundler resolution）
- Strict: true
- Path Alias: `@/*` → `./*`
- Plugins: Next.js TSプラグイン

---

## 16. 最近のコミット履歴

| ハッシュ | メッセージ |
|---------|-----------|
| 33739f2 | feat: add QR code sheet PDF for all units distribution |
| 9549a51 | remove: debug endpoint |
| e0c0527 | fix: update default DynamoDB table names to -prod suffix |
| bd3a593 | debug: add env var check endpoint |
| 2aa5d2a | fix: catch server errors in import route and handle empty response on client |
