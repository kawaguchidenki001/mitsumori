# KE-Mitsumori API リファレンス

GAS バックエンドの API 仕様書。

## 共通仕様

### エンドポイント

- **本番URL**: `https://script.google.com/macros/s/【DEPLOYMENT_ID】/exec`
- **メソッド**: POST（メイン操作）、GET（ヘルスチェックのみ）

### リクエスト形式

POST のみ。Content-Type は `text/plain` を使用（GAS のCORS制約回避のため）。

```javascript
fetch(GAS_URL, {
  method: 'POST',
  mode: 'cors',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    entity: 'customer',     // 対象エンティティ
    action: 'list',         // 操作種別
    data: { /* パラメータ */ }
  })
});
```

### レスポンス形式

成功時:
```json
{
  "success": true,
  "data": { ... },          // 単体取得・作成・更新時
  "count": 10,              // 一覧取得時
  "message": "..."          // 任意のメッセージ
}
```

エラー時:
```json
{
  "success": false,
  "error": "エラー内容",
  "status": 400
}
```

## エンティティと操作

| entity | 対象テーブル | 主キー |
|---|---|---|
| `customer` | 顧客マスタ | customer_id |
| `project` | 案件マスタ | quote_no |
| `quote_line` | 見積明細 | line_id |
| `unit_price` | 単価マスタ | unit_price_id |
| `work_category` | 工種マスタ | category_id |
| `notes_template` | 特記事項マスタ | note_id |
| `setting` | 設定マスタ | setting_key |

| action | 説明 | 必要パラメータ |
|---|---|---|
| `list` | 一覧取得 | なし |
| `get` | 1件取得 | `id` |
| `create` | 新規作成 | 各エンティティの必須項目 |
| `update` | 更新 | `id` + 更新項目 |
| `delete` | 削除 | `id` |

## エンティティ別の詳細

### 顧客マスタ (`customer`)

#### 一覧取得
```javascript
API.customer.list();
// → { success: true, data: [...], count: 3 }
```

#### 1件取得
```javascript
API.customer.get('C001');
// → { success: true, data: { customer_id: 'C001', ... } }
```

#### 新規作成
```javascript
API.customer.create({
  company_name: '株式会社○○',  // 必須
  contact_person: '田中様',
  customer_type: '民間',        // 民間／同業／元請
  discount_tendency: '通常',
  tel: '058-xxx-xxxx',
  postal_code: '500-xxxx',
  address: '岐阜市...',
  memo: ''
});
// → { success: true, data: { customer_id: 'C004', ... }, message: '顧客を登録しました' }
```

#### 更新
```javascript
API.customer.update('C001', { contact_person: '新担当者名' });
```

#### 削除
```javascript
API.customer.delete('C001');
```

### 案件マスタ (`project`)

#### 新規作成（採番ロジック付き）
```javascript
API.project.create({
  customer_id: 'C001',          // 必須
  project_name: '工事名',        // 必須
  project_location: '工事場所',
  // quote_no: '2603132',        // 任意（指定なければ自動採番）
  overhead_rate: 12,
  status: '見積中'
});
```

自動採番ルール: `YYMM + 通し番号` （例: `2603132` = R8年3月132番目）

### 単価マスタ (`unit_price`)

#### 新規作成
```javascript
API.unitPrice.create({
  category_id: 'cat05',
  item_name: 'スイッチ片切配線',
  spec: '',
  standard_unit: 'ケ所',
  price_embedded: 3800,
  price_exposed: 4200,
  maker: 'パナソニック'
});
```

### 設定マスタ (`setting`)

設定マスタは `list`、`get`、`update` のみサポート。

```javascript
API.setting.list();
API.setting.get('tax_rate');           // → { data: { setting_key: 'tax_rate', setting_value: '10' } }
API.setting.update('tax_rate', '10');
```

## エラーステータス一覧

| ステータス | 意味 |
|---|---|
| 400 | リクエスト不正（必須パラメータ不足等） |
| 404 | リソースが見つからない |
| 409 | 重複（既存IDで作成しようとした等） |
| 500 | サーバーエラー |

## ID採番ルール

| エンティティ | 形式 | 例 |
|---|---|---|
| customer | C + 3桁0埋め | C001, C002 |
| project | YYMM + 通し番号 | 2603132 |
| quote_line | L + 5桁0埋め | L00001 |
| unit_price | U + 3桁0埋め | U001 |
| work_category | cat + 2桁0埋め | cat01 |
| notes_template | N + 3桁0埋め | N001 |

## ヘルスチェック (GET)

```javascript
// ブラウザで直接URLにアクセス可能
GET https://script.google.com/macros/s/.../exec

// レスポンス
{
  "success": true,
  "status": "ok",
  "message": "KE-Mitsumori API is running",
  "version": "0.1.0",
  "timestamp": "2026-06-23T11:30:00"
}
```

## 既知の制約・課題

### Phase 1での未実装機能

- 認証（誰でもAPIにアクセス可能）
- レート制限なし
- バルク操作（一度に複数件作成・更新）
- 高度な検索・絞り込み（クライアント側でフィルタリング）

### GAS の制約

- 実行時間制限: 1回6分
- 1日あたりの実行時間制限: 6時間
- 1分あたりの呼び出し回数制限: あり
- POST時のContent-Type: `application/json` は使えない（`text/plain` で送信）

### Phase 2以降の改善

- 認証機能（GoogleアカウントID連携）
- 計算系API（合計集計、諸経費計算等の専用エンドポイント）
- 検索系API（複合条件、全文検索）
- バッチ操作（明細行の一括登録）
