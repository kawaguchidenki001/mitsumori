/**
 * ===================================================================
 * KE-Mitsumori - 河口電機 民間見積特化PWA
 * GAS バックエンド v0.1.0
 * ===================================================================
 *
 * 機能:
 * - 顧客マスタ CRUD (完成)
 * - 案件マスタ CRUD (スケルトン)
 * - 見積明細 CRUD (スケルトン)
 * - 単価マスタ CRUD (スケルトン)
 * - 工種マスタ CRUD (スケルトン)
 * - 特記事項マスタ CRUD (スケルトン)
 * - 設定マスタ CRUD (スケルトン)
 *
 * 設計書: MITSUMORI_DESIGN_SPEC.md を参照
 */

// =====================================================================
// 設定
// =====================================================================

const CONFIG = {
  sheets: {
    customers: 'customers',
    projects: 'projects',
    quote_lines: 'quote_lines',
    work_categories: 'work_categories',
    unit_prices: 'unit_prices',
    notes_templates: 'notes_templates',
    settings: 'settings'
  },
  idPrefix: {
    customer: 'C',
    line: 'L',
    unit_price: 'U',
    note: 'N',
    category: 'cat'
  },
  apiVersion: '0.1.0'
};

// =====================================================================
// メインエントリーポイント
// =====================================================================

/**
 * GET リクエスト（疎通確認用）
 */
function doGet(e) {
  const params = e && e.parameter ? e.parameter : {};

  // パラメータなし → ヘルスチェック
  if (!params.entity) {
    return jsonResponse({
      status: 'ok',
      message: 'KE-Mitsumori API is running',
      version: CONFIG.apiVersion,
      timestamp: getNow()
    });
  }

  // パラメータあり → POST と同じルーティング
  return routeRequest(params.entity, params.action || 'list', params);
}

/**
 * POST リクエスト（メインAPI）
 */
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return errorResponse('リクエストボディが空です', 400);
    }

    const params = JSON.parse(e.postData.contents);
    const { entity, action, data } = params;

    if (!entity || !action) {
      return errorResponse('entity と action は必須です', 400);
    }

    return routeRequest(entity, action, data);

  } catch (err) {
    return errorResponse(`サーバーエラー: ${err.message}`, 500);
  }
}

/**
 * リクエストをエンティティ別のハンドラへルーティング
 */
function routeRequest(entity, action, data) {
  try {
    switch (entity) {
      case 'customer':
        return handleCustomer(action, data);
      case 'project':
        return handleProject(action, data);
      case 'quote_line':
        return handleQuoteLine(action, data);
      case 'unit_price':
        return handleUnitPrice(action, data);
      case 'work_category':
        return handleWorkCategory(action, data);
      case 'notes_template':
        return handleNotesTemplate(action, data);
      case 'setting':
        return handleSetting(action, data);
      default:
        return errorResponse(`不明なエンティティ: ${entity}`, 400);
    }
  } catch (err) {
    return errorResponse(`処理エラー: ${err.message}`, 500);
  }
}

// =====================================================================
// 顧客マスタ ハンドラ（完成版）
// =====================================================================

function handleCustomer(action, data) {
  switch (action) {
    case 'list':
      return listCustomers();
    case 'get':
      return getCustomer(data.id);
    case 'create':
      return createCustomer(data);
    case 'update':
      return updateCustomer(data.id, data);
    case 'delete':
      return deleteCustomer(data.id);
    default:
      return errorResponse(`不明なアクション: ${action}`, 400);
  }
}

/**
 * 顧客マスタ一覧取得
 */
function listCustomers() {
  const sheet = getSheet(CONFIG.sheets.customers);
  const customers = sheetToObjects(sheet);
  return jsonResponse({ data: customers, count: customers.length });
}

/**
 * 顧客1件取得
 */
function getCustomer(id) {
  if (!id) return errorResponse('id は必須です', 400);
  const sheet = getSheet(CONFIG.sheets.customers);
  const customers = sheetToObjects(sheet);
  const customer = customers.find(c => c.customer_id === id);
  if (!customer) return errorResponse(`顧客 ${id} が見つかりません`, 404);
  return jsonResponse({ data: customer });
}

/**
 * 顧客新規作成
 */
function createCustomer(data) {
  if (!data.company_name) return errorResponse('company_name は必須です', 400);

  const sheet = getSheet(CONFIG.sheets.customers);
  const headers = getHeaders(sheet);

  const customerId = generateId('customer');
  const now = getNow();

  const newCustomer = {
    customer_id: customerId,
    company_name: data.company_name || '',
    contact_person: data.contact_person || '',
    postal_code: data.postal_code || '',
    address: data.address || '',
    tel: data.tel || '',
    fax: data.fax || '',
    email: data.email || '',
    customer_type: data.customer_type || '民間',
    discount_tendency: data.discount_tendency || '通常',
    memo: data.memo || '',
    created_at: now,
    updated_at: now
  };

  const row = headers.map(h => newCustomer[h] !== undefined ? newCustomer[h] : '');
  sheet.appendRow(row);

  return jsonResponse({ data: newCustomer, message: '顧客を登録しました' });
}

/**
 * 顧客更新
 */
function updateCustomer(id, data) {
  if (!id) return errorResponse('id は必須です', 400);

  const sheet = getSheet(CONFIG.sheets.customers);
  const headers = getHeaders(sheet);
  const rowIndex = findRowIndexById(sheet, 'customer_id', id);
  if (rowIndex < 0) return errorResponse(`顧客 ${id} が見つかりません`, 404);

  const existing = sheetRowToObject(sheet, rowIndex, headers);
  const updated = Object.assign({}, existing, data);
  updated.customer_id = id;
  updated.updated_at = getNow();

  const row = headers.map(h => updated[h] !== undefined ? updated[h] : '');
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);

  return jsonResponse({ data: updated, message: '顧客を更新しました' });
}

/**
 * 顧客削除
 */
function deleteCustomer(id) {
  if (!id) return errorResponse('id は必須です', 400);

  const sheet = getSheet(CONFIG.sheets.customers);
  const rowIndex = findRowIndexById(sheet, 'customer_id', id);
  if (rowIndex < 0) return errorResponse(`顧客 ${id} が見つかりません`, 404);

  sheet.deleteRow(rowIndex);
  return jsonResponse({ message: `顧客 ${id} を削除しました` });
}

// =====================================================================
// 案件マスタ ハンドラ（スケルトン）
// =====================================================================

function handleProject(action, data) {
  switch (action) {
    case 'list':
      return listSheet(CONFIG.sheets.projects);
    case 'get':
      return getSheetItem(CONFIG.sheets.projects, 'quote_no', data.id);
    case 'create':
      return createProject(data);
    case 'update':
      return updateSheetItem(CONFIG.sheets.projects, 'quote_no', data.id, data);
    case 'delete':
      return deleteSheetItem(CONFIG.sheets.projects, 'quote_no', data.id);
    default:
      return errorResponse(`不明なアクション: ${action}`, 400);
  }
}

/**
 * 案件作成（採番ロジック付き）
 */
function createProject(data) {
  if (!data.customer_id) return errorResponse('customer_id は必須です', 400);
  if (!data.project_name) return errorResponse('project_name は必須です', 400);

  const sheet = getSheet(CONFIG.sheets.projects);
  const headers = getHeaders(sheet);
  const now = getNow();

  // 採番（手動指定 or 自動採番）
  const quoteNo = data.quote_no || generateQuoteNo();

  // 重複チェック
  if (findRowIndexById(sheet, 'quote_no', quoteNo) >= 0) {
    return errorResponse(`見積番号 ${quoteNo} は既に存在します`, 409);
  }

  const newProject = {
    quote_no: quoteNo,
    customer_id: data.customer_id,
    project_name: data.project_name,
    project_location: data.project_location || '',
    issue_date: data.issue_date || todayString(),
    expiry_date: data.expiry_date || expiryFromToday(30),
    owner: data.owner || '河口',
    output_pattern: data.output_pattern || 'auto',
    overhead_rate: data.overhead_rate || 12,
    discount: data.discount || 0,
    final_adjustment: data.final_adjustment || 0,
    tax_display: data.tax_display || '税抜',
    status: data.status || '見積中',
    notes: data.notes || '',
    created_at: now,
    updated_at: now
  };

  const row = headers.map(h => newProject[h] !== undefined ? newProject[h] : '');
  sheet.appendRow(row);

  return jsonResponse({ data: newProject, message: '案件を登録しました' });
}

// =====================================================================
// その他のエンティティ ハンドラ（スケルトン: 汎用CRUDで実装）
// =====================================================================

function handleQuoteLine(action, data) {
  switch (action) {
    case 'replace_for_quote':
      return replaceLinesForQuote(data);
    default:
      return handleGeneric(action, data, CONFIG.sheets.quote_lines, 'line_id', 'line');
  }
}

/**
 * 指定見積の明細を一括置換（既存削除＋新規作成）
 * フロントの見積保存処理を1回のAPI呼び出しで完結させる
 */
function replaceLinesForQuote(data) {
  if (!data.quote_no) return errorResponse('quote_no は必須です', 400);
  if (!Array.isArray(data.lines)) return errorResponse('lines は配列で指定してください', 400);

  const sheet = getSheet(CONFIG.sheets.quote_lines);
  const headers = getHeaders(sheet);
  const quoteNoColIdx = headers.indexOf('quote_no');
  if (quoteNoColIdx < 0) return errorResponse('quote_lines シートに quote_no 列がありません', 500);

  // Step 1: 既存明細を下から削除（インデックス維持のため）
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const allData = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
    for (let i = allData.length - 1; i >= 0; i--) {
      if (String(allData[i][quoteNoColIdx]) === String(data.quote_no)) {
        sheet.deleteRow(i + 2);
      }
    }
  }

  // Step 2: 新明細を一括書き込み
  if (data.lines.length === 0) {
    return jsonResponse({
      data: { quote_no: data.quote_no, line_count: 0 },
      message: '明細をすべて削除しました'
    });
  }

  // 既存の最大line_idを取得して、連番でID採番
  const remainingLines = sheetToObjects(sheet);
  let maxNum = 0;
  remainingLines.forEach(line => {
    const id = String(line.line_id || '');
    if (id.startsWith('L')) {
      const num = parseInt(id.substring(1), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  // 行データを生成
  const newRows = data.lines.map((line, idx) => {
    maxNum++;
    const newLine = Object.assign({}, line, {
      line_id: 'L' + String(maxNum).padStart(5, '0'),
      quote_no: data.quote_no,
      row_no: idx + 1
    });
    return headers.map(h => {
      const v = newLine[h];
      return v === undefined || v === null ? '' : v;
    });
  });

  // 一括書き込み（範囲操作1回）
  const startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, newRows.length, headers.length).setValues(newRows);

  return jsonResponse({
    data: { quote_no: data.quote_no, line_count: data.lines.length },
    message: `${data.lines.length}件の明細を保存しました`
  });
}

function handleUnitPrice(action, data) {
  return handleGeneric(action, data, CONFIG.sheets.unit_prices, 'unit_price_id', 'unit_price');
}

function handleWorkCategory(action, data) {
  return handleGeneric(action, data, CONFIG.sheets.work_categories, 'category_id', 'category');
}

function handleNotesTemplate(action, data) {
  return handleGeneric(action, data, CONFIG.sheets.notes_templates, 'note_id', 'note');
}

function handleSetting(action, data) {
  switch (action) {
    case 'list':
      return listSheet(CONFIG.sheets.settings);
    case 'get':
      return getSheetItem(CONFIG.sheets.settings, 'setting_key', data.id);
    case 'update':
      return updateSheetItem(CONFIG.sheets.settings, 'setting_key', data.id, data);
    default:
      return errorResponse(`Settingは list/get/update のみサポート`, 400);
  }
}

/**
 * 汎用CRUDハンドラ
 */
function handleGeneric(action, data, sheetName, idField, idPrefix) {
  switch (action) {
    case 'list':
      return listSheet(sheetName);
    case 'get':
      return getSheetItem(sheetName, idField, data.id);
    case 'create':
      return createSheetItem(sheetName, idField, idPrefix, data);
    case 'update':
      return updateSheetItem(sheetName, idField, data.id, data);
    case 'delete':
      return deleteSheetItem(sheetName, idField, data.id);
    default:
      return errorResponse(`不明なアクション: ${action}`, 400);
  }
}

function listSheet(sheetName) {
  const sheet = getSheet(sheetName);
  const items = sheetToObjects(sheet);
  return jsonResponse({ data: items, count: items.length });
}

function getSheetItem(sheetName, idField, id) {
  if (!id) return errorResponse('id は必須です', 400);
  const sheet = getSheet(sheetName);
  const items = sheetToObjects(sheet);
  const item = items.find(it => it[idField] === id);
  if (!item) return errorResponse(`${id} が見つかりません`, 404);
  return jsonResponse({ data: item });
}

function createSheetItem(sheetName, idField, idPrefix, data) {
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheet);
  const newId = data[idField] || generateId(idPrefix);

  if (findRowIndexById(sheet, idField, newId) >= 0) {
    return errorResponse(`${newId} は既に存在します`, 409);
  }

  const newItem = Object.assign({}, data, { [idField]: newId });
  if (headers.includes('created_at')) newItem.created_at = getNow();
  if (headers.includes('updated_at')) newItem.updated_at = getNow();

  const row = headers.map(h => newItem[h] !== undefined ? newItem[h] : '');
  sheet.appendRow(row);
  return jsonResponse({ data: newItem, message: '登録しました' });
}

function updateSheetItem(sheetName, idField, id, data) {
  if (!id) return errorResponse('id は必須です', 400);
  const sheet = getSheet(sheetName);
  const headers = getHeaders(sheet);
  const rowIndex = findRowIndexById(sheet, idField, id);
  if (rowIndex < 0) return errorResponse(`${id} が見つかりません`, 404);

  const existing = sheetRowToObject(sheet, rowIndex, headers);
  const updated = Object.assign({}, existing, data);
  updated[idField] = id;
  if (headers.includes('updated_at')) updated.updated_at = getNow();

  const row = headers.map(h => updated[h] !== undefined ? updated[h] : '');
  sheet.getRange(rowIndex, 1, 1, headers.length).setValues([row]);
  return jsonResponse({ data: updated, message: '更新しました' });
}

function deleteSheetItem(sheetName, idField, id) {
  if (!id) return errorResponse('id は必須です', 400);
  const sheet = getSheet(sheetName);
  const rowIndex = findRowIndexById(sheet, idField, id);
  if (rowIndex < 0) return errorResponse(`${id} が見つかりません`, 404);
  sheet.deleteRow(rowIndex);
  return jsonResponse({ message: `${id} を削除しました` });
}

// =====================================================================
// ユーティリティ関数
// =====================================================================

/**
 * シート取得
 */
function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`シート ${sheetName} が見つかりません`);
  return sheet;
}

/**
 * シートのヘッダ行を取得
 */
function getHeaders(sheet) {
  const lastColumn = sheet.getLastColumn();
  if (lastColumn === 0) return [];
  return sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
}

/**
 * シート全体をオブジェクト配列に変換
 */
function sheetToObjects(sheet) {
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();
  if (lastRow < 2 || lastColumn === 0) return [];

  const data = sheet.getRange(1, 1, lastRow, lastColumn).getValues();
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

/**
 * 指定行をオブジェクトとして取得
 */
function sheetRowToObject(sheet, rowIndex, headers) {
  const values = sheet.getRange(rowIndex, 1, 1, headers.length).getValues()[0];
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = values[i];
  });
  return obj;
}

/**
 * 指定IDの行番号（1-indexed）を取得
 */
function findRowIndexById(sheet, idField, id) {
  const headers = getHeaders(sheet);
  const idColIndex = headers.indexOf(idField);
  if (idColIndex < 0) return -1;

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return -1;

  const idColumn = sheet.getRange(2, idColIndex + 1, lastRow - 1, 1).getValues();
  for (let i = 0; i < idColumn.length; i++) {
    if (String(idColumn[i][0]) === String(id)) {
      return i + 2;
    }
  }
  return -1;
}

/**
 * ID生成
 * - customer: C001, C002, ...
 * - line: L00001, L00002, ...
 * - unit_price: U001, U002, ...
 * - note: N001, N002, ...
 * - category: cat01, cat02, ...
 */
function generateId(entity) {
  const prefix = CONFIG.idPrefix[entity];
  if (!prefix) throw new Error(`Unknown entity for ID generation: ${entity}`);

  const sheetMap = {
    customer: { sheet: CONFIG.sheets.customers, idField: 'customer_id', pad: 3 },
    line: { sheet: CONFIG.sheets.quote_lines, idField: 'line_id', pad: 5 },
    unit_price: { sheet: CONFIG.sheets.unit_prices, idField: 'unit_price_id', pad: 3 },
    note: { sheet: CONFIG.sheets.notes_templates, idField: 'note_id', pad: 3 },
    category: { sheet: CONFIG.sheets.work_categories, idField: 'category_id', pad: 2 }
  };

  const info = sheetMap[entity];
  const sheet = getSheet(info.sheet);
  const items = sheetToObjects(sheet);

  let maxNum = 0;
  items.forEach(item => {
    const id = String(item[info.idField] || '');
    if (id.startsWith(prefix)) {
      const num = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  });

  const newNum = maxNum + 1;
  return prefix + String(newNum).padStart(info.pad, '0');
}

/**
 * 見積番号採番（YYMM + 通し番号）
 */
function generateQuoteNo() {
  const now = new Date();
  const reiwaYear = now.getFullYear() - 2018;
  const yy = String(reiwaYear).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const prefix = yy + mm;

  const sheet = getSheet(CONFIG.sheets.projects);
  const items = sheetToObjects(sheet);

  let maxSeq = 0;
  items.forEach(item => {
    const no = String(item.quote_no || '');
    if (no.startsWith(prefix)) {
      const seq = parseInt(no.substring(prefix.length), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });

  return prefix + (maxSeq + 1);
}

/**
 * 現在日時 (ISO形式)
 */
function getNow() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', "yyyy-MM-dd'T'HH:mm:ss");
}

/**
 * 今日の日付 (YYYY-MM-DD)
 */
function todayString() {
  return Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
}

/**
 * 今日からN日後の日付 (YYYY-MM-DD)
 */
function expiryFromToday(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Utilities.formatDate(date, 'Asia/Tokyo', 'yyyy-MM-dd');
}

/**
 * JSON成功レスポンス
 */
function jsonResponse(payload) {
  const body = Object.assign({ success: true }, payload);
  return ContentService
    .createTextOutput(JSON.stringify(body))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * JSONエラーレスポンス
 */
function errorResponse(message, status) {
  return ContentService
    .createTextOutput(JSON.stringify({
      success: false,
      error: message,
      status: status || 500
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// =====================================================================
// テスト関数（GASエディタから手動実行用）
// =====================================================================

/**
 * 顧客一覧の動作確認
 */
function test_listCustomers() {
  const result = listCustomers();
  Logger.log(result.getContent());
}

/**
 * 顧客追加の動作確認
 */
function test_createCustomer() {
  const result = createCustomer({
    company_name: 'テスト株式会社',
    contact_person: 'テスト担当',
    customer_type: '民間'
  });
  Logger.log(result.getContent());
}

/**
 * 見積番号採番のテスト
 */
function test_generateQuoteNo() {
  Logger.log(generateQuoteNo());
}
