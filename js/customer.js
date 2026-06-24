/**
 * KE-Mitsumori 顧客マスタ管理画面
 *
 * 顧客一覧表示・新規登録・編集・削除。
 */

const CustomerScreen = {

  state: {
    customers: [],
    filterType: 'all',
    searchKeyword: '',
    editingCustomer: null
  },

  async init() {
    await this.loadData();
    this.render();
    this.bindEvents();
  },

  async loadData() {
    try {
      const res = await API.customer.list();
      this.state.customers = res.data || [];
    } catch (err) {
      Util.toast(`データ取得エラー: ${err.message}`, 'error');
      this.state.customers = [];
    }
  },

  render() {
    const el = document.getElementById('cust-list');
    if (!el) return;

    let list = [...this.state.customers];

    if (this.state.filterType !== 'all') {
      list = list.filter(c => c.customer_type === this.state.filterType);
    }

    if (this.state.searchKeyword) {
      const kw = this.state.searchKeyword.toLowerCase();
      list = list.filter(c => {
        return (c.company_name || '').toLowerCase().includes(kw) ||
               (c.contact_person || '').toLowerCase().includes(kw);
      });
    }

    list.sort((a, b) => {
      const da = new Date(a.updated_at || 0);
      const db = new Date(b.updated_at || 0);
      return db - da;
    });

    const countEl = document.getElementById('cust-count');
    if (countEl) countEl.textContent = `全${list.length}件`;

    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state">該当する顧客がありません</div>';
      return;
    }

    el.innerHTML = list.map(c => {
      const typeClass = this.typeClassOf(c.customer_type);
      const tel = c.tel ? `TEL: ${c.tel}` : '';
      const contact = c.contact_person ? `担当: ${c.contact_person}` : '';

      return `
        <div class="customer-card" data-id="${c.customer_id}">
          <div class="customer-header">
            <div class="customer-name">${this.escapeHtml(c.company_name)}</div>
            <div class="customer-actions">
              <button class="icon-btn btn-edit" title="編集" data-id="${c.customer_id}">編集</button>
              <button class="icon-btn btn-delete" title="削除" data-id="${c.customer_id}">削除</button>
            </div>
          </div>
          <div class="customer-meta">${this.escapeHtml(contact)} ${tel ? '/ ' + this.escapeHtml(tel) : ''}</div>
          <div class="customer-tags">
            <span class="badge ${typeClass}">${this.escapeHtml(c.customer_type || '民間')}</span>
            ${c.discount_tendency ? `<span class="badge badge-default">${this.escapeHtml(c.discount_tendency)}</span>` : ''}
          </div>
          ${c.memo ? `<div class="customer-memo">${this.escapeHtml(c.memo)}</div>` : ''}
        </div>
      `;
    }).join('');

    el.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditDialog(btn.dataset.id);
      });
    });

    el.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDelete(btn.dataset.id);
      });
    });
  },

  typeClassOf(type) {
    if (type === '元請') return 'badge-warning';
    if (type === '同業') return 'badge-success';
    return 'badge-info';
  },

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  openEditDialog(id) {
    const customer = id ? this.state.customers.find(c => c.customer_id === id) : null;
    this.state.editingCustomer = customer ? Object.assign({}, customer) : {
      customer_id: '',
      company_name: '',
      contact_person: '',
      postal_code: '',
      address: '',
      tel: '',
      fax: '',
      email: '',
      customer_type: '民間',
      discount_tendency: '通常',
      memo: ''
    };

    this.renderDialog();
  },

  renderDialog() {
    const c = this.state.editingCustomer;
    const isNew = !c.customer_id;

    const dialog = document.getElementById('cust-dialog');
    dialog.innerHTML = `
      <div class="dialog-overlay" id="dialog-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>${isNew ? '顧客を新規登録' : '顧客情報を編集'}</h3>
            <button class="icon-btn" id="dialog-close">×</button>
          </div>
          <div class="dialog-body">
            <div class="form-group">
              <label>会社名 <span class="required">*</span></label>
              <input type="text" id="f-company_name" value="${this.escapeHtml(c.company_name)}" required>
            </div>
            <div class="form-group">
              <label>担当者</label>
              <input type="text" id="f-contact_person" value="${this.escapeHtml(c.contact_person)}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>顧客タイプ</label>
                <select id="f-customer_type">
                  <option value="民間" ${c.customer_type === '民間' ? 'selected' : ''}>民間</option>
                  <option value="同業" ${c.customer_type === '同業' ? 'selected' : ''}>同業</option>
                  <option value="元請" ${c.customer_type === '元請' ? 'selected' : ''}>元請</option>
                </select>
              </div>
              <div class="form-group">
                <label>値引き傾向</label>
                <select id="f-discount_tendency">
                  <option value="通常" ${c.discount_tendency === '通常' ? 'selected' : ''}>通常</option>
                  <option value="値引き多め" ${c.discount_tendency === '値引き多め' ? 'selected' : ''}>値引き多め</option>
                  <option value="値引きなし" ${c.discount_tendency === '値引きなし' ? 'selected' : ''}>値引きなし</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>TEL</label>
                <input type="text" id="f-tel" value="${this.escapeHtml(c.tel)}">
              </div>
              <div class="form-group">
                <label>FAX</label>
                <input type="text" id="f-fax" value="${this.escapeHtml(c.fax)}">
              </div>
            </div>
            <div class="form-group">
              <label>郵便番号</label>
              <input type="text" id="f-postal_code" value="${this.escapeHtml(c.postal_code)}">
            </div>
            <div class="form-group">
              <label>住所</label>
              <input type="text" id="f-address" value="${this.escapeHtml(c.address)}">
            </div>
            <div class="form-group">
              <label>メール</label>
              <input type="email" id="f-email" value="${this.escapeHtml(c.email)}">
            </div>
            <div class="form-group">
              <label>備考</label>
              <textarea id="f-memo" rows="2">${this.escapeHtml(c.memo)}</textarea>
            </div>
          </div>
          <div class="dialog-footer">
            <button class="secondary" id="dialog-cancel">キャンセル</button>
            <button id="dialog-save">${isNew ? '登録' : '保存'}</button>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    document.getElementById('dialog-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'dialog-overlay') this.closeDialog();
    });
    document.getElementById('dialog-close').addEventListener('click', () => this.closeDialog());
    document.getElementById('dialog-cancel').addEventListener('click', () => this.closeDialog());
    document.getElementById('dialog-save').addEventListener('click', () => this.saveCustomer());
  },

  closeDialog() {
    const dialog = document.getElementById('cust-dialog');
    dialog.classList.remove('open');
    dialog.innerHTML = '';
    this.state.editingCustomer = null;
  },

  async saveCustomer() {
    const c = this.state.editingCustomer;
    if (!c) return;

    const data = {
      company_name: document.getElementById('f-company_name').value.trim(),
      contact_person: document.getElementById('f-contact_person').value.trim(),
      customer_type: document.getElementById('f-customer_type').value,
      discount_tendency: document.getElementById('f-discount_tendency').value,
      tel: document.getElementById('f-tel').value.trim(),
      fax: document.getElementById('f-fax').value.trim(),
      postal_code: document.getElementById('f-postal_code').value.trim(),
      address: document.getElementById('f-address').value.trim(),
      email: document.getElementById('f-email').value.trim(),
      memo: document.getElementById('f-memo').value.trim()
    };

    if (!data.company_name) {
      Util.toast('会社名は必須です', 'warning');
      return;
    }

    try {
      if (c.customer_id) {
        await API.customer.update(c.customer_id, data);
        Util.toast('顧客情報を更新しました', 'success');
      } else {
        await API.customer.create(data);
        Util.toast('顧客を登録しました', 'success');
      }
      this.closeDialog();
      await this.loadData();
      this.render();
    } catch (err) {
      Util.toast(`保存エラー: ${err.message}`, 'error');
    }
  },

  async confirmDelete(id) {
    const c = this.state.customers.find(x => x.customer_id === id);
    if (!c) return;
    if (!confirm(`「${c.company_name}」を削除しますか？\n（関連する案件は削除されません）`)) return;

    try {
      await API.customer.delete(id);
      Util.toast('顧客を削除しました', 'success');
      await this.loadData();
      this.render();
    } catch (err) {
      Util.toast(`削除エラー: ${err.message}`, 'error');
    }
  },

  // ===== CSV出力 =====
  exportCsv() {
    const headers = ['customer_id', 'company_name', 'contact_person', 'postal_code', 'address', 'tel', 'fax', 'email', 'customer_type', 'discount_tendency', 'memo'];
    const rows = this.state.customers.map(c => {
      const row = {};
      headers.forEach(h => { row[h] = c[h] !== undefined && c[h] !== null ? c[h] : ''; });
      return row;
    });
    const csv = CSV.stringify(rows, headers);
    const today = Util.formatDate(new Date());
    downloadAsFile(csv, `customers_${today}.csv`, 'text/csv;charset=utf-8');
    Util.toast(`${rows.length}件をCSV出力しました`, 'success');
  },

  // ===== CSV取込 =====
  async importCsv() {
    let file;
    try {
      file = await pickTextFile('.csv');
    } catch (err) {
      return;
    }

    let rows;
    try {
      rows = CSV.parse(file.text);
    } catch (err) {
      Util.toast(`CSV解析エラー: ${err.message}`, 'error');
      return;
    }

    if (rows.length === 0) {
      Util.toast('CSVにデータが含まれていません', 'warning');
      return;
    }

    const validRows = [];
    const errors = [];
    const existingIds = new Set(this.state.customers.map(c => c.customer_id));
    const allowedTypes = ['民間', '同業', '元請'];

    rows.forEach((row, idx) => {
      const rowErrors = [];
      if (!row.company_name) rowErrors.push('会社名が空');
      if (row.customer_type && !allowedTypes.includes(row.customer_type)) {
        rowErrors.push(`顧客タイプが不正: ${row.customer_type}`);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: idx + 2, errors: rowErrors });
      } else {
        validRows.push({
          customer_id: row.customer_id || '',
          company_name: row.company_name,
          contact_person: row.contact_person || '',
          postal_code: row.postal_code || '',
          address: row.address || '',
          tel: row.tel || '',
          fax: row.fax || '',
          email: row.email || '',
          customer_type: row.customer_type || '民間',
          discount_tendency: row.discount_tendency || '通常',
          memo: row.memo || '',
          _isUpdate: row.customer_id && existingIds.has(row.customer_id)
        });
      }
    });

    this.showImportPreview(file.name, validRows, errors);
  },

  showImportPreview(filename, validRows, errors) {
    const container = document.getElementById('cust-dialog');
    const newCount = validRows.filter(r => !r._isUpdate).length;
    const updateCount = validRows.filter(r => r._isUpdate).length;

    container.innerHTML = `
      <div class="dialog-overlay" id="cust-import-overlay">
        <div class="dialog" style="max-width: 700px;">
          <div class="dialog-header">
            <h3>CSV取込プレビュー</h3>
            <button class="icon-btn" id="cust-import-close">×</button>
          </div>
          <div class="dialog-body">
            <p style="font-size: 12px; margin: 0 0 8px;">${this.escapeHtml(filename)}</p>
            <p style="font-size: 13px; margin: 0 0 12px;">
              新規 <strong>${newCount}件</strong> /
              更新 <strong>${updateCount}件</strong> /
              エラー <strong style="color: var(--color-error);">${errors.length}件</strong>
            </p>

            ${errors.length > 0 ? `
              <div class="csv-error-list">
                <strong>エラー（取込から除外されます）:</strong>
                <ul>
                  ${errors.slice(0, 10).map(e => `<li>行${e.row}: ${this.escapeHtml(e.errors.join(', '))}</li>`).join('')}
                  ${errors.length > 10 ? `<li>... 他 ${errors.length - 10}件</li>` : ''}
                </ul>
              </div>
            ` : ''}

            ${validRows.length > 0 ? `
              <div class="csv-preview">
                <table>
                  <thead>
                    <tr>
                      <th>区分</th>
                      <th>ID</th>
                      <th>会社名</th>
                      <th>担当</th>
                      <th>タイプ</th>
                      <th>TEL</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${validRows.slice(0, 30).map(r => `
                      <tr>
                        <td><span class="badge ${r._isUpdate ? 'badge-warning' : 'badge-success'}">${r._isUpdate ? '更新' : '新規'}</span></td>
                        <td>${this.escapeHtml(r.customer_id || '自動')}</td>
                        <td>${this.escapeHtml(r.company_name)}</td>
                        <td>${this.escapeHtml(r.contact_person)}</td>
                        <td>${this.escapeHtml(r.customer_type)}</td>
                        <td>${this.escapeHtml(r.tel)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ${validRows.length > 30 ? `<div style="padding: 6px 8px; font-size: 11px; color: var(--color-text-secondary);">先頭30件を表示（残${validRows.length - 30}件は省略）</div>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="dialog-footer">
            <button class="secondary" id="cust-import-cancel">キャンセル</button>
            <button id="cust-import-execute" ${validRows.length === 0 ? 'disabled' : ''}>${validRows.length}件を取込</button>
          </div>
        </div>
      </div>
    `;
    container.classList.add('open');

    document.getElementById('cust-import-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'cust-import-overlay') this.closeDialog();
    });
    document.getElementById('cust-import-close').addEventListener('click', () => this.closeDialog());
    document.getElementById('cust-import-cancel').addEventListener('click', () => this.closeDialog());
    document.getElementById('cust-import-execute').addEventListener('click', () => this.executeImport(validRows));
  },

  async executeImport(validRows) {
    if (validRows.length === 0) return;

    const execBtn = document.getElementById('cust-import-execute');
    if (execBtn) execBtn.disabled = true;

    let okCount = 0;
    let ngCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const data = Object.assign({}, r);
      delete data._isUpdate;

      try {
        if (r._isUpdate) {
          await API.customer.update(r.customer_id, data);
        } else {
          delete data.customer_id;
          await API.customer.create(data);
        }
        okCount++;
      } catch (err) {
        console.error(`取込エラー (${r.company_name}):`, err);
        ngCount++;
      }

      if (execBtn) {
        execBtn.textContent = `処理中... ${i + 1}/${validRows.length}`;
      }
    }

    this.closeDialog();
    if (ngCount > 0) {
      Util.toast(`取込完了: 成功${okCount}件 / 失敗${ngCount}件`, 'warning');
    } else {
      Util.toast(`${okCount}件を取込みました`, 'success');
    }
    await this.loadData();
    this.render();
  },

  bindEvents() {
    document.getElementById('cust-back')?.addEventListener('click', () => {
      Router.navigate('/dashboard');
    });

    document.getElementById('cust-new')?.addEventListener('click', () => {
      this.openEditDialog(null);
    });

    document.getElementById('cust-export')?.addEventListener('click', () => this.exportCsv());
    document.getElementById('cust-import')?.addEventListener('click', () => this.importCsv());

    document.getElementById('cust-search')?.addEventListener('input', Util.debounce((e) => {
      this.state.searchKeyword = e.target.value;
      this.render();
    }, 200));

    document.getElementById('cust-filter')?.addEventListener('change', (e) => {
      this.state.filterType = e.target.value;
      this.render();
    });
  }
};
