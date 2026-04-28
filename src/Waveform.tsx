import { useEffect, useRef, type RefObject } from 'react'

interface WaveformProps {
  /**
   * Mutable ref with 0–1 audio level. When provided, the waveform is
   * audio-reactive (bars driven by rAF reading from the ref).
   * When omitted, shows a slow idle breathing animation via CSS.
   */
  levelRef?: RefObject<number>
}

const BAR_COUNT = 5

export function Waveform({ levelRef }: WaveformProps) {
  const barsRef = useRef<(HTMLSpanElement | null)[]>([])
  const rafRef = useRef<number>(0)
  const noiseRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => Math.random()))

  // Active mode: own rAF loop reads from levelRef and sets bar transforms directly
  useEffect(() => {
    if (!levelRef) return

    let noiseCounter = 0
    const tick = () => {
      const level = levelRef.current
      const bars = barsRef.current
      const noise = noiseRef.current

      // Reshuffle noise every ~8 frames so bars vary organically
      noiseCounter++
      if (noiseCounter % 8 === 0) {
        for (let i = 0; i < BAR_COUNT; i++) {
          noise[i] = 0.3 + Math.random() * 0.7
        }
      }

      for (let i = 0; i < BAR_COUNT; i++) {
        const bar = bars[i]
        if (!bar) continue
        const barLevel = Math.max(0.12, level * noise[i])
        bar.style.transform = `scaleY(${barLevel})`
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [levelRef])

  const isIdle = !levelRef

  return (
    <div className={`tp-wave ${isIdle ? 'tp-wave--idle' : ''}`} aria-hidden="true">
      {Array.from({ length: BAR_COUNT }, (_, i) => (
        <span
          key={i}
          ref={(el) => { barsRef.current[i] = el }}
          style={isIdle ? { transform: 'scaleY(0.2)' } : { transform: 'scaleY(0.12)' }}
        />
      ))}
    </div>
  )
}
