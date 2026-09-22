import './App.scss'
import { useEffect, useState } from 'react'
import {
  BrowserRouter,
  Link,
  useLocation,
  Navigate,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom'
import MakeInfo from './pages/MakeInfo'
import Game from './pages/Game'
import Result from './pages/Result'
import Story from './pages/Story'
import storyBackground from './assets/background/story.png'
import gameBackground from './assets/background/game.png'
import successBackground from './assets/background/success.png'
import failBackground from './assets/background/fail.png'
import hatchImage from './assets/Etc/hatch.png'
import sunImage from './assets/Etc/sun.png'
import firstImage from './assets/mr.leak/first.png'
import secondImage from './assets/mr.leak/second.png'
import thirdImage from './assets/mr.leak/third.png'
import successImage from './assets/mr.leak/success.png'
import failImage from './assets/mr.leak/fail.png'

const assetsToPreload = [
  storyBackground,
  gameBackground,
  successBackground,
  failBackground,
  hatchImage,
  sunImage,
  firstImage,
  secondImage,
  thirdImage,
  successImage,
  failImage,
]

const Home = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [isLeaving, setIsLeaving] = useState(false)
  const [isEntering, setIsEntering] = useState(
    location.state?.fromMakeInfo === true,
  )

  const handleMakeInfoClick = (event) => {
    event.preventDefault()

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      navigate('/make-info')
      return
    }

    setIsLeaving(true)
  }

  return (
    <main className="start-page">
      <div
        className={`start-page__content${isLeaving ? ' start-page__content--leaving' : isEntering ? ' start-page__content--entering' : ''}`}
        onAnimationEnd={() => {
          if (isLeaving) {
            navigate('/make-info')
            return
          }

          if (isEntering) setIsEntering(false)
        }}
      >
        <h1 className="start-page__title">
          <span>아리수를</span>
          <span>마셔야되는 이유</span>
        </h1>

        <nav className="start-page__actions" aria-label="시작 메뉴">
          <Link to="/story">게임 시작</Link>
          <Link
            to="/make-info"
            aria-disabled={isLeaving}
            onClick={handleMakeInfoClick}
          >
            제작 정보
          </Link>
        </nav>
      </div>
    </main>
  )
}

const App = () => {
  useEffect(() => {
    const preload = () => {
      assetsToPreload.forEach((source) => {
        const image = new Image()
        image.decoding = 'async'
        image.src = source
        image.decode?.().catch(() => {})
      })
    }

    const idleId = window.requestIdleCallback?.(preload, { timeout: 1500 })
    const timeoutId = idleId === undefined
      ? window.setTimeout(preload, 500)
      : undefined

    return () => {
      if (idleId !== undefined) window.cancelIdleCallback?.(idleId)
      if (timeoutId !== undefined) window.clearTimeout(timeoutId)
    }
  }, [])

  return (
    <BrowserRouter>
      <div className="app-background" aria-hidden="true" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/make-info" element={<MakeInfo />} />
        <Route path="/story" element={<Story />} />
        <Route path="/game" element={<Game />} />
        <Route path="/result" element={<Result />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
