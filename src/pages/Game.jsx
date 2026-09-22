import './Game.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import arisuInfo from '../data/ArisuInfo.json'
import arisuImage from '../assets/Etc/arisu.png'
import sunshineImage from '../assets/Etc/sunshine.png'
import firstImage from '../assets/mr.leak/first.png'
import secondImage from '../assets/mr.leak/second.png'
import thirdImage from '../assets/mr.leak/third.png'

const GAME_DURATION = 60_000
const INITIAL_CONCENTRATION = 0

const getStageSettings = (concentration) => {
  if (concentration >= 70) {
    return { stage: 3, character: thirdImage, waterChance: 0.55, speed: 420, spawnEvery: 360, extraSunshine: 1, bonusSunshineChance: 0.35 }
  }

  if (concentration >= 30) {
    return { stage: 2, character: secondImage, waterChance: 0.65, speed: 290, spawnEvery: 520, extraSunshine: 1, bonusSunshineChance: 0 }
  }

  return { stage: 1, character: firstImage, waterChance: 0.72, speed: 180, spawnEvery: 700, extraSunshine: 0, bonusSunshineChance: 0.50 }
}

const formatTime = (milliseconds) => {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

const splitTerm = (term) => term.match(/.{1,2}/gu) ?? [term]

const Game = () => {
  const navigate = useNavigate()
  const arenaRef = useRef(null)
  const playerRef = useRef(null)
  const animationRef = useRef(0)
  const lastFrameRef = useRef(0)
  const lastSpawnRef = useRef(0)
  const itemIdRef = useRef(0)
  const spawnQueueRef = useRef([])
  const lastReleasedAtRef = useRef(0)
  const lastSpawnXRef = useRef({ water: -1, sunshine: -1 })
  const noticeIdRef = useRef(0)
  const concentrationRef = useRef(INITIAL_CONCENTRATION)
  const elapsedRef = useRef(0)
  const statusRef = useRef('playing')
  const playerXRef = useRef(0.5)
  const itemsRef = useRef([])
  const noticesRef = useRef([])
  const pendingNoticesRef = useRef([])
  const drainNoticeQueueRef = useRef(() => {})
  const noticeTimeoutsRef = useRef(new Set())

  const [concentration, setConcentration] = useState(INITIAL_CONCENTRATION)
  const [remainingTime, setRemainingTime] = useState(GAME_DURATION)
  const [items, setItems] = useState([])
  const [notices, setNotices] = useState([])
  const [playerX, setPlayerX] = useState(0.5)
  const [isFacingRight, setIsFacingRight] = useState(false)
  const [status, setStatus] = useState('playing')

  const settings = getStageSettings(concentration)

  const finishGame = useCallback((result) => {
    if (statusRef.current !== 'playing') return

    statusRef.current = result
    setStatus(result)
    cancelAnimationFrame(animationRef.current)
    navigate('/result', {
      replace: true,
      state: {
        result,
        concentration: concentrationRef.current,
        elapsed: elapsedRef.current,
      },
    })
  }, [navigate])

  const removeNotice = useCallback((noticeId) => {
    const notice = noticesRef.current.find((item) => item.id === noticeId)
    if (!notice || notice.isLeaving) return

    const leavingNotices = noticesRef.current.map((item) =>
      item.id === noticeId ? { ...item, isLeaving: true } : item,
    )
    noticesRef.current = leavingNotices
    setNotices(leavingNotices)

    const removalTimeout = window.setTimeout(() => {
      const remainingNotices = noticesRef.current.filter((item) => item.id !== noticeId)
      noticesRef.current = remainingNotices
      setNotices(remainingNotices)
      noticeTimeoutsRef.current.delete(removalTimeout)
      drainNoticeQueueRef.current()
    }, 300)
    noticeTimeoutsRef.current.add(removalTimeout)
  }, [])

  const drainNoticeQueue = useCallback(() => {
    if (pendingNoticesRef.current.length === 0) return
    if (noticesRef.current.some((notice) => notice.isLeaving)) return
    const noticeLimit = window.innerWidth <= 800 ? 2 : 5

    if (noticesRef.current.length < noticeLimit) {
      const nextNotice = pendingNoticesRef.current.shift()
      const nextNotices = [...noticesRef.current, nextNotice]
      noticesRef.current = nextNotices
      setNotices(nextNotices)
      return
    }

    const oldestNotice = noticesRef.current[0]
    const leavingNotices = noticesRef.current.map((notice) =>
      notice.id === oldestNotice.id ? { ...notice, isLeaving: true } : notice,
    )
    noticesRef.current = leavingNotices
    setNotices(leavingNotices)

    const removalTimeout = window.setTimeout(() => {
      const nextNotice = pendingNoticesRef.current.shift()
      const remainingNotices = noticesRef.current.filter(
        (notice) => notice.id !== oldestNotice.id,
      )
      const nextNotices = nextNotice
        ? [...remainingNotices, nextNotice]
        : remainingNotices

      noticesRef.current = nextNotices
      setNotices(nextNotices)
      noticeTimeoutsRef.current.delete(removalTimeout)
      drainNoticeQueueRef.current()
    }, 300)
    noticeTimeoutsRef.current.add(removalTimeout)
  }, [])

  useEffect(() => {
    drainNoticeQueueRef.current = drainNoticeQueue
  }, [drainNoticeQueue])

  const addNotice = useCallback((info) => {
    const id = noticeIdRef.current++
    const newNotice = { ...info, id, isLeaving: false }
    pendingNoticesRef.current.push(newNotice)
    drainNoticeQueueRef.current()

    const timeoutId = window.setTimeout(() => {
      removeNotice(id)
      noticeTimeoutsRef.current.delete(timeoutId)
    }, 5000)
    noticeTimeoutsRef.current.add(timeoutId)
  }, [removeNotice])

  const updateConcentration = useCallback((amount, info) => {
    if (statusRef.current !== 'playing') return

    const next = concentrationRef.current + amount
    concentrationRef.current = next
    setConcentration(next)

    if (info) addNotice(info)

    if (next >= 100) {
      concentrationRef.current = 100
      setConcentration(100)
      finishGame('success')
    } else if (next < 0) {
      finishGame('failure')
    }
  }, [addNotice, finishGame])

  useEffect(() => {
    const noticeTimeouts = noticeTimeoutsRef.current
    const startedAt = performance.now()
    lastFrameRef.current = startedAt
    lastSpawnRef.current = startedAt

    const runGame = (now) => {
      if (statusRef.current !== 'playing') return

      const arena = arenaRef.current
      if (!arena) return

      const elapsed = now - startedAt
      elapsedRef.current = Math.min(elapsed, GAME_DURATION)
      const remaining = Math.max(0, GAME_DURATION - elapsed)
      const deltaSeconds = Math.min((now - lastFrameRef.current) / 1000, 0.05)
      const currentSettings = getStageSettings(concentrationRef.current)
      const arenaHeight = arena.clientHeight
      const arenaBounds = arena.getBoundingClientRect()
      const playerBounds = playerRef.current?.getBoundingClientRect()

      lastFrameRef.current = now
      setRemainingTime(remaining)

      if (remaining <= 0) {
        finishGame(concentrationRef.current >= 100 ? 'success' : 'failure')
        return
      }

      const movedItems = itemsRef.current
        .map((item) => ({
          ...item,
          y: item.y + currentSettings.speed * deltaSeconds,
        }))
        .filter((item) => {
          const isMobile = arena.clientWidth <= 800
          const itemWidth = item.type === 'water' ? (isMobile ? 34 : 57) : (isMobile ? 42 : 81)
          const itemHeight = item.type === 'water' ? (isMobile ? 45 : 76) : (isMobile ? 42 : 81)
          const itemCenterX = item.x * arena.clientWidth
          const itemLeft = arenaBounds.left + itemCenterX - itemWidth / 2
          const itemRight = itemLeft + itemWidth
          const itemTop = arenaBounds.top + item.y
          const itemBottom = itemTop + itemHeight
          const playerHitbox = playerBounds && {
            left: playerBounds.left + playerBounds.width * 0.24,
            right: playerBounds.right - playerBounds.width * 0.24,
            top: playerBounds.top + playerBounds.height * 0.18,
            bottom: playerBounds.bottom - playerBounds.height * 0.08,
          }
          const hitPlayer = playerBounds
            && itemRight >= playerHitbox.left
            && itemLeft <= playerHitbox.right
            && itemBottom >= playerHitbox.top
            && itemTop <= playerHitbox.bottom

          if (hitPlayer) {
            if (item.type === 'water') {
              updateConcentration(5, item.info)
            } else {
              updateConcentration(-10)
            }
            return false
          }

          return item.y < arenaHeight + 100
        })

      if (now - lastSpawnRef.current >= currentSettings.spawnEvery) {
        lastSpawnRef.current = now
        const isWater = Math.random() < currentSettings.waterChance
        const info = isWater
          ? arisuInfo[Math.floor(Math.random() * arisuInfo.length)]
          : null

        spawnQueueRef.current.push({
          id: itemIdRef.current++,
          type: isWater ? 'water' : 'sunshine',
          info,
          availableAt: now,
        })

        const sunshineCount = currentSettings.extraSunshine
          + (Math.random() < currentSettings.bonusSunshineChance ? 1 : 0)

        for (let index = 0; index < sunshineCount; index += 1) {
          spawnQueueRef.current.push({
            id: itemIdRef.current++,
            type: 'sunshine',
            info: null,
            availableAt: now + (index + 1) * 220,
          })
        }

        spawnQueueRef.current.sort((first, second) => first.availableAt - second.availableAt)
      }

      const nextQueuedItem = spawnQueueRef.current[0]
      if (
        nextQueuedItem
        && nextQueuedItem.availableAt <= now
        && now - lastReleasedAtRef.current >= 160
      ) {
        spawnQueueRef.current.shift()

        let nextX = 0.04 + Math.random() * 0.92
        for (let attempt = 0; attempt < 6; attempt += 1) {
          if (Math.abs(nextX - lastSpawnXRef.current[nextQueuedItem.type]) >= 0.18) break
          nextX = 0.04 + Math.random() * 0.92
        }

        lastSpawnXRef.current[nextQueuedItem.type] = nextX
        lastReleasedAtRef.current = now
        movedItems.push({
          ...nextQueuedItem,
          x: nextX,
          y: -90,
        })
      }

      itemsRef.current = movedItems
      setItems(movedItems)

      animationRef.current = requestAnimationFrame(runGame)
    }

    animationRef.current = requestAnimationFrame(runGame)

    return () => {
      cancelAnimationFrame(animationRef.current)
      noticeTimeouts.forEach((timeoutId) => clearTimeout(timeoutId))
      noticeTimeouts.clear()
    }
  }, [finishGame, updateConcentration])

  const movePlayer = (clientX) => {
    if (statusRef.current !== 'playing' || !arenaRef.current) return

    const bounds = arenaRef.current.getBoundingClientRect()
    const nextX = Math.min(0.94, Math.max(0.06, (clientX - bounds.left) / bounds.width))
    if (nextX !== playerXRef.current) {
      setIsFacingRight(nextX > playerXRef.current)
    }
    playerXRef.current = nextX
    setPlayerX(nextX)
  }

  const handlePointerMove = (event) => movePlayer(event.clientX)

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId)
    movePlayer(event.clientX)
  }

  const handleTouchMove = (event) => {
    event.preventDefault()
    const touch = event.touches[0]
    if (touch) movePlayer(touch.clientX)
  }

  const restartGame = () => window.location.reload()
  const elapsedPercent = ((GAME_DURATION - remainingTime) / GAME_DURATION) * 100

  return (
    <main
      ref={arenaRef}
      className="game-page"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
    >
      <header className="game-hud">
        <div className="game-hud__time-row">
          <div className="game-hud__track" aria-label="경과 시간">
            <span style={{ width: `${elapsedPercent}%` }} />
          </div>
          <time>{formatTime(remainingTime)}</time>
        </div>
        <div className="game-hud__concentration">
          <span>아리수 농도 :</span>
          <strong>{concentration}%</strong>
        </div>
      </header>

      <div className="game-items" aria-hidden="true">
        {items.map((item) => (
          <div
            key={item.id}
            className={`game-item game-item--${item.type}`}
            style={{ left: `${item.x * 100}%`, transform: `translate(-50%, ${item.y}px)` }}
          >
            <img src={item.type === 'water' ? arisuImage : sunshineImage} alt="" />
            {item.info && (
              <span>
                {splitTerm(item.info.term).map((part, index) => (
                  <span key={`${item.id}-${index}`}>
                    {part}
                    {index < splitTerm(item.info.term).length - 1 && <br />}
                  </span>
                ))}
              </span>
            )}
          </div>
        ))}
      </div>

      <aside className="game-notices" aria-live="polite">
        {notices.map((notice) => (
          <article
            key={notice.id}
            className={notice.isLeaving ? 'game-notice--leaving' : ''}
          >
            <strong>{notice.term}</strong>
            <p>{notice.description}</p>
          </article>
        ))}
      </aside>

      <div className="game-floor" aria-hidden="true" />

      <div
        ref={playerRef}
        className={`game-player${isFacingRight ? ' game-player--right' : ''}`}
        style={{ left: `${playerX * 100}%` }}
        aria-label={`${settings.stage}단계 미스터 리크`}
      >
        <img src={settings.character} alt="미스터 리크" />
      </div>

      {status !== 'playing' && (
        <section className="game-result" role="dialog" aria-modal="true">
          <h1>{status === 'success' ? '성공!' : '실패'}</h1>
          <p>
            {status === 'success'
              ? '아리수 농도 100%를 달성했어요!'
              : concentration < 0
                ? '아리수 농도가 0% 아래로 떨어졌어요.'
                : '제한 시간 안에 아리수 농도 100%를 달성하지 못했어요.'}
          </p>
          <div>
            <button type="button" onClick={restartGame}>다시 하기</button>
            <button type="button" onClick={() => navigate('/')}>홈으로</button>
          </div>
        </section>
      )}
    </main>
  )
}

export default Game
