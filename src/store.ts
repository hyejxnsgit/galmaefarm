import { useSyncExternalStore } from 'react';

export type ProductId = 'gift-5' | 'gift-10' | 'home-5' | 'home-10';
export type Category = 'gift' | 'home';
export type TasteKey = 'sweet' | 'balanced' | 'fresh';

export const PRODUCT_IDS: ProductId[] = ['gift-5', 'gift-10', 'home-5', 'home-10'];

export const PRODUCTS: Record<ProductId, { name: string; short: string; weight: 5 | 10; category: Category; price: number }> = {
  'gift-5': { name: '선물용 한라봉 5kg', short: '선물용 5kg', weight: 5, category: 'gift', price: 36000 },
  'gift-10': { name: '선물용 한라봉 10kg', short: '선물용 10kg', weight: 10, category: 'gift', price: 68000 },
  'home-5': { name: '가정용 한라봉 5kg', short: '가정용 5kg', weight: 5, category: 'home', price: 28000 },
  'home-10': { name: '가정용 한라봉 10kg', short: '가정용 10kg', weight: 10, category: 'home', price: 55000 },
};

export const productId = (category: Category, weight: number) => `${category}-${weight}` as ProductId;

export const TASTES: Record<TasteKey, string> = { sweet: '달콤형', balanced: '균형형', fresh: '상큼형' };

export const STATUS = {
  normal: {
    admin: '정상 판매', label: '주문 가능',
    bar: '지금 주문 가능 · 출고일은 수확 후 문자로 알려드려요',
    character: '잘 골라놨다봉',
  },
  reservation: {
    admin: '예약 판매', label: '예약 중',
    bar: '다음 수확분 예약 중 · 출고 일정은 문자로 먼저 알려드려요',
    character: '미리 잡아두라봉',
  },
} as const;
export type StatusKey = keyof typeof STATUS;

export const REVIEW_TAGS = [
  { key: 'sweet-sour', label: '달고 적당히 새콤했어요' },
  { key: 'juicy', label: '과즙이 풍부했어요' },
  { key: 'family', label: '가족이 함께 먹기 좋았어요' },
  { key: 'repurchase', label: '다시 구매하고 싶어요' },
];

export const STAGES = ['주문 접수', '주소 확인', '선별·포장 중', '출고 완료', '배송 중', '배송 완료'];
export const STAGE_SMALL = ['주문을 확인했어요', '배송지를 확인했어요', '좋은 과일을 고르고 있어요', '송장을 알려드려요', '택배사 이동 중', '받았는지 확인해요'];
export const STAGE_ACTION = ['주소 확인', '포장 시작', '출고 완료 처리', '배송 중으로', '배송 완료'];

export interface User {
  memberId: string; name: string; phone: string; hash: string; marketing: boolean;
  coupon: boolean; points: number; createdAt: string;
}
export interface Order {
  id: string; createdAt: string; product: ProductId; productName: string; quantity: number;
  listPrice: number; unitPrice: number; farmDiscount: number; couponAmount: number; total: number;
  buyerName: string; buyerPhone: string; buyerEmail: string;
  recipientName: string; recipientPhone: string; address: string; giftMessage: string;
  payment: string; stage: number; member: boolean; sample?: boolean;
}
export interface Address { owner: string; label: string; name: string; phone: string; address: string }
export interface Review { createdAt: string; taste: TasteKey; tags: string[]; hasPhoto: boolean; comment: string; points: number }
export interface Issue { createdAt: string; orderId: string; type: string; note: string; photos: number }
export interface Activity { time: string; text: string }
export interface TasteDetail {
  measurementDate: string; sampleCount: number; brixAverage: number; brixMin: number; brixMax: number;
  tastingNote: string; ripening: string; shippingStart: string; shippingEnd: string;
}

export interface State {
  status: StatusKey;
  taste: TasteKey;
  availability: Record<ProductId, boolean>;
  detail: TasteDetail;
  inventory: { 5: number; 10: number };
  prices: Record<ProductId, number>;
  discount: { enabled: boolean; rate: number };
  costs: Partial<Record<ProductId, number>>;
  sheetUrl: string;
  packingNote: string;
  updatedAt: string;
  users: User[];
  orders: Order[];
  addresses: Address[];
  reviews: Review[];
  issues: Issue[];
  activity: Activity[];
}

export const PACKING_DEFAULT = '주문 순서대로 선별해 보내고 있어요.';
export const DEFAULT_SHEET_URL = 'https://script.google.com/macros/s/AKfycbzfjdl8Cv88TbJYWXI3U--DVQP2PgdGaoJyxAQYvZw89l_c2z1S67GlP8OyAbQgzTFf/exec';

const DEFAULTS: State = {
  status: 'normal',
  taste: 'balanced',
  availability: { 'gift-5': true, 'gift-10': true, 'home-5': true, 'home-10': true },
  detail: {
    measurementDate: '2026-10-02', sampleCount: 12, brixAverage: 13.2, brixMin: 12.4, brixMax: 14.1,
    tastingNote: '달고 적당히 새콤하며 과즙이 풍부해요.', ripening: '바로 먹기 좋아요.',
    shippingStart: '2026-10-03', shippingEnd: '2026-10-07',
  },
  inventory: { 5: 20, 10: 10 },
  prices: { 'gift-5': 36000, 'gift-10': 68000, 'home-5': 28000, 'home-10': 55000 },
  discount: { enabled: false, rate: 5 },
  costs: {},
  sheetUrl: DEFAULT_SHEET_URL,
  packingNote: PACKING_DEFAULT,
  updatedAt: '2026-10-02',
  users: [], orders: [], addresses: [], reviews: [], issues: [],
  activity: [
    { time: '2026-10-02T09:12:00', text: '주문 HNB-1024 접수 문자를 보냈어요.' },
    { time: '2026-10-01T16:30:00', text: '판매 수량을 5kg 20개, 10kg 10개로 저장했어요.' },
  ],
};

export const SAMPLE_ORDERS: Order[] = [
  {
    id: 'HNB-1024', createdAt: '2026-10-02T09:12:00', product: 'gift-5', productName: PRODUCTS['gift-5'].name, quantity: 1,
    listPrice: 36000, unitPrice: 36000, farmDiscount: 0, couponAmount: 0, total: 36000,
    buyerName: '박지현', buyerPhone: '', buyerEmail: '', recipientName: '김영자', recipientPhone: '', address: '저장된 배송지',
    giftMessage: '', payment: 'card', stage: 3, member: true, sample: true,
  },
  {
    id: 'HNB-1023', createdAt: '2026-10-02T08:40:00', product: 'gift-10', productName: PRODUCTS['gift-10'].name, quantity: 1,
    listPrice: 68000, unitPrice: 68000, farmDiscount: 0, couponAmount: 0, total: 68000,
    buyerName: '이준호', buyerPhone: '', buyerEmail: '', recipientName: '이정숙', recipientPhone: '', address: '저장된 배송지',
    giftMessage: '', payment: 'card', stage: 1, member: true, sample: true,
  },
];

const KEY = 'hannubong-v2';
const SESSION_KEY = 'hannubong-session';
const listeners = new Set<() => void>();
let cache: { raw: string | null; state: State } = { raw: '\u0000', state: DEFAULTS };

const parse = (raw: string | null): State => {
  if (!raw) return DEFAULTS;
  try {
    const p = JSON.parse(raw) as Partial<State>;
    return {
      ...DEFAULTS, ...p,
      availability: { ...DEFAULTS.availability, ...p.availability },
      detail: { ...DEFAULTS.detail, ...p.detail },
      inventory: { ...DEFAULTS.inventory, ...p.inventory },
      prices: { ...DEFAULTS.prices, ...p.prices },
      discount: { ...DEFAULTS.discount, ...p.discount },
      costs: { ...p.costs },
      users: (p.users || []).map((user) => ({ ...user, memberId: user.memberId || makeMemberId() })),
    };
  } catch {
    return DEFAULTS;
  }
};

export const getState = (): State => {
  const raw = localStorage.getItem(KEY);
  if (raw !== cache.raw) cache = { raw, state: parse(raw) };
  return cache.state;
};

const emit = () => listeners.forEach((l) => l());
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener('storage', cb);
  return () => { listeners.delete(cb); window.removeEventListener('storage', cb); };
};

export const update = (fn: (s: State) => State) => {
  const next = fn(getState());
  localStorage.setItem(KEY, JSON.stringify(next));
  emit();
};

export const useStore = () => useSyncExternalStore(subscribe, getState);

const readSession = () => localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY) || '';
export const useSession = (): User | null => {
  const phone = useSyncExternalStore(subscribe, readSession);
  const state = useStore();
  return state.users.find((u) => u.phone === phone) || null;
};
export const login = (phone: string, remember: boolean) => {
  localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
  (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, phone);
  emit();
};
export const logout = () => { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); emit(); };

export const addActivity = (s: State, text: string): State => ({
  ...s, activity: [{ time: new Date().toISOString(), text }, ...s.activity].slice(0, 30),
});

export const hashPassword = async (phone: string, password: string) => {
  const data = new TextEncoder().encode(`hannubong:${phone}:${password}`);
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const digits = (v: string) => v.replace(/\D/g, '');
export const isPhone = (v: string) => /^01\d{8,9}$/.test(digits(v));
export const formatPhone = (v: string) => {
  const d = digits(v);
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return v.trim();
};

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`;
export const dateKR = (iso: string) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};
export const mdKR = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : `${d.getMonth() + 1}월 ${d.getDate()}일`;
};
export const shippingRange = (d: TasteDetail) => `${mdKR(d.shippingStart)}–${mdKR(d.shippingEnd)}`;
export const timeKR = (iso: string) => {
  const d = new Date(iso);
  const t = d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' });
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  const yday = new Date(today.getTime() - 864e5).toDateString() === d.toDateString();
  return same ? t : yday ? `어제 ${t}` : `${d.getMonth() + 1}월 ${d.getDate()}일 ${t}`;
};
export const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

export const listPrice = (s: State, id: ProductId) => s.prices[id];
export const salePrice = (s: State, id: ProductId) =>
  s.discount.enabled ? Math.round((s.prices[id] * (100 - s.discount.rate)) / 100 / 10) * 10 : s.prices[id];

export const COUPON = 3000;

export const makeMemberId = () => {
  const now = new Date();
  const date = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  return `HNM-${date}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
};

export const getSheetUrl = (state: State = getState()) => state.sheetUrl.trim() || DEFAULT_SHEET_URL;
export const isSheetUrl = (url: string) => /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec(?:\?.*)?$/.test(url.trim());

type SheetResponse = { ok?: boolean; status?: string; message?: string; addedOrders?: number; skippedOrders?: number; addedMembers?: number };

const requestSheetJsonp = (url: string, params: Record<string, string>, timeout = 10000) => new Promise<SheetResponse>((resolve, reject) => {
  const callback = `hannubongSheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const script = document.createElement('script');
  let finished = false;
  const finish = (error?: Error, value?: SheetResponse) => {
    if (finished) return;
    finished = true;
    window.clearTimeout(timer);
    script.remove();
    delete (window as unknown as Record<string, unknown>)[callback];
    if (error) reject(error); else resolve(value || {});
  };
  const timer = window.setTimeout(() => finish(new Error('구글 응답 시간이 초과되었습니다.')), timeout);
  (window as unknown as Record<string, unknown>)[callback] = (value: SheetResponse) => finish(undefined, value);
  script.onerror = () => finish(new Error('구글 연결 응답을 읽지 못했습니다.'));
  const target = new URL(url);
  Object.entries({ ...params, callback, cacheBust: String(Date.now()) }).forEach(([key, value]) => target.searchParams.set(key, value));
  script.src = target.toString();
  document.head.appendChild(script);
});

export const checkSheetConnection = async (url: string) => {
  if (!isSheetUrl(url)) throw new Error('Apps Script 웹 앱의 /exec 주소를 확인해주세요.');
  const result = await requestSheetJsonp(url, { mode: 'health' });
  if (!result.ok) throw new Error(result.message || '구글 연결 확인에 실패했습니다.');
  return result;
};

const waitForSheetSync = async (url: string, syncId: string) => {
  let result: SheetResponse = {};
  for (let attempt = 0; attempt < 9; attempt += 1) {
    await new Promise((resolve) => window.setTimeout(resolve, attempt === 0 ? 650 : 1000));
    result = await requestSheetJsonp(url, { mode: 'status', syncId });
    if (result.status === 'success') return result;
    if (result.status === 'error') throw new Error(result.message || '구글 시트 저장 중 오류가 발생했습니다.');
  }
  throw new Error(result.message || '구글 시트 저장 완료를 확인하지 못했습니다.');
};

export const sheetOrder = (order: Order, costs: Partial<Record<ProductId, number>> = {}) => {
  const unitCost = costs[order.product];
  const totalCost = unitCost == null ? '' : unitCost * order.quantity;
  return {
    orderDateTime: order.createdAt, orderId: order.id, productCode: order.product, productName: order.productName,
    quantity: order.quantity, listUnitPrice: order.listPrice, saleUnitPrice: order.unitPrice,
    discount: order.farmDiscount + order.couponAmount, revenue: order.total, unitCost: unitCost ?? '', totalCost,
    expectedProfit: totalCost === '' ? '' : order.total - totalCost, buyerName: order.buyerName, buyerPhone: order.buyerPhone,
    recipientName: order.recipientName, recipientPhone: order.recipientPhone, address: order.address,
    status: STAGES[order.stage - 1] || '주문 접수', sms: '미발송',
  };
};

export const postToSheet = async (url: string, payload: Record<string, unknown>) => {
  const target = url.trim();
  await checkSheetConnection(target);
  const syncId = String(payload.syncId || `sync-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);
  await fetch(target, {
    method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ ...payload, syncId }),
  });
  return waitForSheetSync(target, syncId);
};
