import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Order, SAMPLE_ORDERS, STAGES, STAGE_SMALL, addActivity, dateKR, digits, shippingRange, update, useSession, useStore, won, isPhone,
} from '../store';
import { Logo, usePage, useToast } from '../components/ui';

export default function Orders() {
  usePage('orders', 'orders-body');
  const s = useStore();
  const user = useSession();
  const { toast, node } = useToast();
  const [lookupOpen, setLookupOpen] = useState(false);
  const [lookupPhone, setLookupPhone] = useState('');
  const [issueMsg, setIssueMsg] = useState('');

  useEffect(() => {
    const syncNotice = sessionStorage.getItem('hannubong-sync-notice');
    if (!syncNotice) return;
    sessionStorage.removeItem('hannubong-sync-notice');
    toast(syncNotice);
  }, [toast]);

  const phone = user?.phone || lookupPhone;
  const mine: Order[] = useMemo(
    () => (phone ? s.orders.filter((o) => digits(o.buyerPhone) === digits(phone)) : []),
    [s.orders, phone],
  );
  const orders = mine.length ? mine : SAMPLE_ORDERS.slice(0, 1);
  const active = orders.find((o) => o.stage < 6) || orders[0];
  const past = mine.filter((o) => o.id !== active.id);

  const lookup = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const v = String(new FormData(e.currentTarget).get('phone') || '');
    if (!isPhone(v)) return toast('휴대전화 번호를 확인해주세요.');
    setLookupPhone(v);
    const n = s.orders.filter((o) => digits(o.buyerPhone) === digits(v)).length;
    toast(n ? `${n}건의 주문을 찾았어요.` : '이 기기에서 찾을 수 있는 주문이 없어요.');
  };

  const submitIssue = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const photos = (f.getAll('issuePhotos') as File[]).filter((x) => x.size > 0).length;
    update((st) => addActivity({
      ...st,
      issues: [...st.issues, { createdAt: new Date().toISOString(), orderId: active.id, type: String(f.get('issueType')), note: String(f.get('issueNote') || ''), photos }],
    }, `주문 ${active.id} 문제가 접수됐어요.`));
    setIssueMsg('문제를 접수했어요. 확인 후 주문자 휴대전화로 안내드릴게요.');
    e.currentTarget.reset();
  };

  return (
    <>
      <a className="skip-link" href="#main">구매내역으로 바로가기</a>
      <header className="simple-header"><Link to="/" className="brand"><Logo /></Link><Link to="/#products">한라봉 더 보기</Link></header>
      <main id="main" className="orders-page">
        <header className="orders-title">
          <p>{user ? '로그인된 계정의 주문을 모았어요' : '주문과 배송 상황을 확인해요'}</p>
          <h1>구매내역과<br />배송 조회</h1>
          <button type="button" className="phone-lookup-toggle" onClick={() => setLookupOpen((v) => !v)}>비회원 주문을 찾으시나요?</button>
          <form className="phone-lookup" hidden={!lookupOpen} onSubmit={lookup}>
            <label><span>주문할 때 사용한 휴대전화</span><input name="phone" type="tel" inputMode="tel" placeholder="010-0000-0000" required /></label>
            <button type="submit">주문 찾기</button>
            <p>프로토타입에서는 이 기기에 저장된 주문을 휴대전화 번호로 찾습니다.</p>
          </form>
        </header>

        <section className="active-order" aria-labelledby="active-order-title">
          <div className="active-order-head">
            <div><p>{active.sample ? '진행 중인 주문 (예시)' : '진행 중인 주문'}</p><h2 id="active-order-title">{active.productName}</h2></div>
            <div className="order-number"><span>주문번호</span><strong>{active.id}</strong></div>
          </div>
          <div className="order-overview">
            <dl><div><dt>주문일</dt><dd>{dateKR(active.createdAt)}</dd></div><div><dt>받는 곳</dt><dd>{active.address}</dd></div><div><dt>예상 출고</dt><dd>{shippingRange(s.detail)}</dd></div></dl>
            <Link to="/review">배송 완료 후 후기 작성</Link>
          </div>
          <ol className="delivery-timeline" aria-label="배송 진행 상태">
            {STAGES.map((label, i) => (
              <li key={label} className={i + 1 < active.stage ? 'is-complete' : i + 1 === active.stage ? 'is-current' : ''}><span>{i + 1}</span><strong>{label}</strong><small>{STAGE_SMALL[i]}</small></li>
            ))}
          </ol>
        </section>

        <section className="issue-section" id="issue" aria-labelledby="issue-title">
          <header><p>주문번호를 다시 입력하지 않아도 돼요</p><h2 id="issue-title">상품이나 배송에<br />문제가 있나요?</h2></header>
          <form className="issue-form" onSubmit={submitIssue}>
            <input type="hidden" name="orderId" value={active.id} />
            <fieldset><legend>어떤 문제가 생겼나요?</legend><div className="issue-options">
              <label><input type="radio" name="issueType" value="missing" required /><span>배송이 오지 않았어요</span></label>
              <label><input type="radio" name="issueType" value="spoiled" /><span>한라봉이 썩거나 물렀어요</span></label>
              <label><input type="radio" name="issueType" value="damaged" /><span>상품이 파손됐어요</span></label>
              <label><input type="radio" name="issueType" value="different" /><span>주문한 내용과 달라요</span></label>
            </div></fieldset>
            <label className="issue-note"><span>상황을 알려주세요 <small>선택</small></span><textarea name="issueNote" rows={4} placeholder="확인에 필요한 내용을 적어주세요." /></label>
            <label className="issue-photo"><span><strong>사진 첨부</strong><small>상자, 송장, 과일 상태가 함께 보이면 더 빨리 확인할 수 있어요.</small></span><input type="file" name="issuePhotos" accept="image/*" multiple /></label>
            <button className="button" type="submit">이 주문의 문제 접수하기</button>
            <p className="issue-result" role="status">{issueMsg}</p>
          </form>
        </section>

        <section className="past-orders" aria-labelledby="past-orders-title">
          <div><p>같은 상품을 다시 찾기 쉽게</p><h2 id="past-orders-title">지난 구매내역</h2></div>
          <div className="past-order-list">
            {past.length === 0 ? <p>저장된 주문이 생기면 여기에 표시됩니다.</p> : past.map((o) => (
              <article key={o.id}><div><strong>{o.productName} · {o.quantity}상자</strong><span>{dateKR(o.createdAt)} · {o.id}</span><small>{won(o.total)} · {STAGES[o.stage - 1]}</small></div><Link to={`/order?product=${o.product}`}>다시 주문하기</Link></article>
            ))}
          </div>
        </section>
      </main>
      {node}
    </>
  );
}
