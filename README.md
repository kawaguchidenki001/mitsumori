# KE-Mitsumori（河口電機 民間見積特化PWA）

河口電機株式会社の民間電気工事における見積作業を効率化するためのPWA（Progressive Web App）。

## 概要

- **対象**: 民間電気工事の見積作成（公共工事は対象外）
- **特長**: 自社実勢価格に基づく単価マスタ管理
- **構成**: GitHub Pages（フロント） + GAS（API） + Google Sheets（DB）
- **既存資産との関係**: tanka-search・GenCanとは完全独立

## 関連ドキュメント

- `MITSUMORI_DESIGN_SPEC.md` - 設計書本体（システム全体仕様）
- `MITSUMORI_MASTER_DATA.xlsx` - データスキーマ＆初期マスタデータ
- `docs/SETUP_GUIDE.md` - セットアップ手順
- `docs/API_REFERENCE.md` - GAS API仕様

## クイックスタート

### モックモードで先に動作確認

セットアップ前でも、ブラウザでローカル動作確認できます：

1. `frontend/index.html` をブラウザで開く（ダブルクリック）
2. または、`frontend/` をGitHub Pages配信
3. デフォルトで `USE_MOCK: true` のため、69品目の実サンプル単価＋4件のサンプル案件で動作

セットアップは `docs/SETUP_GUIDE.md` を参照。

### 本番稼働への切替

1. Google Sheets / GAS / GitHub Pagesをセットアップ（手順書通り）
2. `frontend/js/config.js` の `GAS_API_URL` を設定
3. `USE_MOCK: false` に変更

## ディレクトリ構成

```
mitsumori/
├── README.md
├── .gitignore
├── docs/
│   ├── SETUP_GUIDE.md         セットアップ手順
│   └── API_REFERENCE.md       GAS API仕様
├── backend/
│   └── Code.gs                GASバックエンド（顧客CRUD完成、他はスケルトン）
└── frontend/
    ├── index.html             SPA エントリ
    ├── manifest.json          PWAマニフェスト（ショートカット対応）
    ├── sw.js                  Service Worker（オフライン対応）
    ├── icons/                 PWAアイコン (192/512/maskable/apple)
    ├── css/
    │   └── style.css          共通スタイル（A4印刷対応）
    └── js/
        ├── config.js          設定（GAS_URL、USE_MOCK等）
        ├── common.js          共通ユーティリティ
        ├── mockApi.js         モックAPI（69品目データ込み）
        ├── api.js             APIクライアント（実/モック自動切替）
        ├── router.js          SPAルーター
        ├── dashboard.js       ダッシュボード（コピー機能付き）
        ├── customer.js        顧客マスタ管理（CRUD）
        ├── unit_prices.js     単価マスタ管理（CRUD）
        ├── quote_edit.js      見積編集（フル機能）
        ├── quote_preview.js   見積書プレビュー（A4印刷）
        └── main.js            メインエントリ
```

## 実装状況

### ✅ 完成（v0.1.0スターター）

| 画面・機能 | 状態 |
|---|---|
| バックエンドAPI（顧客マスタ） | 完全実装 |
| バックエンドAPI（明細一括保存） | 完全実装（replace_for_quote） |
| バックエンドAPI（その他） | 汎用CRUDスケルトン |
| ID自動採番（顧客、見積番号等） | 完全実装 |
| 諸経費率推奨ロジック | 完全実装 |
| モックAPI（オフライン動作確認用） | 完全実装 |
| サンプルデータ（69品目+4案件+3顧客+17工種+6特記事項） | 完全実装 |
| SPAルーター | 完全実装 |
| **ダッシュボード画面** | 完全実装（コピー機能込み） |
| **顧客マスタ管理画面** | 完全実装（CRUD全部） |
| **単価マスタ管理画面** | 完全実装（CRUD全部） |
| **見積編集画面** | 完全実装（明細編集・自動保存・諸経費推奨・テンプレ・**D&D並べ替え**） |
| **見積書プレビュー画面** | 完全実装（分割型・一覧型・PDF出力） |
| **設定管理画面** | 完全実装（消費税・諸経費率・会社情報等） |
| **CSV取込/出力（顧客マスタ）** | 完全実装（プレビュー付き） |
| **CSV取込/出力（単価マスタ）** | 完全実装（69品目一括取込可能） |
| **データバックアップ/復元** | JSON形式、全テーブル一括 |
| デバッグ画面 | 完全実装 |
| **PWAマニフェスト＋アイコン** | 完全実装（ショートカット対応） |
| **Service Worker** | 完全実装（オフライン対応） |
| トースト通知 | 完全実装 |
| 過去案件コピー | ダッシュボードから1クリック |
| 明細並べ替え | **↑↓ボタン＋ドラッグ&ドロップ**（PC/モバイル両対応） |

### 🔜 次セッション以降（オプション機能）

- 過去案件コピー（複合フィルタ付き高度版）
- 30秒ごとの自動API同期（現在はlocalStorageのみ）
- 工種マスタ管理UI（現在はSheets直編集）
- 特記事項テンプレ管理UI（現在はSheets直編集）

## 開発状況

- [x] Phase 0: 設計完了（2026/6/23）
- [x] Phase 1: MVP実装ほぼ完了
  - [x] P1.1 環境構築用テンプレート
  - [x] P1.2-1 バックエンド API スケルトン + 顧客マスタ API
  - [x] P1.2-2 案件・明細・単価 API（モック完全実装、GAS汎用版）
  - [x] P1.3 共通UI
  - [x] P1.4 ダッシュボード（コピー機能込み）
  - [x] P1.5 顧客マスタ管理画面
  - [x] P1.6 単価マスタ管理画面（CRUD完成）
  - [x] P1.7 見積編集画面
  - [x] P1.8 見積書プレビュー（A4印刷）
  - [x] P1.9 PWA化（Service Worker + アイコン + Manifest）
  - [ ] P1.10 実機テスト・デバッグ（実セットアップ後）
  - [ ] P1.11 デプロイ（実セットアップ後）

## ライセンス

社内利用専用。
