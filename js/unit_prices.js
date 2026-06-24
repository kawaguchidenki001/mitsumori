/**
 * KE-Mitsumori 単価マスタ管理画面
 *
 * 単価マスタの一覧表示・検索・フィルタ・CRUD全機能。
 */

const UnitPriceScreen = {

  state: {
    unitPrices: [],
    categories: [],
    categoryMap: {},
    filterCategory: 'all',
    searchKeyword: '',
    sortBy: 'usage',
    editingPrice: null
  },

  async init() {
    await this.loadData();
    this.render();
    this.bindEvents();
  },

  async loadData() {
    try {
      const [priceRes, catRes] = await Promise.all([
        API.unitPrice.list(),
        API.workCategory.list()
      ]);
      this.state.unitPrices = priceRes.data || [];
      this.state.categories = (catRes.data || []).sort((a, b) =>
        (a.display_order || 99) - (b.display_order || 99));
      this.state.categoryMap = {};
      this.state.categories.forEach(c => {
        this.state.categoryMap[c.category_id] = c;
      });
    } catch (err) {
      Util.toast(`データ取得エラー: ${err.message}`, 'error');
      this.state.unitPrices = [];
      this.state.categories = [];
    }
  },

  render() {
    this.renderFilter();
    this.renderList();
  },

  renderFilter() {
    const el = document.getElementById('up-filter');
    if (!el) return;
    el.innerHTML = `
      <option value="all">全工種</option>
      ${this.state.categories.map(c =>
        `<option value="${c.category_id}">${this.escapeHtml(c.category_name)}</option>`
      ).join('')}
    `;
    el.value = this.state.filterCategory;
  },

  renderList() {
    const el = document.getElementById('up-list');
    if (!el) return;

    let list = [...this.state.unitPrices];

    if (this.state.filterCategory !== 'all') {
      list = list.filter(p => p.category_id === this.state.filterCategory);
    }

    if (this.state.searchKeyword) {
      const kw = this.state.searchKeyword.toLowerCase();
      list = list.filter(p => {
        return (p.item_name || '').toLowerCase().includes(kw) ||
               (p.spec || '').toLowerCase().includes(kw) ||
               (p.maker || '').toLowerCase().includes(kw);
      });
    }

    if (this.state.sortBy === 'usage') {
      list.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
    } else if (this.state.sortBy === 'name') {
      list.sort((a, b) => (a.item_name || '').localeCompare(b.item_name || '', 'ja'));
    } else if (this.state.sortBy === 'price') {
      list.sort((a, b) => (b.price_embedded || 0) - (a.price_embedded || 0));
    }

    const countEl = document.getElementById('up-count');
    if (countEl) {
      const catName = this.state.filterCategory !== 'all'
        ? this.state.categoryMap[this.state.filterCategory]?.category_name || ''
        : '';
      countEl.textContent = `全${list.length}件${catName ? ' / ' + catName : ''}`;
    }

    if (list.length === 0) {
      el.innerHTML = '<div class="empty-state">該当する単価がありません</div>';
      return;
    }

    el.innerHTML = list.map(p => {
      const cat = this.state.categoryMap[p.category_id];
      const catName = cat ? cat.category_name : '';
      const exposedPrice = p.price_exposed
        ? `<div class="up-sub">露出 ¥${Number(p.price_exposed).toLocaleString('ja-JP')}</div>`
        : '';
      const usageTag = p.usage_count
        ? `<span class="up-tag">使用 ${p.usage_count}回</span>`
        : '';
      const lastUsedTag = p.last_used_at
        ? `<span class="up-tag">最終 ${Util.formatReiwa(p.last_used_at)}</span>`
        : '';
      const catTag = catName ? `<span class="up-tag">${this.escapeHtml(catName)}</span>` : '';
      const makerInfo = p.maker ? this.escapeHtml(p.maker) + ' / ' : '';

      return `
        <div class="up-item" data-id="${p.unit_price_id}">
          <div class="up-main">
            <div class="up-name">${this.escapeHtml(p.item_name)}</div>
            <div class="up-spec">${makerInfo}単位: ${this.escapeHtml(p.standard_unit || '')}${p.spec ? ' / ' + this.escapeHtml(p.spec) : ''}</div>
            <div class="up-tags">${catTag} ${usageTag} ${lastUsedTag}</div>
          </div>
          <div class="up-price">
            <div class="up-main-price">¥${Number(p.price_embedded || 0).toLocaleString('ja-JP')}</div>
            ${exposedPrice}
          </div>
          <div class="up-actions">
            <button class="icon-btn up-edit" data-id="${p.unit_price_id}">編集</button>
            <button class="icon-btn up-delete" data-id="${p.unit_price_id}">削除</button>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.up-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.openEditDialog(btn.dataset.id);
      });
    });
    el.querySelectorAll('.up-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.confirmDelete(btn.dataset.id);
      });
    });
  },

  openEditDialog(id) {
    const price = id ? this.state.unitPrices.find(p => p.unit_price_id === id) : null;
    this.state.editingPrice = price ? Object.assign({}, price) : {
      unit_price_id: '',
      category_id: this.state.filterCategory !== 'all' ? this.state.filterCategory : (this.state.categories[0]?.category_id || ''),
      item_name: '',
      spec: '',
      standard_unit: 'ケ所',
      price_embedded: 0,
      price_exposed: null,
      maker: '',
      model_no: '',
      tags: '',
      usage_count: 0,
      memo: ''
    };
    this.renderDialog();
  },

  renderDialog() {
    const p = this.state.editingPrice;
    const isNew = !p.unit_price_id;

    const container = document.getElementById('up-dialog');
    if (!container) {
      const newContainer = document.createElement('div');
      newContainer.id = 'up-dialog';
      newContainer.className = 'dialog-container';
      document.getElementById('view-unit-prices').appendChild(newContainer);
    }
    const dialog = document.getElementById('up-dialog');

    dialog.innerHTML = `
      <div class="dialog-overlay" id="up-dialog-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>${isNew ? '単価を新規登録' : '単価を編集'}</h3>
            <button class="icon-btn" id="up-dialog-close">×</button>
          </div>
          <div class="dialog-body">
            <div class="form-group">
              <label>品名 <span class="required">*</span></label>
              <input type="text" id="upf-item-name" value="${this.escapeHtml(p.item_name)}" placeholder="電灯配線、コンセント2口など">
            </div>
            <div class="form-group">
              <label>工種</label>
              <select id="upf-category-id">
                ${this.state.categories.map(c =>
                  `<option value="${c.category_id}" ${c.category_id === p.category_id ? 'selected' : ''}>${this.escapeHtml(c.category_name)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>仕様・型番</label>
              <input type="text" id="upf-spec" value="${this.escapeHtml(p.spec)}" placeholder="CVT38sq, DSY-5233AWE など">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>単位 <span class="required">*</span></label>
                <input type="text" id="upf-standard-unit" value="${this.escapeHtml(p.standard_unit)}" placeholder="ケ所、m、台 など">
              </div>
              <div class="form-group">
                <label>メーカー</label>
                <input type="text" id="upf-maker" value="${this.escapeHtml(p.maker || '')}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>埋込単価 <span class="required">*</span></label>
                <input type="number" id="upf-price-embedded" value="${p.price_embedded || 0}" step="1">
              </div>
              <div class="form-group">
                <label>露出単価（任意）</label>
                <input type="number" id="upf-price-exposed" value="${p.price_exposed || ''}" step="1" placeholder="設定なし可">
              </div>
            </div>
            <div class="form-group">
              <label>備考</label>
              <input type="text" id="upf-memo" value="${this.escapeHtml(p.memo || '')}">
            </div>
          </div>
          <div class="dialog-footer">
            <button class="secondary" id="up-dialog-cancel">キャンセル</button>
            <button id="up-dialog-save">${isNew ? '登録' : '保存'}</button>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    document.getElementById('up-dialog-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'up-dialog-overlay') this.closeDialog();
    });
    document.getElementById('up-dialog-close').addEventListener('click', () => this.closeDialog());
    document.getElementById('up-dialog-cancel').addEventListener('click', () => this.closeDialog());
    document.getElementById('up-dialog-save').addEventListener('click', () => this.savePrice());
  },

  closeDialog() {
    const dialog = document.getElementById('up-dialog');
    if (dialog) {
      dialog.classList.remove('open');
      dialog.innerHTML = '';
    }
    this.state.editingPrice = null;
  },

  async savePrice() {
    const p = this.state.editingPrice;
    if (!p) return;

    const exposedRaw = document.getElementById('upf-price-exposed').value;
    const data = {
      item_name: document.getElementById('upf-item-name').value.trim(),
      category_id: document.getElementById('upf-category-id').value,
      spec: document.getElementById('upf-spec').value.trim(),
      standard_unit: document.getElementById('upf-standard-unit').value.trim(),
      maker: document.getElementById('upf-maker').value.trim(),
      price_embedded: Number(document.getElementById('upf-price-embedded').value) || 0,
      price_exposed: exposedRaw ? Number(exposedRaw) : null,
      memo: document.getElementById('upf-memo').value.trim()
    };

    if (!data.item_name) {
      Util.toast('品名は必須です', 'warning');
      return;
    }
    if (!data.standard_unit) {
      Util.toast('単位は必須です', 'warning');
      return;
    }
    if (!data.price_embedded || data.price_embedded < 0) {
      Util.toast('埋込単価は0以上の数値を入力してください', 'warning');
      return;
    }

    try {
      if (p.unit_price_id) {
        await API.unitPrice.update(p.unit_price_id, data);
        Util.toast('単価を更新しました', 'success');
      } else {
        await API.unitPrice.create(data);
        Util.toast('単価を登録しました', 'success');
      }
      this.closeDialog();
      await this.loadData();
      this.render();
    } catch (err) {
      Util.toast(`保存エラー: ${err.message}`, 'error');
    }
  },

  async confirmDelete(id) {
    const p = this.state.unitPrices.find(x => x.unit_price_id === id);
    if (!p) return;
    if (!confirm(`「${p.item_name}」を削除しますか？\n（既存の見積からは消えません）`)) return;

    try {
      await API.unitPrice.delete(id);
      Util.toast('単価を削除しました', 'success');
      await this.loadData();
      this.render();
    } catch (err) {
      Util.toast(`削除エラー: ${err.message}`, 'error');
    }
  },

  // ===== CSV出力 =====
  exportCsv() {
    const headers = ['unit_price_id', 'category_id', 'item_name', 'spec', 'standard_unit', 'price_embedded', 'price_exposed', 'maker', 'model_no', 'tags', 'memo'];
    const rows = this.state.unitPrices.map(p => {
      const row = {};
      headers.forEach(h => { row[h] = p[h] !== undefined && p[h] !== null ? p[h] : ''; });
      return row;
    });
    const csv = CSV.stringify(rows, headers);
    const today = Util.formatDate(new Date());
    downloadAsFile(csv, `unit_prices_${today}.csv`, 'text/csv;charset=utf-8');
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

    // 検証
    const validRows = [];
    const errors = [];
    const categoryIds = new Set(this.state.categories.map(c => c.category_id));
    const existingIds = new Set(this.state.unitPrices.map(p => p.unit_price_id));

    rows.forEach((row, idx) => {
      const rowErrors = [];
      if (!row.item_name) rowErrors.push('品名が空');
      if (!row.standard_unit) rowErrors.push('単位が空');
      const priceE = Number(row.price_embedded);
      if (isNaN(priceE) || priceE < 0) rowErrors.push('埋込単価が不正');
      if (row.category_id && !categoryIds.has(row.category_id)) {
        rowErrors.push(`未知の工種コード: ${row.category_id}`);
      }
      // 露出単価が空文字なら null に
      let priceX = null;
      if (row.price_exposed && row.price_exposed !== '') {
        priceX = Number(row.price_exposed);
        if (isNaN(priceX)) rowErrors.push('露出単価が不正');
      }

      if (rowErrors.length > 0) {
        errors.push({ row: idx + 2, errors: rowErrors });
      } else {
        validRows.push({
          unit_price_id: row.unit_price_id || '',
          category_id: row.category_id || '',
          item_name: row.item_name,
          spec: row.spec || '',
          standard_unit: row.standard_unit,
          price_embedded: priceE,
          price_exposed: priceX,
          maker: row.maker || '',
          model_no: row.model_no || '',
          tags: row.tags || '',
          memo: row.memo || '',
          _isUpdate: row.unit_price_id && existingIds.has(row.unit_price_id)
        });
      }
    });

    this.showImportPreview(file.name, validRows, errors);
  },

  showImportPreview(filename, validRows, errors) {
    const container = document.getElementById('up-dialog');
    const newCount = validRows.filter(r => !r._isUpdate).length;
    const updateCount = validRows.filter(r => r._isUpdate).length;

    container.innerHTML = `
      <div class="dialog-overlay" id="up-import-overlay">
        <div class="dialog" style="max-width: 700px;">
          <div class="dialog-header">
            <h3>CSV取込プレビュー</h3>
            <button class="icon-btn" id="up-import-close">×</button>
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
                      <th>工種</th>
                      <th>品名</th>
                      <th>仕様</th>
                      <th>単位</th>
                      <th>埋込</th>
                      <th>露出</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${validRows.slice(0, 30).map(r => `
                      <tr>
                        <td><span class="badge ${r._isUpdate ? 'badge-warning' : 'badge-success'}">${r._isUpdate ? '更新' : '新規'}</span></td>
                        <td>${this.escapeHtml(r.unit_price_id || '自動')}</td>
                        <td>${this.escapeHtml(r.category_id)}</td>
                        <td>${this.escapeHtml(r.item_name)}</td>
                        <td>${this.escapeHtml(r.spec)}</td>
                        <td>${this.escapeHtml(r.standard_unit)}</td>
                        <td>¥${Number(r.price_embedded).toLocaleString('ja-JP')}</td>
                        <td>${r.price_exposed ? '¥' + Number(r.price_exposed).toLocaleString('ja-JP') : '-'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
                ${validRows.length > 30 ? `<div style="padding: 6px 8px; font-size: 11px; color: var(--color-text-secondary);">先頭30件を表示（残${validRows.length - 30}件は省略）</div>` : ''}
              </div>
            ` : ''}
          </div>
          <div class="dialog-footer">
            <button class="secondary" id="up-import-cancel">キャンセル</button>
            <button id="up-import-execute" ${validRows.length === 0 ? 'disabled' : ''}>${validRows.length}件を取込</button>
          </div>
        </div>
      </div>
    `;
    container.classList.add('open');

    document.getElementById('up-import-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'up-import-overlay') this.closeDialog();
    });
    document.getElementById('up-import-close').addEventListener('click', () => this.closeDialog());
    document.getElementById('up-import-cancel').addEventListener('click', () => this.closeDialog());
    document.getElementById('up-import-execute').addEventListener('click', () => this.executeImport(validRows));
  },

  async executeImport(validRows) {
    if (validRows.length === 0) return;

    const execBtn = document.getElementById('up-import-execute');
    if (execBtn) execBtn.disabled = true;

    let okCount = 0;
    let ngCount = 0;

    for (let i = 0; i < validRows.length; i++) {
      const r = validRows[i];
      const data = Object.assign({}, r);
      delete data._isUpdate;

      try {
        if (r._isUpdate) {
          await API.unitPrice.update(r.unit_price_id, data);
        } else {
          delete data.unit_price_id;
          await API.unitPrice.create(data);
        }
        okCount++;
      } catch (err) {
        console.error(`取込エラー (${r.item_name}):`, err);
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

  escapeHtml(text) {
    if (text === null || text === undefined) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  bindEvents() {
    document.getElementById('up-back')?.addEventListener('click', () => {
      Router.navigate('/dashboard');
    });

    document.getElementById('up-new')?.addEventListener('click', () => {
      this.openEditDialog(null);
    });

    document.getElementById('up-export')?.addEventListener('click', () => this.exportCsv());
    document.getElementById('up-import')?.addEventListener('click', () => this.importCsv());

    document.getElementById('up-search')?.addEventListener('input', Util.debounce((e) => {
      this.state.searchKeyword = e.target.value;
      this.renderList();
    }, 200));

    document.getElementById('up-filter')?.addEventListener('change', (e) => {
      this.state.filterCategory = e.target.value;
      this.renderList();
    });

    document.getElementById('up-sort')?.addEventListener('change', (e) => {
      this.state.sortBy = e.target.value;
      this.renderList();
    });
  }
};
