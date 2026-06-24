/**
 * KE-Mitsumori 見積編集画面
 *
 * Phase 1 のメインブロック。
 * - 案件情報・明細編集・計算・保存
 * - 行のCRUD、工種別グループ化
 * - 単価マスタからの呼び出し（オートコンプリート）
 * - 諸経費率の推奨表示
 * - localStorage自動保存
 */

const QuoteEdit = {

  state: {
    quoteNo: null,
    isNewQuote: false,
    project: null,
    lines: [],

    customers: [],
    customerMap: {},
    workCategories: [],
    workCategoryMap: {},
    unitPrices: [],
    notesTemplates: [],

    isDirty: false,
    editingLine: null,
    editingLineIndex: -1
  },

  // ===== 初期化 =====
  async init(quoteNo) {
    this.state.quoteNo = quoteNo;
    this.state.isNewQuote = !quoteNo;

    await this.loadMasters();

    if (this.state.isNewQuote) {
      this.createNewProject();
      // localStorageからドラフト復元を試みる
      const draft = Util.storage.get('draft_new');
      if (draft && confirm('未保存の新規見積データがあります。復元しますか？')) {
        this.state.project = draft.project;
        this.state.lines = draft.lines || [];
      }
    } else {
      await this.loadProject(quoteNo);
      await this.loadLines(quoteNo);
    }

    this.render();
    this.bindEvents();
  },

  async loadMasters() {
    try {
      const [custRes, catRes, priceRes, notesRes] = await Promise.all([
        API.customer.list(),
        API.workCategory.list(),
        API.unitPrice.list(),
        API.notesTemplate.list()
      ]);
      this.state.customers = custRes.data || [];
      this.state.workCategories = (catRes.data || []).sort((a, b) =>
        (a.display_order || 99) - (b.display_order || 99));
      this.state.unitPrices = priceRes.data || [];
      this.state.notesTemplates = notesRes.data || [];

      this.state.customerMap = {};
      this.state.customers.forEach(c => { this.state.customerMap[c.customer_id] = c; });
      this.state.workCategoryMap = {};
      this.state.workCategories.forEach(c => { this.state.workCategoryMap[c.category_id] = c; });
    } catch (err) {
      Util.toast(`マスタ取得エラー: ${err.message}`, 'error');
    }
  },

  createNewProject() {
    this.state.project = {
      quote_no: null,
      customer_id: '',
      project_name: '',
      project_location: '',
      issue_date: Util.formatDate(new Date()),
      expiry_date: this.calcExpiry(CONFIG.DEFAULT_EXPIRY_DAYS),
      owner: '河口',
      output_pattern: 'auto',
      overhead_rate: CONFIG.DEFAULT_OVERHEAD_RATE,
      discount: 0,
      final_adjustment: 0,
      tax_display: '税抜',
      status: '見積中',
      notes: ''
    };
    this.state.lines = [];
  },

  async loadProject(quoteNo) {
    try {
      const res = await API.project.get(quoteNo);
      this.state.project = res.data;
    } catch (err) {
      Util.toast(`案件の取得に失敗: ${err.message}`, 'error');
      this.createNewProject();
    }
  },

  async loadLines(quoteNo) {
    try {
      const res = await API.quoteLine.list();
      this.state.lines = (res.data || [])
        .filter(line => line.quote_no === quoteNo)
        .sort((a, b) => (a.row_no || 0) - (b.row_no || 0));
    } catch (err) {
      console.warn('Lines load failed:', err);
      this.state.lines = [];
    }
  },

  calcExpiry(days) {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return Util.formatDate(d);
  },

  // ===== レンダリング =====
  render() {
    this.renderHeader();
    this.renderCustomer();
    this.renderProjectInfo();
    this.renderLines();
    this.renderSummary();
  },

  renderHeader() {
    const el = document.getElementById('qe-header');
    if (!el) return;
    const p = this.state.project;
    const quoteNoDisplay = p.quote_no || '（新規・保存時に採番）';
    const statusClass = this.statusClassOf(p.status);

    el.innerHTML = `
      <div class="qe-header-row">
        <div>
          <div class="qe-meta">見積番号</div>
          <div class="qe-quote-no">${this.escapeHtml(quoteNoDisplay)}</div>
        </div>
        <div class="qe-actions">
          <span class="badge ${statusClass}">${this.escapeHtml(p.status)}</span>
          <button class="icon-btn" id="qe-status-edit">状態</button>
          <button id="qe-save">保存</button>
          <button class="secondary" id="qe-output">出力</button>
        </div>
      </div>
    `;
  },

  renderCustomer() {
    const el = document.getElementById('qe-customer');
    if (!el) return;
    const p = this.state.project;
    const cust = this.state.customerMap[p.customer_id];

    if (cust) {
      el.innerHTML = `
        <div class="qe-section-label">顧客情報</div>
        <div class="qe-customer-row">
          <div>
            <div class="qe-customer-name">${this.escapeHtml(cust.company_name)}</div>
            <div class="qe-customer-meta">担当: ${this.escapeHtml(cust.contact_person || '-')} / タイプ: ${this.escapeHtml(cust.customer_type || '民間')}</div>
          </div>
          <button class="icon-btn" id="qe-customer-change">変更</button>
        </div>
      `;
    } else {
      el.innerHTML = `
        <div class="qe-section-label">顧客情報</div>
        <div class="qe-customer-row">
          <div class="qe-customer-empty">顧客が選択されていません</div>
          <button id="qe-customer-change">顧客を選択</button>
        </div>
      `;
    }
  },

  renderProjectInfo() {
    const el = document.getElementById('qe-project-info');
    if (!el) return;
    const p = this.state.project;

    el.innerHTML = `
      <div class="qe-section-label">工事情報</div>
      <div class="form-group">
        <label>工事名 <span class="required">*</span></label>
        <input type="text" id="qe-project-name" value="${this.escapeHtml(p.project_name || '')}" placeholder="○○邸電気工事 など">
      </div>
      <div class="form-group">
        <label>工事場所</label>
        <input type="text" id="qe-project-location" value="${this.escapeHtml(p.project_location || '')}" placeholder="岐阜市○○町">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>発行日</label>
          <input type="date" id="qe-issue-date" value="${p.issue_date || ''}">
        </div>
        <div class="form-group">
          <label>有効期限</label>
          <input type="date" id="qe-expiry-date" value="${p.expiry_date || ''}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>担当者</label>
          <input type="text" id="qe-owner" value="${this.escapeHtml(p.owner || '')}">
        </div>
        <div class="form-group">
          <label>出力パターン</label>
          <select id="qe-output-pattern">
            <option value="auto" ${p.output_pattern === 'auto' ? 'selected' : ''}>自動判定</option>
            <option value="split" ${p.output_pattern === 'split' ? 'selected' : ''}>工種分割型</option>
            <option value="flat" ${p.output_pattern === 'flat' ? 'selected' : ''}>一覧型</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label>備考・特記事項
          <button class="icon-btn qe-notes-templates-btn" type="button" id="qe-notes-templates">テンプレ</button>
        </label>
        <textarea id="qe-notes" rows="3" placeholder="※キュービクルの基礎工事は含みません など">${this.escapeHtml(p.notes || '')}</textarea>
      </div>
    `;

    document.getElementById('qe-project-name').addEventListener('input', (e) => {
      this.state.project.project_name = e.target.value;
      this.markDirty();
    });
    document.getElementById('qe-project-location').addEventListener('input', (e) => {
      this.state.project.project_location = e.target.value;
      this.markDirty();
    });
    document.getElementById('qe-issue-date').addEventListener('change', (e) => {
      this.state.project.issue_date = e.target.value;
      const issueDate = new Date(e.target.value);
      if (!isNaN(issueDate.getTime())) {
        const expiry = new Date(issueDate);
        expiry.setDate(expiry.getDate() + CONFIG.DEFAULT_EXPIRY_DAYS);
        this.state.project.expiry_date = Util.formatDate(expiry);
        document.getElementById('qe-expiry-date').value = this.state.project.expiry_date;
      }
      this.markDirty();
    });
    document.getElementById('qe-expiry-date').addEventListener('change', (e) => {
      this.state.project.expiry_date = e.target.value;
      this.markDirty();
    });
    document.getElementById('qe-owner').addEventListener('input', (e) => {
      this.state.project.owner = e.target.value;
      this.markDirty();
    });
    document.getElementById('qe-output-pattern').addEventListener('change', (e) => {
      this.state.project.output_pattern = e.target.value;
      this.markDirty();
    });
    document.getElementById('qe-notes').addEventListener('input', (e) => {
      this.state.project.notes = e.target.value;
      this.markDirty();
    });
    document.getElementById('qe-notes-templates').addEventListener('click', () => this.openNotesTemplatesDialog());
  },

  // ===== 特記事項テンプレダイアログ =====
  openNotesTemplatesDialog() {
    const dialog = document.getElementById('qe-dialog');
    const usedCategoryIds = Object.keys(this.groupLinesByCategory());

    // 使われている工種の特記事項を上位に、他は下に
    const sorted = [...this.state.notesTemplates].sort((a, b) => {
      const aPri = !a.category_id ? 1 : usedCategoryIds.includes(a.category_id) ? 0 : 2;
      const bPri = !b.category_id ? 1 : usedCategoryIds.includes(b.category_id) ? 0 : 2;
      return aPri - bPri;
    });

    dialog.innerHTML = `
      <div class="dialog-overlay" id="qe-notes-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>特記事項テンプレ</h3>
            <button class="icon-btn" id="qe-notes-close">×</button>
          </div>
          <div class="dialog-body">
            <p style="font-size:11px;color:var(--color-text-secondary);margin:0 0 8px;">タップして備考欄に追加</p>
            <div class="qe-notes-list">
              ${sorted.map(t => {
                const cat = t.category_id ? this.state.workCategoryMap[t.category_id] : null;
                const catLabel = cat ? `<span class="badge badge-default">${this.escapeHtml(cat.category_name)}</span>` : '<span class="badge badge-info">全体</span>';
                return `
                  <div class="qe-notes-item" data-text="${this.escapeHtml(t.template_text)}">
                    <div>${this.escapeHtml(t.template_text)}</div>
                    <div style="margin-top:4px;">${catLabel}</div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    dialog.querySelectorAll('.qe-notes-item').forEach(el => {
      el.addEventListener('click', () => {
        const text = el.dataset.text;
        const ta = document.getElementById('qe-notes');
        const current = ta.value;
        ta.value = current ? `${current}\n${text}` : text;
        this.state.project.notes = ta.value;
        this.markDirty();
        Util.toast('特記事項を追加しました', 'success');
      });
    });

    document.getElementById('qe-notes-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'qe-notes-overlay') this.closeLineDialog();
    });
    document.getElementById('qe-notes-close').addEventListener('click', () => this.closeLineDialog());
  },

  renderLines() {
    const el = document.getElementById('qe-lines');
    if (!el) return;

    const grouped = this.groupLinesByCategory();
    const usedCategoryIds = Object.keys(grouped);
    const usedCategories = this.state.workCategories.filter(c =>
      usedCategoryIds.includes(c.category_id));

    let html = `<div class="qe-section-label">明細</div>`;

    if (usedCategories.length === 0) {
      html += `<div class="empty-state">明細がまだありません。下のボタンから追加してください。</div>`;
    } else {
      usedCategories.forEach(cat => {
        const lines = grouped[cat.category_id] || [];
        const subtotal = lines.reduce((sum, l) => sum + this.lineAmount(l), 0);

        html += `
          <div class="qe-category-block">
            <div class="qe-category-header">
              <div class="qe-category-name">▼ ${this.escapeHtml(cat.category_name)}</div>
              <div class="qe-category-subtotal">${Util.formatMoney(subtotal)}</div>
            </div>
            <div class="qe-category-lines">
              ${lines.map((line, idx) => this.renderLineRow(line, idx, lines.length)).join('')}
            </div>
            <div class="qe-category-actions">
              <button class="icon-btn qe-add-line-btn" data-category="${cat.category_id}">＋ 行追加</button>
            </div>
          </div>
        `;
      });
    }

    html += `
      <div class="qe-add-category">
        <button class="icon-btn" id="qe-add-category-btn">＋ 工種を追加</button>
      </div>
    `;

    el.innerHTML = html;

    el.querySelectorAll('.qe-line-row').forEach(row => {
      row.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        if (e.target.closest('.qe-line-handle')) return;
        const idx = parseInt(row.dataset.idx, 10);
        this.openLineDialog(idx);
      });

      // ドラッグ&ドロップ（デスクトップ）
      row.addEventListener('dragstart', (e) => {
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', row.dataset.idx);
      });
      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        el.querySelectorAll('.qe-line-row.drag-over').forEach(r => r.classList.remove('drag-over'));
      });
      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const dragging = el.querySelector('.qe-line-row.dragging');
        if (dragging && dragging !== row) {
          el.querySelectorAll('.qe-line-row.drag-over').forEach(r => r.classList.remove('drag-over'));
          row.classList.add('drag-over');
        }
      });
      row.addEventListener('drop', (e) => {
        e.preventDefault();
        const sourceIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
        const targetIdx = parseInt(row.dataset.idx, 10);
        if (!isNaN(sourceIdx) && !isNaN(targetIdx) && sourceIdx !== targetIdx) {
          this.reorderLines(sourceIdx, targetIdx);
        }
      });

      // タッチ操作（モバイル）：長押し開始の検出
      let touchStartY = null;
      let touchStartIdx = null;
      let touchDragging = false;

      row.addEventListener('touchstart', (e) => {
        if (e.target.closest('button')) return;
        if (!e.target.closest('.qe-line-handle')) return;
        touchStartY = e.touches[0].clientY;
        touchStartIdx = parseInt(row.dataset.idx, 10);
        touchDragging = false;
        row.classList.add('touch-pending');
      }, { passive: true });

      row.addEventListener('touchmove', (e) => {
        if (touchStartIdx === null) return;
        if (!touchDragging) {
          const dy = e.touches[0].clientY - touchStartY;
          if (Math.abs(dy) > 10) {
            touchDragging = true;
            row.classList.add('dragging');
            row.classList.remove('touch-pending');
          }
        }
        if (touchDragging) {
          e.preventDefault();
          const touch = e.touches[0];
          const overEl = document.elementFromPoint(touch.clientX, touch.clientY);
          const overRow = overEl?.closest('.qe-line-row');
          el.querySelectorAll('.qe-line-row.drag-over').forEach(r => r.classList.remove('drag-over'));
          if (overRow && overRow !== row) {
            overRow.classList.add('drag-over');
          }
        }
      }, { passive: false });

      row.addEventListener('touchend', (e) => {
        row.classList.remove('touch-pending');
        if (touchDragging) {
          row.classList.remove('dragging');
          const overRow = el.querySelector('.qe-line-row.drag-over');
          if (overRow) {
            const targetIdx = parseInt(overRow.dataset.idx, 10);
            if (!isNaN(targetIdx) && targetIdx !== touchStartIdx) {
              this.reorderLines(touchStartIdx, targetIdx);
            }
            overRow.classList.remove('drag-over');
          }
        }
        touchStartY = null;
        touchStartIdx = null;
        touchDragging = false;
      });
    });

    el.querySelectorAll('.qe-line-up').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveLine(parseInt(btn.dataset.idx, 10), -1);
      });
    });
    el.querySelectorAll('.qe-line-down').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.moveLine(parseInt(btn.dataset.idx, 10), 1);
      });
    });
    el.querySelectorAll('.qe-line-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.deleteLine(parseInt(btn.dataset.idx, 10));
      });
    });

    el.querySelectorAll('.qe-add-line-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openLineDialog(-1, btn.dataset.category);
      });
    });

    document.getElementById('qe-add-category-btn')?.addEventListener('click', () => {
      this.openCategoryPickerDialog();
    });
  },

  renderLineRow(line, idxInGroup, totalInGroup) {
    const idx = this.state.lines.indexOf(line);
    const amount = this.lineAmount(line);
    const spec = line.spec || '';
    const qty = line.qty || 0;
    const unit = line.unit || '';
    const price = line.price || 0;

    let priceDisplay;
    if (line.is_supplied) {
      priceDisplay = `<span class="qe-supplied-badge">支給</span>`;
    } else {
      priceDisplay = `<div class="qe-line-amount">${Util.formatMoney(amount)}</div>`;
    }

    const meta = `${qty} ${unit}${price ? ' × ' + Util.formatMoney(price) : ''}`;

    return `
      <div class="qe-line-row" data-idx="${idx}" draggable="true">
        <span class="qe-line-handle" title="ドラッグして並べ替え">⋮⋮</span>
        <div class="qe-line-content">
          <div class="qe-line-name">${this.escapeHtml(line.item_name)}</div>
          <div class="qe-line-meta">${this.escapeHtml(spec ? spec + ' / ' : '')}${meta}</div>
        </div>
        <div class="qe-line-right">
          ${priceDisplay}
          <div class="qe-line-controls">
            <button class="icon-btn qe-line-up" data-idx="${idx}" ${idxInGroup === 0 ? 'disabled' : ''}>↑</button>
            <button class="icon-btn qe-line-down" data-idx="${idx}" ${idxInGroup === totalInGroup - 1 ? 'disabled' : ''}>↓</button>
            <button class="icon-btn qe-line-delete" data-idx="${idx}">×</button>
          </div>
        </div>
      </div>
    `;
  },

  renderSummary() {
    const el = document.getElementById('qe-summary');
    if (!el) return;
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

    const cust = this.state.customerMap[p.customer_id];
    const customerType = cust ? cust.customer_type : '民間';
    const recommendedRate = Util.recommendOverheadRate(subtotal, customerType);
    const recommendNote = recommendedRate !== overheadRate
      ? `<span class="qe-recommend">推奨 ${recommendedRate}%</span>`
      : '';

    const taxDisplayLabel = p.tax_display === '税込' ? '税込' : '税抜';

    el.innerHTML = `
      <div class="qe-section-label">集計</div>
      <div class="qe-summary-table">
        <div class="qe-summary-row">
          <span>小計</span>
          <span class="qe-num">${Util.formatMoney(subtotal)}</span>
        </div>
        <div class="qe-summary-row">
          <span>諸経費 ${recommendNote}</span>
          <span class="qe-rate-input">
            <input type="number" id="qe-overhead-rate" value="${overheadRate}" min="0" max="30" step="0.1"> %
          </span>
        </div>
        <div class="qe-summary-row qe-sub">
          <span class="qe-indent">諸経費額</span>
          <span class="qe-num">${Util.formatMoney(overheadAmount)}</span>
        </div>
        <div class="qe-summary-row qe-emphasis">
          <span>合計</span>
          <span class="qe-num">${Util.formatMoney(total)}</span>
        </div>
        <div class="qe-summary-row qe-discount">
          <span>値引き</span>
          <span class="qe-discount-input">
            <input type="number" id="qe-discount" value="${discount}" step="1000">
          </span>
        </div>
        <div class="qe-summary-row qe-discount">
          <span>出精値引き</span>
          <span class="qe-discount-input">
            <input type="number" id="qe-final-adjustment" value="${finalAdjustment}" step="1000">
          </span>
        </div>
        <div class="qe-summary-row qe-final">
          <span>最終合計（税抜）</span>
          <span class="qe-num">${Util.formatMoney(finalTotal)}</span>
        </div>
        <div class="qe-summary-row qe-sub">
          <span class="qe-indent">消費税 (${taxRate}%)</span>
          <span class="qe-num">${Util.formatMoney(taxAmount)}</span>
        </div>
        <div class="qe-summary-row qe-emphasis">
          <span>税込合計</span>
          <span class="qe-num">${Util.formatMoney(taxIncluded)}</span>
        </div>
        <div class="qe-summary-row" style="margin-top:8px;">
          <span>表示形式</span>
          <select id="qe-tax-display" style="width:120px;">
            <option value="税抜" ${p.tax_display === '税抜' ? 'selected' : ''}>税抜表示</option>
            <option value="税込" ${p.tax_display === '税込' ? 'selected' : ''}>税込表示</option>
          </select>
        </div>
      </div>
    `;

    document.getElementById('qe-overhead-rate').addEventListener('input', (e) => {
      this.state.project.overhead_rate = Number(e.target.value) || 0;
      this.markDirty();
      this.renderSummary();
    });
    document.getElementById('qe-discount').addEventListener('input', (e) => {
      this.state.project.discount = Number(e.target.value) || 0;
      this.markDirty();
      this.renderSummary();
    });
    document.getElementById('qe-final-adjustment').addEventListener('input', (e) => {
      this.state.project.final_adjustment = Number(e.target.value) || 0;
      this.markDirty();
      this.renderSummary();
    });
    document.getElementById('qe-tax-display').addEventListener('change', (e) => {
      this.state.project.tax_display = e.target.value;
      this.markDirty();
    });
  },

  // ===== 明細処理 =====
  groupLinesByCategory() {
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

  moveLine(idx, direction) {
    const line = this.state.lines[idx];
    if (!line) return;
    const sameCategory = this.state.lines
      .map((l, i) => ({ line: l, idx: i }))
      .filter(item => item.line.category_id === line.category_id);
    const positionInGroup = sameCategory.findIndex(item => item.idx === idx);
    const targetPosition = positionInGroup + direction;

    if (targetPosition < 0 || targetPosition >= sameCategory.length) return;

    const targetIdx = sameCategory[targetPosition].idx;
    const tmp = this.state.lines[idx];
    this.state.lines[idx] = this.state.lines[targetIdx];
    this.state.lines[targetIdx] = tmp;

    this.markDirty();
    this.renderLines();
    this.renderSummary();
  },

  /**
   * 任意位置の行を別位置へ移動（ドラッグ&ドロップ）
   * 工種跨ぎの場合は移動先の工種に変更
   */
  reorderLines(sourceIdx, targetIdx) {
    const source = this.state.lines[sourceIdx];
    const target = this.state.lines[targetIdx];
    if (!source || !target) return;

    // 工種跨ぎの場合は移動先の工種カテゴリに変更
    if (source.category_id !== target.category_id) {
      source.category_id = target.category_id;
    }

    // 配列から取り出して挿入
    this.state.lines.splice(sourceIdx, 1);
    // sourceを取り除いた後のtargetIdx
    const newTargetIdx = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
    this.state.lines.splice(newTargetIdx, 0, source);

    this.markDirty();
    this.renderLines();
    this.renderSummary();
  },

  deleteLine(idx) {
    const line = this.state.lines[idx];
    if (!line) return;
    if (!confirm(`「${line.item_name}」を削除しますか？`)) return;
    this.state.lines.splice(idx, 1);
    this.markDirty();
    this.renderLines();
    this.renderSummary();
  },

  // ===== 行編集ダイアログ =====
  openLineDialog(idx, defaultCategoryId) {
    const isNew = idx < 0;
    const line = isNew ? {
      line_id: null,
      category_id: defaultCategoryId || '',
      item_name: '',
      spec: '',
      qty: 1,
      unit: 'ケ所',
      price: 0,
      is_supplied: false,
      show_price: true,
      mount_type: '埋込',
      line_note: ''
    } : Object.assign({}, this.state.lines[idx]);

    this.state.editingLine = line;
    this.state.editingLineIndex = idx;

    const dialog = document.getElementById('qe-dialog');
    dialog.innerHTML = `
      <div class="dialog-overlay" id="qe-dialog-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>${isNew ? '行を追加' : '行を編集'}</h3>
            <button class="icon-btn" id="qe-dialog-close">×</button>
          </div>
          <div class="dialog-body">
            <div class="form-group">
              <label>工種</label>
              <select id="ql-category">
                ${this.state.workCategories.map(c =>
                  `<option value="${c.category_id}" ${c.category_id === line.category_id ? 'selected' : ''}>${this.escapeHtml(c.category_name)}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>品名 <span class="required">*</span></label>
              <input type="text" id="ql-item-name" value="${this.escapeHtml(line.item_name)}" placeholder="単価マスタを検索 or 直接入力" autocomplete="off">
              <div id="ql-suggestions" class="ql-suggestions"></div>
            </div>
            <div class="form-group">
              <label>仕様</label>
              <input type="text" id="ql-spec" value="${this.escapeHtml(line.spec)}">
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>数量</label>
                <input type="number" id="ql-qty" value="${line.qty}" step="0.01">
              </div>
              <div class="form-group">
                <label>単位</label>
                <input type="text" id="ql-unit" value="${this.escapeHtml(line.unit)}">
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>単価</label>
                <input type="number" id="ql-price" value="${line.price}" step="1">
              </div>
              <div class="form-group">
                <label>施工種別</label>
                <select id="ql-mount-type">
                  <option value="埋込" ${line.mount_type === '埋込' ? 'selected' : ''}>埋込</option>
                  <option value="露出" ${line.mount_type === '露出' ? 'selected' : ''}>露出</option>
                </select>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label><input type="checkbox" id="ql-is-supplied" ${line.is_supplied ? 'checked' : ''}> 支給品</label>
              </div>
              <div class="form-group">
                <label><input type="checkbox" id="ql-show-price" ${line.show_price ? 'checked' : ''}> 支給時単価表示</label>
              </div>
            </div>
            <div class="form-group">
              <label>備考</label>
              <input type="text" id="ql-line-note" value="${this.escapeHtml(line.line_note || '')}">
            </div>
          </div>
          <div class="dialog-footer">
            <button class="secondary" id="qe-dialog-cancel">キャンセル</button>
            <button id="qe-dialog-save">${isNew ? '追加' : '保存'}</button>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    const itemInput = document.getElementById('ql-item-name');
    itemInput.addEventListener('input', () => this.updateSuggestions(itemInput.value));
    itemInput.addEventListener('focus', () => this.updateSuggestions(itemInput.value));

    document.getElementById('qe-dialog-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'qe-dialog-overlay') this.closeLineDialog();
    });
    document.getElementById('qe-dialog-close').addEventListener('click', () => this.closeLineDialog());
    document.getElementById('qe-dialog-cancel').addEventListener('click', () => this.closeLineDialog());
    document.getElementById('qe-dialog-save').addEventListener('click', () => this.saveLineDialog());

    setTimeout(() => itemInput.focus(), 50);
  },

  updateSuggestions(keyword) {
    const sugEl = document.getElementById('ql-suggestions');
    if (!sugEl) return;

    if (!keyword || keyword.length < 1) {
      sugEl.innerHTML = '';
      sugEl.style.display = 'none';
      return;
    }

    const kw = keyword.toLowerCase();
    const currentCategoryId = document.getElementById('ql-category')?.value;
    const matches = this.state.unitPrices
      .filter(p => (p.item_name || '').toLowerCase().includes(kw) ||
                    (p.spec || '').toLowerCase().includes(kw))
      .sort((a, b) => {
        if (a.category_id === currentCategoryId && b.category_id !== currentCategoryId) return -1;
        if (a.category_id !== currentCategoryId && b.category_id === currentCategoryId) return 1;
        return (b.usage_count || 0) - (a.usage_count || 0);
      })
      .slice(0, 8);

    if (matches.length === 0) {
      sugEl.innerHTML = '';
      sugEl.style.display = 'none';
      return;
    }

    sugEl.innerHTML = matches.map(p => {
      const cat = this.state.workCategoryMap[p.category_id];
      const catName = cat ? cat.category_name : '';
      const spec = p.spec ? ` / ${this.escapeHtml(p.spec)}` : '';
      return `
        <div class="ql-suggest-item" data-id="${p.unit_price_id}">
          <div class="ql-suggest-name">${this.escapeHtml(p.item_name)}${spec}</div>
          <div class="ql-suggest-meta">${this.escapeHtml(catName)} / ¥${Number(p.price_embedded).toLocaleString('ja-JP')}/${this.escapeHtml(p.standard_unit)}</div>
        </div>
      `;
    }).join('');
    sugEl.style.display = 'block';

    sugEl.querySelectorAll('.ql-suggest-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = el.dataset.id;
        const price = this.state.unitPrices.find(p => p.unit_price_id === id);
        if (price) this.fillFromUnitPrice(price);
        sugEl.style.display = 'none';
      });
    });
  },

  fillFromUnitPrice(p) {
    document.getElementById('ql-item-name').value = p.item_name || '';
    document.getElementById('ql-spec').value = p.spec || '';
    document.getElementById('ql-unit').value = p.standard_unit || 'ケ所';
    document.getElementById('ql-category').value = p.category_id || '';

    const mountType = document.getElementById('ql-mount-type').value;
    let priceValue;
    if (mountType === '露出' && p.price_exposed) {
      priceValue = p.price_exposed;
    } else {
      priceValue = p.price_embedded || 0;
    }
    document.getElementById('ql-price').value = priceValue;
  },

  closeLineDialog() {
    const dialog = document.getElementById('qe-dialog');
    dialog.classList.remove('open');
    dialog.innerHTML = '';
    this.state.editingLine = null;
    this.state.editingLineIndex = -1;
  },

  saveLineDialog() {
    const isNew = this.state.editingLineIndex < 0;
    const line = {
      line_id: this.state.editingLine?.line_id || null,
      category_id: document.getElementById('ql-category').value,
      item_name: document.getElementById('ql-item-name').value.trim(),
      spec: document.getElementById('ql-spec').value.trim(),
      qty: Number(document.getElementById('ql-qty').value) || 0,
      unit: document.getElementById('ql-unit').value.trim(),
      price: Number(document.getElementById('ql-price').value) || 0,
      mount_type: document.getElementById('ql-mount-type').value,
      is_supplied: document.getElementById('ql-is-supplied').checked,
      show_price: document.getElementById('ql-show-price').checked,
      line_note: document.getElementById('ql-line-note').value.trim()
    };

    if (!line.item_name) {
      Util.toast('品名は必須です', 'warning');
      return;
    }
    if (!line.category_id) {
      Util.toast('工種を選択してください', 'warning');
      return;
    }

    if (isNew) {
      this.state.lines.push(line);
    } else {
      this.state.lines[this.state.editingLineIndex] = line;
    }

    this.markDirty();
    this.closeLineDialog();
    this.renderLines();
    this.renderSummary();
  },

  // ===== 顧客選択ダイアログ =====
  openCustomerSelector() {
    const dialog = document.getElementById('qe-dialog');
    const currentId = this.state.project.customer_id;

    dialog.innerHTML = `
      <div class="dialog-overlay" id="qe-customer-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>顧客を選択</h3>
            <button class="icon-btn" id="qe-cust-close">×</button>
          </div>
          <div class="dialog-body">
            <input type="text" id="qe-cust-search" placeholder="会社名・担当者で検索" style="margin-bottom: 12px;">
            <div id="qe-cust-list" class="qe-cust-list"></div>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    const renderList = (kw) => {
      const filtered = !kw ? this.state.customers : this.state.customers.filter(c =>
        (c.company_name || '').toLowerCase().includes(kw.toLowerCase()) ||
        (c.contact_person || '').toLowerCase().includes(kw.toLowerCase()));

      const listEl = document.getElementById('qe-cust-list');
      if (filtered.length === 0) {
        listEl.innerHTML = '<div class="empty-state">該当する顧客がありません</div>';
        return;
      }

      listEl.innerHTML = filtered.map(c => `
        <div class="qe-cust-item ${c.customer_id === currentId ? 'selected' : ''}" data-id="${c.customer_id}">
          <div class="qe-cust-item-name">${this.escapeHtml(c.company_name)}</div>
          <div class="qe-cust-item-meta">${this.escapeHtml(c.contact_person || '')} / <span class="badge ${this.typeClassOf(c.customer_type)}">${this.escapeHtml(c.customer_type || '民間')}</span></div>
        </div>
      `).join('');

      listEl.querySelectorAll('.qe-cust-item').forEach(el => {
        el.addEventListener('click', () => {
          this.state.project.customer_id = el.dataset.id;
          this.markDirty();
          this.closeLineDialog();
          this.renderCustomer();
          this.renderSummary();
        });
      });
    };

    renderList('');
    document.getElementById('qe-cust-search').addEventListener('input', Util.debounce((e) => {
      renderList(e.target.value);
    }, 200));
    document.getElementById('qe-customer-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'qe-customer-overlay') this.closeLineDialog();
    });
    document.getElementById('qe-cust-close').addEventListener('click', () => this.closeLineDialog());
  },

  // ===== 工種ピッカー =====
  openCategoryPickerDialog() {
    const dialog = document.getElementById('qe-dialog');
    const usedCategoryIds = Object.keys(this.groupLinesByCategory());
    const available = this.state.workCategories.filter(c => !usedCategoryIds.includes(c.category_id));

    dialog.innerHTML = `
      <div class="dialog-overlay" id="qe-cat-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>工種を追加</h3>
            <button class="icon-btn" id="qe-cat-close">×</button>
          </div>
          <div class="dialog-body">
            ${available.length === 0 ? '<div class="empty-state">すべての工種が使用されています</div>' : ''}
            <div class="qe-cat-list">
              ${available.map(c => `
                <div class="qe-cat-item" data-id="${c.category_id}">
                  <div>${this.escapeHtml(c.category_name)}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    dialog.querySelectorAll('.qe-cat-item').forEach(el => {
      el.addEventListener('click', () => {
        this.closeLineDialog();
        this.openLineDialog(-1, el.dataset.id);
      });
    });

    document.getElementById('qe-cat-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'qe-cat-overlay') this.closeLineDialog();
    });
    document.getElementById('qe-cat-close').addEventListener('click', () => this.closeLineDialog());
  },

  // ===== 保存・出力 =====
  markDirty() {
    this.state.isDirty = true;
    if (this.state.isNewQuote) {
      Util.storage.set('draft_new', {
        project: this.state.project,
        lines: this.state.lines
      });
    } else {
      Util.storage.set(`draft_${this.state.quoteNo}`, {
        project: this.state.project,
        lines: this.state.lines
      });
    }
  },

  async save() {
    const p = this.state.project;
    if (!p.customer_id) {
      Util.toast('顧客を選択してください', 'warning');
      return;
    }
    if (!p.project_name) {
      Util.toast('工事名は必須です', 'warning');
      return;
    }

    try {
      let savedProject;
      if (this.state.isNewQuote) {
        const res = await API.project.create(p);
        savedProject = res.data;
        this.state.quoteNo = savedProject.quote_no;
        this.state.isNewQuote = false;
        this.state.project = savedProject;
        Util.storage.remove('draft_new');
      } else {
        const res = await API.project.update(this.state.quoteNo, p);
        savedProject = res.data;
        this.state.project = savedProject;
      }

      await this.saveLines(savedProject.quote_no);

      Util.storage.remove(`draft_${savedProject.quote_no}`);
      this.state.isDirty = false;

      Util.toast(`保存しました（${savedProject.quote_no}）`, 'success');
      this.renderHeader();
      this.renderLines();

      if (this.state.isNewQuote === false && window.location.hash !== `#/edit/${savedProject.quote_no}`) {
        history.replaceState(null, '', `#/edit/${savedProject.quote_no}`);
      }
    } catch (err) {
      Util.toast(`保存エラー: ${err.message}`, 'error');
    }
  },

  async saveLines(quoteNo) {
    const linesPayload = this.state.lines.map((line, i) => {
      const payload = Object.assign({}, line, {
        row_no: i + 1,
        amount: this.lineAmount(line)
      });
      delete payload.line_id;
      return payload;
    });
    await API.quoteLine.replaceForQuote(quoteNo, linesPayload);
  },

  goToOutput() {
    if (this.state.isDirty) {
      if (!confirm('未保存の変更があります。保存せずに出力画面へ移動しますか？')) return;
    }
    if (!this.state.quoteNo) {
      Util.toast('先に保存してください（見積番号採番のため）', 'warning');
      return;
    }
    Router.navigate(`/preview/${this.state.quoteNo}`);
  },

  // ===== ステータス変更 =====
  openStatusDialog() {
    const dialog = document.getElementById('qe-dialog');
    const current = this.state.project.status;
    dialog.innerHTML = `
      <div class="dialog-overlay" id="qe-status-overlay">
        <div class="dialog">
          <div class="dialog-header">
            <h3>ステータスを変更</h3>
            <button class="icon-btn" id="qe-status-close">×</button>
          </div>
          <div class="dialog-body">
            <div class="qe-status-list">
              ${['見積中', '受注', '失注', '失効'].map(s => `
                <div class="qe-status-item ${s === current ? 'selected' : ''}" data-status="${s}">${s}</div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
    dialog.classList.add('open');

    dialog.querySelectorAll('.qe-status-item').forEach(el => {
      el.addEventListener('click', () => {
        this.state.project.status = el.dataset.status;
        this.markDirty();
        this.closeLineDialog();
        this.renderHeader();
      });
    });
    document.getElementById('qe-status-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'qe-status-overlay') this.closeLineDialog();
    });
    document.getElementById('qe-status-close').addEventListener('click', () => this.closeLineDialog());
  },

  // ===== ユーティリティ =====
  statusClassOf(status) {
    if (status === '見積中') return 'badge-info';
    if (status === '受注') return 'badge-success';
    if (status === '失注') return 'badge-danger';
    if (status === '失効') return 'badge-warning';
    return 'badge-default';
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

  // ===== イベントバインド =====
  bindEvents() {
    document.getElementById('qe-back')?.addEventListener('click', () => {
      if (this.state.isDirty && !confirm('未保存の変更があります。破棄して戻りますか？')) return;
      Router.navigate('/dashboard');
    });

    setTimeout(() => {
      document.getElementById('qe-customer-change')?.addEventListener('click', () => this.openCustomerSelector());
      document.getElementById('qe-save')?.addEventListener('click', () => this.save());
      document.getElementById('qe-output')?.addEventListener('click', () => this.goToOutput());
      document.getElementById('qe-status-edit')?.addEventListener('click', () => this.openStatusDialog());
    }, 0);
  }
};
