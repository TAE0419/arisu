import './Game.scss'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import arisuInfo from '../data/ArisuInfo.json'
import arisuImage from '../assets/Etc/arisu.png'
import sunshineImage from '../assets/Etc/sunshine.png'
import firstImage from '../assets/mr.leak/first.png'
import secondImage from '../assets/mr.leak/second.png'
import thirdImage from '../assets/mr.leak/third.png'
import successBackground from '../assets/background/success.png'
import failBackground from '../assets/background/fail.png'
import successCharacter from '../assets/mr.leak/success.png'
import failCharacter from '../assets/mr.leak/fail.png'

const GAME_DURATION = 60_000
const INITIAL_CONCENTRATION = 10

const getStageSettings = (concentration) => {
  if (concentration >= 70) {
    return { stage: 3, character: thirdImage, waterChance: 0.55, speed: 420, spawnEvery: 360, extraSunshine: 1, bonusSunshineChance: 0.2 }
  }

  if (concentration >= 30) {
    return { stage: 2, character: secondImage, waterChance: 0.65, speed: 290, spawnEvery: 520, extraSunshine: 0, bonusSunshineChance: 0.75 }
  }

  return { stage: 1, character: firstImage, waterChance: 0.72, speed: 180, spawnEvery: 700, extraSunshine: 0, bonusSunshineChance: 0.35 }
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
  const progressRef = useRef(null)
  const animationRef = useRef(0)
  const lastFrameRef = useRef(0)
  const displayedSecondRef = useRef(Math.ceil(GAME_DURATION / 1000))
  const lastSpawnRef = useRef(0)
  const itemIdRef = useRef(0)
  const spawnQueueRef = useRef([])
  const lastReleasedAtRef = useRef(0)
  const lastSpawnXRef = useRef({ water: -1, sunshine: -1 })
  const noticeIdRef = useRef(0)
  const concentrationRef = useRef(INITIAL_CONCENTRATION)
  const elapsedRef = useRef(0)
  const statusRef = useRef('playing')
  const isQuitConfirmRef = useRef(false)
  const pauseStartedAtRef = useRef(0)
  const pausedDurationRef = useRef(0)
  const playerXRef = useRef(0.5)
  const facingRightRef = useRef(false)
  const itemsRef = useRef([])
  const noticesRef = useRef([])
  const pendingNoticesRef = useRef([])
  const drainNoticeQueueRef = useRef(() => {})
  const noticeTimeoutsRef = useRef(new Set())
  const resultAssetsReadyRef = useRef(Promise.resolve())
  const resultImagesRef = useRef([])

  const [concentration, setConcentration] = useState(INITIAL_CONCENTRATION)
  const [remainingTime, setRemainingTime] = useState(GAME_DURATION)
  const [items, setItems] = useState([])
  const [notices, setNotices] = useState([])
  const [isFacingRight, setIsFacingRight] = useState(false)
  const [isQuitConfirmVisible, setIsQuitConfirmVisible] = useState(false)

  const settings = getStageSettings(concentration)

  useEffect(() => {
    const sources = [
      successBackground,
      failBackground,
      successCharacter,
      failCharacter,
    ]
    const images = sources.map((source) => {
      const image = new Image()
      image.decoding = 'async'
      image.fetchPriority = 'high'
      image.src = source
      return image
    })

    resultImagesRef.current = images
    resultAssetsReadyRef.current = Promise.allSettled(
      images.map((image) => image.decode?.() ?? Promise.resolve()),
    )

    return () => {
      resultImagesRef.current = []
    }
  }, [])

  const finishGame = useCallback(async (result) => {
    if (statusRef.current !== 'playing') return

    statusRef.current = result
    cancelAnimationFrame(animationRef.current)
    await resultAssetsReadyRef.current
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

      if (isQuitConfirmRef.current) {
        lastFrameRef.current = now
        animationRef.current = requestAnimationFrame(runGame)
        return
      }

      const arena = arenaRef.current
      if (!arena) return

      const elapsed = now - startedAt - pausedDurationRef.current
      elapsedRef.current = Math.min(elapsed, GAME_DURATION)
      const remaining = Math.max(0, GAME_DURATION - elapsed)
      const deltaSeconds = Math.min((now - lastFrameRef.current) / 1000, 0.05)
      const currentSettings = getStageSettings(concentrationRef.current)
      const arenaHeight = arena.clientHeight
      const arenaBounds = arena.getBoundingClientRect()
      const playerBounds = playerRef.current?.getBoundingClientRect()

      lastFrameRef.current = now

      const displayedSecond = Math.ceil(remaining / 1000)
      if (displayedSecond !== displayedSecondRef.current) {
        displayedSecondRef.current = displayedSecond
        setRemainingTime(remaining)
      }
      if (progressRef.current) {
        progressRef.current.style.transform = `scaleX(${elapsedRef.current / GAME_DURATION})`
      }

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
              updateConcentration(-5)
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
    if (
      statusRef.current !== 'playing'
      || isQuitConfirmRef.current
      || !arenaRef.current
    ) return

    const bounds = arenaRef.current.getBoundingClientRect()
    const nextX = Math.min(0.94, Math.max(0.06, (clientX - bounds.left) / bounds.width))
    if (nextX !== playerXRef.current) {
      const nextFacingRight = nextX > playerXRef.current
      if (nextFacingRight !== facingRightRef.current) {
        facingRightRef.current = nextFacingRight
        setIsFacingRight(nextFacingRight)
      }
    }
    playerXRef.current = nextX
    playerRef.current.style.left = `${nextX * 100}%`
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

  const openQuitConfirm = () => {
    if (isQuitConfirmRef.current) return
    isQuitConfirmRef.current = true
    pauseStartedAtRef.current = performance.now()
    setIsQuitConfirmVisible(true)
  }

  const closeQuitConfirm = () => {
    pausedDurationRef.current += performance.now() - pauseStartedAtRef.current
    pauseStartedAtRef.current = 0
    isQuitConfirmRef.current = false
    setIsQuitConfirmVisible(false)
  }

  return (
    <main
      ref={arenaRef}
      className={`game-page${isQuitConfirmVisible ? ' game-page--confirming-quit' : ''}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onTouchStart={handleTouchMove}
      onTouchMove={handleTouchMove}
    >
      <header className="game-hud">
        <div className="game-hud__time-row">
          <div className="game-hud__track" aria-label="경과 시간">
            <span ref={progressRef} />
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
            style={{ left: `${item.x * 100}%`, transform: `translate3d(-50%, ${item.y}px, 0)` }}
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

      <button
        className="game-quit"
        type="button"
        onPointerDown={(event) => event.stopPropagation()}
        onPointerMove={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        onTouchMove={(event) => event.stopPropagation()}
        onClick={openQuitConfirm}
      >
        그만두기 →
      </button>

      {isQuitConfirmVisible && (
        <section
          className="game-quit-confirm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="game-quit-confirm-title"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.stopPropagation()}
          onTouchStart={(event) => event.stopPropagation()}
          onTouchMove={(event) => event.stopPropagation()}
        >
          <p id="game-quit-confirm-title">정말 게임을 그만두시겠어요?</p>
          <div>
            <button type="button" className="game-quit-confirm__yes" onClick={() => navigate('/')}>
              예
            </button>
            <button type="button" className="game-quit-confirm__no" onClick={closeQuitConfirm}>
              아니오
            </button>
          </div>
        </section>
      )}

      <div
        ref={playerRef}
        className={`game-player${isFacingRight ? ' game-player--right' : ''}`}
        style={{ left: '50%' }}
        aria-label={`${settings.stage}단계 미스터 리크`}
      >
        <img src={settings.character} alt="미스터 리크" />
      </div>

    </main>
  )
}

export default Game
