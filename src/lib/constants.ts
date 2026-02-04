export const EVENT_INFO = {
  title: '華地產鑽石分會 春酒',
  date: '2026/03/03（週二）',
  checkInTime: '17:30–18:00',
  startTime: '18:30',
  deadline: '2026-02-07T23:59:59+08:00', // 後台可覆寫，此為 API 無回應時的 fallback
  deadlineDisplay: '2/7（週六，含）',
};

/** 活動場地與交通資訊 */
export const VENUE_INFO = {
  name: '晶宴‧日光香頌',
  nameAlt: '原民生館',
  address: '台北市中山區民生東路三段8號1樓',
  addressNote: '訂席櫃台',
  phone: '02-2517-9977',
  parking: '南山便利停車場 B5~B6',
  parkingNote: '出入口於民生東路上汎德汽車旁',
  mapsUrl: 'https://goo.gl/maps/gAJa9rAJ8LW3myMS9',
};

export const REGISTRATION_TYPE_LABELS: Record<string, string> = {
  internal: '內部夥伴（分會夥伴）',
  external: '外部來賓',
  vip: 'VIP（大咖/特邀）',
};

export const DIET_TYPE_LABELS: Record<string, string> = {
  normal: '一般',
  vegetarian: '素食',
  no_beef: '不吃牛',
  no_pork: '不吃豬',
  other: '其他',
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  transfer: '轉帳',
  cash: '現金',
  other: '其他',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: '已付款',
  unpaid: '尚未付款',
  pending: '審核付款',
};

/** 收款／匯款說明（供報名頁與催款使用，請依實際活動修改） */
export const PAYMENT_INSTRUCTIONS = {
  deadline: '2/7（週六，含）前', // 後台可覆寫，此為 API 無回應時的 fallback
  bankName: '（請填入銀行名稱，例如：中國信託）',
  bankCode: '',
  accountNumber: '（請填入帳號）',
  accountName: '（請填入戶名）',
  amount: '（請填入每人金額或「另洽主辦」）',
  note: '匯款後請上傳憑證或告知主辦，以加速確認。',
};

export const SEAT_ZONE_LABELS: Record<string, string> = {
  vip: 'VIP區',
  general: '一般區',
  internal: '內部區',
};

export const STEPS = [
  { number: 1, title: '預覽報名時間' },
  { number: 2, title: '填寫聯絡信箱' },
];
