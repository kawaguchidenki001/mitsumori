/**
 * KE-Mitsumori SPAルーター
 *
 * ハッシュベースのシンプルなルーター。
 * URL: /#/dashboard, /#/customers, /#/edit/2603132 など
 */

const Router = {
  routes: {},
  currentRoute: null,
  currentParams: null,

  /**
   * ルート登録
   * @param {string} pattern '/dashboard', '/edit/:id' など
   * @param {Function} handler async (params) => void
   */
  register(pattern, handler) {
    this.routes[pattern] = handler;
  },

  /**
   * 起動（hashchange監視 + 初回ハンドリング）
   */
  start() {
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  },

  /**
   * 指定パスへ遷移
   */
  navigate(path) {
    window.location.hash = path.startsWith('#') ? path : '#' + path;
  },

  /**
   * 現在のhashからルートを解決
   */
  handleHashChange() {
    const hash = window.location.hash || '#/dashboard';
    const path = hash.substring(1); // '#' を除去

    let matched = null;
    let params = {};

    for (const pattern in this.routes) {
      const result = this.matchRoute(pattern, path);
      if (result) {
        matched = pattern;
        params = result;
        break;
      }
    }

    if (!matched) {
      console.warn(`No route matched: ${path}`);
      this.navigate('/dashboard');
      return;
    }

    this.currentRoute = matched;
    this.currentParams = params;

    this.showView(matched);

    const handler = this.routes[matched];
    Promise.resolve(handler(params)).catch(err => {
      console.error('Route handler error:', err);
      Util.toast('画面表示中にエラーが発生しました', 'error');
    });
  },

  /**
   * パターンマッチング（':id' のような変数対応）
   */
  matchRoute(pattern, path) {
    const patternSegs = pattern.split('/').filter(Boolean);
    const pathSegs = path.split('/').filter(Boolean);

    if (patternSegs.length !== pathSegs.length) return null;

    const params = {};
    for (let i = 0; i < patternSegs.length; i++) {
      if (patternSegs[i].startsWith(':')) {
        params[patternSegs[i].substring(1)] = decodeURIComponent(pathSegs[i]);
      } else if (patternSegs[i] !== pathSegs[i]) {
        return null;
      }
    }
    return params;
  },

  /**
   * 該当View要素を表示し、他は非表示
   */
  showView(pattern) {
    const viewId = this.viewIdOf(pattern);
    document.querySelectorAll('.view').forEach(el => {
      el.classList.toggle('active', el.id === viewId);
    });
    window.scrollTo(0, 0);
  },

  /**
   * ルートパターン → View ID
   */
  viewIdOf(pattern) {
    if (pattern === '/dashboard') return 'view-dashboard';
    if (pattern === '/customers') return 'view-customers';
    if (pattern === '/unit-prices') return 'view-unit-prices';
    if (pattern.startsWith('/edit')) return 'view-edit';
    if (pattern.startsWith('/preview')) return 'view-preview';
    if (pattern === '/debug') return 'view-debug';
    return 'view-dashboard';
  }
};
