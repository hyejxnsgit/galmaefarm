import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { REVIEW_TAGS, TasteKey, addActivity, dateKR, update, useSession, useStore } from '../store';
import { Logo, usePage } from '../components/ui';

export default function Review() {
  usePage('review', 'review-form-body');
  const s = useStore();
  const user = useSession();
  const [photo, setPhoto] = useState(false);
  const [photoName, setPhotoName] = useState('');
  const [comment, setComment] = useState('');
  const [awarded, setAwarded] = useState<number | null>(null);

  const points = (photo ? 1000 : 0) + (comment.trim().length >= 50 ? 200 : 0);
  const rest = 50 - comment.trim().length;

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const taste = f.get('taste') as TasteKey;
    const tags = f.getAll('tags').map(String);
    update((st) => {
      const next = addActivity({
        ...st,
        reviews: [...st.reviews, { createdAt: new Date().toISOString(), taste, tags, hasPhoto: photo, comment: comment.trim(), points }],
        users: st.users.map((u) => (user && u.phone === user.phone ? { ...u, points: u.points + points } : u)),
      }, `후기가 새로 등록됐어요. (${points}P)`);
      return next;
    });
    setAwarded(points);
  };

  return (
    <>
      <a className="skip-link" href="#main">본문으로 바로가기</a>
      <header className="simple-header"><Link to="/" className="brand"><Logo /></Link><Link to="/#reviews">후기 화면으로 돌아가기</Link></header>
      <main id="main" className="review-page">
        <header className="review-form-head"><p>구매가 확인된 고객 후기</p><h1>먹어본 맛을<br />버튼으로 알려주세요.</h1><div className="current-batch-chip"><span>{dateKR(s.detail.measurementDate)}</span> 측정 출하분</div>
          <aside className="review-point-card"><span>이번 후기 예상 적립</span><strong><b>{points}</b>P</strong><p>사진 등록 1,000P<br />50자 이상 작성 200P</p></aside></header>
        <form className="review-form" onSubmit={submit}>
          <fieldset><legend>어떤 맛에 가장 가까웠나요?</legend><div className="review-taste-options">
            <label><input type="radio" name="taste" value="sweet" required /><span>달콤형<small>단맛이 더 또렷해요</small></span></label>
            <label><input type="radio" name="taste" value="balanced" /><span>균형형<small>달고 적당히 새콤해요</small></span></label>
            <label><input type="radio" name="taste" value="fresh" /><span>상큼형<small>산뜻한 신맛이 느껴져요</small></span></label>
          </div></fieldset>
          <fieldset><legend>먹으면서 느낀 점을 모두 눌러주세요.</legend><div className="review-check-options">
            {REVIEW_TAGS.map((t) => <label key={t.key}><input type="checkbox" name="tags" value={t.key} /><span>{t.label}</span></label>)}
          </div></fieldset>
          <label className="review-photo-upload"><span><strong>사진과 함께 남기기</strong><small>사진을 등록하면 1,000P를 드려요.</small></span>
            <input type="file" name="reviewPhoto" accept="image/*" onChange={(e) => { const file = e.target.files?.[0]; setPhoto(!!file); setPhotoName(file?.name || ''); }} />
            <b>{photo ? photoName || '사진 등록됨' : '사진 선택'}</b></label>
          <label className="review-comment"><span>한마디 더 남기기 <small>50자 이상이면 200P</small></span>
            <textarea name="comment" rows={5} maxLength={300} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="가족과 함께 먹은 느낌, 당도와 과즙, 다시 구매하고 싶은 이유를 알려주세요." />
            <div className="review-writing-progress"><span><b>{comment.trim().length}</b>/50자</span><strong>{rest > 0 ? '50자를 채우면 200P가 더 적립돼요.' : '200P가 더 적립돼요!'}</strong></div></label>
          <label className="review-consent"><input type="checkbox" name="consent" required /> 이 후기를 현재 출하분의 맛 정보에 익명으로 공개하는 데 동의합니다.</label>
          <button className="button review-submit" type="submit">후기 작성하고 <span>{points > 0 ? `${points.toLocaleString('ko-KR')}P 받기` : '포인트 받기'}</span></button>
          {awarded !== null && (
            <div className="review-success" role="status"><strong>후기를 기록했어요.</strong><p>현재 출하분의 맛 비율과 선택한 표현에 바로 반영됩니다.</p><p className="awarded-points"><b>{awarded.toLocaleString('ko-KR')}P</b> 적립 예정</p><Link to="/#reviews">업데이트된 후기 보기</Link></div>
          )}
        </form>
      </main>
    </>
  );
}
