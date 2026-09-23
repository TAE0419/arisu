import './MakeInfo.scss'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const MakeInfo = () => {
  const navigate = useNavigate()
  const [isLeaving, setIsLeaving] = useState(false)

  const handleBack = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/', { state: { fromMakeInfo: true } })
      return
    }

    setIsLeaving(true)
  }

  return (
    <main className="make-info-page">
      <section
        className={`make-info-page__panel${isLeaving ? ' make-info-page__panel--leaving' : ''}`}
        onAnimationEnd={() => {
          if (isLeaving) navigate('/', { state: { fromMakeInfo: true } })
        }}
      >
        <h1>제작 정보</h1>

        <div className="make-info-page__details">
          <div className="make-info-page__row">
            <h2>게임 설명</h2>
            <p>
              ‘아리수를 마셔야되는 이유’는 2026 아리수 서포터즈 활동의
              일환으로, 서울시의 수돗물 아리수를 친근하고 재미있는 방식으로
              알리기 위해 기획되었습니다. 게임을 플레이하며 일상 속 아리수의 매력을 재발견해 보세요!
            </p>
          </div>

          <div className="make-info-page__row">
            <h2>기술 스택</h2>
            <div>
              <p>Frontend: React 19, JavaScript (ES6+), React Router, SCSS</p>
              <p>Build / Tools: Vite, Sass, Oxlint</p>
              <p>Game / Logic: React Hooks와 requestAnimationFrame 기반 게임 루프, 충돌 판정, 타이머 및 단계별 난이도 구현</p>
              <p>Interaction / UI: 마우스·터치 드래그 조작, 반응형 레이아웃, CSS 애니메이션 및 페이지 전환 효과</p>
            </div>
          </div>

          <div className="make-info-page__row">
            <h2>기타 정보</h2>
            <div>
              <p>문의 : ktcat0419@gmail.com</p>
              <p>배포 링크 : <a href="https://arisu-eta.vercel.app/" target="_blank" rel="noreferrer">https://arisu-eta.vercel.app/</a></p>
              <p>Copyright: © 2026 Arisu Supporters. All rights reserved.</p>
            </div>
          </div>
        </div>

        <div className="make-info-page__actions">
          <button type="button" disabled={isLeaving} onClick={handleBack}>돌아가기</button>
          <button type="button" onClick={() => navigate('/story')}>게임 시작</button>
        </div>
      </section>
    </main>
  )
}

export default MakeInfo
