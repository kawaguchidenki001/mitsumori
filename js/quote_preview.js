/**
 * KE-Mitsumori 見積書プレビュー画面
 *
 * 実際の見積書フォーマットでHTML表示。
 * ブラウザの印刷機能でPDF化可能。
 * - 工種分割型と一覧型の2パターン対応
 * - 表紙 + 内訳明細ページ（分割型）
 */

const QuotePreview = {

  state: {
    quoteNo: null,
    project: null,
    lines: [],
    customer: null,
    workCategories: [],
    workCategoryMap: {},
    settings: {},
    outputPattern: 'flat'
  },

  async init(quoteNo) {
    this.state.quoteNo = quoteNo;
    await this.loadData(quoteNo);
    this.determineOutputPattern();
    this.render();
    this.bindEvents();
  },

  async loadData(quoteNo) {
    try {
      const [projRes, lineRes, custList, catRes, setRes] = await Promise.all([
        API.project.get(quoteNo),
        API.quoteLine.list(),
        API.customer.list(),
        API.workCategory.list(),
        API.setting.list()
      ]);
      this.state.project = projRes.data;
      this.state.lines = (lineRes.data || [])
        .filter(l => l.quote_no === quoteNo)
        .sort((a, b) => (a.row_no || 0) - (b.row_no || 0));
      this.state.customer = (custList.data || []).find(c => c.customer_id === this.state.project.customer_id);
      this.state.workCategories = (catRes.data || []).sort((a, b) =>
        (a.display_order || 99) - (b.display_order || 99));
      this.state.workCategoryMap = {};
      this.state.workCategories.forEach(c => { this.state.workCategoryMap[c.category_id] = c; });

      const settings = {};
      (setRes.data || []).forEach(s => { settings[s.setting_key] = s.setting_value; });
      this.state.settings = settings;
    } catch (err) {
      Util.toast(`データ取得エラー: ${err.message}`, 'error');
    }
  },

  determineOutputPattern() {
    const p = this.state.project;
    if (!p) return;

    if (p.output_pattern === 'split' || p.output_pattern === 'flat') {
      this.state.outputPattern = p.output_pattern;
      return;
    }

    const categoryCount = new Set(this.state.lines.map(l => l.category_id)).size;
    const lineCount = this.state.lines.length;
    if (lineCount >= CONFIG.AUTO_SPLIT_THRESHOLD_LINES ||
        categoryCount >= CONFIG.AUTO_SPLIT_THRESHOLD_CATEGORIES) {
      this.state.outputPattern = 'split';
    } else {
      this.state.outputPattern = 'flat';
    }
  },

  render() {
    this.renderToolbar();
    this.renderDocument();
  },

  renderToolbar() {
    const el = document.getElementById('qp-toolbar');
    if (!el) return;
    const p = this.state.project;
    if (!p) {
      el.innerHTML = '<div class="empty-state">案件データが読み込めません</div>';
      return;
    }

    el.innerHTML = `
      <div class="qp-toolbar-inner">
        <div class="qp-toolbar-left">
          <button class="icon-btn" id="qp-back">← 編集に戻る</button>
        </div>
        <div class="qp-toolbar-right">
          <select id="qp-pattern">
            <option value="auto" ${p.output_pattern === 'auto' ? 'selected' : ''}>自動判定</option>
            <option value="split" ${p.output_pattern === 'split' ? 'selected' : ''}>分割型</option>
            <option value="flat" ${p.output_pattern === 'flat' ? 'selected' : ''}>一覧型</option>
          </select>
          <button class="icon-btn" id="qp-print">印刷 / PDF</button>
        </div>
      </div>
    `;
  },

  renderDocument() {
    const el = document.getElementById('qp-document');
    if (!el) return;
    if (!this.state.project) {
      el.innerHTML = '';
      return;
    }

    if (this.state.outputPattern === 'split') {
      el.innerHTML = this.renderSplitPattern();
    } else {
      el.innerHTML = this.renderFlatPattern();
    }
  },

  // ===== 分割型 =====
  renderSplitPattern() {
    const p = this.state.project;
    const groups = this.groupLines();
    const usedCategories = this.state.workCategories.filter(c =>
      groups[c.category_id] && groups[c.category_id].length > 0);

    const totals = this.calcTotals();

    let html = '';
    html += this.renderCoverPage(p, usedCategories, groups, totals);

    usedCategories.forEach((cat, idx) => {
      html += this.renderCategoryPage(cat, groups[cat.category_id], idx + 2);
    });

    return html;
  },

  renderCoverPage(p, usedCategories, groups, totals) {
    const cust = this.state.customer;
    const company = cust ? cust.company_name : '（不明）';
    const taxIncluded = p.tax_display === '税込';

    const finalDisplay = taxIncluded ? totals.taxIncluded : totals.finalTotal;

    return `
      <div class="qp-page">
        ${this.renderPageHeader(p, 1)}
        <h1 class="qp-title">御見積書</h1>
        <div class="qp-date">${this.formatReiwaDate(p.issue_date)}</div>

        <div class="qp-recipient-row">
          <div class="qp-recipient">
            <div class="qp-recipient-name">${this.escapeHtml(company)} 御中</div>
            <div class="qp-recipient-greeting">
              下記の通り御見積申し上げます。<br>
              何卒ご用命賜ります様お願い申し上げます。
            </div>
          </div>
          <div class="qp-sender">
            ${this.renderSenderBlock()}
          </div>
        </div>

        <div class="qp-amount-box">
          <span class="qp-amount-label">金 額</span>
          <span class="qp-amount-value">${Util.formatMoney(finalDisplay)}</span>
        </div>

        <div class="qp-info-grid">
          <div class="qp-info-label">工事名</div>
          <div class="qp-info-value">${this.escapeHtml(p.project_name || '')}</div>
          <div class="qp-info-label">工事場所</div>
          <div class="qp-info-value">${this.escapeHtml(p.project_location || '')}</div>
          <div class="qp-info-label">有効期限</div>
          <div class="qp-info-value">発行日より1ヶ月</div>
          <div class="qp-info-label">備考</div>
          <div class="qp-info-value">${taxIncluded ? '消費税を含みます' : '消費税は含まれておりません'}${p.notes ? '<br>' + this.escapeHtml(p.notes) : ''}</div>
        </div>

        <table class="qp-summary-table">
          <thead>
            <tr><th class="qp-th-name">項　目　名　称</th><th class="qp-th-qty">数量</th><th class="qp-th-unit">単位</th><th class="qp-th-amount">金　額</th></tr>
          </thead>
          <tbody>
            ${usedCategories.map(cat => {
              const subtotal = (groups[cat.category_id] || []).reduce((sum, l) => sum + this.lineAmount(l), 0);
              return `<tr>
                <td>${this.escapeHtml(cat.category_name)}</td>
                <td class="qp-num">1</td>
                <td class="qp-cell-center">式</td>
                <td class="qp-num">${Util.formatMoney(subtotal).replace('¥', '')}</td>
              </tr>`;
            }).join('')}
            <tr class="qp-subtotal-row">
              <td colspan="3">小　計</td>
              <td class="qp-num">${Util.formatMoney(totals.subtotal).replace('¥', '')}</td>
            </tr>
            <tr>
              <td colspan="3">諸経費</td>
              <td class="qp-num">${Util.formatMoney(totals.overheadAmount).replace('¥', '')}</td>
            </tr>
            <tr class="qp-total-row">
              <td colspan="3">合　計</td>
              <td class="qp-num">${Util.formatMoney(totals.total).replace('¥', '')}</td>
            </tr>
            ${totals.discount !== 0 ? `<tr class="qp-discount-row">
              <td colspan="3">値引き</td>
              <td class="qp-num">${this.formatSignedMoney(totals.discount).replace('¥', '')}</td>
            </tr>` : ''}
            ${totals.finalAdjustment !== 0 ? `<tr class="qp-discount-row">
              <td colspan="3">出精値引き</td>
              <td class="qp-num">${this.formatSignedMoney(totals.finalAdjustment).replace('¥', '')}</td>
            </tr>` : ''}
            <tr class="qp-final-row">
              <td colspan="3">合　計</td>
              <td class="qp-num">${Util.formatMoney(totals.finalTotal).replace('¥', '')}</td>
            </tr>
            ${taxIncluded ? `
              <tr>
                <td colspan="3">消費税 (${CONFIG.DEFAULT_TAX_RATE}%)</td>
                <td class="qp-num">${Util.formatMoney(totals.taxAmount).replace('¥', '')}</td>
              </tr>
              <tr class="qp-final-row">
                <td colspan="3">税込合計</td>
                <td class="qp-num">${Util.formatMoney(totals.taxIncluded).replace('¥', '')}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;
  },

  renderCategoryPage(cat, lines, pageNum) {
    const p = this.state.project;
    const subtotal = lines.reduce((sum, l) => sum + this.lineAmount(l), 0);

    return `
      <div class="qp-page qp-detail-page">
        ${this.renderPageHeader(p, pageNum, '内訳明細')}
        <h2 class="qp-category-title">${this.escapeHtml(cat.category_name)}</h2>

        <table class="qp-detail-table">
          <thead>
            <tr>
              <th class="qp-th-name">品 名 及 び 仕 様</th>
              <th class="qp-th-qty">数 量</th>
              <th class="qp-th-unit">単位</th>
              <th class="qp-th-price">単 価</th>
              <th class="qp-th-amount">金 額</th>
            </tr>
          </thead>
          <tbody>
            ${lines.map(line => this.renderDetailRow(line)).join('')}
            <tr class="qp-detail-subtotal">
              <td colspan="4">合　計</td>
              <td class="qp-num">${Util.formatMoney(subtotal).replace('¥', '')}</td>
            </tr>
          </tbody>
        </table>

        ${cat.default_notes ? `<div class="qp-notes">${this.escapeHtml(cat.default_notes).replace(/\n/g, '<br>')}</div>` : ''}
      </div>
    `;
  },

  renderDetailRow(line) {
    const supplied = line.is_supplied;
    const showPrice = line.show_price && supplied;
    const qty = line.qty || 0;
    const unit = line.unit || '';
    const price = line.price || 0;
    const amount = this.lineAmount(line);

    const nameDisplay = line.item_name +
      (line.spec ? '　' + line.spec : '') +
      (supplied ? '　（支給品）' : '');

    if (supplied && !showPrice) {
      return `<tr>
        <td>${this.escapeHtml(nameDisplay)}</td>
        <td class="qp-num">${qty}</td>
        <td class="qp-cell-center">${this.escapeHtml(unit)}</td>
        <td></td>
        <td></td>
      </tr>`;
    }

    return `<tr>
      <td>${this.escapeHtml(nameDisplay)}</td>
      <td class="qp-num">${qty}</td>
      <td class="qp-cell-center">${this.escapeHtml(unit)}</td>
      <td class="qp-num">${price ? Number(price).toLocaleString('ja-JP') : ''}</td>
      <td class="qp-num">${amount ? Number(amount).toLocaleString('ja-JP') : ''}</td>
    </tr>`;
  },

  // ===== 一覧型 =====
  renderFlatPattern() {
    const p = this.state.project;
    const cust = this.state.customer;
    const company = cust ? cust.company_name : '（不明）';
    const taxIncluded = p.tax_display === '税込';
    const totals = this.calcTotals();

    return `
      <div class="qp-page">
        ${this.renderPageHeader(p, 1)}
        <h1 class="qp-title">御見積書</h1>
        <div class="qp-date">${this.formatReiwaDate(p.issue_date)}</div>

        <div class="qp-recipient-row">
          <div class="qp-recipient">
            <div class="qp-recipient-name">${this.escapeHtml(company)} 御中</div>
            <div class="qp-recipient-greeting">
              下記の通り御見積申し上げます。<br>
              何卒ご用命賜ります様お願い申し上げます。
            </div>
          </div>
          <div class="qp-sender">${this.renderSenderBlock()}</div>
        </div>

        <div class="qp-amount-box-flat">
          <div><span>金　額</span><span class="qp-amount-value">${Util.formatMoney(taxIncluded ? totals.taxIncluded : totals.finalTotal)}</span></div>
          ${taxIncluded ? `<div><span>消費税</span><span>${Util.formatMoney(totals.taxAmount)}</span></div>` : ''}
        </div>

        <div class="qp-info-grid">
          <div class="qp-info-label">工事名</div>
          <div class="qp-info-value">${this.escapeHtml(p.project_name || '')}</div>
          <div class="qp-info-label">工事場所</div>
          <div class="qp-info-value">${this.escapeHtml(p.project_location || '')}</div>
          <div class="qp-info-label">有効期限</div>
          <div class="qp-info-value">発行日より1ヶ月</div>
          <div class="qp-info-label">備考</div>
          <div class="qp-info-value">${p.notes ? this.escapeHtml(p.notes) : ''}</div>
        </div>

        <table class="qp-detail-table">
          <thead>
            <tr>
              <th class="qp-th-name">品 名 及 び 仕 様</th>
              <th class="qp-th-qty">数量</th>
              <th class="qp-th-unit">単位</th>
              <th class="qp-th-price">単 価</th>
              <th class="qp-th-amount">金 額</th>
            </tr>
          </thead>
          <tbody>
            ${this.state.lines.map(line => this.renderDetailRow(line)).join('')}
            <tr class="qp-detail-subtotal">
              <td colspan="4">諸経費</td>
              <td class="qp-num">${Util.formatMoney(totals.overheadAmount).replace('¥', '')}</td>
            </tr>
            ${totals.discount !== 0 ? `<tr class="qp-discount-row">
              <td colspan="4">値引き</td>
              <td class="qp-num">${this.formatSignedMoney(totals.discount).replace('¥', '')}</td>
            </tr>` : ''}
            ${totals.finalAdjustment !== 0 ? `<tr class="qp-discount-row">
              <td colspan="4">出精値引き</td>
              <td class="qp-num">${this.formatSignedMoney(totals.finalAdjustment).replace('¥', '')}</td>
            </tr>` : ''}
            <tr class="qp-final-row">
              <td colspan="4">合　計</td>
              <td class="qp-num">${Util.formatMoney(totals.finalTotal).replace('¥', '')}</td>
            </tr>
            ${taxIncluded ? `
              <tr>
                <td colspan="4">消費税 (${CONFIG.DEFAULT_TAX_RATE}%)</td>
                <td class="qp-num">${Util.formatMoney(totals.taxAmount).replace('¥', '')}</td>
              </tr>
              <tr class="qp-final-row">
                <td colspan="4">税込合計</td>
                <td class="qp-num">${Util.formatMoney(totals.taxIncluded).replace('¥', '')}</td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    `;
  },

  // ===== 共通パーツ =====
  renderPageHeader(p, pageNum, label) {
    return `
      <div class="qp-page-meta">
        <span>No. ${this.escapeHtml(p.quote_no || '')}${label ? ' ' + this.escapeHtml(label) : ''}</span>
        <span>P. ${pageNum}</span>
      </div>
    `;
  },

  renderSenderBlock() {
    const s = this.state.settings;
    return `
      <div class="qp-sender-text">${this.escapeHtml(s.company_name || '河口電機株式会社')}<br>
        ${this.escapeHtml(s.company_business || '電気設備工事 設計施工')}<br>
        〒${this.escapeHtml(s.company_postal || '500-8285')}<br>
        ${this.escapeHtml(s.company_address || '岐阜市南鶉6丁目40-3')}<br>
        Tel ${this.escapeHtml(s.company_tel || '058-275-4141')}<br>
        Fax ${this.escapeHtml(s.company_fax || '058-275-4133')}<br>
        ${this.escapeHtml(s.company_president || '代表取締役 河口安男')}<br>
        担当：${this.escapeHtml(this.state.project.owner || '河口')}</div>
    `;
  },

  // ===== 計算 =====
  groupLines() {
    const groups = {};
    this.state.lines.forEach(line => {
      const catId = line.category_id || 'uncategorized';
      if (!groups[catId]) groups[catId] = [];
      groups[catId].push(line);
    });
    return groups;
  },

  lineAmount(line) {
    if (line.is_supplied && !line.show_price) return 0;
    const qty = Number(line.qty) || 0;
    const price = Number(line.price) || 0;
    return Math.round(qty * price);
  },

  calcTotals() {
    const p = this.state.project;
    const subtotal = this.state.lines.reduce((sum, l) => sum + this.lineAmount(l), 0);
    const overheadRate = Number(p.overhead_rate) || 0;
    const overheadAmount = Math.round(subtotal * overheadRate / 100);
    const total = subtotal + overheadAmount;
    const discount = Number(p.discount) || 0;
    const finalAdjustment = Number(p.final_adjustment) || 0;
    const finalTotal = total + discount + finalAdjustment;
    const taxRate = CONFIG.DEFAULT_TAX_RATE;
    const taxAmount = Math.round(finalTotal * taxRate / 100);
    const taxIncluded = finalTotal + taxAmount;

    return { subtotal, overheadRate, overheadAmount, total, discount, finalAdjustment, finalTotal, taxAmount, taxIncluded };
  },

  // ===== ユーティリティ =====
  formatReiwaDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const reiwa = d.getFullYear() - 2018;
    return `令和 ${reiwa}年 ${d.getMonth() + 1}月 ${d.getDate()}日`;
  },

  formatSignedMoney(value) {
    if (value === 0) return '¥0';
    if (value < 0) return '-' + Util.formatMoney(Math.abs(value));
    return Util.formatMoney(value);
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  bindEvents() {
    document.getElementById('qp-back')?.addEventListener('click', () => {
      if (this.state.quoteNo) Router.navigate(`/edit/${this.state.quoteNo}`);
      else Router.navigate('/dashboard');
    });

    document.getElementById('qp-pattern')?.addEventListener('change', (e) => {
      const val = e.target.value;
      this.state.project.output_pattern = val;
      this.determineOutputPattern();
      this.renderDocument();
    });

    document.getElementById('qp-print')?.addEventListener('click', () => {
      window.print();
    });
  }
};
