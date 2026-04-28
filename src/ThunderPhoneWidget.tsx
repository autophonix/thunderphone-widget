import { WidgetButton } from './WidgetButton'
import { WidgetStatus } from './WidgetStatus'
import { Waveform } from './Waveform'
import { useThunderPhone } from './useThunderPhone'
import type { ThunderPhoneWidgetProps, WidgetPosition } from './types'

const MicIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
    <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
    <line x1="12" y1="18" x2="12" y2="22" />
    <line x1="8" y1="22" x2="16" y2="22" />
  </svg>
)

function posStyle(p: WidgetPosition): React.CSSProperties {
  const base: React.CSSProperties = { position: 'fixed', zIndex: 9999 }
  switch (p) {
    case 'bottom-right': return { ...base, bottom: 20, right: 20 }
    case 'bottom-left':  return { ...base, bottom: 20, left: 20 }
    case 'top-right':    return { ...base, top: 20, right: 20 }
    case 'top-left':     return { ...base, top: 20, left: 20 }
  }
}

export function ThunderPhoneWidget({
  publishableKey, apiBase, onConnect, onDisconnect, onError,
  className, ringtone,
  position = 'bottom-right',
  primaryColor,
  title = 'Voice assistant',
  theme = 'light',
}: ThunderPhoneWidgetProps) {
  const resolvedColor = primaryColor ?? (theme === 'dark' ? '#ffffff' : '#000000')

  // Determine if accent is light or dark so we can pick a contrasting icon color
  const isLightAccent = (() => {
    const hex = resolvedColor.replace('#', '')
    if (hex.length < 6) return false
    const r = parseInt(hex.slice(0, 2), 16)
    const g = parseInt(hex.slice(2, 4), 16)
    const b = parseInt(hex.slice(4, 6), 16)
    // Relative luminance formula
    return (r * 299 + g * 587 + b * 114) / 1000 > 150
  })()
  const startIconColor = isLightAccent ? '#000' : '#fff'
  const phone = useThunderPhone({ publishableKey, apiBase, onConnect, onDisconnect, onError, ringtone })
  const levelRef = phone.audioLevelRef

  const act = () => {
    if (phone.state === 'connected') phone.disconnect()
    else if (phone.state === 'idle' || phone.state === 'error' || phone.state === 'disconnected') phone.connect()
  }

  const live = phone.state === 'connecting' || phone.state === 'connected'
  const vars = { '--tp-accent': resolvedColor } as React.CSSProperties

  return (
    <div
      className={`tp-widget tp--${theme} ${className || ''}`}
      style={{ ...posStyle(position), ...vars }}
    >
      <div className="tp-bar">
        {/* Left: waveform or connecting dot */}
        {phone.state === 'connected' && <Waveform levelRef={levelRef} />}
        {phone.state === 'connecting' && <span className="tp-dot" />}
        {!live && <Waveform />}

        {/* Center: text */}
        <div className="tp-meta">
          <span className="tp-name">{live ? (phone.agentName || title) : title}</span>
          {live ? (
            <WidgetStatus state={phone.state} agentName={null} errorMessage={phone.error} />
          ) : (
            <span className="tp-sub">Available now</span>
          )}
        </div>

        {/* Right: controls */}
        {live ? (
          <WidgetButton state={phone.state} muted={phone.isMuted} onClick={act} onMuteToggle={phone.toggleMute} />
        ) : (
          <button className="tp-start" onClick={act} type="button" aria-label="Start call" style={{ color: startIconColor }}>
            <MicIcon size={16} />
          </button>
        )}
      </div>
      {phone.audio}
    </div>
  )
}
