import './Result.scss'
import { useLocation, useNavigate } from 'react-router-dom'
import successCharacter from '../assets/mr.leak/success.png'
import failCharacter from '../assets/mr.leak/fail.png'

const formatElapsedTime = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

const Result = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const isSuccess = state?.result === 'success'
  const concentration = Number.isFinite(state?.concentration)
    ? state.concentration
    : 0
  const elapsed = Number.isFinite(state?.elapsed) ? state.elapsed : 60_000

  return (
    <main className={`result-page result-page--${isSuccess ? 'success' : 'fail'}`}>
      <section className="result-page__summary">
        <h1>{isSuccess ? '성공!' : '실패...'}</h1>
        <p>
          {isSuccess
            ? '미스터 릭은 아리수를 잔뜩 마시고 건강해졌습니다!'
            : '지쳐버린 미스터 릭은 바닥에 떨어진 아리수를 핥아마시게 되었습니다...'}
        </p>
        <dl>
          <div>
            <dt>아리수 농도</dt>
            <dd>{concentration}%</dd>
          </div>
          <div>
            <dt>클리어 시간</dt>
            <dd>{formatElapsedTime(elapsed)}</dd>
          </div>
        </dl>
      </section>

      <img
        className="result-page__character"
        src={isSuccess ? successCharacter : failCharacter}
        alt={isSuccess ? '건강해진 미스터 릭' : '쓰러진 미스터 릭'}
      />

      <nav className="result-page__actions" aria-label="결과 메뉴">
        <button type="button" onClick={() => navigate('/game', { replace: true })}>
          다시하기
        </button>
        <button type="button" onClick={() => navigate('/', { replace: true })}>
          메인으로
        </button>
      </nav>
    </main>
  )
}

export default Result
