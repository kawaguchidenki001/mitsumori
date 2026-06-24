/**
 * KE-Mitsumori 設定管理画面
 *
 * settings マスタの編集UI。
 * - 消費税率、標準諸経費率、有効期限日数 など計算系設定
 * - 会社情報（社名、住所、電話、代表者名 など）
 * - 規模補正値、顧客タイプ補正値
 */

const SettingsScreen = {

  state: {
    settings: [],
    settingsMap: {}
  },

  // 設定キーをグループ分けして表示
  groups: [
    {
      label: '消費税・諸経費',
      keys: ['tax_rate', 'default_overhead_rate', 'overhead_rate_min', 'overhead_rate_max', 'default_expiry_days']
    },
    {
      label: '出力パターン自動判定',
      keys: ['auto_split_threshold_lines', 'auto_split_threshold_categories']
    },
    {
      label: '規模補正',
      keys: ['size_correction_small_threshold', 'size_correction_large_threshold', 'size_correction_small', 'size_correction_large']
    },
    {
      label: '顧客タイプ補正',
      keys: ['type_correction_doukyou', 'type_correction_motouke']
    },
    {
      label: '会社情報',
      keys: ['company_name', 'company_business', 'company_postal', 'company_address', 'company_tel', 'company_fax', 'company_president', 'company_owner_default']
    },
    {
      label: 'その他',
      keys: ['autosave_interval_seconds']
    }
  ],

  async init() {
    await this.loadData();
    this.render();
    this.bindEvents();
  },

  async loadData() {
    try {
      const res = await API.setting.list();
      this.state.settings = res.data || [];
      this.state.settingsMap = {};
      this.state.settings.forEach(s => {
        this.state.settingsMap[s.setting_key] = s;
      });
    } catch (err) {
      Util.toast(`設定の取得に失敗: ${err.message}`, 'error');
      this.state.settings = [];
    }
  },

  render() {
    const el = document.getElementById('set-list');
    if (!el) return;

    const knownKeys = new Set();
    this.groups.forEach(g => g.keys.forEach(k => knownKeys.add(k)));

    let html = '';
    this.groups.forEach(group => {
      const items = group.keys.map(k => this.state.settingsMap[k]).filter(Boolean);
      if (items.length === 0) return;

      html += `<div class="card set-group">`;
      html += `<h3>${this.escapeHtml(group.label)}</h3>`;
      items.forEach(s => {
        html += this.renderSettingRow(s);
      });
      html += `</div>`;
    });

    // グループに分類されてない設定
    const otherSettings = this.state.settings.filter(s => !knownKeys.has(s.setting_key));
    if (otherSettings.length > 0) {
      html += `<div class="card set-group">`;
      html += `<h3>その他の設定</h3>`;
      otherSettings.forEach(s => {
        html += this.renderSettingRow(s);
      });
      html += `</div>`;
    }

    el.innerHTML = html;

    // 各input変更時のハンドラ
    el.querySelectorAll('.set-input').forEach(input => {
      input.addEventListener('change', async (e) => {
        const key = e.target.dataset.key;
        const value = e.target.value;
        await this.saveSetting(key, value);
      });
    });
  },

  renderSettingRow(s) {
    const desc = s.description || '';
    const isNumber = !isNaN(Number(s.setting_value)) && s.setting_value !== '';
    const inputType = isNumber ? 'number' : 'text';
    const step = isNumber && s.setting_key.includes('threshold') ? '1' :
                 isNumber && s.setting_key.includes('rate') ? '0.1' : '1';

    return `
      <div class="set-row">
        <div class="set-row-meta">
          <div class="set-row-key">${this.escapeHtml(s.setting_key)}</div>
          ${desc ? `<div class="set-row-desc">${this.escapeHtml(desc)}</div>` : ''}
        </div>
        <div class="set-row-value">
          <input type="${inputType}" class="set-input" data-key="${this.escapeHtml(s.setting_key)}"
            value="${this.escapeHtml(s.setting_value || '')}"
            ${isNumber ? `step="${step}"` : ''}>
        </div>
      </div>
    `;
  },

  async saveSetting(key, value) {
    try {
      await API.setting.update(key, value);
      if (this.state.settingsMap[key]) {
        this.state.settingsMap[key].setting_value = value;
      }
      Util.toast(`「${key}」を保存しました`, 'success');
    } catch (err) {
      Util.toast(`保存エラー: ${err.message}`, 'error');
    }
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
    document.getElementById('set-back')?.addEventListener('click', () => {
      Router.navigate('/dashboard');
    });
  }
};
