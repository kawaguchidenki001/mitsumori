# セットアップガイド v0.1.0

KE-Mitsumori の運用環境を構築する手順。所要時間 **約45分**（Google・GitHub アカウントは事前用意）。

## 全体像

```
┌─────────────────────────────────────────────────┐
│  Phase A: 動作確認（5分・任意）                │
│   モックモードでブラウザ単体動作確認            │
├─────────────────────────────────────────────────┤
│  Phase B: Google Sheets セットアップ（10分）   │
│   DBとなるSheetsを準備＋初期マスタデータ投入    │
├─────────────────────────────────────────────────┤
│  Phase C: GAS セットアップ（15分）             │
│   バックエンドAPIをデプロイ                     │
├─────────────────────────────────────────────────┤
│  Phase D: GitHub Pages 公開（10分）            │
│   フロントエンドをWeb公開                       │
├─────────────────────────────────────────────────┤
│  Phase E: 接続切替＋動作確認（5分）            │
│   モック→本番への切替＋疎通テスト              │
└─────────────────────────────────────────────────┘
```

## 前提

- **Googleアカウント**: Sheets と Apps Script で使用
- **GitHubアカウント**: 公開ホスティングに使用
- **ブラウザ**: Chrome 推奨
- **テキストエディタ**: VS Code 推奨（GitHub Web UI でも可）

---

## Phase A: 動作確認（5分・任意）

セットアップ前にブラウザ単体で動作確認したい場合：

1. バンドルZIPを展開
2. `app/frontend/index.html` をブラウザで開く（ダブルクリック）
3. 「モックモード」と表示され、サンプルデータで動作

> 💡 ここで「これでいい」と判断できたら次に進む。気になる点はメモして、本番でも調整可能。

---

## Phase B: Google Sheets セットアップ（10分）

### B-1. 新規 Sheets を作成

1. Google Drive にアクセス（drive.google.com）
2. 「新規」→「Google スプレッドシート」→「空白のスプレッドシート」
3. ファイル名を `KE-Mitsumori-DB` に変更
4. **URLをメモ**：`https://docs.google.com/spreadsheets/d/【SPREADSHEET_ID】/edit`
   - `【SPREADSHEET_ID】` の部分が後で必要（メモ不要・自動で紐付くため）

### B-2. 初期データを取り込む

1. `02_MASTER_DATA.xlsx` を Google Drive にアップロード
2. アップロードしたファイルを右クリック →「アプリで開く」→「Google スプレッドシート」
3. 6つのシートが表示されることを確認:
   - `01_スキーマ定義`、`02_工種マスタ`、`03_単価マスタ`、`04_顧客マスタ`、`05_特記事項`、`06_設定`

### B-3. シート名を本番用に変更（重要）

`KE-Mitsumori-DB` を開いて、上記の各シートをコピー＆ペーストし、以下の名前で保存：

| インポート時のシート名 | 本番用シート名 |
|---|---|
| 01_スキーマ定義 | **不要**（取り込まなくてOK） |
| 02_工種マスタ | `work_categories` |
| 03_単価マスタ | `unit_prices` |
| 04_顧客マスタ | `customers` |
| 05_特記事項 | `notes_templates` |
| 06_設定 | `settings` |

**シート名は半角英数字、ハイフン/アンダースコアのみ**。日本語シート名は不可。

#### コピー手順（シート単位）：
1. インポートしたファイルの該当シートを開く
2. シートタブを右クリック→「他のスプレッドシートにコピー」→ `KE-Mitsumori-DB` を選択
3. `KE-Mitsumori-DB` でシート名を右クリック→「名前を変更」で半角英名にする
4. 不要なヘッダ行（タイトル行）を削除して、列名行（`category_id, category_name, ...`）が1行目になるようにする

### B-4. 不足シートを追加

以下2シートを `KE-Mitsumori-DB` に追加作成：

#### `projects` シート（案件マスタ）
1行目（ヘッダ）に以下を入力：
```
quote_no | customer_id | project_name | project_location | issue_date | expiry_date | owner | output_pattern | overhead_rate | discount | final_adjustment | tax_display | status | notes | created_at | updated_at
```

#### `quote_lines` シート（見積明細）
1行目（ヘッダ）：
```
line_id | quote_no | category_id | row_no | unit_price_id | item_name | spec | qty | unit | price | amount | is_supplied | show_price | mount_type | line_note
```

### B-5. 確認

`KE-Mitsumori-DB` のシート一覧（下部タブ）に以下7つがあること：
- `work_categories`、`unit_prices`、`customers`、`notes_templates`、`settings`、`projects`、`quote_lines`

---

## Phase C: GAS セットアップ（15分）

### C-1. GAS エディタを開く

1. `KE-Mitsumori-DB` を開いた状態で
2. メニュー「拡張機能」→「Apps Script」
3. 新しいタブで GAS エディタが開く
4. デフォルトプロジェクト名 `無題のプロジェクト` を `KE-Mitsumori-API` に変更（上部のタイトルクリックで編集可能）

### C-2. Code.gs を貼り付け

1. 左サイドバー「ファイル」の `Code.gs` をクリック
2. エディタの中身を**全削除**（Ctrl+A → Delete）
3. `app/backend/Code.gs` の中身を**全コピー＆ペースト**
4. Ctrl+S（または保存ボタン）で保存

### C-3. テスト実行（権限承認）

1. エディタ上部のドロップダウンから関数 `test_listCustomers` を選択
2. 「実行」ボタン
3. 初回は権限承認ダイアログが出る:
   - 「権限を確認」→ Googleアカウントを選択
   - 「詳細を表示」→「KE-Mitsumori-API（安全ではないページ）に移動」
   - 「許可」
4. 実行ログに JSON 結果が表示されれば成功
   - `{"success":true,"data":[...],"count":3}`

### C-4. Web アプリとしてデプロイ

1. 右上「デプロイ」→「**新しいデプロイ**」
2. 種類の選択: 歯車アイコン →「**ウェブアプリ**」
3. 設定:
   - 説明: `KE-Mitsumori API v0.1`
   - 次のユーザーとして実行: **自分**（Googleアカウント名）
   - アクセスできるユーザー: **全員**
4. 「デプロイ」をクリック
5. **「ウェブアプリのURL」をコピーして必ずメモ**（後で必須）
   - 例: `https://script.google.com/macros/s/AKfycbz.../exec`

### C-5. ブラウザで疎通確認

メモしたURLをブラウザに貼り付けてアクセス。以下のJSON が表示されれば成功：

```json
{
  "success": true,
  "status": "ok",
  "message": "KE-Mitsumori API is running",
  "version": "0.1.0",
  "timestamp": "2026-06-23T..."
}
```

---

## Phase D: GitHub Pages 公開（10分）

### D-1. リポジトリ作成

1. GitHub にログイン（github.com）
2. 右上「+」→「**New repository**」
3. 設定:
   - Repository name: `mitsumori`（任意の名前でOK）
   - Description: `河口電機 民間見積特化PWA`
   - **Public** を選択（無料プランでGitHub Pages使用のため）
   - 「Add a README file」にチェック
4. 「Create repository」

### D-2. ファイルアップロード

#### 方法1: GitHub Web UI（簡単）

1. リポジトリトップで「Add file」→「Upload files」
2. `app/` フォルダの中身をすべてドラッグ&ドロップ：
   - `README.md`、`.gitignore`
   - `backend/`、`docs/`、`frontend/` の各フォルダ
3. ⚠️ **`app/` フォルダ自体ではなく、`app/` の中身をアップロード**
4. コミットメッセージ: `Initial commit: v0.1.0`
5. 「Commit changes」

#### 方法2: Git CLI（VS Codeなどでgit使う場合）

```bash
git clone https://github.com/【ユーザー名】/mitsumori.git
cd mitsumori
# app/ フォルダの中身をすべてコピー
cp -r /path/to/app/* .
git add .
git commit -m "Initial commit: v0.1.0"
git push
```

### D-3. config.js に GAS URL を設定

1. GitHub 上で `frontend/js/config.js` を開く
2. 鉛筆アイコン（編集）をクリック
3. 以下の2行を編集：

**変更前**:
```javascript
GAS_API_URL: '',
USE_MOCK: true,
```

**変更後**:
```javascript
GAS_API_URL: 'https://script.google.com/macros/s/AKfycbz.../exec',  // Phase C-4 でメモしたURL
USE_MOCK: false,  // モックを無効化
```

4. ページ下部「Commit changes」

### D-4. GitHub Pages 有効化

1. リポジトリの「**Settings**」タブ
2. 左メニュー「**Pages**」
3. 設定:
   - Source: **Deploy from a branch**
   - Branch: **main**
   - Folder: **`/frontend`**（important）
4. 「Save」
5. 数分待つと公開URLが表示される
   - 例: `https://【ユーザー名】.github.io/mitsumori/`

---

## Phase E: 接続切替＋動作確認（5分）

### E-1. 公開URLにアクセス

`https://【ユーザー名】.github.io/mitsumori/` を開く

### E-2. モックバナーが消えていることを確認

上部に「モックモード」バナーが**表示されていなければ成功**。
表示されている場合は config.js の `USE_MOCK: false` が反映されていない（5分待つか強制更新 Ctrl+Shift+R）

### E-3. API疎通テスト

1. ダッシュボード → 「🔧 デバッグ」
2. 「ヘルスチェック」ボタン
3. JSON で `"success": true` が返れば成功

### E-4. データ投入テスト

1. 「顧客一覧」ボタン → サンプル顧客（3件）が表示されれば成功
2. 「単価一覧」ボタン → 単価データ（69件）が表示されれば成功

すべて OK なら**セットアップ完了**🎉

---

## トラブルシューティング

### 症状: API疎通テストでCORSエラー

**原因**: GAS Web アプリのアクセス権限が「自分のみ」になっている

**対処**:
1. GAS エディタ →「デプロイ」→「デプロイを管理」
2. 鉛筆アイコン（編集）
3. 「アクセスできるユーザー」を **「全員」** に変更
4. 「デプロイ」

### 症状: 「シートが見つかりません」エラー

**原因**: シート名が半角英名になっていない、または存在しない

**対処**: `KE-Mitsumori-DB` のシート名を以下の通り確認：
- `customers`、`projects`、`quote_lines`、`work_categories`、`unit_prices`、`notes_templates`、`settings`

### 症状: GitHub Pages で 404

**原因**: Pages の公開フォルダ設定が間違っている

**対処**: Settings → Pages → Folder が **`/frontend`** になっているか確認

### 症状: アイコンが表示されない

**原因**: アイコンファイルがアップロードされていない

**対処**: `frontend/icons/` フォルダの中身が GitHub 上にあるか確認

### 症状: 保存しても反映されない

**原因**: ブラウザキャッシュ

**対処**: Ctrl+Shift+R（Macは Cmd+Shift+R）で強制更新。それでも駄目なら Service Worker を一度クリア：
1. F12（デベロッパーツール）→ Application タブ
2. Service Workers → Unregister
3. Storage → Clear site data

---

## 補足: GAS再デプロイの注意

`Code.gs` を更新したら必ず **「新しいバージョン」としてデプロイ**してください：

1. 「デプロイ」→「デプロイを管理」
2. 鉛筆アイコン
3. バージョン: **「新しいバージョン」** を選択
4. 「デプロイ」

URL は変わらないので、フロントの再設定は不要。

## 補足: GASエディタの旧版機能

「v6 (旧エディタ)」を使っている場合、UI が異なる。新エディタに切り替え推奨。

## 補足: CSV による既存データの一括投入

セットアップ完了後、過去Excelの単価データを一括投入する場合：

1. 単価マスタ画面で「📥 CSV出力」→ 現在の69品目テンプレ取得
2. Excel で開いて行を追加（既存IDは消す）
3. UTF-8（BOM付き）で保存
4. 単価マスタ画面で「📤 CSV取込」→ プレビュー確認 → 取込

詳細は `04_CSV_IMPORT_GUIDE.md` を参照。
