import { useEffect, useMemo, useState } from 'react';
import {
  Order, PRODUCTS, PRODUCT_IDS, PACKING_DEFAULT, ProductId, SAMPLE_ORDERS, STAGES, STAGE_ACTION, STATUS, StatusKey, TASTES, TasteKey,
  addActivity, checkSheetConnection, getSheetUrl, getState, isToday, postToSheet, salePrice, sheetOrder, timeKR, update, useStore, won,
} from '../store';
import { useDialog, usePage, useToast } from '../components/ui';

const NOTES = ['달고 적당히 새콤하며 과즙이 풍부해요.', '단맛이 선명하고 신맛은 부드러워요.', '상큼한 신맛 뒤에 은은한 단맛이 남아요.'];
const NOTE_LABELS = ['달고 새콤해요', '단맛이 선명해요', '상큼함이 또렷해요'];
const RIPEN = [['바로 먹기', '바로 먹기 좋아요.'], ['2일 후숙', '상온에서 2일 후숙을 권장해요.'], ['3일 후숙', '상온에서 3일 후숙을 권장해요.']];

const csvCell = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const toCsv = (orders: Order[], costs: Partial<Record<ProductId, number>>) => {
  const head = ['주문번호', '주문일시', '상품', '수량', '정가', '판매가', '농장할인', '쿠폰', '결제금액', '원가합계', '예상이익', '주문자', '주문자전화', '받는분', '받는분전화', '주소', '선물메시지', '결제수단', '진행단계'];
  const rows = orders.map((o) => {
    const c = costs[o.product];
    const cost = c == null ? '' : c * o.quantity;
    return [o.id, o.createdAt, o.productName, o.quantity, o.listPrice, o.unitPrice, o.farmDiscount, o.couponAmount, o.total, cost, cost === '' ? '' : o.total - cost, o.buyerName, o.buyerPhone, o.recipientName, o.recipientPhone, o.address, o.giftMessage, o.payment, STAGES[o.stage - 1]];
  });
  return '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
};
const download = (name: string, text: string) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
};

export default function Admin() {
  usePage('admin', 'admin-body');
  const s = useStore();
  const { toast, node } = useToast();
  const statusDialog = useDialog();
  const [pendingStatus, setPendingStatus] = useState<StatusKey>('reservation');
  const today = new Date();

  const [taste, setTaste] = useState<TasteKey>(s.taste);
  const [avail, setAvail] = useState(s.availability);
  const [detail, setDetail] = useState(s.detail);
  const [counts, setCounts] = useState(s.inventory);
  const [prices, setPrices] = useState(s.prices);
  const [disc, setDisc] = useState(s.discount);
  const [costs, setCosts] = useState<Record<string, string>>(() => Object.fromEntries(PRODUCT_IDS.map((id) => [id, s.costs[id] != null ? String(s.costs[id]) : ''])));
  const [sheetUrl, setSheetUrl] = useState(getSheetUrl(s));
  const [sheetMsg, setSheetMsg] = useState('연결 주소를 저장하면 실제로 구글과 통신되는지 확인합니다.');
  const [sheetState, setSheetState] = useState(s.sheetUrl ? '주소 저장됨' : '연결 전');

  useEffect(() => { document.title = '오늘 농장 일 | 한누봉 관리자'; }, []);

  const todayOrders = useMemo(() => s.orders.filter((o) => isToday(o.createdAt)), [s.orders]);
  const revenue = todayOrders.reduce((a, o) => a + o.total, 0);
  const discountSum = todayOrders.reduce((a, o) => a + o.farmDiscount + o.couponAmount, 0);
  const costKnown = todayOrders.length > 0 && todayOrders.every((o) => s.costs[o.product] != null);
  const net = costKnown ? todayOrders.reduce((a, o) => a + o.total - (s.costs[o.product] || 0) * o.quantity, 0) : null;
  const byProduct = PRODUCT_IDS.map((id) => ({ id, qty: todayOrders.filter((o) => o.product === id).reduce((a, o) => a + o.quantity, 0) })).filter((x) => x.qty > 0);
  const sentence = todayOrders.length === 0 ? '아직 오늘 들어온 주문이 없어요'
    : net == null ? `오늘 ${todayOrders.length}건, ${won(revenue)}어치 팔렸어요`
    : net >= 0 ? `오늘 ${won(net)} 남겼어요` : `오늘은 ${won(-net)} 손해예요`;

  const orderList = [...s.orders, ...(s.orders.length ? [] : SAMPLE_ORDERS)];

  const commit = (fn: (x: typeof s) => typeof s, msg: string, log: string) => {
    update((x) => addActivity({ ...fn(x), updatedAt: new Date().toISOString().slice(0, 10) }, log));
    toast(msg);
  };

  const askStatus = (k: StatusKey) => { if (k === s.status) return; setPendingStatus(k); statusDialog.open(); };
  const confirmStatus = () => {
    commit((x) => ({ ...x, status: pendingStatus }), '판매 상태를 바꿨어요.', `판매 상태를 ‘${STATUS[pendingStatus].admin}’으로 바꿨어요.`);
    statusDialog.close();
  };

  const num = (v: string) => (v === '' ? undefined : Number(v));
  const advance = (id: string) => commit((x) => ({
    ...x, orders: x.orders.map((o) => (o.id === id ? { ...o, stage: Math.min(6, o.stage + 1) } : o)),
  }), '진행 단계를 바꿨어요.', `주문 ${id}을(를) 다음 단계로 옮겼어요.`);

  const quick = (k: string) => {
    if (k === 'packing') commit((x) => ({ ...x, orders: x.orders.map((o) => (o.stage === 2 ? { ...o, stage: 3 } : o)) }), '주소 확인된 주문을 포장 단계로 옮겼어요.', '포장 완료 처리를 했어요.');
    if (k === 'shipping') commit((x) => ({ ...x, orders: x.orders.map((o) => (o.stage === 3 ? { ...o, stage: 4 } : o)) }), '포장 중인 주문을 출고 완료 처리했어요.', '출고 완료 처리를 했어요.');
    if (k === 'pause') commit((x) => ({ ...x, packingNote: '오늘은 출고를 잠시 멈췄어요. 내일 순서대로 이어서 보낼게요.' }), '고객 화면에 출고 중단을 안내했어요.', '오늘 출고를 중단했어요.');
    if (k === 'taste') {
      const note = window.prompt('고객에게 보여줄 오늘 농장 메모를 적어주세요. (비우면 기본 문구로 돌아가요)', s.packingNote);
      if (note === null) return;
      commit((x) => ({ ...x, packingNote: note.trim() || PACKING_DEFAULT }), '오늘 농장 메모를 반영했어요.', '오늘 농장 메모를 바꿨어요.');
    }
  };

  const saveSheet = async () => {
    update((x) => ({ ...x, sheetUrl }));
    if (!sheetUrl) { setSheetState('연결 전'); return setSheetMsg('주소를 지웠어요.'); }
    setSheetMsg('연결을 확인하고 있어요…');
    try {
      await checkSheetConnection(sheetUrl);
      setSheetState('연결됨');
      setSheetMsg('구글 시트와 실제 통신을 확인했어요.');
    } catch (error) {
      setSheetState('확인 필요');
      setSheetMsg(error instanceof Error ? error.message : '연결을 확인하지 못했어요. 주소와 액세스 권한을 확인해주세요.');
    }
  };
  const syncSheet = async () => {
    const real = getState().orders;
    if (!sheetUrl) return setSheetMsg('먼저 구글 연결 주소를 입력해주세요.');
    if (!real.length) return setSheetMsg('보낼 실제 주문이 아직 없어요.');
    setSheetMsg('주문을 구글 시트에 저장하고 있어요…');
    try {
      const todayReal = real.filter((order) => isToday(order.createdAt));
      const revenue = todayReal.reduce((sum, order) => sum + order.total, 0);
      const discount = todayReal.reduce((sum, order) => sum + order.farmDiscount + order.couponAmount, 0);
      const knownCosts = todayReal.filter((order) => s.costs[order.product] != null);
      const totalCost = knownCosts.reduce((sum, order) => sum + (s.costs[order.product] || 0) * order.quantity, 0);
      const result = await postToSheet(sheetUrl, {
        orders: real.map((order) => sheetOrder(order, s.costs)),
        dailySummary: {
          date: today.toISOString().slice(0, 10), orderCount: todayReal.length, revenue, discount,
          totalCost: knownCosts.length === todayReal.length ? totalCost : '',
          expectedProfit: knownCosts.length === todayReal.length ? revenue - totalCost : '',
        },
        exportedAt: new Date().toISOString(),
      });
      setSheetMsg(`구글 시트 저장 완료 · 새 주문 ${result.addedOrders || 0}건, 이미 저장된 주문 ${result.skippedOrders || 0}건`);
    } catch (error) {
      setSheetMsg(error instanceof Error ? error.message : '전송하지 못했어요. 연결 주소를 확인해주세요.');
    }
  };

  const dayCsv = () => download(`hannubong-today-${today.toISOString().slice(0, 10)}.csv`, toCsv(todayOrders, s.costs));
  const allCsv = () => download('hannubong-all.csv', toCsv(s.orders, s.costs));

  const previewId: ProductId = 'home-5';
  const previewPrice = Math.round((prices[previewId] * (100 - disc.rate)) / 100 / 10) * 10;

  return (
    <>
      <a className="skip-link" href="#main">오늘 할 일로 바로가기</a>
      <header className="admin-header"><div><p>갈매농장</p><strong>오늘 농장 일</strong></div><a href="/" target="_blank" rel="noopener">고객 화면 보기</a></header>
      <main id="main" className="admin-main">
        <section className="admin-greeting"><div><p>{today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p><h1>오늘 할 일부터 볼게요</h1></div><span className="save-state">홈페이지와 연결됨</span></section>

        <section className="daily-profit" aria-labelledby="daily-profit-title">
          <div className="daily-profit-lead"><div className="profit-kicker"><p>오늘 장사</p><span>실제 주문</span></div><h2 id="daily-profit-title">{sentence}</h2><small>예상 이익은 실제 결제금액에서 등록한 상자당 원가를 뺀 금액이에요.</small></div>
          <dl className="profit-metrics">
            <div><dt>팔린 주문</dt><dd>{todayOrders.length}건</dd></div>
            <div><dt>오늘 매출</dt><dd>{won(revenue)}</dd></div>
            <div><dt>할인해준 금액</dt><dd>{won(discountSum)}</dd></div>
            <div className="profit-highlight"><dt>예상 이익</dt><dd>{net == null ? '원가 입력 필요' : won(net)}</dd></div>
          </dl>
          <div className="profit-by-product" aria-label="오늘 상품별 판매 현황">{byProduct.map((x) => <span key={x.id}>{PRODUCTS[x.id].short} {x.qty}상자</span>)}</div>
          {net == null && <a href="#cost-settings" className="profit-cost-link">원가 입력하기</a>}
        </section>

        <section className="admin-panel status-panel"><div className="admin-panel-title"><div><p className="admin-number">1</p><h2>지금 판매 상태</h2></div><strong className="current-status">{STATUS[s.status].admin}</strong></div>
          <div className="status-buttons">
            <button type="button" className={s.status === 'normal' ? 'is-active' : ''} onClick={() => askStatus('normal')}>정상 판매<span>바로 주문받기</span></button>
            <button type="button" className={s.status === 'reservation' ? 'is-active' : ''} onClick={() => askStatus('reservation')}>예약 판매<span>다음 수확분 받기</span></button>
          </div><p className="admin-help">상태를 바꾸면 고객 화면의 안내와 주문 문구가 함께 바뀝니다.</p></section>

        <section className="admin-panel farm-update-panel"><div className="admin-panel-title"><div><p className="admin-number">2</p><h2>이번 주 맛과 주문 가능 상품</h2></div><time>{s.updatedAt}</time></div>
          <fieldset className="admin-choice-group"><legend>이번 주 맛</legend><div className="taste-buttons">
            {(Object.keys(TASTES) as TasteKey[]).map((k) => <button key={k} type="button" className={taste === k ? 'is-active' : ''} aria-pressed={taste === k} onClick={() => setTaste(k)}>{TASTES[k]}</button>)}
          </div></fieldset>
          <fieldset className="admin-choice-group"><legend>현재 주문 가능 여부</legend><div className="admin-availability-grid" role="group" aria-label="용도와 중량별 주문 가능 여부 설정">
            <span></span><strong>5kg</strong><strong>10kg</strong>
            {(['gift', 'home'] as const).map((c) => (
              <span key={c} style={{ display: 'contents' }}><b>{c === 'gift' ? '선물용' : '가정용'}</b>
                {([5, 10] as const).map((w) => { const id = `${c}-${w}` as ProductId; return <button key={id} type="button" className={avail[id] ? '' : 'is-unavailable'} aria-pressed={avail[id]} onClick={() => setAvail({ ...avail, [id]: !avail[id] })}>{avail[id] ? '가능' : '준비 중'}</button>; })}</span>
            ))}
          </div></fieldset>
          <fieldset className="admin-choice-group taste-detail-admin"><legend>이번 주 맛 상세 정보</legend>
            <div className="admin-field-grid">
              <label><span>측정일</span><input type="date" value={detail.measurementDate} onChange={(e) => setDetail({ ...detail, measurementDate: e.target.value })} /></label>
              <label><span>표본 개수</span><input type="number" min={1} value={detail.sampleCount} onChange={(e) => setDetail({ ...detail, sampleCount: Number(e.target.value) })} /></label>
              <label><span>평균 당도</span><input type="number" min={0} step={0.1} value={detail.brixAverage} onChange={(e) => setDetail({ ...detail, brixAverage: Number(e.target.value) })} /></label>
              <label><span>최저 당도</span><input type="number" min={0} step={0.1} value={detail.brixMin} onChange={(e) => setDetail({ ...detail, brixMin: Number(e.target.value) })} /></label>
              <label><span>최고 당도</span><input type="number" min={0} step={0.1} value={detail.brixMax} onChange={(e) => setDetail({ ...detail, brixMax: Number(e.target.value) })} /></label>
            </div>
            <div className="admin-preset-group"><span>시식 설명 빠른 선택</span><div>{NOTES.map((n, i) => <button key={n} type="button" className={detail.tastingNote === n ? 'is-active' : ''} onClick={() => setDetail({ ...detail, tastingNote: n })}>{NOTE_LABELS[i]}</button>)}</div></div>
            <label className="admin-long-field"><span>농장주의 실제 시식 설명</span><textarea rows={3} value={detail.tastingNote} onChange={(e) => setDetail({ ...detail, tastingNote: e.target.value })} /></label>
            <div className="admin-preset-group"><span>먹기 좋은 때</span><div>{RIPEN.map(([l, v]) => <button key={l} type="button" className={detail.ripening === v ? 'is-active' : ''} onClick={() => setDetail({ ...detail, ripening: v })}>{l}</button>)}</div></div>
            <div className="admin-field-grid shipping-date-fields">
              <label><span>출고 시작일</span><input type="date" value={detail.shippingStart} onChange={(e) => setDetail({ ...detail, shippingStart: e.target.value })} /></label>
              <label><span>출고 종료일</span><input type="date" value={detail.shippingEnd} onChange={(e) => setDetail({ ...detail, shippingEnd: e.target.value })} /></label>
            </div>
          </fieldset>
          <button className="admin-primary" type="button" onClick={() => {
            if (detail.shippingEnd < detail.shippingStart) return toast('출고 종료일이 시작일보다 빨라요.');
            if (detail.brixMin > detail.brixMax) return toast('최저 당도가 최고 당도보다 높아요.');
            commit((x) => ({ ...x, taste, availability: avail, detail }), '농장 상태를 홈페이지에 반영했어요.', `이번 주 맛을 ‘${TASTES[taste]}’으로 저장했어요.`);
          }}>농장 상태 홈페이지에 반영</button><p className="admin-help">저장한 날짜가 고객 화면에 하루 단위로 표시됩니다.</p>
        </section>

        <section className="today-cards" aria-label="오늘 현황">
          <article><span>새 주문</span><strong>{s.orders.filter((o) => o.stage === 1).length}건</strong><a href="#orders">주문 보기</a></article>
          <article><span>오늘 포장</span><strong>5kg {todayOrders.filter((o) => PRODUCTS[o.product].weight === 5).reduce((a, o) => a + o.quantity, 0)}개</strong><small>10kg {todayOrders.filter((o) => PRODUCTS[o.product].weight === 10).reduce((a, o) => a + o.quantity, 0)}개</small></article>
          <article className="attention"><span>확인 필요</span><strong>{s.issues.length + s.orders.filter((o) => o.stage === 2).length}건</strong><small>문제 접수·주소 확인</small></article>
        </section>

        <section className="admin-panel inventory-panel"><div className="admin-panel-title"><div><p className="admin-number">3</p><h2>판매할 상자 수</h2></div></div>
          <div className="inventory-grid">
            {([5, 10] as const).map((w) => (
              <label key={w}><span>{w}kg 남은 수량</span><div>
                <button type="button" aria-label={`${w}kg 수량 1개 줄이기`} onClick={() => setCounts({ ...counts, [w]: Math.max(0, counts[w] - 1) })}>−</button>
                <output>{counts[w]}</output>
                <button type="button" aria-label={`${w}kg 수량 1개 늘리기`} onClick={() => setCounts({ ...counts, [w]: counts[w] + 1 })}>+</button></div></label>
            ))}
          </div>
          <button className="admin-primary" type="button" onClick={() => commit((x) => ({ ...x, inventory: counts }), '판매 수량을 저장했어요.', `판매 수량을 5kg ${counts[5]}개, 10kg ${counts[10]}개로 저장했어요.`)}>판매 수량 저장</button></section>

        <section className="admin-panel pricing-panel"><div className="admin-panel-title"><div><p className="admin-number">4</p><h2>상품 가격과 할인</h2></div><strong id="pricing-state">{s.discount.enabled ? `${s.discount.rate}% 할인 중` : '정가 판매'}</strong></div>
          <p className="admin-help">상품별 기준 가격을 입력하면 고객 화면과 주문서에 함께 반영됩니다.</p>
          <div className="pricing-grid">
            {PRODUCT_IDS.map((id) => <label key={id}><span>{PRODUCTS[id].short}</span><div><input type="number" min={0} step={100} value={prices[id]} onChange={(e) => setPrices({ ...prices, [id]: Number(e.target.value) })} /><b>원</b></div></label>)}
          </div>
          <label className="admin-discount-toggle"><input type="checkbox" checked={disc.enabled} onChange={(e) => setDisc({ ...disc, enabled: e.target.checked })} /><span><strong>할인율을 적용하시겠습니까?</strong><small>체크하면 모든 상품에 같은 할인율이 적용됩니다.</small></span></label>
          {disc.enabled && <div className="discount-rate-field"><label><span>할인율</span><div><input type="number" min={1} max={90} step={1} value={disc.rate} onChange={(e) => setDisc({ ...disc, rate: Math.min(90, Math.max(1, Number(e.target.value))) })} /><b>%</b></div></label><p><strong>{disc.rate}% 할인</strong><span>{PRODUCTS[previewId].short} {won(prices[previewId])} → {won(previewPrice)}</span></p></div>}
          <button className="admin-primary" type="button" onClick={() => commit((x) => ({ ...x, prices, discount: disc }), '가격과 할인을 반영했어요.', disc.enabled ? `전 상품 ${disc.rate}% 할인을 적용했어요.` : '상품 가격을 저장했어요.')}>가격과 할인 홈페이지에 반영</button>
          <div className="cost-settings" id="cost-settings">
            <div><h3>상자당 원가</h3><p>과일·박스·포장재·배송비를 합친 예상 비용을 입력해주세요.</p></div>
            <div className="pricing-grid cost-grid">
              {PRODUCT_IDS.map((id) => <label key={id}><span>{PRODUCTS[id].short}</span><div><input type="number" min={0} step={100} placeholder="미입력" value={costs[id]} onChange={(e) => setCosts({ ...costs, [id]: e.target.value })} /><b>원</b></div></label>)}
            </div>
            <button className="admin-secondary" type="button" onClick={() => commit((x) => ({ ...x, costs: Object.fromEntries(PRODUCT_IDS.filter((id) => costs[id] !== '').map((id) => [id, num(costs[id])])) }), '원가를 저장하고 이익을 계산했어요.', '상자당 원가를 저장했어요.')}>원가 저장하고 이익 계산</button>
          </div>
        </section>

        <section className="admin-panel task-panel"><div className="admin-panel-title"><div><p className="admin-number">5</p><h2>빠른 작업</h2></div></div><div className="quick-actions">
          <button type="button" onClick={() => quick('packing')}>포장 완료 처리<span>오늘 포장한 주문</span></button>
          <button type="button" onClick={() => quick('shipping')}>출고 완료 처리<span>송장번호 확인 후</span></button>
          <button type="button" onClick={() => quick('pause')}>오늘 출고 중단<span>고객 안내도 함께</span></button>
          <button type="button" onClick={() => quick('taste')}>오늘 농장 메모<span>실제 확인했을 때만</span></button>
        </div></section>

        <section className="admin-panel orders-panel" id="orders"><div className="admin-panel-title"><div><p className="admin-number">6</p><h2>새 주문</h2></div><button className="download-button" type="button" onClick={allCsv}>전체 CSV</button></div>
          <div className="orders-list">
            {orderList.map((o) => (
              <article className="admin-order" key={o.id}><div><span className={`order-state${o.stage === 1 ? ' ready' : ''}`}>{o.sample ? '예시' : STAGES[o.stage - 1]}</span><strong>{o.id} · {o.buyerName}</strong><p>{PRODUCTS[o.product].short} {o.quantity}상자 · 받는 분 {o.recipientName}</p></div>
                {!o.sample && o.stage < 6 && <button type="button" onClick={() => advance(o.id)}>{STAGE_ACTION[o.stage - 1]}</button>}
                {o.sample && <button type="button" onClick={() => toast('예시 주문이에요. 실제 주문이 들어오면 바로 처리할 수 있어요.')}>주문 확인</button>}</article>
            ))}
          </div></section>

        <section className="admin-panel data-panel" id="data-management">
          <div className="admin-panel-title"><div><p className="admin-number">7</p><h2>매출 기록 보관</h2></div><strong>{sheetState}</strong></div>
          <p className="admin-help">오늘 기록은 엑셀에서 바로 열리는 CSV로 내려받거나, 구글 스프레드시트에 이어서 보관할 수 있어요. 화면의 예시 주문 2건은 전송하지 않고 실제 주문만 보냅니다.</p>
          <a className="sheet-open-link" href="https://docs.google.com/spreadsheets/d/1Bj7csGkS3lhsJMDM6l_ngIbL2paYRq6Yi7AB1hqJqd8/edit" target="_blank" rel="noopener">한누봉 매출 관리 시트 열기</a>
          <a className="sheet-open-link" href="https://docs.google.com/spreadsheets/d/1Bj7csGkS3lhsJMDM6l_ngIbL2paYRq6Yi7AB1hqJqd8/edit?gid=1558992022#gid=1558992022" target="_blank" rel="noopener">회원관리 탭 바로 열기</a>
          <div className="data-actions"><button type="button" className="admin-primary" onClick={dayCsv}>오늘 장사 CSV 받기</button><button type="button" className="admin-secondary" onClick={allCsv}>전체 기록 CSV 받기</button></div>
          <div className="sheet-connect">
            <label><span>구글 연결 주소</span><input type="url" value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://script.google.com/macros/s/.../exec" /></label>
            <div><button type="button" className="admin-secondary" onClick={saveSheet}>주소 저장·연결 확인</button><button type="button" className="admin-primary" onClick={syncSheet}>구글 시트로 보내기</button></div>
            <p className="admin-help" role="status" aria-live="polite">{sheetMsg}</p>
          </div>
          <details className="sheet-guide"><summary>처음 한 번만 연결하는 방법</summary><ol><li>위 ‘한누봉 매출 관리 시트’를 열어요.</li><li>확장 프로그램 → Apps Script에 제공한 연결 코드를 붙여넣어요.</li><li>배포 → 새 배포 → 웹 앱에서 액세스 사용자를 ‘모든 사용자’로 설정해요.</li><li>배포 후 나온 <strong>/exec</strong> 주소를 위에 붙여넣고 ‘주소 저장·연결 확인’을 눌러요.</li><li>같은 주소로 매출 기록과 회원가입 정보가 각각 알맞은 탭에 저장됩니다.</li><li>연결 코드가 바뀌었다면 반드시 배포 → 배포 관리 → 새 버전으로 다시 배포해야 합니다.</li></ol></details>
        </section>

        <section className="admin-panel log-panel"><div className="admin-panel-title"><div><p className="admin-number">8</p><h2>문자·변경 기록</h2></div></div>
          <ul>{s.activity.slice(0, 12).map((a, i) => <li key={i}><time>{timeKR(a.time)}</time><span>{a.text}</span></li>)}</ul></section>
      </main>

      <dialog ref={statusDialog.ref}><div className="dialog-body"><p className="section-kicker">판매 상태 변경</p><h2>{STATUS[pendingStatus].admin}으로 바꿀까요?</h2><p>고객 화면이 ‘{STATUS[pendingStatus].label}’ 안내로 바뀝니다.</p>
        <div className="status-preview"><small>고객 화면 미리보기</small><strong>{STATUS[pendingStatus].bar}</strong></div>
        <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={statusDialog.close}>취소</button><button className="button" type="button" onClick={confirmStatus}>홈페이지에 반영</button></div></div></dialog>
      {node}
    </>
  );
}
