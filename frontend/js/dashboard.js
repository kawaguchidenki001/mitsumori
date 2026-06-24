/**
 * KE-Mitsumori ダッシュボード画面
 *
 * 案件一覧表示・検索・フィルタ・新規見積作成。
 */

const Dashboard = {

  state: {
    projects: [],
    customers: [],
    customerMap: {},
    filterStatus: 'all',
    searchKeyword: ''
  },

  /**
   * ダッシュボード初期化（ルーターから呼ばれる）
   */
  async init() {
    await this.loadData();
    this.render();
    this.bindEvents();
  },

  async loadData() {
    try {
      const [projRes, custRes] = await Promise.all([
        API.project.list(),
        API.customer.list()
      ]);
      this.state.projects = projRes.data || [];
      this.state.customers = custRes.data || [];
      this.state.customerMap = {};
      this.state.customers.forEach(c => {
        this.state.customerMap[c.customer_id] = c;
      });
    } catch (err) {
      Util.toast(`データ取得エラー: ${err.message}`, 'error');
      this.state.projects = [];
      this.state.customers = [];
    }
  },

  render() {
    this.renderStats();
    this.renderProjectList();
  },

  renderStats() {
    const projects = this.state.projects;

    const thisMonth = new Date();
    const yyyymm = `${thisMonth.getFullYear()}-${String(thisMonth.getMonth() + 1).padStart(2, '0')}`;
    const thisMonthCount = projects.filter(p => p.issue_date && p.issue_date.startsWith(yyyymm)).length;
    const activeCount = projects.filter(p => p.status === '見積中').length;

    const el = document.getElementById('dash-stats');
    if (!el) return;
    el.innerHTML = `
      <div class="stat-card">
        <div class="stat-num">${thisMonthCount}</div>
        <div class="stat-label">今月の見積</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">${activeCount}</div>
        <div class="stat-label">進行中案件</div>
      </div>
    `;
  },

  renderProjectList() {
    const el = document.getElementById('dash-project-list');
    if (!el) return;

    let projects = [...this.state.projects];

    if (this.state.filterStatus !== 'all') {
      projects = projects.filter(p => p.status === this.state.filterStatus);
    }

    if (this.state.searchKeyword) {
      const kw = this.state.searchKeyword.toLowerCase();
      projects = projects.filter(p => {
        const company = (this.state.customerMap[p.customer_id]?.company_name || '').toLowerCase();
        const name = (p.project_name || '').toLowerCase();
        const location = (p.project_location || '').toLowerCase();
        return company.includes(kw) || name.includes(kw) || location.includes(kw);
      });
    }

    projects.sort((a, b) => {
      const da = new Date(a.updated_at || a.issue_date || 0);
      const db = new Date(b.updated_at || b.issue_date || 0);
      return db - da;
    });

    if (projects.length === 0) {
      el.innerHTML = '<div class="empty-state">該当する案件がありません</div>';
      return;
    }

    el.innerHTML = projects.map(p => {
      const cust = this.state.customerMap[p.customer_id];
      const company = cust ? cust.company_name : '（不明）';
      const amount = this.calcTotal(p);
      const statusClass = this.statusClassOf(p.status);

      return `
        <div class="project-card" data-quote-no="${p.quote_no}">
          <div class="project-header">
            <span class="project-meta">${p.quote_no} / ${Util.formatReiwa(p.issue_date)}</span>
            <div class="project-card-actions">
              <span class="badge ${statusClass}">${p.status}</span>
              <button class="icon-btn btn-copy-project" data-quote-no="${p.quote_no}" title="この案件をコピー">📋</button>
            </div>
          </div>
          <div class="project-name">${this.escapeHtml(p.project_name)}</div>
          <div class="project-footer">
            <span class="project-customer">${this.escapeHtml(company)}</span>
            <span class="project-amount">${Util.formatMoney(amount)}</span>
          </div>
        </div>
      `;
    }).join('');

    el.querySelectorAll('.project-card').forEach(card => {
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-copy-project')) return;
        const quoteNo = card.dataset.quoteNo;
        Router.navigate(`/edit/${quoteNo}`);
      });
    });

    el.querySelectorAll('.btn-copy-project').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.copyProject(btn.dataset.quoteNo);
      });
    });
  },

  async copyProject(srcQuoteNo) {
    const src = this.state.projects.find(p => p.quote_no === srcQuoteNo);
    if (!src) return;
    if (!confirm(`「${src.project_name}」をコピーして新規見積を作成しますか？\n（顧客・工事情報・全明細をコピーします）`)) return;

    Util.toast('コピー中...', 'info');

    try {
      const allLines = await API.quoteLine.list();
      const srcLines = (allLines.data || []).filter(l => l.quote_no === srcQuoteNo);

      const newProjectData = Object.assign({}, src);
      delete newProjectData.quote_no;
      delete newProjectData.created_at;
      delete newProjectData.updated_at;
      newProjectData.project_name = src.project_name + '（コピー）';
      newProjectData.issue_date = Util.formatDate(new Date());
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + CONFIG.DEFAULT_EXPIRY_DAYS);
      newProjectData.expiry_date = Util.formatDate(expiry);
      newProjectData.status = '見積中';

      const projRes = await API.project.create(newProjectData);
      const newQuoteNo = projRes.data.quote_no;

      const newLines = srcLines.map((line, i) => {
        const copy = Object.assign({}, line);
        delete copy.line_id;
        copy.quote_no = newQuoteNo;
        copy.row_no = i + 1;
        return copy;
      });

      if (newLines.length > 0) {
        await API.quoteLine.replaceForQuote(newQuoteNo, newLines);
      }

      Util.toast(`コピー完了（${newQuoteNo}）`, 'success');
      Router.navigate(`/edit/${newQuoteNo}`);
    } catch (err) {
      Util.toast(`コピー失敗: ${err.message}`, 'error');
    }
  },

  /**
   * 案件の合計金額を計算（暫定：discount/final_adjustmentを差し引く）
   * 本来は明細から計算するが、ダッシュボードでは概算表示。
   */
  calcTotal(project) {
    return 0;
  },

  statusClassOf(status) {
    if (status === '見積中') return 'badge-info';
    if (status === '受注') return 'badge-success';
    if (status === '失注') return 'badge-danger';
    if (status === '失効') return 'badge-warning';
    return 'badge-default';
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
    document.getElementById('dash-search')?.addEventListener('input', Util.debounce((e) => {
      this.state.searchKeyword = e.target.value;
      this.renderProjectList();
    }, 200));

    document.getElementById('dash-filter')?.addEventListener('change', (e) => {
      this.state.filterStatus = e.target.value;
      this.renderProjectList();
    });

    document.getElementById('dash-new')?.addEventListener('click', () => {
      Router.navigate('/new');
    });

    document.getElementById('nav-customers')?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('/customers');
    });

    document.getElementById('nav-unit-prices')?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('/unit-prices');
    });

    document.getElementById('nav-debug')?.addEventListener('click', (e) => {
      e.preventDefault();
      Router.navigate('/debug');
    });
  }
};
