import { WidgetButton } from './WidgetButton'
import { WidgetStatus } from './WidgetStatus'
import { useThunderPhone } from './useThunderPhone'
import type { ThunderPhoneWidgetProps } from './types'

export function ThunderPhoneWidget({
  apiKey,
  agentId,
  apiBase,
  onConnect,
  onDisconnect,
  onError,
  className,
}: ThunderPhoneWidgetProps) {
  const phone = useThunderPhone({ apiKey, agentId, apiBase, onConnect, onDisconnect, onError })

  const handleClick = () => {
    if (phone.state === 'connected') {
      phone.disconnect()
    } else if (phone.state === 'idle' || phone.state === 'error' || phone.state === 'disconnected') {
      phone.connect()
    }
  }

  return (
    <div className={`tp-widget ${className || ''}`}>
      <WidgetStatus
        state={phone.state}
        agentName={phone.agentName || null}
        errorMessage={phone.error}
      />
      <WidgetButton
        state={phone.state}
        muted={phone.isMuted}
        onClick={handleClick}
        onMuteToggle={phone.toggleMute}
      />
      {phone.audio}
    </div>
  )
}
