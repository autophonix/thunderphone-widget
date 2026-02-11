import { useEffect, useState } from 'react'
import type { WidgetState } from './types'

interface WidgetStatusProps {
  state: WidgetState
  agentName: string | null
  errorMessage?: string
}

export function WidgetStatus({ state, agentName, errorMessage }: WidgetStatusProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (state !== 'connected') {
      setElapsed(0)
      return
    }
    const interval = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [state])

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const statusText: Record<WidgetState, string> = {
    idle: 'Ready',
    connecting: 'Connecting...',
    connected: formatTime(elapsed),
    disconnected: 'Disconnected',
    error: 'Unable to connect',
  }

  return (
    <div className="tp-status">
      {agentName && <div className="tp-status__name">{agentName}</div>}
      <div className={`tp-status__text tp-status--${state}`}>
        {state === 'connected' && <span className="tp-status__dot" />}
        {errorMessage && state === 'error' ? errorMessage : statusText[state]}
      </div>
    </div>
  )
}
