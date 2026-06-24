/**
 * KE-Mitsumori 共通ユーティリティ
 */

const Util = {

  /**
   * 数値を金額表記にフォーマット（カンマ区切り）
   */
  formatMoney(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return '¥' + num.toLocaleString('ja-JP');
  },

  /**
   * 数値を数値のみのカンマ区切りでフォーマット
   */
  formatNumber(value) {
    if (value === null || value === undefined || value === '') return '';
    const num = Number(value);
    if (isNaN(num)) return String(value);
    return num.toLocaleString('ja-JP');
  },

  /**
   * 日付を和暦表示にフォーマット (R8.3.7)
   */
  formatReiwa(dateInput) {
    if (!dateInput) return '';
    const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const reiwaYear = date.getFullYear() - 2018;
    return `R${reiwaYear}.${date.getMonth() + 1}.${date.getDate()}`;
  },

  /**
   * 日付をISO形式 (YYYY-MM-DD) にフォーマット
   */
  formatDate(dateInput) {
    if (!dateInput) return '';
    const date = (dateInput instanceof Date) ? dateInput : new Date(dateInput);
    if (isNaN(date.getTime())) return String(dateInput);

    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  /**
   * localStorage 読み書き
   */
  storage: {
    set(key, value) {
      try {
        localStorage.setItem(CONFIG.STORAGE_PREFIX + key, JSON.stringify(value));
        return true;
      } catch (err) {
        console.error('Storage set error:', err);
        return false;
      }
    },
    get(key, defaultValue = null) {
      try {
        const v = localStorage.getItem(CONFIG.STORAGE_PREFIX + key);
        return v === null ? defaultValue : JSON.parse(v);
      } catch (err) {
        console.error('Storage get error:', err);
        return defaultValue;
      }
    },
    remove(key) {
      localStorage.removeItem(CONFIG.STORAGE_PREFIX + key);
    },
    clear() {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CONFIG.STORAGE_PREFIX)) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    }
  },

  /**
   * トースト通知（簡易版）
   */
  toast(message, type = 'info') {
    const el = document.createElement('div');
    el.className = `toast toast-${type}`;
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 300);
    }, 3000);
  },

  /**
   * debounce
   */
  debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  },

  /**
   * 諸経費率の推奨値を計算
   * @param {number} subtotal 小計（円）
   * @param {string} customerType 民間／同業／元請
   * @returns {number} 推奨諸経費率（%）
   */
  recommendOverheadRate(subtotal, customerType) {
    let rate = 12;

    // 規模補正
    if (subtotal < 2000000) {
      rate += 1;
    } else if (subtotal >= 10000000) {
      rate -= 1;
    }

    // 顧客タイプ補正
    if (customerType === '同業') rate -= 1;
    if (customerType === '元請') rate -= 1;

    // 10-15%にクランプ
    return Math.max(10, Math.min(15, rate));
  }
};

/**
 * CSV変換ユーティリティ
 */
const CSV = {

  /**
   * オブジェクト配列をCSV文字列に変換
   * @param {Array} rows オブジェクト配列
   * @param {Array} headers 列の順序を制御（省略時は最初のオブジェクトのキー順）
   * @returns {string} CSV文字列（先頭行はヘッダ）
   */
  stringify(rows, headers) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return headers ? headers.join(',') + '\n' : '';
    }
    const cols = headers || Object.keys(rows[0]);
    const lines = [cols.map(c => this.escape(c)).join(',')];
    rows.forEach(row => {
      lines.push(cols.map(c => this.escape(row[c])).join(','));
    });
    // BOM付き UTF-8（Excelで文字化けしないように）
    return '\uFEFF' + lines.join('\r\n');
  },

  /**
   * CSV文字列をオブジェクト配列にパース
   * 先頭行をヘッダとして扱う
   * @param {string} csv CSV文字列
   * @returns {Array<Object>} オブジェクト配列
   */
  parse(csv) {
    if (!csv) return [];
    // BOM除去
    csv = csv.replace(/^\uFEFF/, '');
    const rows = this.parseLines(csv);
    if (rows.length === 0) return [];
    const headers = rows[0];
    return rows.slice(1).filter(r => r.length > 0 && r.some(v => v !== '')).map(row => {
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] !== undefined ? row[i] : '';
      });
      return obj;
    });
  },

  /**
   * CSV全体を行・セル配列にパース（RFC4180準拠の簡易版）
   */
  parseLines(csv) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuote = false;
    let i = 0;
    while (i < csv.length) {
      const ch = csv[i];
      if (inQuote) {
        if (ch === '"') {
          if (csv[i + 1] === '"') {
            cell += '"';
            i += 2;
            continue;
          }
          inQuote = false;
          i++;
          continue;
        }
        cell += ch;
        i++;
        continue;
      }
      if (ch === '"') {
        inQuote = true;
        i++;
        continue;
      }
      if (ch === ',') {
        row.push(cell);
        cell = '';
        i++;
        continue;
      }
      if (ch === '\r') {
        if (csv[i + 1] === '\n') i++;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
        continue;
      }
      if (ch === '\n') {
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
        i++;
        continue;
      }
      cell += ch;
      i++;
    }
    if (cell !== '' || row.length > 0) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  },

  /**
   * CSVセルのエスケープ（カンマ・改行・ダブルクオート含む場合）
   */
  escape(value) {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (s.includes(',') || s.includes('\n') || s.includes('\r') || s.includes('"')) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  }
};

/**
 * ファイルダウンロードヘルパー
 */
function downloadAsFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType || 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/**
 * ファイル選択ダイアログを開き、テキストとして読み込む
 */
function pickTextFile(accept) {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept || '.csv,.txt,.json';
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) {
        reject(new Error('ファイルが選択されませんでした'));
        return;
      }
      const reader = new FileReader();
      reader.onload = (e) => resolve({ text: e.target.result, name: file.name, size: file.size });
      reader.onerror = () => reject(new Error('ファイル読込に失敗しました'));
      reader.readAsText(file, 'UTF-8');
    });
    document.body.appendChild(input);
    input.click();
    setTimeout(() => document.body.removeChild(input), 1000);
  });
}
