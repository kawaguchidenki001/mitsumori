/**
 * KE-Mitsumori メインエントリ
 *
 * SPAルーターを初期化し、各画面ハンドラを登録。
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log(`KE-Mitsumori v${CONFIG.VERSION} 起動 (mock=${CONFIG.USE_MOCK})`);

  // Service Worker登録（PWA化）
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js')
      .then((reg) => console.log('[SW] 登録成功:', reg.scope))
      .catch((err) => console.warn('[SW] 登録失敗:', err));
  }

  // モックモード表示バナー
  if (CONFIG.USE_MOCK) {
    const banner = document.getElementById('mock-banner');
    if (banner) banner.style.display = 'block';
  }

  // 各画面ハンドラを登録
  Router.register('/dashboard', () => Dashboard.init());
  Router.register('/customers', () => CustomerScreen.init());
  Router.register('/unit-prices', () => UnitPriceScreen.init());
  Router.register('/new', () => QuoteEdit.init(null));
  Router.register('/edit/:id', (params) => QuoteEdit.init(params.id));
  Router.register('/preview/:id', (params) => QuotePreview.init(params.id));
  Router.register('/settings', () => SettingsScreen.init());
  Router.register('/debug', () => DebugScreen.init());

  // ルーター起動
  Router.start();
});

// 見積編集画面：ルーター遷移時の更新
Router.updateViewIdOf = function(pattern) {
  if (pattern === '/dashboard') return 'view-dashboard';
  if (pattern === '/customers') return 'view-customers';
  if (pattern === '/unit-prices') return 'view-unit-prices';
  if (pattern === '/new' || pattern.startsWith('/edit')) return 'view-edit';
  if (pattern.startsWith('/preview')) return 'view-preview';
  if (pattern === '/settings') return 'view-settings';
  if (pattern === '/debug') return 'view-debug';
  return 'view-dashboard';
};
Router.viewIdOf = Router.updateViewIdOf;

// デバッグ画面
const DebugScreen = {
  init() {
    const el = document.getElementById('debug-output');
    if (el) el.textContent = 'ボタンを押してください';
  }
};

async function debugTest(type) {
  const out = document.getElementById('debug-output');
  if (!out) return;
  out.textContent = '実行中...';
  try {
    let result;
    switch (type) {
      case 'health': result = await API.health(); break;
      case 'customers': result = await API.customer.list(); break;
      case 'categories': result = await API.workCategory.list(); break;
      case 'prices': result = await API.unitPrice.list(); break;
      case 'projects': result = await API.project.list(); break;
    }
    out.textContent = JSON.stringify(result, null, 2);
    Util.toast('OK', 'success');
  } catch (err) {
    out.textContent = `エラー: ${err.message}`;
    Util.toast(err.message, 'error');
  }
}

async function debugResetMock() {
  if (!confirm('モックデータを初期状態にリセットしますか？')) return;
  MockData.reset();
  Util.toast('モックデータをリセットしました', 'success');
  const out = document.getElementById('debug-output');
  if (out) out.textContent = 'リセット完了';
}

/**
 * 全データをJSONバックアップとしてダウンロード
 * モック・本番どちらでも動作
 */
async function debugExportBackup() {
  const out = document.getElementById('debug-output');
  if (out) out.textContent = '取得中...';

  try {
    const [customers, projects, lines, prices, categories, notes, settings] = await Promise.all([
      API.customer.list(),
      API.project.list(),
      API.quoteLine.list(),
      API.unitPrice.list(),
      API.workCategory.list(),
      API.notesTemplate.list(),
      API.setting.list()
    ]);

    const backup = {
      _meta: {
        version: CONFIG.VERSION,
        exported_at: new Date().toISOString(),
        source: CONFIG.USE_MOCK ? 'mock' : 'gas',
        counts: {
          customers: customers.data?.length || 0,
          projects: projects.data?.length || 0,
          quote_lines: lines.data?.length || 0,
          unit_prices: prices.data?.length || 0,
          work_categories: categories.data?.length || 0,
          notes_templates: notes.data?.length || 0,
          settings: settings.data?.length || 0
        }
      },
      customers: customers.data || [],
      projects: projects.data || [],
      quote_lines: lines.data || [],
      unit_prices: prices.data || [],
      work_categories: categories.data || [],
      notes_templates: notes.data || [],
      settings: settings.data || []
    };

    const json = JSON.stringify(backup, null, 2);
    const today = Util.formatDate(new Date());
    downloadAsFile(json, `ke_mitsumori_backup_${today}.json`, 'application/json');

    if (out) out.textContent = JSON.stringify(backup._meta, null, 2);
    Util.toast('バックアップを出力しました', 'success');
  } catch (err) {
    if (out) out.textContent = `エラー: ${err.message}`;
    Util.toast(err.message, 'error');
  }
}

/**
 * モックモード時のみ：JSONバックアップから復元
 */
async function debugImportBackup() {
  if (!CONFIG.USE_MOCK) {
    Util.toast('バックアップ復元はモックモード時のみ可能です', 'warning');
    return;
  }

  let file;
  try {
    file = await pickTextFile('.json');
  } catch (err) {
    return;
  }

  let backup;
  try {
    backup = JSON.parse(file.text);
  } catch (err) {
    Util.toast(`JSON解析エラー: ${err.message}`, 'error');
    return;
  }

  if (!backup._meta) {
    Util.toast('有効なバックアップファイルではありません', 'error');
    return;
  }

  const counts = backup._meta.counts || {};
  const summary = Object.entries(counts).map(([k, v]) => `${k}: ${v}件`).join('\n');

  if (!confirm(`以下のデータで現在のモックデータを上書きします。\n\n${summary}\n\n続行しますか？`)) return;

  // localStorageに上書き
  const tables = ['customers', 'projects', 'quote_lines', 'unit_prices', 'work_categories', 'notes_templates', 'settings'];
  tables.forEach(t => {
    if (Array.isArray(backup[t])) {
      Util.storage.set('mock_' + t, backup[t]);
    }
  });
  Util.storage.set('mock_initialized', true);

  Util.toast('バックアップを復元しました', 'success');
  const out = document.getElementById('debug-output');
  if (out) out.textContent = `復元完了:\n${summary}`;
}
