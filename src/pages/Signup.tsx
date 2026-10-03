import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { addActivity, digits, formatPhone, getSheetUrl, getState, hashPassword, isPhone, login, makeMemberId, postToSheet, update } from '../store';
import { usePage } from '../components/ui';
import { AuthHeader } from './Login';
import character from '../assets/hannubong-character-cutout-v1.png';

export default function Signup() {
  usePage('signup', 'auth-body');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [syncNote, setSyncNote] = useState('회원 정보도 농장 관리 시트에 저장했습니다.');

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name') || '').trim();
    const phoneRaw = String(f.get('phone') || '');
    const password = String(f.get('password') || '');
    if (!name) return setMsg('이름을 입력해주세요.');
    if (!isPhone(phoneRaw)) return setMsg('휴대전화 번호를 010-0000-0000 형식으로 입력해주세요.');
    if (password.length < 8) return setMsg('비밀번호는 8자 이상 입력해주세요.');
    if (password !== f.get('passwordConfirm')) return setMsg('비밀번호 확인이 일치하지 않아요.');
    if (f.get('terms') !== 'on') return setMsg('필수 약관에 동의해주세요.');
    const phone = formatPhone(phoneRaw);
    if (getState().users.some((u) => digits(u.phone) === digits(phone))) return setMsg('이미 가입된 휴대전화 번호예요. 로그인해주세요.');
    setBusy(true);
    const hash = await hashPassword(phone, password);
    const marketing = f.get('marketing') === 'on';
    const createdAt = new Date().toISOString();
    const memberId = makeMemberId();
    update((s) => addActivity({ ...s, users: [...s.users, { memberId, name, phone, hash, marketing, coupon: true, points: 0, createdAt }] }, `새 회원 ${name}님이 가입했어요.`));
    try {
      await postToSheet(getSheetUrl(), {
        action: 'member-signup',
        member: { memberId, name, phone, marketing: marketing ? '동의' : '미동의', joinedAt: createdAt, source: '한누봉 웹사이트' },
      });
    } catch {
      setSyncNote('가입은 완료됐지만 농장 관리 시트 저장은 확인이 필요합니다. 관리자 화면에서 다시 연결할 수 있어요.');
    }
    login(phone, true);
    setBusy(false);
    setMsg('');
    setDone(true);
  };

  return (
    <>
      <a className="skip-link" href="#main">본문으로 바로가기</a>
      <AuthHeader showName={false} right={<>이미 회원이신가요? <Link to="/login">로그인</Link></>} />
      <main className="auth-main" id="main">
        <section className="auth-story" aria-labelledby="signup-title">
          <div>
            <p className="auth-kicker">첫 구매를 조금 가볍게</p>
            <h1 id="signup-title">농장 단골로<br />등록할게요.</h1>
            <p>가입하면 첫 주문에 쓸 수 있는 3,000원 쿠폰을 드려요. 다음 주문은 배송지를 다시 적지 않아도 됩니다.</p>
          </div>
          <div className="auth-benefit-ticket" aria-label="회원 혜택"><span>첫 구매 쿠폰</span><strong>3,000원</strong><small>회원가입 즉시 발급</small></div>
          <img src={character} alt="한누봉 캐릭터" width={220} height={220} />
        </section>
        <section className="auth-panel" aria-label="회원가입 입력">
          <div className="auth-panel-heading"><span>회원가입</span><strong>필요한 정보만 받을게요.</strong></div>
          {!done ? (
            <form className="auth-form" onSubmit={submit} noValidate>
              <label className="auth-field"><span>이름</span><input type="text" name="name" autoComplete="name" maxLength={30} required placeholder="이름을 입력해주세요" /></label>
              <label className="auth-field"><span>휴대전화</span><input type="tel" name="phone" autoComplete="tel" inputMode="numeric" required placeholder="010-0000-0000" aria-describedby="signup-phone-help" /><small id="signup-phone-help">주문과 배송 안내에 사용합니다.</small></label>
              <label className="auth-field"><span>비밀번호</span><input type="password" name="password" autoComplete="new-password" minLength={8} required placeholder="8자 이상 입력해주세요" /></label>
              <label className="auth-field"><span>비밀번호 확인</span><input type="password" name="passwordConfirm" autoComplete="new-password" minLength={8} required placeholder="한 번 더 입력해주세요" /></label>
              <div className="auth-consents">
                <label><input type="checkbox" name="terms" required /><span><b>필수</b> 이용약관과 개인정보 수집에 동의합니다.</span></label>
                <label><input type="checkbox" name="marketing" /><span><b>선택</b> 판매 시작과 재출하 소식을 받아봅니다.</span></label>
              </div>
              <p className="auth-form-message" role="alert">{msg}</p>
              <button className="button auth-submit" type="submit" disabled={busy}>가입하고 3,000원 쿠폰 받기</button>
            </form>
          ) : (
            <div className="auth-success">
              <span aria-hidden="true">✓</span><h2>한누봉 단골이 되었어요.</h2><p>3,000원 쿠폰을 담아두었습니다.</p><p>{syncNote}</p>
              <Link className="button" to="/#products">한라봉 고르러 가기</Link>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
