/**
 * KE-Mitsumori 設定ファイル
 *
 * セットアップ時に GAS Web アプリのURLをここに設定してください。
 * 詳細は docs/SETUP_GUIDE.md を参照。
 */

const CONFIG = {
  // GASウェブアプリのURL
  // 例: https://script.google.com/macros/s/【DEPLOYMENT_ID】/exec
  GAS_API_URL: '',

  // モックモード（GAS未設定でもUI動作確認できる）
  // セットアップ完了後は false に変更
  USE_MOCK: true,

  // ローカルストレージのキープレフィックス
  STORAGE_PREFIX: 'ke_mitsumori_',

  // 自動保存間隔（ミリ秒）
  AUTOSAVE_INTERVAL_MS: 30 * 1000,

  // 標準消費税率（%）
  DEFAULT_TAX_RATE: 10,

  // 標準諸経費率（%）
  DEFAULT_OVERHEAD_RATE: 12,

  // 標準有効期限（日数）
  DEFAULT_EXPIRY_DAYS: 30,

  // 分割型自動判定の閾値
  AUTO_SPLIT_THRESHOLD_LINES: 30,
  AUTO_SPLIT_THRESHOLD_CATEGORIES: 5,

  // バージョン
  VERSION: '0.1.0'
};
