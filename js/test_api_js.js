/**
 * api.js のロジック（URL組み立て・チャンク分割）をNode.js上で検証する。
 * fetch をモックして、実際にどんなURLが何回発行されるかを確認する。
 */

global.CONFIG = {
  GAS_API_URL: 'https://script.google.com/macros/s/FAKE_DEPLOYMENT_ID/exec',
  USE_MOCK: false
};

// fetchの呼び出しを記録するモック
const fetchCalls = [];
global.fetch = async (url, options) => {
  fetchCalls.push({ url, options });
  const parsed = new URL(url);
  const entity = parsed.searchParams.get('entity');
  const action = parsed.searchParams.get('action');
  const data = JSON.parse(parsed.searchParams.get('data') || '{}');

  // 簡易的な成功レスポンスを返す(実際のCode.gsの挙動を模倣)
  let responseBody;
  if (action === 'append_lines') {
    responseBody = { success: true, data: { quote_no: data.quote_no, added_count: data.lines.length } };
  } else if (action === 'clear_for_quote') {
    responseBody = { success: true, data: { quote_no: data.quote_no, deleted_count: 0 } };
  } else {
    responseBody = { success: true, data: {} };
  }
  return {
    ok: true,
    status: 200,
    async json() { return responseBody; }
  };
};

const fs = require('fs');
const code = fs.readFileSync(__dirname + '/js/api.js', 'utf-8');
eval(code);

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

(async () => {

  console.log('=== テスト1: buildGetUrl が正しいURLを組み立てるか ===');
  {
    const url = buildGetUrl('customer', 'list', {});
    console.log('  URL:', url);
    assertEqual(url.startsWith(CONFIG.GAS_API_URL + '?'), true, 'URLがGAS_API_URLで始まる');
    assertEqual(url.includes('entity=customer'), true, 'entity=customerが含まれる');
    assertEqual(url.includes('action=list'), true, 'action=listが含まれる');
  }

  console.log('\n=== テスト2: 小さい見積(5行)は1回のリクエストで送信されるか ===');
  {
    fetchCalls.length = 0;
    const lines = [];
    for (let i = 0; i < 5; i++) {
      lines.push({ item_name: `品目${i}`, unit: 'm', qty: 1, unit_price: 100, amount: 100 });
    }
    const result = await replaceForQuoteChunked('Q100', lines);
    const appendCalls = fetchCalls.filter(c => c.url.includes('action=append_lines'));
    console.log(`  発行されたリクエスト数: clear=1 + append=${appendCalls.length}`);
    assertEqual(appendCalls.length, 1, '5行なら1回のappend_linesで済む');
    assertEqual(result.data.line_count, 5, '合計5件保存された');
  }

  console.log('\n=== テスト3: 大きい見積(日本語品名で50行)は自動的に複数回に分割されるか ===');
  {
    fetchCalls.length = 0;
    const lines = [];
    for (let i = 0; i < 50; i++) {
      lines.push({
        item_name: `耐熱電線HP-0.9mm×${i}C 高圧絶縁ケーブル特殊仕様品`,
        unit: 'm', qty: 10 + i, unit_price: 193 + i, amount: (10 + i) * (193 + i)
      });
    }
    const result = await replaceForQuoteChunked('Q200', lines);
    const appendCalls = fetchCalls.filter(c => c.url.includes('action=append_lines'));
    console.log(`  発行されたappend_linesリクエスト数: ${appendCalls.length}`);
    console.log(`  各リクエストのURL長:`, appendCalls.map(c => c.url.length));
    const allUnder2000 = appendCalls.every(c => c.url.length < 2000);
    assertEqual(allUnder2000, true, '全リクエストのURL長が2000文字未満に収まっている');
    assertEqual(appendCalls.length > 1, true, '50行は複数回に分割されている');
    assertEqual(result.data.line_count, 50, '合計50件すべて保存された(取りこぼしなし)');
  }

  console.log('\n=== テスト4: 空配列(明細0件で保存)の場合、append_linesは呼ばれないか ===');
  {
    fetchCalls.length = 0;
    const result = await replaceForQuoteChunked('Q300', []);
    const appendCalls = fetchCalls.filter(c => c.url.includes('action=append_lines'));
    const clearCalls = fetchCalls.filter(c => c.url.includes('action=clear_for_quote'));
    assertEqual(clearCalls.length, 1, 'clear_for_quoteは呼ばれる');
    assertEqual(appendCalls.length, 0, '明細が0件ならappend_linesは呼ばれない');
  }

  console.log('\n=== 全テスト完了 ===');
})();
