import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Category, PRODUCTS, ProductId, REVIEW_TAGS, STATUS, TASTES, TasteKey, dateKR, listPrice, logout, productId,
  salePrice, shippingRange, useSession, useStore, won, PRODUCT_IDS,
} from '../store';
import { Logo, useDialog, usePage, useToast } from '../components/ui';
import characterCutout from '../assets/hannubong-character-cutout-v1.png';
import peekCharacter from '../assets/peek-character.png';
import tasteStamp from '../assets/taste-stamp.svg';
import shippingScene from '../assets/hannubong-shipping-scene-v1.png';
import farmDiary from '../assets/hannubong-farm-diary-v1.png';
import slideMeasure from '../assets/banner/slide-2.png';
import slideRun from '../assets/banner/slide-3.png';
import headlineSunbong from '../assets/banner/headline-sunbong.svg';
import headline5 from '../assets/banner/headline-5.svg';
import headlineDigital from '../assets/banner/headline-digital.svg';

const COPY: Record<ProductId, { use: string; desc: string }> = {
  'gift-5': { use: '부모님 두 분 · 작은 가족', desc: '모양과 상태를 한 번 더 살펴 선물 상자에 담아요.' },
  'gift-10': { use: '여럿이 함께 · 넉넉한 선물', desc: '여럿이 나누기 좋은 넉넉한 양으로 준비해요.' },
  'home-5': { use: '한두 분 · 부담 없는 양', desc: '생김새보다 맛있게 먹기 좋은 한라봉을 담아요.' },
  'home-10': { use: '온 가족 · 오래 넉넉하게', desc: '집에서 함께 나누기 좋은 넉넉한 양이에요.' },
};
const COUNT = { 5: '약 18–24과', 10: '약 36–48과' } as const;
const SIZE = {
  5: '중과 중심이며 과일 크기에 따라 개수가 달라져요.',
  10: '중과 중심이며 5kg 두 상자보다 포장이 단단하고 개수가 넉넉해요.',
} as const;
const SEED_REVIEWS: Record<TasteKey, number> = { balanced: 17, sweet: 6, fresh: 2 };

function Price({ id, small }: { id: ProductId; small?: boolean }) {
  const s = useStore();
  const list = listPrice(s, id);
  const sale = salePrice(s, id);
  return (
    <>
      {small && <small>예상가</small>}{' '}
      {sale !== list && <del>{won(list)}</del>}
      {sale !== list ? <strong>{won(sale)}</strong> : won(sale)}
    </>
  );
}

export default function Shop() {
  usePage('shop');
  const s = useStore();
  const user = useSession();
  const { hash } = useLocation();
  const { toast, node: toastNode } = useToast();
  const status = STATUS[s.status];
  const tasteLabel = TASTES[s.taste];

  const [menuOpen, setMenuOpen] = useState(false);
  const [category, setCategory] = useState<Category>('gift');
  const [weight, setWeight] = useState<5 | 10>(5);
  const [slide, setSlide] = useState(0);
  const [statusPaused, setStatusPaused] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const touchX = useRef(0);
  const goHero = (i: number) => setHeroIdx((i + 3) % 3);
  const [purpose, setPurpose] = useState<Category | null>(null);
  const [result, setResult] = useState<{ w: 5 | 10; text: string } | null>(null);
  const weightDialog = useDialog();

  useEffect(() => {
    document.body.classList.toggle('mobile-menu-open', menuOpen);
    return () => document.body.classList.remove('mobile-menu-open');
  }, [menuOpen]);

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
  }, [hash]);

  useEffect(() => {
    if (heroPaused) return;
    const t = window.setInterval(() => setHeroIdx((n) => (n + 1) % 3), 6000);
    return () => window.clearInterval(t);
  }, [heroPaused, heroIdx]);

  useEffect(() => {
    if (statusPaused) return;
    const t = window.setInterval(() => setSlide((n) => (n + 1) % 3), 5200);
    return () => window.clearInterval(t);
  }, [statusPaused]);

  const selected = productId(category, weight);
  const selectedAvailable = s.availability[selected];
  const stock = s.inventory[weight];
  const orderable = selectedAvailable && stock > 0;
  const ctaLabel = `${PRODUCTS[selected].short} 주문하기 · ${won(salePrice(s, selected))}`;
  const orderHref = `/order?product=${selected}`;

  const pickCategory = (c: Category) => setCategory(c);
  const choosePurpose = (c: Category) => {
    setPurpose(c);
    setCategory(c);
    document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' });
  };

  const reviewStats = useMemo(() => {
    const counts = { ...SEED_REVIEWS };
    s.reviews.forEach((r) => { counts[r.taste] += 1; });
    const total = counts.balanced + counts.sweet + counts.fresh;
    return { counts, total, pct: (k: TasteKey) => Math.round((counts[k] / total) * 100) };
  }, [s.reviews]);

  const submitHelper = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const big = (f.get('sharing') === 'share' ? 1 : 0) + (f.get('amount') === 'plenty' ? 1 : 0) + (f.get('firstOrder') === 'no' ? 0.5 : 0);
    const w: 5 | 10 = big >= 1.5 ? 10 : 5;
    setResult({
      w,
      text: w === 10 ? '여럿이 나누거나 넉넉히 드신다면 10kg이 알맞아요.' : '먼저 맛보거나 가볍게 보내신다면 5kg이 알맞아요.',
    });
  };

  const applyResult = () => {
    if (!result) return;
    setWeight(result.w);
    weightDialog.close();
    document.getElementById('selected-product')?.scrollIntoView({ behavior: 'smooth' });
  };

  const availText = (ok: boolean) => (ok ? '가능' : '준비 중');
  const availSummary = PRODUCT_IDS.every((id) => s.availability[id])
    ? '선물용과 가정용 5kg, 10kg 모두 주문 가능합니다.'
    : `주문 가능 상품: ${PRODUCT_IDS.filter((id) => s.availability[id]).map((id) => PRODUCTS[id].short).join(', ') || '없음'}`;
  const closeMenu = () => setMenuOpen(false);

  const cards = ([5, 10] as const).map((w) => {
    const id = productId(category, w);
    const ok = s.availability[id] && s.inventory[w] > 0;
    return { w, id, ok };
  });

  return (
    <>
      <a className="skip-link" href="#main">본문으로 바로가기</a>
      <header className={`site-header${menuOpen ? ' is-menu-open' : ''}`}>
        <button className="mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-navigation" aria-label="메뉴 열기" onClick={() => setMenuOpen(true)}><span></span><span></span><span></span></button>
        <a className="brand" href="#main" aria-label="갈매농장 한누봉 홈"><Logo /></a>
        <nav className="main-nav" id="main-navigation" aria-label="주요 메뉴">
          <span className="mobile-menu-label">MENU</span>
          <button className="mobile-menu-close" type="button" aria-label="메뉴 닫기" onClick={closeMenu}>×</button>
          <a href="#products" onClick={closeMenu}>SHOP</a>
          <Link to="/orders" onClick={closeMenu}>ORDER &amp; DELIVERY</Link>
        </nav>
        <div className="header-actions">
          <div className="account-links">
            {user ? (
              <>
                <Link className="account-member-link" to="/orders">{user.name}님</Link>
                <button type="button" onClick={() => { logout(); toast('로그아웃했어요.'); }}>LOGOUT</button>
              </>
            ) : (
              <>
                <Link to="/login">LOGIN</Link>
                <Link className="account-signup-link" to="/signup">JOIN</Link>
              </>
            )}
          </div>
        </div>
        <button className="mobile-menu-backdrop" type="button" aria-label="메뉴 닫기" tabIndex={-1} onClick={closeMenu}></button>
      </header>

      <main id="main">
        <section className="hero-carousel" aria-roledescription="carousel" aria-label="갈매농장 소식"
          onMouseEnter={() => setHeroPaused(true)} onMouseLeave={() => setHeroPaused(false)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touchX.current; if (Math.abs(dx) > 50) goHero(heroIdx + (dx < 0 ? 1 : -1)); }}>
          <div className="hero-track" style={{ transform: `translateX(-${heroIdx * 100}%)` }}>
            <div className="scene-hero hero-slide" role="group" aria-roledescription="slide" aria-label="1 / 3" aria-hidden={heroIdx !== 0}>
              <img className="scene-hero-image" src={shippingScene} alt="제주 농장 포장 작업대에서 한누봉 캐릭터가 한라봉 상자에 송장을 붙이는 장면" width={1664} height={934} />
              <div className="scene-shade" aria-hidden="true"></div>
              <div className="scene-title"><h1 id="hero-title"><img className="hero-headline" src={headlineSunbong} alt="이번 연말, 가족에게 보낼 달달한 한라봉 찾고 있나요?" /></h1></div>
              <aside className="scene-ticket" aria-label="현재 판매 안내" style={{ borderRadius: 30 }}><div className="ticket-sparkle" style={{ fontSize: 25, color: "rgb(71, 110, 63)" }}><strong>현재 {status.label}</strong></div></aside>
              <div className="scene-actions">
                <a className="button" href="#products" onClick={() => setWeight(5)}>5kg 보기</a>
                <a className="button button-light" href="#products" onClick={() => setWeight(10)}>10kg 보기</a>
              </div>
              <p className="scene-credit">프로토타입 생성 이미지 · 실제 촬영본으로 교체 예정</p>
            </div>
            <div className="scene-hero hero-slide hero-slide-left" role="group" aria-roledescription="slide" aria-label="2 / 3" aria-hidden={heroIdx !== 1}>
              <img className="scene-hero-image" src={slideMeasure} alt="온실에서 당도계로 한라봉을 재며 고민하는 한누봉 캐릭터" />
              <div className="scene-shade hero-shade-soft" aria-hidden="true"></div>
              <h2 className="hero-slide-title"><img className="hero-headline" src={headline5} alt="구매할 한라봉 상태는? 오늘의 갈매 농장 확인하기" /></h2>
              <a className="button button-light hero-slide-button hero-slide-button-right" href="#farm-status" tabIndex={heroIdx === 1 ? 0 : -1}>바로가기</a>
            </div>
            <div className="scene-hero hero-slide hero-slide-center" role="group" aria-roledescription="slide" aria-label="3 / 3" aria-hidden={heroIdx !== 2}>
              <img className="scene-hero-image" src={slideRun} alt="한라봉 온실 길을 신나게 달려오는 한누봉 캐릭터" />
              <div className="scene-shade hero-shade-soft" aria-hidden="true"></div>
              <h2 className="hero-slide-title"><img className="hero-headline" src={headlineDigital} alt="드디어 갈매 농장이 디지털 전환을 합니다" /></h2>
              <a className="button hero-slide-button hero-slide-button-center" href="#products" tabIndex={heroIdx === 2 ? 0 : -1}>주문하러 가기</a>
            </div>
          </div>
          <button className="hero-arrow hero-arrow-prev" type="button" aria-label="이전 배너" onClick={() => goHero(heroIdx - 1)}>‹</button>
          <button className="hero-arrow hero-arrow-next" type="button" aria-label="다음 배너" onClick={() => goHero(heroIdx + 1)}>›</button>
          <div className="hero-dots" role="tablist" aria-label="배너 선택">
            {[0, 1, 2].map((i) => <button key={i} type="button" role="tab" aria-selected={heroIdx === i} aria-label={`${i + 1}번 배너`} className={heroIdx === i ? 'is-active' : ''} onClick={() => goHero(i)} />)}
          </div>
        </section>

        <section className="farm-status-section" id="farm-status" aria-labelledby="farm-status-title">
          <div className="farm-status-heading">
            <p className="farm-status-kicker"><span aria-hidden="true"></span><time dateTime={s.updatedAt} style={{ fontWeight: 400 }}>{dateKR(s.updatedAt)} 업데이트</time></p>
            <h2 id="farm-status-title" style={{ fontWeight: 700 }}>오늘 농장 상태</h2>
            <p>수확과 포장 상황이 궁금하다면?</p>
          </div>
          <div className="farm-status-window" onMouseEnter={() => setStatusPaused(true)} onMouseLeave={() => setStatusPaused(false)} onFocus={() => setStatusPaused(true)} onBlur={() => setStatusPaused(false)}>
            <div className="farm-status-panel">
              {slide === 0 && (
                <div className="farm-status-slide" data-farm-status-slide="availability">
                  <p>현재 주문 가능 여부</p>
                  <table className="availability-table" aria-label="용도와 중량별 주문 가능 여부">
                    <thead><tr><th scope="col">상품</th><th scope="col">5kg</th><th scope="col">10kg</th></tr></thead>
                    <tbody>
                      {(['gift', 'home'] as const).map((c) => (
                        <tr key={c}>
                          <th scope="row">{c === 'gift' ? '선물용' : '가정용'}</th>
                          {([5, 10] as const).map((w) => {
                            const ok = s.availability[productId(c, w)];
                            return <td key={w} className={ok ? 'is-available' : 'is-unavailable'}>{availText(ok)}</td>;
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <small>가능한 상품만 주문서에서 선택할 수 있어요.</small>
                </div>
              )}
              {slide === 1 && (
                <div className="farm-status-slide" data-farm-status-slide="taste">
                  <p>이번 주 한라봉 맛</p>
                  <strong>이번 주 한라봉은 <em>{tasteLabel}</em>이에요.</strong>
                  <small>농장주가 직접 먹어보고 기록했어요.</small>
                  <a className="farm-detail-link" href="#weekly-taste">자세히&nbsp;&nbsp;</a>
                </div>
              )}
              {slide === 2 && (
                <div className="farm-status-slide" data-farm-status-slide="packing">
                  <p>오늘 포장 상황</p>
                  <strong>{s.packingNote}</strong>
                  <small>출고되면 문자로 바로 알려드려요.</small>
                </div>
              )}
            </div>
            <div className="farm-status-motion" aria-hidden="true"><span></span><span></span><span></span></div>
          </div>
          <a className="farm-status-cta" href="#purpose" style={{ fontWeight: 400 }}>한라봉 고르기 <span aria-hidden="true">→</span></a>
          <p className="sr-only">{availSummary}</p>
        </section>

        <section className="purpose-section" id="purpose" aria-labelledby="purpose-title">
          <div className="purpose-copy">
            <p>먼저 용도를 알려주세요</p>
            <h2 id="purpose-title" style={{ fontWeight: 700 }}>어떻게 드실 예정인가요?</h2>
            <div className="purpose-actions" aria-label="구매 목적 선택">
              <button type="button" className={purpose === 'home' ? 'is-selected' : ''} aria-pressed={purpose === 'home'} onClick={() => choosePurpose('home')}><span style={{ fontWeight: 400 }}>우리 가족이 먹을 거예요</span><b aria-hidden="true">→</b></button>
              <button type="button" className={purpose === 'gift' ? 'is-selected' : ''} aria-pressed={purpose === 'gift'} onClick={() => choosePurpose('gift')}><span style={{ fontWeight: 400 }}>선물로 보낼 거예요</span><b aria-hidden="true">→</b></button>
            </div>
          </div>
          <div className="purpose-chatbot-space" aria-hidden="true"></div>
        </section>

        <section className="section products-section" id="products">
          <div className="section-heading center-heading"><div><h2 style={{ fontWeight: 700 }}>어느 상자를 보낼까요?</h2><p>용도를 먼저 고르면 같은 무게의 가격과 구성이 바뀝니다.</p></div></div>
          <div className="choice-tabs" role="tablist" aria-label="상품 용도 선택">
            <button className={`choice-tab${category === 'home' ? ' is-active' : ''}`} type="button" role="tab" aria-selected={category === 'home'} onClick={() => pickCategory('home')} style={{ fontWeight: 400 }}>집에서 먹기</button>
            <button className={`choice-tab${category === 'gift' ? ' is-active' : ''}`} type="button" role="tab" aria-selected={category === 'gift'} onClick={() => pickCategory('gift')} style={{ fontWeight: 400 }}>선물하기</button>
          </div>
          <div className="packing-bench" aria-live="polite">
            {cards.map(({ w, id, ok }, i) => (
              <div key={id} style={{ display: 'contents' }}>
                <article className={`product-card ${w === 5 ? 'parcel-small' : 'featured parcel-large'}${weight === w ? ' is-selected' : ''}`} data-weight={w} data-category={category}>
                  {w === 10 && <div className="product-ribbon">온 가족 선물</div>}
                  <div className={`product-photo ${w === 5 ? 'small-box' : 'large-box'}`} style={w === 10 ? { padding: '25px 23px 24px 23px' } : undefined}><span>촬영 예정</span><strong>{w}kg</strong></div>
                  <div className="product-card-body">
                    <p className="product-use">{COPY[id].use}</p>
                    <h3>{PRODUCTS[id].name}</h3>
                    <p>{COPY[id].desc}</p>
                    <dl><div><dt>구성</dt><dd>수확 후 선별</dd></div><div><dt>배송</dt><dd>배송비 포함</dd></div></dl>
                    <p className="price"><Price id={id} small /></p>
                    <button className="button full" type="button" onClick={() => setWeight(w)}>
                      {!ok ? `${w}kg 준비 중` : weight === w ? `${w}kg 선택됨` : `${w}kg 선택하기`}
                    </button>
                  </div>
                </article>
                {i === 0 && (
                  <div className="bench-note" aria-hidden="true"><img src={characterCutout} alt="" /></div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="purchase-decision" id="selected-product" aria-labelledby="selected-product-title">
          <div className="purchase-photo-board" aria-label="실제 과일과 포장 사진 자리">
            <div className="purchase-photo-main"><span>실제 과일 사진</span><strong>{weight}kg</strong></div>
            <div><span>상자 포장 사진</span></div>
            <p>판매 전 실제 출하분 사진으로 교체합니다.</p>
          </div>
          <div className="purchase-decision-copy">
            <p className="selection-state">지금 고른 한 상자</p>
            <h2 id="selected-product-title">{PRODUCTS[selected].name}</h2>
            <p className="selected-price"><Price id={selected} /></p>
            <div className="purchase-facts">
              <div><span>이번 주 맛</span><strong>{tasteLabel}</strong></div>
              <div><span>주문 가능</span><strong><b>{selectedAvailable ? stock : 0}</b>상자</strong></div>
              <div><span>예상 출고</span><strong>{shippingRange(s.detail)}</strong></div>
              <div><span>예상 구성</span><strong>{COUNT[weight]}</strong></div>
            </div>
            <div className="purchase-guidance">
              <article><strong>크기와 수량</strong><p>{SIZE[weight]}</p></article>
              <article><strong>먹기 좋은 때</strong><p>{s.detail.ripening}</p></article>
              <article><strong>보관 방법</strong><p>상자에서 꺼내 무른 과일부터 확인하고, 서늘한 곳이나 냉장고에 보관하세요.</p></article>
            </div>
            {orderable ? (
              <Link className="button purchase-cta" to={orderHref}>{ctaLabel}</Link>
            ) : (
              <span className="button purchase-cta" aria-disabled="true" style={{ opacity: 0.55, pointerEvents: 'none' }}>{stock > 0 ? '지금은 주문할 수 없어요' : '품절됐어요'}</span>
            )}
            <p className="purchase-reassurance">배송비 포함 · 출고되면 주문자 휴대전화로 알려드려요.</p>
          </div>
        </section>

        <section className="section comparison-section" id="weight-guide" aria-labelledby="compare-title">
          <div className="weight-helper">
            <img src={peekCharacter} alt="한누봉 캐릭터" />
            <div className="weight-helper-bubble"><p style={{ fontWeight: 400 }}>몇 kg를 사야 할지<br />고민되시나요?</p><button className="weight-helper-button" type="button" aria-haspopup="dialog" aria-controls="weight-dialog" aria-label="한라봉 중량 추천 질문 열기" onClick={weightDialog.open}>→</button></div>
          </div>
          <div className="compare-intro"><h2 id="compare-title" style={{ fontWeight: 700 }}>5kg와10kg 비교</h2><p>두 분께 가볍게 보내면 5kg,<br />여럿이 나누면 10kg이 넉넉해요.</p></div>
          <div className="scale-scene">
            <div className="scale-parcel scale-five" tabIndex={0} aria-label="5kg, 먼저 맛보기 좋은 양, 가격 부담이 적고 첫 구매에 추천"><div className="scale-default"><span>5kg</span><strong>{won(salePrice(s, productId(category, 5)))}</strong><small>작은 가족 · 두 분</small></div><div className="scale-hover-copy" aria-hidden="true"><strong style={{ fontSize: 16 }}>5kg은 이런 분께</strong><ul><li style={{ fontWeight: 400 }}>먼저 맛보기 좋은 양</li><li style={{ fontWeight: 400 }}>가격 부담이 적음</li><li style={{ fontWeight: 400 }}>첫 구매 추천</li></ul></div></div>
            <div className="scale-parcel scale-ten" tabIndex={0} aria-label="10kg, 가족과 넉넉히 먹는 양, 주변과 나누기 좋고 단골 고객에 추천"><div className="scale-default"><span>10kg</span><strong>{won(salePrice(s, productId(category, 10)))}</strong><small>온 가족 · 여럿이</small></div><div className="scale-hover-copy" aria-hidden="true"><strong style={{ fontSize: 20 }}>10kg은 이런 분께</strong><ul><li style={{ fontWeight: 400 }}>가족과 넉넉히 먹는 양</li><li style={{ fontWeight: 400 }}>주변과 나누기 좋음</li><li style={{ fontWeight: 400 }}>단골 고객 추천</li></ul></div></div>
            <div className="scale-line"><span>상자에 마우스를 올려 추천을 확인해보세요</span></div>
          </div>
        </section>

        <section className="weekly-taste-section" id="weekly-taste" aria-labelledby="weekly-taste-title">
          <header className="weekly-taste-head"><div><p style={{ fontWeight: 300 }}>농장에서 직접 재고 기록해요</p><h2 id="weekly-taste-title" style={{ fontWeight: 800, fontSize: 40 }}>이번 주 맛 정보</h2></div><strong className="taste-stamp" style={{ backgroundImage: `url(${tasteStamp})`, backgroundSize: 'contain', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', width: 150, aspectRatio: '779 / 843', border: 0, borderRadius: 0, transform: 'none', color: '#F0631E', fontSize: 26, fontWeight: 800 }}>{tasteLabel}</strong></header>
          <div className="taste-ledger">
            <dl className="taste-measures">
              <div><dt>측정일</dt><dd>{dateKR(s.detail.measurementDate)}</dd></div>
              <div><dt>표본 개수</dt><dd><strong>{s.detail.sampleCount}</strong>개</dd></div>
              <div className="brix-measure"><dt>평균 당도와 범위</dt><dd><strong><span>{s.detail.brixAverage}</span> Brix</strong><small><span>{s.detail.brixMin}</span>–<span>{s.detail.brixMax}</span> Brix</small></dd></div>
            </dl>
            <div className="taste-notes">
              <article><span>농장주의 실제 시식</span><p>{s.detail.tastingNote}</p></article>
              <article><span>먹기 좋은 때</span><p>{s.detail.ripening}</p></article>
              <article><span>출고 예정 기간</span><p>{shippingRange(s.detail)}</p></article>
            </div>
          </div>
        </section>

        <section className="customer-reviews-section" id="reviews" aria-labelledby="reviews-title">
          <div className="reviews-intro"><p style={{ fontWeight: 300 }}>현재 출하분 후기만 모았어요</p><h2 id="reviews-title" style={{ fontWeight: 800 }}>실제 고객 후기</h2><p>별점 하나보다 어떤 맛이었는지 구조적으로 보여드려요.</p>
            <aside className="returning-review-prompt"><strong>저번 구매는 어떠셨나요?</strong><p>사진 후기를 남기고 최대 1,200P 받아가세요.</p><Link className="button review-write-button" to="/review">내 구매 후기 작성하기</Link></aside></div>
          <div className="review-dashboard">
            <div className="review-batch"><span>이번 출하분을 먹은 고객의 평가</span><strong>{reviewStats.total}명 참여</strong></div>
            <div className="taste-distribution" aria-label="고객 맛 평가 비율">
              {(['balanced', 'sweet', 'fresh'] as const).map((k) => (
                <div key={k}><span>{TASTES[k]}</span><b>{reviewStats.pct(k)}%</b><i style={{ '--value': `${reviewStats.pct(k)}%` } as React.CSSProperties}></i></div>
              ))}
            </div>
            <ul className="review-tags">{REVIEW_TAGS.map((t) => <li key={t.key}>{t.label}</li>)}</ul>
            <p className="review-batch-note"><span>{dateKR(s.detail.measurementDate)}</span> 측정 출하분과 연결된 후기입니다.</p>
          </div>
        </section>

        <section className="section journey-section"><div className="section-heading"><div><h2 style={{ fontWeight: 700 }}>농장에서 집까지</h2></div><p>정해진 날짜를 서둘러 약속하기보다, 수확과 선별 상태를 확인한 뒤 문자로 알려드려요.</p></div><ol className="journey"><li><span>1</span><strong>수확</strong><small>상태 확인</small></li><li><span>2</span><strong>선별</strong><small>용도별 구분</small></li><li><span>3</span><strong>포장</strong><small>눌림 방지</small></li><li><span>4</span><strong>출고</strong><small>주소 재확인</small></li><li><span>5</span><strong>도착</strong><small>문자로 확인</small></li></ol></section>

        <section className="section care-section" id="care"><div className="section-heading"><div><h2 style={{ fontWeight: 800 }}>문제가 생기면<br />이렇게 도와드려요.</h2></div><p>받은 상태를 사진으로 남겨주시면 확인 후 재발송 또는 환불 기준을 안내합니다.</p></div><div className="care-list">
          <details><summary><span style={{ fontWeight: 300 }}>무르거나 상했어요</span><strong>수령 후 24시간 안에 알려주세요</strong></summary><div><p><b>필요한 사진</b> 운송장, 상자 전체, 문제 과일 전체와 확대 사진</p><p><b>처리 기준</b> 피해 범위를 확인해 일부 재발송·부분 환불·전액 처리 중 안내합니다.</p></div></details>
          <details><summary><span style={{ fontWeight: 300 }}>상자가 파손됐어요</span><strong>받은 상태 그대로 먼저 찍어주세요</strong></summary><div><p><b>필요한 사진</b> 외부 상자, 운송장, 내부 포장과 과일 상태</p><p><b>처리 기준</b> 내용물 손상 범위에 따라 재발송 또는 환불합니다.</p></div></details>
          <details><summary><span style={{ fontWeight: 300 }}>배송이 확인되지 않아요</span><strong>송장이 48시간 멈추면 확인해요</strong></summary><div><p><b>확인 방법</b> 농장에서 택배사에 위치와 상품 상태를 확인합니다.</p><p><b>처리 기준</b> 분실·오배송이 확인되면 재발송 또는 전액 환불 중 선택할 수 있습니다.</p></div></details>
        </div><p className="policy-note">운영 기준 초안이며 실제 판매 전 택배 계약과 전자상거래 고지 기준에 맞춰 확정합니다.</p></section>

        <section className="diary-section" id="farm" aria-labelledby="diary-title"><div className="diary-head"><div><h2 id="diary-title" style={{ fontWeight: 700 }}>한누봉의 농장일기</h2><p>농장 이야기는 한누봉이 직접 찍어 올립니다.</p></div></div>
          <button className="video-diary" type="button" aria-label="농장일기 영상 재생 준비 중" onClick={() => toast('농장일기 영상은 준비 중이에요.')}><img src={farmDiary} alt="카메라를 든 한누봉이 용실이 아줌마의 한라봉 선별 작업을 지켜보는 장면" width={1664} height={934} /><span className="video-play" aria-hidden="true">▶</span><span className="video-caption"><strong>농장일기 01</strong><small>한라봉 고르는 날 · 영상 교체 예정</small></span></button></section>
      </main>

      <footer className="site-footer">
        <div className="footer-contact-row">
          <div className="footer-contact"><a className="footer-phone" href="tel:01026292633">010-2629-2633</a><p>상담 시간 09:00–18:00</p></div>
          <div className="footer-wordmark" aria-label="한누봉 갈매농장"><strong>이용실</strong><span>갈매농장</span></div>
        </div>
        <div className="footer-divider" aria-hidden="true"></div>
        <div className="footer-info-row">
          <div className="footer-company"><strong>갈매농장</strong><p>대표 이용실</p><p>제주특별자치도 서귀포시 성산읍 삼달로 79-51</p><p>전화: 010-2629-2633</p></div>
          <nav className="footer-links" aria-label="하단 안내"><Link to="/orders">주문·배송 조회</Link><a href="#care">배송·보상 안내</a></nav>
          <div className="footer-reserved-space" aria-hidden="true"></div>
        </div>
        <div className="footer-bottom"><p>갈매농장</p><p>제주 농장에서 직접 준비합니다.</p></div>
      </footer>

      <dialog id="weight-dialog" className="weight-dialog" ref={weightDialog.ref} aria-labelledby="weight-dialog-title">
        <form className="weight-dialog-card" onSubmit={submitHelper}>
          <button className="weight-dialog-close" type="button" aria-label="중량 추천 닫기" onClick={weightDialog.close}>×</button>
          <p className="weight-dialog-kicker">한누봉이 함께 골라볼게요</p>
          <h2 id="weight-dialog-title">몇 kg가 잘 맞을까요?</h2>
          <fieldset><legend>이번 주문이 처음인가요?</legend><label><input type="radio" name="firstOrder" value="yes" required /> 처음이에요</label><label><input type="radio" name="firstOrder" value="no" /> 주문한 적 있어요</label></fieldset>
          <fieldset><legend>어떻게 나눠 드실 예정인가요?</legend><label><input type="radio" name="sharing" value="family" required /> 가족끼리 먹어요</label><label><input type="radio" name="sharing" value="share" /> 주변과 함께 나눠요</label></fieldset>
          <fieldset><legend>어떤 양을 원하시나요?</legend><label><input type="radio" name="amount" value="moderate" required /> 부담 없이 적당한 양</label><label><input type="radio" name="amount" value="plenty" /> 한 번에 넉넉한 양</label></fieldset>
          <button className="button full" type="submit">추천 확인하기</button>
          {result && (
            <div className="weight-result" role="status" aria-live="polite">
              <strong>{result.w}kg를 추천해요</strong>
              <p>{result.text}</p>
              <a href="#selected-product" onClick={(e) => { e.preventDefault(); applyResult(); }}>{result.w}kg 상자 보러 가기 →</a>
            </div>
          )}
        </form>
      </dialog>

      <div className="mobile-order-bar mobile-purchase-bar">
        <span><small>선택한 상품</small><strong>{PRODUCTS[selected].short}</strong></span>
        {orderable ? <Link to={orderHref}>주문하기 · {won(salePrice(s, selected))}</Link> : <a aria-disabled="true" style={{ opacity: 0.55, pointerEvents: 'none' }}>{stock > 0 ? '준비 중' : '품절'}</a>}
      </div>
      {toastNode}
    </>
  );
}
