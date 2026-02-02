export const EVENT_INFO = {
  title: '華地產鑽石分會 春酒',
  date: '2026/03/03（週二）',
  checkInTime: '17:30–18:00',
  startTime: '18:30',
  deadline: '2026-01-31T23:59:59+08:00',
  deadlineDisplay: '1/31（週六，含）',
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
};

/** 收款／匯款說明（供報名頁與催款使用，請依實際活動修改） */
export const PAYMENT_INSTRUCTIONS = {
  deadline: '1/31（週六，含）前',
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
