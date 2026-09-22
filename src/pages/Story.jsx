import './Story.scss'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import arisuImage from '../assets/Etc/arisu.png'
import hatchImage from '../assets/Etc/hatch.png'
import sunImage from '../assets/Etc/sun.png'
import sunFaceImage from '../assets/Etc/sunface.png'
import sunFace2Image from '../assets/Etc/sunface2.png'
import sunshineImage from '../assets/Etc/sunshine.png'
import surpriseImage from '../assets/mr.leak/surprise.png'
import thirstImage from '../assets/mr.leak/thirst.png'

const wait = (duration, signal) =>
  new Promise((resolve) => {
    const timeoutId = window.setTimeout(resolve, duration)
    signal.addEventListener('abort', () => window.clearTimeout(timeoutId), {
      once: true,
    })
  })

const animateScroll = (element, destination, duration, signal) =>
  new Promise((resolve) => {
    const start = element.scrollTop
    const distance = destination - start
    const startedAt = performance.now()

    const move = (now) => {
      if (signal.aborted) return

      const progress = Math.min((now - startedAt) / duration, 1)
      const eased = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2

      element.scrollTop = start + distance * eased

      if (progress < 1) {
        requestAnimationFrame(move)
      } else {
        resolve()
      }
    }

    requestAnimationFrame(move)
  })

const dropDelayOrder = [0, 11, 4, 16, 7, 2, 14, 9, 5, 17, 1, 12, 6, 15, 3, 10, 8, 13]

const createDrops = () =>
  dropDelayOrder.map((delayOrder, index) => ({
    id: index,
    left: `${4 + index * (92 / 17)}%`,
    delay: `${delayOrder * 0.105}s`,
  }))

const Story = () => {
  const navigate = useNavigate()
  const viewportRef = useRef(null)
  const storyControllerRef = useRef(null)
  const [isCoverShrinking, setIsCoverShrinking] = useState(false)
  const [isCoverGone, setIsCoverGone] = useState(false)
  const [isSunSpinning, setIsSunSpinning] = useState(false)
  const [isHatchVisible, setIsHatchVisible] = useState(false)
  const [isHatchSpinning, setIsHatchSpinning] = useState(false)
  const [isRaining, setIsRaining] = useState(false)
  const [isSurprised, setIsSurprised] = useState(false)
  const [isGuideVisible, setIsGuideVisible] = useState(false)
  const drops = useMemo(() => createDrops(), [])

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const controller = new AbortController()
    const { signal } = controller
    storyControllerRef.current = controller

    const playStory = async () => {
      const middle = viewport.clientHeight
      const bottom = viewport.scrollHeight - viewport.clientHeight

      viewport.scrollTop = middle
      await wait(350, signal)
      if (signal.aborted) return

      setIsCoverShrinking(true)
      await wait(1450, signal)
      if (signal.aborted) return

      setIsCoverGone(true)
      setIsSunSpinning(true)
      await wait(600, signal)
      if (signal.aborted) return

      await animateScroll(viewport, bottom, 2800, signal)
      await wait(900, signal)
      if (signal.aborted) return

      await animateScroll(viewport, 0, 1500, signal)
      if (signal.aborted) return

      setIsHatchVisible(true)
      await wait(1800, signal)
      if (signal.aborted) return

      setIsHatchSpinning(true)
      await wait(800, signal)
      if (signal.aborted) return

      setIsRaining(true)
      await wait(1100, signal)
      if (signal.aborted) return

      await animateScroll(viewport, bottom, 1500, signal)
      if (signal.aborted) return

      setIsSurprised(true)
      await wait(800, signal)
      if (!signal.aborted) setIsGuideVisible(true)
    }

    playStory()
    return () => {
      controller.abort()
      storyControllerRef.current = null
    }
  }, [])

  const skipStory = () => {
    storyControllerRef.current?.abort()

    const viewport = viewportRef.current
    if (viewport) viewport.scrollTop = viewport.scrollHeight - viewport.clientHeight

    setIsCoverGone(true)
    setIsSunSpinning(true)
    setIsHatchVisible(true)
    setIsHatchSpinning(true)
    setIsRaining(true)
    setIsSurprised(true)
    setIsGuideVisible(true)
  }

  return (
    <main className="story" aria-label="아리수 이야기 자동 재생">
      <div ref={viewportRef} className="story__viewport" aria-live="off">
        <div className="story__world">
          <section className="story__scene story__scene--top">
            <div
              className={`story__hatch${isHatchVisible ? ' story__hatch--visible' : ''}`}
            >
              <div className="story__hatch-bob">
                <img
                  className={isHatchSpinning ? 'story__hatch-image--spin' : ''}
                  src={hatchImage}
                  alt="아리수 캐릭터"
                />
              </div>
            </div>
          </section>

          <section className="story__scene story__scene--middle">
            <div className="story__sun">
              <img
                className={`story__sun-body${isSunSpinning ? ' story__sun-body--spinning' : ''}`}
                src={sunImage}
                alt=""
              />
            </div>
            <img
              className={`story__sun-face${isCoverGone ? ' story__sun-face--visible' : ''}`}
              src={isRaining ? sunFace2Image : sunFaceImage}
              alt="표정이 있는 태양"
            />
          </section>

          <section className="story__scene story__scene--bottom">
            <img
              className="story__mr-leak"
              src={isSurprised ? surpriseImage : thirstImage}
              alt={isSurprised ? '비를 보고 놀란 미스터 리크' : '더위에 지친 미스터 리크'}
            />
          </section>
        </div>
      </div>

      {!isCoverGone && (
        <>
          <div
            className={`story__orange-cover${isCoverShrinking ? ' story__orange-cover--shrinking' : ''}`}
          />
          <img className="story__intro-face" src={sunFaceImage} alt="" />
        </>
      )}

      {isRaining && (
        <div className="story__rain" aria-hidden="true">
          {drops.map((drop) => (
            <img
              key={drop.id}
              src={arisuImage}
              alt=""
              style={{
                '--drop-left': drop.left,
                '--drop-delay': drop.delay,
              }}
            />
          ))}
        </div>
      )}

      {!isGuideVisible && (
        <button className="story__skip" type="button" onClick={skipStory}>
          SKIP →
        </button>
      )}

      {isGuideVisible && (
        <section className="story-guide" aria-labelledby="story-guide-title">
          <h1 id="story-guide-title">게임 방법</h1>

          <div className="story-guide__content">
            <div className="story-guide__row">
              <h2>게임 설명</h2>
              <p>
                목이 너무 마른 미스터 릭을 위해, 아리수의 마스코트인 해치가
                마법을 부려 하늘에서 아리수가 쏟아지기 시작했어요. 미스터
                릭을 조작하여 몸에 좋은 아리수를 최대한 많이 마셔보세요!
              </p>
            </div>

            <div className="story-guide__row">
              <h2>조작 키</h2>
              <div className="story-guide__controls">
                <figure>
                  <div className="story-guide__control-device">
                    <span className="story-guide__control-icon" aria-hidden="true">
                      <span className="story-guide__mouse-control" />
                    </span>
                    <figcaption>PC</figcaption>
                  </div>
                  <span className="story-guide__control-description">마우스 좌우 드래그</span>
                </figure>

                <figure>
                  <div className="story-guide__control-device">
                    <span className="story-guide__control-icon" aria-hidden="true">
                      <span className="story-guide__touch-control">☝</span>
                    </span>
                    <figcaption>모바일</figcaption>
                  </div>
                  <span className="story-guide__control-description">화면 하단 좌우 드래그</span>
                </figure>
              </div>
            </div>

            <div className="story-guide__row">
              <h2>성공 조건</h2>
              <p>
                1분 안에 아리수를 최대한 많이 받아 아리수 농도를 100% 이상으로
                만들면 성공입니다.
                아리수를 마시면 오른쪽에 나타나는 다양한 설명들도 읽어보세요~
              </p>
            </div>

            <div className="story-guide__row">
              <h2>유의사항</h2>
              <div>
                <p>
                  아리수가 아닌 햇빛을 받아버리면 아리수 농도가 크게 떨어지니
                  주의하세요! 아리수를 마셔 미스터 릭의 상태가 나아질수록, 난이도는 점점 어려워집니다.
                </p>
                <div className="story-guide__legend" aria-label="게임 아이템 안내">
                  <figure>
                    <img src={sunshineImage} alt="햇빛" />
                    <figcaption>햇빛</figcaption>
                  </figure>
                  <figure>
                    <img src={arisuImage} alt="아리수" />
                    <figcaption>아리수</figcaption>
                  </figure>
                </div>
              </div>
            </div>
          </div>

          <div className="story-guide__actions">
            <button type="button" onClick={() => navigate('/')}>돌아가기</button>
            <button type="button" onClick={() => navigate('/game')}>게임 시작</button>
          </div>
        </section>
      )}
    </main>
  )
}

export default Story
