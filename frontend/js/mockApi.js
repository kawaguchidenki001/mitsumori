/**
 * KE-Mitsumori モックAPI層
 *
 * セットアップ完了前にUIの動作確認をするためのインメモリ実装。
 * config.js の USE_MOCK = true 時に有効。
 *
 * データはブラウザのlocalStorageに保存され、リロードしても保持される。
 */

const MockData = {

  // 初期データ（localStorageが空の場合に使用）
  seed: {
    customers: [
      {
        customer_id: 'C001',
        company_name: '株式会社 井上デンキ工事',
        contact_person: '井上 様',
        postal_code: '500-XXXX',
        address: '岐阜市XX町X-X',
        tel: '058-XXX-XXXX',
        fax: '058-XXX-XXXX',
        email: '',
        customer_type: '民間',
        discount_tendency: '通常',
        memo: '新築電気工事元請',
        created_at: '2025-12-15T10:00:00',
        updated_at: '2026-03-07T14:30:00'
      },
      {
        customer_id: 'C002',
        company_name: '株式会社 廣瀬住建',
        contact_person: '廣瀬 様',
        postal_code: '500-XXXX',
        address: '岐阜市YY町Y-Y',
        tel: '058-XXX-XXXX',
        fax: '058-XXX-XXXX',
        email: '',
        customer_type: '民間',
        discount_tendency: '通常',
        memo: 'リノベーション工事中心',
        created_at: '2025-08-10T09:00:00',
        updated_at: '2026-03-26T11:00:00'
      },
      {
        customer_id: 'C003',
        company_name: '岐阜県住宅供給公社',
        contact_person: '担当者様',
        postal_code: '500-XXXX',
        address: '岐阜市ZZ町Z-Z',
        tel: '058-XXX-XXXX',
        fax: '058-XXX-XXXX',
        email: '',
        customer_type: '元請',
        discount_tendency: '値引きなし',
        memo: '県営住宅LED改修案件',
        created_at: '2025-06-01T08:00:00',
        updated_at: '2026-02-21T16:00:00'
      }
    ],
    projects: [
      {
        quote_no: '2603132',
        customer_id: 'C001',
        project_name: 'うちくる一宮西インター新築電気設備工事',
        project_location: '一宮市XX町',
        issue_date: '2026-03-07',
        expiry_date: '2026-04-07',
        owner: '河口',
        output_pattern: 'split',
        overhead_rate: 12,
        discount: -1035000,
        final_adjustment: -200000,
        tax_display: '税抜',
        status: '見積中',
        notes: '',
        created_at: '2026-03-07T10:00:00',
        updated_at: '2026-03-07T15:00:00'
      },
      {
        quote_no: '260332',
        customer_id: 'C002',
        project_name: '住井冨二郎商店リノベーション電気工事',
        project_location: '岐阜市XX町',
        issue_date: '2026-03-26',
        expiry_date: '2026-04-26',
        owner: '河口',
        output_pattern: 'flat',
        overhead_rate: 12,
        discount: 0,
        final_adjustment: 0,
        tax_display: '税込',
        status: '見積中',
        notes: '照明器具納期遅延の可能性あり',
        created_at: '2026-03-26T11:00:00',
        updated_at: '2026-03-26T11:00:00'
      },
      {
        quote_no: '260221',
        customer_id: 'C003',
        project_name: '県営北方住宅室内照明LED化改修工事',
        project_location: '岐阜市北方町',
        issue_date: '2026-02-21',
        expiry_date: '2026-03-21',
        owner: '河口',
        output_pattern: 'split',
        overhead_rate: 11,
        discount: 0,
        final_adjustment: 0,
        tax_display: '税抜',
        status: '受注',
        notes: '',
        created_at: '2026-02-01T09:00:00',
        updated_at: '2026-02-21T16:00:00'
      },
      {
        quote_no: '260115',
        customer_id: 'C001',
        project_name: '某工場LED化改修工事',
        project_location: '岐阜市',
        issue_date: '2026-01-15',
        expiry_date: '2026-02-15',
        owner: '河口',
        output_pattern: 'flat',
        overhead_rate: 13,
        discount: 0,
        final_adjustment: 0,
        tax_display: '税抜',
        status: '失注',
        notes: '',
        created_at: '2026-01-15T10:00:00',
        updated_at: '2026-02-20T17:00:00'
      }
    ],
    work_categories: [
      { category_id: 'cat01', category_name: '高圧受電設備工事', display_order: 1, default_notes: '※キュービクルの基礎工事は含みません\n※中電申請手続費は含みません\n※耐圧試験費は含みません', keywords: 'キュービクル,高圧,受電,SOG,LA' },
      { category_id: 'cat02', category_name: '電灯動力盤工事', display_order: 2, default_notes: '', keywords: '分電盤,主幹,ELB,動力盤' },
      { category_id: 'cat03', category_name: '電灯動力幹線工事', display_order: 3, default_notes: '', keywords: 'CVT,IV,幹線,送り' },
      { category_id: 'cat04', category_name: '動力配線工事', display_order: 4, default_notes: '', keywords: '動力,エアコン,エレベーター' },
      { category_id: 'cat05', category_name: '電灯配線工事', display_order: 5, default_notes: '', keywords: '電灯配線,スイッチ,人感,3路,片切' },
      { category_id: 'cat06', category_name: 'コンセント工事', display_order: 6, default_notes: '', keywords: 'コンセント,AC専用,2口,防水,ET' },
      { category_id: 'cat07', category_name: '厨房コンセント・換気・動力工事', display_order: 7, default_notes: '', keywords: '厨房,動力4P' },
      { category_id: 'cat08', category_name: '換気工事', display_order: 8, default_notes: '', keywords: '換気,ダクト,FY' },
      { category_id: 'cat09', category_name: '照明器具工事', display_order: 9, default_notes: '※照明器具の納期遅延の可能性があります', keywords: '照明,ダウンライト,ダクトレール,LED電球' },
      { category_id: 'cat10', category_name: '自火報配線工事', display_order: 10, default_notes: '', keywords: '感知器,自火報,HP0.9' },
      { category_id: 'cat11', category_name: 'ワイヤレスナースコール工事', display_order: 11, default_notes: '', keywords: 'ナースコール' },
      { category_id: 'cat12', category_name: 'スピーカー工事', display_order: 12, default_notes: '', keywords: 'スピーカー,音響,放送' },
      { category_id: 'cat13', category_name: 'TVアンテナ配線工事', display_order: 13, default_notes: '', keywords: 'TV,アンテナ,テレビ' },
      { category_id: 'cat14', category_name: '誘導灯・非常灯工事', display_order: 14, default_notes: '', keywords: '誘導灯,非常灯' },
      { category_id: 'cat15', category_name: '情報・電話・カメラ設備工事', display_order: 15, default_notes: '', keywords: 'LAN,TEL,電話,カメラ' },
      { category_id: 'cat16', category_name: '電気錠・インターホン工事', display_order: 16, default_notes: '', keywords: 'インターホン,電気錠' },
      { category_id: 'cat17', category_name: 'その他電気工事', display_order: 99, default_notes: '', keywords: 'その他,既設撤去,中電申請' }
    ],
    unit_prices: [
      { unit_price_id: 'U001', category_id: 'cat01', item_name: '高圧ケーブル配線', spec: '6KVCVT38sq', standard_unit: 'm', price_embedded: 5960, price_exposed: null, maker: '', usage_count: 3, last_used_at: '' },
      { unit_price_id: 'U002', category_id: 'cat01', item_name: '端末処理材', spec: 'CVT38sq用', standard_unit: 'ケ所', price_embedded: 42000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U003', category_id: 'cat01', item_name: '接地工事 A種', spec: 'EA', standard_unit: 'ケ所', price_embedded: 164000, price_exposed: null, maker: '', usage_count: 5, last_used_at: '' },
      { unit_price_id: 'U004', category_id: 'cat01', item_name: '接地工事 D種', spec: 'D', standard_unit: 'ケ所', price_embedded: 164000, price_exposed: null, maker: '', usage_count: 7, last_used_at: '' },
      { unit_price_id: 'U005', category_id: 'cat01', item_name: '接地工事 ELA', spec: 'ELA', standard_unit: 'ケ所', price_embedded: 164000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U006', category_id: 'cat01', item_name: '接地工事 B種', spec: 'EB', standard_unit: 'ケ所', price_embedded: 53000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U007', category_id: 'cat01', item_name: '接地工事 EELB', spec: 'EELB', standard_unit: 'ケ所', price_embedded: 26000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U008', category_id: 'cat01', item_name: '接地工事 ET', spec: 'ET', standard_unit: 'ケ所', price_embedded: 28000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U009', category_id: 'cat01', item_name: '接地工事 ED種', spec: 'ED種', standard_unit: 'ケ所', price_embedded: 12000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U010', category_id: 'cat02', item_name: '分電盤取付 P-1', spec: '支給品', standard_unit: '面', price_embedded: 65800, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U011', category_id: 'cat02', item_name: '分電盤取付 L-1', spec: '支給品', standard_unit: '面', price_embedded: 132000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U012', category_id: 'cat02', item_name: '分電盤取付 T', spec: '支給品', standard_unit: '面', price_embedded: 35000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U013', category_id: 'cat02', item_name: '分電盤 主幹ELB3P3E50A 分岐16回路', spec: '', standard_unit: '面', price_embedded: 66000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U014', category_id: 'cat03', item_name: 'ケーブル配線', spec: 'CVT100sq', standard_unit: 'm', price_embedded: 10850, price_exposed: null, maker: '', usage_count: 8, last_used_at: '2026-03-07' },
      { unit_price_id: 'U015', category_id: 'cat03', item_name: 'ケーブル配線', spec: 'CVT60sq', standard_unit: 'm', price_embedded: 6990, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U016', category_id: 'cat03', item_name: 'ケーブル配線', spec: 'CVT38sq', standard_unit: 'm', price_embedded: 4840, price_exposed: null, maker: '', usage_count: 15, last_used_at: '2026-03-07' },
      { unit_price_id: 'U017', category_id: 'cat03', item_name: '電線', spec: 'IV38sq', standard_unit: 'm', price_embedded: 2040, price_exposed: null, maker: '', usage_count: 11, last_used_at: '2026-03-07' },
      { unit_price_id: 'U018', category_id: 'cat03', item_name: '電線', spec: 'E38sq', standard_unit: 'm', price_embedded: 2040, price_exposed: null, maker: '', usage_count: 11, last_used_at: '' },
      { unit_price_id: 'U019', category_id: 'cat03', item_name: 'ケーブル配線', spec: 'NFP5.5×4C', standard_unit: 'm', price_embedded: 2550, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U020', category_id: 'cat03', item_name: '幹線配線 引込金具共', spec: '14sq', standard_unit: '式', price_embedded: 85000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U021', category_id: 'cat05', item_name: '電灯配線', spec: '', standard_unit: 'ケ所', price_embedded: 2500, price_exposed: 3800, maker: '', usage_count: 47, last_used_at: '2026-03-26' },
      { unit_price_id: 'U022', category_id: 'cat05', item_name: 'スイッチ片切配線', spec: '', standard_unit: 'ケ所', price_embedded: 3800, price_exposed: 4200, maker: 'パナソニック', usage_count: 32, last_used_at: '2026-03-26' },
      { unit_price_id: 'U023', category_id: 'cat05', item_name: 'スイッチ3路配線', spec: '', standard_unit: 'ケ所', price_embedded: 5100, price_exposed: 6300, maker: 'パナソニック', usage_count: 18, last_used_at: '2026-03-26' },
      { unit_price_id: 'U024', category_id: 'cat05', item_name: 'スイッチ人感センサー配線', spec: '人感・3路含む', standard_unit: 'ケ所', price_embedded: 13800, price_exposed: null, maker: '', usage_count: 12, last_used_at: '2026-03-07' },
      { unit_price_id: 'U025', category_id: 'cat05', item_name: 'スイッチセンサー配線', spec: '', standard_unit: 'ケ所', price_embedded: 9300, price_exposed: null, maker: '', usage_count: 7, last_used_at: '' },
      { unit_price_id: 'U026', category_id: 'cat05', item_name: '回路配線', spec: '', standard_unit: 'ケ所', price_embedded: 5500, price_exposed: 8000, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U027', category_id: 'cat05', item_name: '電灯配線（換気）', spec: '', standard_unit: 'ケ所', price_embedded: 4800, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U028', category_id: 'cat06', item_name: 'コンセント配線 AC専用', spec: '', standard_unit: 'ケ所', price_embedded: 7100, price_exposed: null, maker: '', usage_count: 18, last_used_at: '' },
      { unit_price_id: 'U029', category_id: 'cat06', item_name: 'コンセント配線 専用', spec: '', standard_unit: 'ケ所', price_embedded: 7100, price_exposed: 12000, maker: '', usage_count: 23, last_used_at: '2026-03-26' },
      { unit_price_id: 'U030', category_id: 'cat06', item_name: 'コンセント配線 ET', spec: '', standard_unit: 'ケ所', price_embedded: 4000, price_exposed: null, maker: '', usage_count: 6, last_used_at: '' },
      { unit_price_id: 'U031', category_id: 'cat06', item_name: 'コンセント配線 2E', spec: '', standard_unit: 'ケ所', price_embedded: 4200, price_exposed: 6600, maker: '', usage_count: 28, last_used_at: '' },
      { unit_price_id: 'U032', category_id: 'cat06', item_name: 'コンセント配線 2口', spec: '', standard_unit: 'ケ所', price_embedded: 3500, price_exposed: 4800, maker: '', usage_count: 89, last_used_at: '2026-03-26' },
      { unit_price_id: 'U033', category_id: 'cat06', item_name: 'コンセント配線 防水', spec: '', standard_unit: 'ケ所', price_embedded: 4700, price_exposed: null, maker: '', usage_count: 13, last_used_at: '' },
      { unit_price_id: 'U034', category_id: 'cat06', item_name: 'コンセント配線 IH', spec: '', standard_unit: 'ケ所', price_embedded: 12000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U035', category_id: 'cat06', item_name: 'コンセント配線 エアコン', spec: '', standard_unit: 'ケ所', price_embedded: 12000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U036', category_id: 'cat07', item_name: '動力4Pコンセント配線', spec: '', standard_unit: 'ケ所', price_embedded: 13200, price_exposed: null, maker: '', usage_count: 9, last_used_at: '' },
      { unit_price_id: 'U037', category_id: 'cat08', item_name: '換気用電源工事', spec: '', standard_unit: 'ケ所', price_embedded: 2500, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U038', category_id: 'cat08', item_name: '換気用スイッチ工事', spec: '', standard_unit: 'ケ所', price_embedded: 3800, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U039', category_id: 'cat08', item_name: '換気扇取付 天井埋込', spec: 'FY-17', standard_unit: '台', price_embedded: 16300, price_exposed: null, maker: 'パナソニック', usage_count: 6, last_used_at: '2026-03-26' },
      { unit_price_id: 'U040', category_id: 'cat08', item_name: 'ダクト工事 100φアルミ', spec: '', standard_unit: 'ケ所', price_embedded: 15000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U041', category_id: 'cat09', item_name: '照明器具取付 間接', spec: 'DSY-5233AWE', standard_unit: '台', price_embedded: 13700, price_exposed: null, maker: '', usage_count: 5, last_used_at: '' },
      { unit_price_id: 'U042', category_id: 'cat09', item_name: '照明器具取付 間接', spec: 'DSY-5234AWE', standard_unit: '台', price_embedded: 17300, price_exposed: null, maker: '', usage_count: 3, last_used_at: '' },
      { unit_price_id: 'U043', category_id: 'cat09', item_name: '照明器具取付 間接', spec: 'DSY-5235AWE', standard_unit: '台', price_embedded: 21500, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U044', category_id: 'cat09', item_name: '照明器具取付 間接', spec: 'DSY-5236AWE', standard_unit: '台', price_embedded: 29300, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U045', category_id: 'cat09', item_name: '直流電源装置取付', spec: 'DP-42054', standard_unit: '台', price_embedded: 9900, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U046', category_id: 'cat09', item_name: '直流電源装置取付', spec: 'DP-42055', standard_unit: '台', price_embedded: 11700, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U047', category_id: 'cat09', item_name: '直流電源装置取付', spec: 'DP-42056', standard_unit: '台', price_embedded: 15900, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U048', category_id: 'cat09', item_name: '照明器具取付', spec: 'OS256736R', standard_unit: '台', price_embedded: 13100, price_exposed: null, maker: 'オーデリック', usage_count: 4, last_used_at: '' },
      { unit_price_id: 'U049', category_id: 'cat09', item_name: '照明器具取付', spec: 'OL291576R1C', standard_unit: '台', price_embedded: 19800, price_exposed: null, maker: 'オーデリック', usage_count: 4, last_used_at: '' },
      { unit_price_id: 'U050', category_id: 'cat09', item_name: '照明器具取付', spec: 'DCL-42431', standard_unit: '台', price_embedded: 19800, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U051', category_id: 'cat09', item_name: 'LED電球取付', spec: '100W相当', standard_unit: '台', price_embedded: 3400, price_exposed: null, maker: '', usage_count: 22, last_used_at: '2026-03-26' },
      { unit_price_id: 'U052', category_id: 'cat09', item_name: 'ダクトレール 1.5m 黒', spec: '', standard_unit: '台', price_embedded: 8000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U053', category_id: 'cat09', item_name: 'ダクトレール 2.0m 黒', spec: '', standard_unit: '台', price_embedded: 8000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U054', category_id: 'cat10', item_name: 'ケーブル配線', spec: 'HP0.9-10P', standard_unit: 'm', price_embedded: 950, price_exposed: null, maker: '', usage_count: 5, last_used_at: '2026-03-07' },
      { unit_price_id: 'U055', category_id: 'cat10', item_name: 'ケーブル配線', spec: 'HP0.9-5P', standard_unit: 'm', price_embedded: 770, price_exposed: null, maker: '', usage_count: 9, last_used_at: '' },
      { unit_price_id: 'U056', category_id: 'cat10', item_name: 'ケーブル配線', spec: 'HP0.9-4P', standard_unit: 'm', price_embedded: 720, price_exposed: null, maker: '', usage_count: 8, last_used_at: '' },
      { unit_price_id: 'U057', category_id: 'cat10', item_name: 'ケーブル配線', spec: 'HP0.9-2P', standard_unit: 'm', price_embedded: 520, price_exposed: null, maker: '', usage_count: 14, last_used_at: '2026-03-07' },
      { unit_price_id: 'U058', category_id: 'cat10', item_name: '感知器配線', spec: '', standard_unit: 'ケ所', price_embedded: 2100, price_exposed: null, maker: '', usage_count: 11, last_used_at: '2026-03-07' },
      { unit_price_id: 'U059', category_id: 'cat12', item_name: 'スピーカー配線', spec: '', standard_unit: 'ケ所', price_embedded: 4800, price_exposed: null, maker: '', usage_count: 4, last_used_at: '' },
      { unit_price_id: 'U060', category_id: 'cat13', item_name: 'TV配線', spec: '', standard_unit: 'ケ所', price_embedded: 3600, price_exposed: null, maker: '', usage_count: 7, last_used_at: '' },
      { unit_price_id: 'U061', category_id: 'cat14', item_name: '誘導灯・非常灯配線工事', spec: '', standard_unit: 'ケ所', price_embedded: 5500, price_exposed: null, maker: '', usage_count: 7, last_used_at: '2026-03-07' },
      { unit_price_id: 'U062', category_id: 'cat14', item_name: '信号配線', spec: '', standard_unit: 'ケ所', price_embedded: 3000, price_exposed: null, maker: '', usage_count: 4, last_used_at: '' },
      { unit_price_id: 'U063', category_id: 'cat15', item_name: 'LAN配線', spec: '', standard_unit: 'ケ所', price_embedded: 5000, price_exposed: null, maker: '', usage_count: 15, last_used_at: '' },
      { unit_price_id: 'U064', category_id: 'cat15', item_name: 'TEL配線', spec: '', standard_unit: 'ケ所', price_embedded: 8000, price_exposed: null, maker: '', usage_count: 10, last_used_at: '' },
      { unit_price_id: 'U065', category_id: 'cat15', item_name: 'カメラ用LAN配線', spec: '', standard_unit: 'ケ所', price_embedded: 5000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U066', category_id: 'cat15', item_name: '電話配管 壁貫通含む', spec: '', standard_unit: 'ケ所', price_embedded: 14000, price_exposed: null, maker: '', usage_count: 0, last_used_at: '' },
      { unit_price_id: 'U067', category_id: 'cat16', item_name: '電気錠配線', spec: '取付機器別途', standard_unit: 'ケ所', price_embedded: 4200, price_exposed: null, maker: '', usage_count: 4, last_used_at: '' },
      { unit_price_id: 'U068', category_id: 'cat17', item_name: '既設撤去', spec: '', standard_unit: '式', price_embedded: 50000, price_exposed: null, maker: '', usage_count: 12, last_used_at: '' },
      { unit_price_id: 'U069', category_id: 'cat17', item_name: '中電申請手続費', spec: '', standard_unit: '式', price_embedded: 15000, price_exposed: null, maker: '', usage_count: 24, last_used_at: '' }
    ],
    quote_lines: [],
    notes_templates: [
      { note_id: 'N001', category_id: 'cat01', template_text: '※キュービクルの基礎工事は含みません', usage_count: 5 },
      { note_id: 'N002', category_id: 'cat01', template_text: '※中電申請手続費は含みません', usage_count: 5 },
      { note_id: 'N003', category_id: 'cat01', template_text: '※耐圧試験費は含みません', usage_count: 5 },
      { note_id: 'N004', category_id: 'cat09', template_text: '※照明器具の納期遅延の可能性がありますのでご承知おきください', usage_count: 3 },
      { note_id: 'N005', category_id: null, template_text: '※撤去品処分費は含みません', usage_count: 2 },
      { note_id: 'N006', category_id: null, template_text: '※消費税は含まれておりません', usage_count: 7 }
    ],
    settings: [
      { setting_key: 'tax_rate', setting_value: '10', description: '消費税率（%）' },
      { setting_key: 'default_overhead_rate', setting_value: '12', description: '標準諸経費率（%）' },
      { setting_key: 'company_name', setting_value: '河口電機株式会社', description: '会社名' }
    ]
  },

  // 初期化（初回呼び出し時にlocalStorageへseed投入）
  init() {
    const initialized = Util.storage.get('mock_initialized');
    if (initialized) return;

    Object.keys(this.seed).forEach(key => {
      Util.storage.set('mock_' + key, this.seed[key]);
    });
    Util.storage.set('mock_initialized', true);
  },

  // モックデータをリセット
  reset() {
    Object.keys(this.seed).forEach(key => {
      Util.storage.remove('mock_' + key);
    });
    Util.storage.remove('mock_initialized');
    this.init();
  },

  // テーブル読み込み
  read(table) {
    return Util.storage.get('mock_' + table, []);
  },

  // テーブル書き込み
  write(table, data) {
    Util.storage.set('mock_' + table, data);
  },

  // ID自動採番
  generateId(table, prefix, padLength) {
    const items = this.read(table);
    const idField = MockApi.idFieldOf(table);
    let maxNum = 0;
    items.forEach(item => {
      const id = String(item[idField] || '');
      if (id.startsWith(prefix)) {
        const num = parseInt(id.substring(prefix.length), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return prefix + String(maxNum + 1).padStart(padLength, '0');
  },

  // 見積番号採番（YYMM+通し）
  generateQuoteNo() {
    const now = new Date();
    const reiwaYear = now.getFullYear() - 2018;
    const yy = String(reiwaYear).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = yy + mm;

    const items = this.read('projects');
    let maxSeq = 0;
    items.forEach(item => {
      const no = String(item.quote_no || '');
      if (no.startsWith(prefix)) {
        const seq = parseInt(no.substring(prefix.length), 10);
        if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
      }
    });
    return prefix + (maxSeq + 1);
  }
};

const MockApi = {

  // 各テーブルのID列名
  idFieldMap: {
    customers: 'customer_id',
    projects: 'quote_no',
    quote_lines: 'line_id',
    unit_prices: 'unit_price_id',
    work_categories: 'category_id',
    notes_templates: 'note_id',
    settings: 'setting_key'
  },

  idFieldOf(table) {
    return this.idFieldMap[table];
  },

  // エンティティ名→テーブル名のマッピング
  tableMap: {
    customer: 'customers',
    project: 'projects',
    quote_line: 'quote_lines',
    unit_price: 'unit_prices',
    work_category: 'work_categories',
    notes_template: 'notes_templates',
    setting: 'settings'
  },

  // メインリクエストハンドラ
  async request(entity, action, data) {
    MockData.init();
    await this.delay(100);

    const table = this.tableMap[entity];
    if (!table) {
      throw new Error(`不明なエンティティ: ${entity}`);
    }

    // 特殊アクション：見積明細の一括置換
    if (entity === 'quote_line' && action === 'replace_for_quote') {
      return this.replaceLinesForQuote(data);
    }

    switch (action) {
      case 'list':
        return this.list(table);
      case 'get':
        return this.get(table, data.id);
      case 'create':
        return this.create(entity, table, data);
      case 'update':
        return this.update(table, data.id, data);
      case 'delete':
        return this.delete(table, data.id);
      default:
        throw new Error(`不明なアクション: ${action}`);
    }
  },

  /**
   * 指定見積の明細を一括置換
   */
  replaceLinesForQuote(data) {
    if (!data.quote_no) throw new Error('quote_no は必須です');
    if (!Array.isArray(data.lines)) throw new Error('lines は配列で指定してください');

    const allLines = MockData.read('quote_lines');
    // 既存の同quote_no分を除外
    const kept = allLines.filter(l => String(l.quote_no) !== String(data.quote_no));

    // 既存全体の最大line_id番号を取得
    let maxNum = 0;
    kept.forEach(l => {
      const id = String(l.line_id || '');
      if (id.startsWith('L')) {
        const num = parseInt(id.substring(1), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });

    // 新明細を採番
    const newLines = data.lines.map((line, idx) => {
      maxNum++;
      return Object.assign({}, line, {
        line_id: 'L' + String(maxNum).padStart(5, '0'),
        quote_no: data.quote_no,
        row_no: idx + 1
      });
    });

    MockData.write('quote_lines', kept.concat(newLines));

    return {
      success: true,
      data: { quote_no: data.quote_no, line_count: newLines.length },
      message: `${newLines.length}件の明細を保存しました`
    };
  },

  async health() {
    await this.delay(50);
    return {
      success: true,
      status: 'ok',
      message: 'KE-Mitsumori Mock API is running',
      version: CONFIG.VERSION + ' (mock)',
      timestamp: new Date().toISOString()
    };
  },

  list(table) {
    const items = MockData.read(table);
    return { success: true, data: items, count: items.length };
  },

  get(table, id) {
    const idField = this.idFieldOf(table);
    const items = MockData.read(table);
    const item = items.find(i => String(i[idField]) === String(id));
    if (!item) throw new Error(`${id} が見つかりません`);
    return { success: true, data: item };
  },

  create(entity, table, data) {
    const idField = this.idFieldOf(table);
    let newId;

    if (entity === 'project') {
      newId = data.quote_no || MockData.generateQuoteNo();
    } else if (entity === 'customer') {
      newId = data.customer_id || MockData.generateId('customers', 'C', 3);
    } else if (entity === 'unit_price') {
      newId = data.unit_price_id || MockData.generateId('unit_prices', 'U', 3);
    } else if (entity === 'work_category') {
      newId = data.category_id || MockData.generateId('work_categories', 'cat', 2);
    } else if (entity === 'notes_template') {
      newId = data.note_id || MockData.generateId('notes_templates', 'N', 3);
    } else if (entity === 'quote_line') {
      newId = data.line_id || MockData.generateId('quote_lines', 'L', 5);
    } else {
      newId = data[idField];
    }

    const items = MockData.read(table);
    if (items.some(i => String(i[idField]) === String(newId))) {
      throw new Error(`${newId} は既に存在します`);
    }

    const now = new Date().toISOString();
    const newItem = Object.assign({}, data, { [idField]: newId });
    if (entity === 'customer' || entity === 'project') {
      newItem.created_at = now;
      newItem.updated_at = now;
    }

    items.push(newItem);
    MockData.write(table, items);
    return { success: true, data: newItem, message: '登録しました' };
  },

  update(table, id, data) {
    const idField = this.idFieldOf(table);
    const items = MockData.read(table);
    const index = items.findIndex(i => String(i[idField]) === String(id));
    if (index < 0) throw new Error(`${id} が見つかりません`);

    const updated = Object.assign({}, items[index], data);
    updated[idField] = id;
    updated.updated_at = new Date().toISOString();
    items[index] = updated;
    MockData.write(table, items);

    return { success: true, data: updated, message: '更新しました' };
  },

  delete(table, id) {
    const idField = this.idFieldOf(table);
    const items = MockData.read(table);
    const filtered = items.filter(i => String(i[idField]) !== String(id));
    if (items.length === filtered.length) {
      throw new Error(`${id} が見つかりません`);
    }
    MockData.write(table, filtered);
    return { success: true, message: `${id} を削除しました` };
  },

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
};
