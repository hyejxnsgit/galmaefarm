import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  COUPON, PRODUCTS, PRODUCT_IDS, ProductId, STATUS, addActivity, formatPhone, getSheetUrl, getState, isPhone, listPrice, postToSheet,
  salePrice, sheetOrder, shippingRange, update, useSession, useStore, won,
} from '../store';
import { Logo, useDialog, usePage, useToast } from '../components/ui';

export default function OrderPage() {
  usePage('order', 'checkout-body');
  const s = useStore();
  const user = useSession();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const { toast, node: toastNode } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const guestDialog = useDialog();
  const orderDialog = useDialog();

  const requested = params.get('product') as ProductId | null;
  const firstOk = PRODUCT_IDS.find((id) => s.availability[id]) || 'gift-5';
  const [product, setProduct] = useState<ProductId>(requested && requested in PRODUCTS ? requested : 'gift-5');
  const [qty, setQty] = useState(1);
  const [coupon, setCoupon] = useState(false);
  const [same, setSame] = useState(false);
  const [buyer, setBuyer] = useState({ name: '', phone: '' });
  const [recipient, setRecipient] = useState({ name: '', phone: '', address: '' });
  const [savedIdx, setSavedIdx] = useState('');
  const [pending, setPending] = useState<FormData | null>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => { if (!s.availability[product]) setProduct(firstOk); }, [s.availability, product, firstOk]);
  useEffect(() => {
    if (user) setBuyer((b) => ({ name: b.name || user.name, phone: b.phone || user.phone }));
    else {
      const t = window.setTimeout(guestDialog.open, 300);
      return () => window.clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.phone]);
  useEffect(() => { if (same) setRecipient((r) => ({ ...r, name: buyer.name, phone: buyer.phone })); }, [same, buyer]);

  const info = PRODUCTS[product];
  const isGift = info.category === 'gift';
  const unit = salePrice(s, product);
  const list = listPrice(s, product);
  const farmDiscount = (list - unit) * qty;
  const couponOn = !!user?.coupon && coupon;
  const total = Math.max(0, unit * qty - (couponOn ? COUPON : 0));
  const rate = s.discount.enabled ? s.discount.rate : 0;
  const myAddresses = useMemo(() => s.addresses.filter((a) => user && a.owner === user.phone), [s.addresses, user]);
  const submitLabel = `${info.short} 주문 내용 확인하기`;

  const loadAddress = () => {
    const a = myAddresses[Number(savedIdx)];
    if (!a) return toast('불러올 배송지를 먼저 선택해주세요.');
    setSame(false);
    setRecipient({ name: a.name, phone: a.phone, address: a.address });
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    if (!isPhone(String(f.get('buyerPhone')))) return toast('주문자 휴대전화 번호를 확인해주세요.');
    if (!isPhone(String(f.get('recipientPhone')))) return toast('받는 분 휴대전화 번호를 확인해주세요.');
    if (qty > s.inventory[info.weight]) return toast(`${info.weight}kg는 ${s.inventory[info.weight]}상자만 남았어요.`);
    setPending(f);
    orderDialog.open();
  };

  const confirm = async () => {
    if (!pending || syncing) return;
    setSyncing(true);
    const f = pending;
    const st = getState();
    const id = `HNB-${1025 + st.orders.length}`;
    const order = {
      id, createdAt: new Date().toISOString(), product, productName: info.name, quantity: qty,
      listPrice: list, unitPrice: unit, farmDiscount, couponAmount: couponOn ? COUPON : 0, total,
      buyerName: String(f.get('buyerName')).trim(), buyerPhone: formatPhone(String(f.get('buyerPhone'))), buyerEmail: String(f.get('buyerEmail') || ''),
      recipientName: String(f.get('recipientName')).trim(), recipientPhone: formatPhone(String(f.get('recipientPhone'))),
      address: String(f.get('address')).trim(), giftMessage: isGift ? String(f.get('giftMessage') || '') : '',
      payment: String(f.get('payment')), stage: 1, member: !!user,
    };
    update((x) => {
      let next = {
        ...x,
        orders: [order, ...x.orders],
        inventory: { ...x.inventory, [info.weight]: Math.max(0, x.inventory[info.weight] - qty) },
        users: x.users.map((u) => (couponOn && user && u.phone === user.phone ? { ...u, coupon: false } : u)),
        addresses: x.addresses,
      };
      if (f.get('saveAddress') === 'on' && user) {
        next.addresses = [...x.addresses, { owner: user.phone, label: String(f.get('addressLabel') || '') || order.recipientName, name: order.recipientName, phone: order.recipientPhone, address: order.address }];
      }
      return addActivity(next, `주문 ${id} 접수 · ${info.short} ${qty}상자`);
    });
    try {
      await postToSheet(getSheetUrl(st), { orders: [sheetOrder(order, st.costs)] });
      sessionStorage.setItem('hannubong-sync-notice', '주문을 접수하고 농장 관리 시트에도 저장했어요.');
    } catch {
      sessionStorage.setItem('hannubong-sync-notice', '주문은 접수됐지만 농장 관리 시트 저장은 확인이 필요해요.');
    }
    orderDialog.close();
    nav('/orders');
  };

  const status = STATUS[s.status];
  const details: [string, string][] = pending ? [
    ['주문자', `${pending.get('buyerName')} · ${pending.get('buyerPhone')}`],
    ['받는 분', `${pending.get('recipientName')} · ${pending.get('recipientPhone')}`],
    ['주소', String(pending.get('address'))],
    ...(isGift && pending.get('giftMessage') ? [['선물 메시지', String(pending.get('giftMessage'))] as [string, string]] : []),
    ['수량', `${qty}상자`],
    ['예상 출고', shippingRange(s.detail)],
    ['최종 결제금액', won(total)],
  ] : [];

  return (
    <>
      <a className="skip-link" href="#main">주문서로 바로가기</a>
      <header className="simple-header checkout-header">
        <Link to="/" className="brand"><Logo /></Link>
        <div className="checkout-progress" aria-label="주문 단계"><strong>주문서</strong><span>›</span><span>결제</span><span>›</span><span>완료</span></div>
        <Link to="/#products">상품 다시 보기</Link>
      </header>

      <main id="main" className="order-page checkout-page">
        <header className="order-title checkout-title">
          <p>{user ? '한누봉 회원으로 로그인되어 있어요' : '비회원으로 주문하고 있어요'}</p>
          <h1>보낼 곳을 확인하고<br />주문을 마칠게요.</h1>
          <div className="member-order-state">
            {user ? <strong>{user.coupon ? '3,000원 가입 쿠폰 사용 가능' : `${user.name}님 · 사용 가능한 쿠폰이 없어요`}</strong> : <strong>가입하면 3,000원 쿠폰을 드려요</strong>}
            {!user && <button type="button" onClick={guestDialog.open}>회원 혜택 보기</button>}
          </div>
        </header>

        <div className="order-layout checkout-layout">
          <form className="order-form checkout-form" id="order-form" ref={formRef} onSubmit={onSubmit}>
            <fieldset className="checkout-section product-check-section">
              <legend><span>1</span> 주문 상품 확인</legend>
              <div className="order-product-picker">
                {PRODUCT_IDS.map((id) => {
                  const ok = s.availability[id] && s.inventory[PRODUCTS[id].weight] > 0;
                  return (
                    <label key={id}><input type="radio" name="product" value={id} checked={product === id} disabled={!ok} onChange={() => setProduct(id)} />
                      <span><b>{PRODUCTS[id].short}</b><small>{ok ? '배송비 포함' : '준비 중'}</small><strong>{won(salePrice(s, id))}</strong></span></label>
                  );
                })}
              </div>
              <label className="field short-field"><span>수량</span><select name="quantity" value={qty} onChange={(e) => setQty(Number(e.target.value))}><option value="1">1상자</option><option value="2">2상자</option><option value="3">3상자</option></select></label>
              <p className="selected-purpose"><span>{isGift ? '선물용' : '가정용'}</span> {isGift ? '받는 분 정보와 선물 메시지를 따로 입력합니다.' : '집에서 드실 상자예요. 받으실 분 정보를 입력해주세요.'}</p>
            </fieldset>

            <fieldset className="checkout-section">
              <legend><span>2</span> 주문자 정보</legend>
              {user && <div className="saved-member-note"><strong>회원 정보로 주문합니다.</strong><span>휴대전화 인증이 완료된 계정</span></div>}
              <div className="form-grid">
                <label className="field"><span>주문자 이름</span><input name="buyerName" autoComplete="name" placeholder="이름" required value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /></label>
                <label className="field"><span>주문자 휴대전화</span><input name="buyerPhone" type="tel" inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" required value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></label>
                <label className="field full-field"><span>이메일 <small>선택</small></span><input name="buyerEmail" type="email" autoComplete="email" placeholder="주문 확인을 받을 이메일" /></label>
              </div>
            </fieldset>

            <fieldset className="checkout-section recipient-section">
              <legend><span>3</span> <b>{isGift ? '선물받는 분과 배송지' : '받는 분과 배송지'}</b></legend>
              {user && (
                <div className="address-actions"><label className="field"><span>이전 배송지 불러오기</span>
                  <select value={savedIdx} onChange={(e) => setSavedIdx(e.target.value)}><option value="">저장된 배송지를 선택하세요</option>{myAddresses.map((a, i) => <option key={i} value={i}>{a.label} · {a.address}</option>)}</select></label>
                  <button type="button" className="text-button" onClick={loadAddress}>불러오기</button></div>
              )}
              <label className="check-line"><input type="checkbox" checked={same} onChange={(e) => setSame(e.target.checked)} /> 주문자와 받는 분이 같아요</label>
              <div className="form-grid">
                <label className="field"><span>받는 분 이름</span><input name="recipientName" autoComplete="shipping name" required value={recipient.name} onChange={(e) => setRecipient({ ...recipient, name: e.target.value })} /></label>
                <label className="field"><span>받는 분 휴대전화</span><input name="recipientPhone" type="tel" inputMode="tel" autoComplete="shipping tel" placeholder="010-0000-0000" required value={recipient.phone} onChange={(e) => setRecipient({ ...recipient, phone: e.target.value })} /></label>
                <label className="field full-field"><span>주소</span><input name="address" autoComplete="shipping street-address" placeholder="도로명 주소와 상세 주소" required value={recipient.address} onChange={(e) => setRecipient({ ...recipient, address: e.target.value })} /></label>
                {user && <>
                  <label className="field"><span>배송지 이름 <small>선택</small></span><input name="addressLabel" placeholder="예: 부모님 댁, 사무실" /></label>
                  <label className="check-line save-address-check"><input type="checkbox" name="saveAddress" /> 이 배송지를 주소록에 저장</label>
                </>}
              </div>
              <p className="privacy-note">받는 분에게는 상품 가격과 주문자의 개인정보를 보내지 않습니다.</p>
            </fieldset>

            {isGift && (
              <fieldset className="checkout-section gift-message-section">
                <legend><span>4</span> 선물 메시지</legend>
                <label className="field"><span>상자에 함께 넣을 말 <small>선택</small></span><textarea name="giftMessage" maxLength={80} rows={3} placeholder="늘 건강하세요. 사랑합니다." /></label>
              </fieldset>
            )}

            <fieldset className="checkout-section">
              <legend><span>{isGift ? 5 : 4}</span> 예상 출고일 확인</legend>
              <div className="shipping-explain checkout-shipping"><strong>{status.label}</strong><p><b>{shippingRange(s.detail)}</b> 사이 순서대로 출고할 예정입니다.</p><p>출고되면 주문자 휴대전화로 송장 번호를 보내드려요.</p></div>
              <label className="check-line"><input type="checkbox" name="agree" required /> 주문 정보와 예상 출고일을 확인했습니다.</label>
            </fieldset>
          </form>

          <aside className="checkout-side" aria-label="결제 정보">
            <section className="order-summary checkout-summary" aria-live="polite">
              <p>주문 요약</p>
              <h2>{info.name}</h2>
              <dl>
                <div><dt>정가</dt><dd>{won(list)}</dd></div>
                {rate > 0 && <div className="farm-discount-summary"><dt>농장 할인 <b>{rate}%</b></dt><dd>−{won(farmDiscount)}</dd></div>}
                <div><dt>{rate > 0 ? '할인 판매가' : '판매가'}</dt><dd>{won(unit)}</dd></div>
                <div><dt>수량</dt><dd>{qty}상자</dd></div>
                <div><dt>배송비</dt><dd>포함</dd></div>
                {couponOn && <div className="coupon-summary"><dt>회원 쿠폰</dt><dd>−{won(COUPON)}</dd></div>}
              </dl>
              {user?.coupon && !couponOn && <div className="expected-lowest"><span>내 예상 최저가</span><strong>{won(Math.max(0, unit * qty - COUPON))}</strong></div>}
              <p className="summary-total"><span>최종 결제금액</span><strong>{won(total)}</strong></p>
            </section>

            <section className="checkout-side-card coupon-card">
              <header><h2>쿠폰</h2><span>농장 할인과 중복 가능</span></header>
              <label className="coupon-line"><input type="checkbox" name="coupon" checked={couponOn} disabled={!user?.coupon} onChange={(e) => setCoupon(e.target.checked)} />
                <span><strong>신규 회원 3,000원 쿠폰</strong><small>{user?.coupon ? '사용하면 최종 가격에서 3,000원 할인돼요.' : user ? '이미 사용했거나 보유한 쿠폰이 없어요.' : '회원가입 후 사용할 수 있어요.'}</small></span><b>적용</b></label>
            </section>

            <section className="checkout-side-card payment-section">
              <h2>결제 수단</h2>
              <div className="payment-options vertical-payment-options">
                <label><input form="order-form" type="radio" name="payment" value="card" defaultChecked /><span>신용·체크카드</span></label>
                <label><input form="order-form" type="radio" name="payment" value="easy" /><span>간편결제</span></label>
                <label><input form="order-form" type="radio" name="payment" value="transfer" /><span>계좌이체</span></label>
              </div>
            </section>

            <section className="checkout-side-card checkout-agreement"><h2>이용 및 정보 제공 약관</h2><p>결제 전 이용 및 정보 제공 약관 동의 내용을 확인했습니다.</p><label><input form="order-form" type="checkbox" name="paymentAgree" required /> 구매조건 확인 및 결제진행 동의</label></section>
            <button className="button side-submit-order" form="order-form" type="submit">{submitLabel}</button>
            <p className="prototype-payment-note">화면 구성을 위한 프로토타입이며 실제 결제는 진행되지 않습니다.</p>
          </aside>
        </div>
      </main>

      <dialog ref={guestDialog.ref} className="member-benefit-dialog" aria-labelledby="member-benefit-title">
        <div className="dialog-body">
          <p>비회원 주문도 가능해요</p>
          <h2 id="member-benefit-title">간편 회원가입하면<br />3,000원 할인</h2>
          <ul><li>배송지를 다음 주문에 다시 사용</li><li>휴대전화 인증으로 주문 조회</li><li>후기 포인트 적립</li></ul>
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={guestDialog.close}>비회원으로 계속</button><button className="button" type="button" onClick={() => nav('/signup')}>간편 회원가입</button></div>
        </div>
      </dialog>

      <dialog ref={orderDialog.ref}>
        <div className="dialog-body"><p>주문 내용을 확인해주세요</p><h2>{info.name}</h2>
          <div>{details.map(([k, v]) => <p key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', margin: '.4rem 0' }}><span>{k}</span><strong>{v}</strong></p>)}</div>
          <div className="dialog-actions"><button className="button button-quiet" type="button" onClick={orderDialog.close} disabled={syncing}>다시 확인하기</button><button className="button" type="button" onClick={confirm} disabled={syncing}>{syncing ? '농장에 주문을 전하고 있어요…' : '이 내용으로 주문 접수'}</button></div></div>
      </dialog>

      <div className="mobile-checkout-bar"><span><small>결제 예정</small><strong>{won(total)}</strong></span><button type="button" onClick={() => formRef.current?.requestSubmit()}>주문 내용 확인</button></div>
      {toastNode}
    </>
  );
}
