import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getState, hashPassword, isPhone, formatPhone, digits, login } from '../store';
import { Logo, usePage } from '../components/ui';
import character from '../assets/hannubong-character-cutout-v1.png';

export function AuthHeader({ right, showName = true }: { right: React.ReactNode; showName?: boolean }) {
  return (
    <header className="auth-header">
      <Link className="auth-brand" to="/"><span className="brand"><Logo /></span>{showName && <b>한누봉</b>}</Link>
      <p>{right}</p>
    </header>
  );
}

export default function Login() {
  usePage('login', 'auth-body');
  const nav = useNavigate();
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get('phone') || '');
    const password = String(f.get('password') || '');
    if (!isPhone(phone)) return setMsg('휴대전화 번호를 010-0000-0000 형식으로 입력해주세요.');
    if (!password) return setMsg('비밀번호를 입력해주세요.');
    setBusy(true);
    const normalized = formatPhone(phone);
    const user = getState().users.find((u) => digits(u.phone) === digits(phone));
    const hash = await hashPassword(normalized, password);
    setBusy(false);
    if (!user || user.hash !== hash) return setMsg('휴대전화 번호나 비밀번호가 맞지 않아요. 이 기기에서 가입한 계정만 로그인할 수 있어요.');
    login(user.phone, f.get('remember') === 'on');
    nav('/orders');
  };

  return (
    <>
      <a className="skip-link" href="#main">본문으로 바로가기</a>
      <AuthHeader showName={false} right={<>처음 오셨나요? <Link to="/signup">회원가입</Link></>} />
      <main className="auth-main auth-main-login" id="main">
        <section className="auth-story" aria-labelledby="login-title">
          <div>
            <p className="auth-kicker">지난 주문 그대로</p>
            <h1 id="login-title">다시 주문하기<br />쉬워져요.</h1>
            <p>이전에 주문한 상자와 배송지를 불러오고, 이번 주 맛이 지난번과 어떻게 다른지도 확인할 수 있어요.</p>
          </div>
          <div className="auth-return-note"><span>지난 주문</span><strong>가정용 10kg</strong><small>로그인하면 주문 기록을 이어서 볼 수 있어요.</small></div>
          <img src={character} alt="한누봉 캐릭터" width={220} height={220} />
        </section>
        <section className="auth-panel" aria-label="로그인 입력">
          <div className="auth-panel-heading"><span>로그인</span><strong>휴대전화 번호로 찾아드릴게요.</strong></div>
          <form className="auth-form" onSubmit={submit} noValidate>
            <label className="auth-field"><span>휴대전화</span><input type="tel" name="phone" autoComplete="tel" inputMode="numeric" required placeholder="010-0000-0000" /></label>
            <label className="auth-field"><span>비밀번호</span><input type="password" name="password" autoComplete="current-password" required placeholder="비밀번호를 입력해주세요" /></label>
            <label className="auth-remember"><input type="checkbox" name="remember" defaultChecked /><span>다음에도 로그인 상태 유지</span></label>
            <p className="auth-form-message" role="alert">{msg}</p>
            <button className="button auth-submit" type="submit" disabled={busy}>로그인</button>
          </form>
          <p className="auth-security-note">현재 프로토타입에서는 이 기기에서 가입한 계정으로 로그인됩니다. 실제 운영 전에는 별도의 보안 인증 서버가 필요합니다.</p>
          <div className="auth-divider"><span>아직 회원이 아니라면</span></div>
          <Link className="auth-outline-link" to="/signup">회원가입하고 3,000원 받기</Link>
        </section>
      </main>
    </>
  );
}
