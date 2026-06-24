/**
 * KE-Mitsumori API クライアント
 *
 * GAS バックエンドへの呼び出しを抽象化する。
 * config.js の USE_MOCK = true のときは mockApi.js を使用。
 */

const API = {

  /**
   * 汎用API呼び出し
   */
  async request(entity, action, data) {
    // モックモード時はモックAPIへ
    if (CONFIG.USE_MOCK) {
      return await MockApi.request(entity, action, data);
    }

    if (!CONFIG.GAS_API_URL) {
      throw new Error('GAS_API_URL が config.js に設定されていません（または USE_MOCK を true にしてください）');
    }

    const payload = { entity, action, data: data || {} };

    try {
      const response = await fetch(CONFIG.GAS_API_URL, {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
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
    replaceForQuote: (quoteNo, lines) => API.request('quote_line', 'replace_for_quote', { quote_no: quoteNo, lines: lines })
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
  }
};
