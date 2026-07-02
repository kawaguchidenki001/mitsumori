/**
 * KE-Mitsumori API クライアント
 *
 * GAS バックエンドへの呼び出しを抽象化する。
 * config.js の USE_MOCK = true のときは mockApi.js を使用。
 *
 * v0.1.1: GAS Web AppのdoPostがHTTP 500/503を返すプラットフォーム障害の
 * 回避策として、すべてのAPI呼び出しをGET方式に変更。
 * entity/action/data(JSON文字列)をURLパラメータとして送信し、
 * バックエンドのdoGetで従来のdoPostと同じ形に復元して処理する。
 *
 * 明細一括保存(replaceForQuote)のみ、GETのURL長制限を避けるため
 * 自動でチャンク分割して複数回のリクエストに分けて送信する。
 */

// GETリクエストのURL長を安全な範囲に保つための、data部分(エンコード後)の目安上限。
// GAS Web AppのGETリクエストの上限は公式に明記されていないため、
// 広く安全とされる範囲(トータルURL長2,000文字未満)を目安に保守的な値を採用している。
const MAX_ENCODED_DATA_LENGTH = 1500;

const API = {

  /**
   * 汎用API呼び出し（GET方式）
   */
  async request(entity, action, data) {
    // モックモード時はモックAPIへ
    if (CONFIG.USE_MOCK) {
      return await MockApi.request(entity, action, data);
    }

    if (!CONFIG.GAS_API_URL) {
      throw new Error('GAS_API_URL が config.js に設定されていません（または USE_MOCK を true にしてください）');
    }

    const url = buildGetUrl(entity, action, data || {});

    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'API呼び出しでエラーが発生しました');
      }
      return result;

    } catch (err) {
      console.error(`API Error (${entity}/${action}):`, err);
      throw err;
    }
  },

  /**
   * API疎通確認
   */
  async health() {
    if (CONFIG.USE_MOCK) {
      return await MockApi.health();
    }

    if (!CONFIG.GAS_API_URL) {
      throw new Error('GAS_API_URL が config.js に設定されていません');
    }
    const response = await fetch(CONFIG.GAS_API_URL, { method: 'GET' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  },

  customer: {
    list: () => API.request('customer', 'list'),
    get: (id) => API.request('customer', 'get', { id }),
    create: (data) => API.request('customer', 'create', data),
    update: (id, data) => API.request('customer', 'update', Object.assign({ id }, data)),
    delete: (id) => API.request('customer', 'delete', { id })
  },

  project: {
    list: () => API.request('project', 'list'),
    get: (id) => API.request('project', 'get', { id }),
    create: (data) => API.request('project', 'create', data),
    update: (id, data) => API.request('project', 'update', Object.assign({ id }, data)),
    delete: (id) => API.request('project', 'delete', { id })
  },

  quoteLine: {
    list: () => API.request('quote_line', 'list'),
    get: (id) => API.request('quote_line', 'get', { id }),
    create: (data) => API.request('quote_line', 'create', data),
    update: (id, data) => API.request('quote_line', 'update', Object.assign({ id }, data)),
    delete: (id) => API.request('quote_line', 'delete', { id }),
    // v0.1.1: GETのURL長制限を避けるため、内部で自動的にチャンク分割する。
    // 呼び出し側のインターフェースは変更なし。
    replaceForQuote: (quoteNo, lines) => replaceForQuoteChunked(quoteNo, lines)
  },

  unitPrice: {
    list: () => API.request('unit_price', 'list'),
    get: (id) => API.request('unit_price', 'get', { id }),
    create: (data) => API.request('unit_price', 'create', data),
    update: (id, data) => API.request('unit_price', 'update', Object.assign({ id }, data)),
    delete: (id) => API.request('unit_price', 'delete', { id })
  },

  workCategory: {
    list: () => API.request('work_category', 'list'),
    get: (id) => API.request('work_category', 'get', { id }),
    create: (data) => API.request('work_category', 'create', data),
    update: (id, data) => API.request('work_category', 'update', Object.assign({ id }, data)),
    delete: (id) => API.request('work_category', 'delete', { id })
  },

  notesTemplate: {
    list: () => API.request('notes_template', 'list'),
    get: (id) => API.request('notes_template', 'get', { id }),
    create: (data) => API.request('notes_template', 'create', data),
    update: (id, data) => API.request('notes_template', 'update', Object.assign({ id }, data)),
    delete: (id) => API.request('notes_template', 'delete', { id })
  },

  setting: {
    list: () => API.request('setting', 'list'),
    get: (key) => API.request('setting', 'get', { id: key }),
    update: (key, value) => API.request('setting', 'update', { id: key, setting_value: value })
  },

  ai: {
    // 音声入力/AI入力: テキストを明細候補(配列)に分解する
    parseLines: (text) => API.request('ai', 'parse_lines', { text })
  }
};

/**
 * entity/action/data から GETリクエスト用のURLを組み立てる。
 * dataはJSON文字列にしてから1つのURLパラメータとして送る
 * (doPostの{entity, action, data}という構造をそのままGETで再現するため)。
 */
function buildGetUrl(entity, action, data) {
  const params = new URLSearchParams();
  params.set('entity', entity);
  params.set('action', action);
  params.set('data', JSON.stringify(data));
  return CONFIG.GAS_API_URL + '?' + params.toString();
}

/**
 * 見積明細の一括保存（GET方式・自動チャンク分割対応）。
 *
 * 1. clear_for_quote で既存明細をすべて削除
 * 2. lines を安全なサイズ(MAX_ENCODED_DATA_LENGTH)ごとに分割
 * 3. append_lines で分割したチャンクを順番に送信（並列だと行順序が崩れるため直列実行）
 *
 * README記載のAUTO_SPLIT_THRESHOLD_LINES(30行)程度までの通常の見積であれば
 * 通常1〜3回のリクエストで収まる想定。
 */
async function replaceForQuoteChunked(quoteNo, lines) {
  // Step 1: 既存明細をクリア
  await API.request('quote_line', 'clear_for_quote', { quote_no: quoteNo });

  if (!lines || lines.length === 0) {
    return {
      success: true,
      data: { quote_no: quoteNo, line_count: 0 },
      message: '明細をすべて削除しました'
    };
  }

  // Step 2: 安全なサイズのチャンクに分割
  const chunks = splitLinesIntoChunks(quoteNo, lines);

  // Step 3: チャンクを順番に追加保存
  let totalAdded = 0;
  for (const chunk of chunks) {
    const res = await API.request('quote_line', 'append_lines', { quote_no: quoteNo, lines: chunk });
    totalAdded += res.data.added_count;
  }

  return {
    success: true,
    data: { quote_no: quoteNo, line_count: totalAdded },
    message: chunks.length > 1
      ? `${totalAdded}件の明細を保存しました（${chunks.length}回に分けて送信）`
      : `${totalAdded}件の明細を保存しました`
  };
}

/**
 * linesをURL長の安全範囲(MAX_ENCODED_DATA_LENGTH)に収まるチャンクに分割する。
 * 1行だけでも上限を超える極端なケースでも、必ず1行以上を含む形で分割する
 * (無限ループを避けるため)。
 */
function splitLinesIntoChunks(quoteNo, lines) {
  const chunks = [];
  let currentChunk = [];

  for (const line of lines) {
    const testChunk = currentChunk.concat([line]);
    const encodedLength = encodeURIComponent(
      JSON.stringify({ quote_no: quoteNo, lines: testChunk })
    ).length;

    if (encodedLength > MAX_ENCODED_DATA_LENGTH && currentChunk.length > 0) {
      chunks.push(currentChunk);
      currentChunk = [line];
    } else {
      currentChunk = testChunk;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk);
  }
  return chunks;
}
