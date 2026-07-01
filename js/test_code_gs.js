/**
 * Code.gs のロジックをNode.js上で検証するためのテストハーネス。
 * SpreadsheetApp / Utilities / ContentService / Logger を最小限モックし、
 * 実際のGAS環境なしでルーティング・JSON解析・チャンク処理のロジックを確認する。
 */

// ---- 疑似シート（インメモリ2次元配列） ----
class FakeSheet {
  constructor(headers) {
    this.rows = [headers];
  }
  getLastRow() { return this.rows.length; }
  getLastColumn() { return this.rows[0].length; }
  getRange(row, col, numRows, numCols) {
    const self = this;
    return {
      getValues() {
        const out = [];
        for (let r = 0; r < numRows; r++) {
          const rowData = self.rows[row - 1 + r] || [];
          out.push(rowData.slice(col - 1, col - 1 + numCols));
        }
        return out;
      },
      setValues(values) {
        for (let r = 0; r < values.length; r++) {
          const targetRowIdx = row - 1 + r;
          while (self.rows.length <= targetRowIdx) self.rows.push(new Array(self.rows[0].length).fill(''));
          for (let c = 0; c < values[r].length; c++) {
            self.rows[targetRowIdx][col - 1 + c] = values[r][c];
          }
        }
      }
    };
  }
  appendRow(row) { this.rows.push(row); }
  deleteRow(rowNum) { this.rows.splice(rowNum - 1, 1); }
}

const fakeSheets = {
  quote_lines: new FakeSheet(['line_id', 'quote_no', 'row_no', 'item_name', 'unit', 'qty', 'unit_price', 'amount'])
};

global.SpreadsheetApp = {
  getActiveSpreadsheet() {
    return {
      getSheetByName(name) { return fakeSheets[name]; }
    };
  }
};

global.Utilities = {
  formatDate(date, tz, fmt) { return date.toISOString(); }
};

global.ContentService = {
  MimeType: { JSON: 'JSON' },
  createTextOutput(text) {
    return {
      _text: text,
      setMimeType() { return this; },
      getContent() { return this._text; }
    };
  }
};

global.Logger = { log: (...args) => console.log('[Logger]', ...args) };

// ---- Code.gsを読み込んで評価 ----
const fs = require('fs');
const code = fs.readFileSync(__dirname + '/Code.gs', 'utf-8');
eval(code);

// =====================================================================
// テスト本体
// =====================================================================

function assertEqual(actual, expected, label) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  OK: ${label}`);
  } else {
    console.log(`  ✗ NG: ${label}\n     期待値: ${e}\n     実際 : ${a}`);
    process.exitCode = 1;
  }
}

console.log('=== テスト1: doGet ヘルスチェック(entity無し) ===');
{
  const res = doGet({ parameter: {} });
  const body = JSON.parse(res.getContent());
  assertEqual(body.status, 'ok', 'status=ok');
}

console.log('\n=== テスト2: doGet で data パラメータ(JSON)を正しく解釈できるか ===');
{
  const res = doGet({
    parameter: {
      entity: 'quote_line',
      action: 'clear_for_quote',
      data: JSON.stringify({ quote_no: 'Q001' })
    }
  });
  const body = JSON.parse(res.getContent());
  assertEqual(body.success, true, 'clear_for_quote success=true(明細0件でも成功する)');
}

console.log('\n=== テスト3: append_lines → 型(数値)がちゃんと保持されるか ===');
{
  const res = doGet({
    parameter: {
      entity: 'quote_line',
      action: 'append_lines',
      data: JSON.stringify({
        quote_no: 'Q001',
        lines: [
          { item_name: '電線管GP-22', unit: 'm', qty: 10, unit_price: 193, amount: 1930 },
          { item_name: 'LED照明', unit: '個', qty: 3, unit_price: 8500, amount: 25500 }
        ]
      })
    }
  });
  const body = JSON.parse(res.getContent());
  assertEqual(body.data.added_count, 2, '2件追加された');

  // シート内の実データを直接確認（型が壊れていないか）
  const sheet = fakeSheets.quote_lines;
  const lastDataRow = sheet.rows[sheet.rows.length - 1];
  console.log('  実際のシート最終行:', JSON.stringify(lastDataRow));
  const qtyIdx = sheet.rows[0].indexOf('qty');
  assertEqual(typeof lastDataRow[qtyIdx], 'number', 'qtyフィールドが数値型で保存されている(文字列化されていない)');
}

console.log('\n=== テスト4: append_lines を複数回呼んでも line_id・row_noが正しく連番になるか ===');
{
  doGet({
    parameter: {
      entity: 'quote_line', action: 'append_lines',
      data: JSON.stringify({ quote_no: 'Q001', lines: [{ item_name: '追加分A' }] })
    }
  });
  doGet({
    parameter: {
      entity: 'quote_line', action: 'append_lines',
      data: JSON.stringify({ quote_no: 'Q001', lines: [{ item_name: '追加分B' }] })
    }
  });
  const listRes = doGet({
    parameter: { entity: 'quote_line', action: 'list', data: JSON.stringify({}) }
  });
  const list = JSON.parse(listRes.getContent()).data;
  const q001Lines = list.filter(l => l.quote_no === 'Q001');
  console.log('  Q001の明細:', JSON.stringify(q001Lines.map(l => ({ line_id: l.line_id, row_no: l.row_no, item_name: l.item_name }))));
  assertEqual(q001Lines.length, 4, 'Q001に合計4件の明細がある(2件+1件+1件)');
  const rowNos = q001Lines.map(l => l.row_no);
  assertEqual(rowNos, [1, 2, 3, 4], 'row_noが1,2,3,4と正しく連番になっている');
  const lineIds = q001Lines.map(l => l.line_id);
  const uniqueIds = new Set(lineIds);
  assertEqual(uniqueIds.size, 4, 'line_idがすべて重複なく発行されている');
}

console.log('\n=== テスト5: clear_for_quote は指定したquote_noの明細だけを消し、他は残す ===');
{
  doGet({
    parameter: {
      entity: 'quote_line', action: 'append_lines',
      data: JSON.stringify({ quote_no: 'Q999', lines: [{ item_name: '別見積の明細' }] })
    }
  });
  doGet({
    parameter: { entity: 'quote_line', action: 'clear_for_quote', data: JSON.stringify({ quote_no: 'Q001' }) }
  });
  const listRes = doGet({ parameter: { entity: 'quote_line', action: 'list', data: JSON.stringify({}) } });
  const list = JSON.parse(listRes.getContent()).data;
  assertEqual(list.filter(l => l.quote_no === 'Q001').length, 0, 'Q001の明細は0件になった');
  assertEqual(list.filter(l => l.quote_no === 'Q999').length, 1, 'Q999の明細は影響を受けず1件残っている');
}

console.log('\n=== テスト6: dataパラメータなしの簡易呼び出し(下位互換)も動くか ===');
{
  const res = doGet({ parameter: { entity: 'quote_line', action: 'list' } });
  const body = JSON.parse(res.getContent());
  assertEqual(body.success, true, 'dataパラメータ無しでも動作する(paramsをそのままdataとして使う)');
}

console.log('\n=== テスト7: 不正なJSON文字列を渡した場合、エラーになるか(落ちずに400を返すか) ===');
{
  const res = doGet({
    parameter: { entity: 'customer', action: 'list', data: '{壊れたJSON' }
  });
  const body = JSON.parse(res.getContent());
  assertEqual(body.success, false, 'JSON解析失敗時はsuccess=falseを返す(例外で落ちない)');
  assertEqual(body.status, 400, 'ステータス400が返る');
}

console.log('\n=== 全テスト完了 ===');
