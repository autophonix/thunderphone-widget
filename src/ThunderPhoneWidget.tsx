import { useCallback, useState } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { AudioHandler } from './AudioHandler'
import { WidgetButton } from './WidgetButton'
import { WidgetStatus } from './WidgetStatus'
import { createWidgetSession, WidgetAPIError } from './api'
import type { ThunderPhoneWidgetProps, WidgetState, WidgetSessionResponse } from './types'

export function ThunderPhoneWidget({
  apiKey,
  agentId,
  apiBase,
  onConnect,
  onDisconnect,
  onError,
  className,
}: ThunderPhoneWidgetProps) {
  const [state, setState] = useState<WidgetState>('idle')
  const [session, setSession] = useState<WidgetSessionResponse | null>(null)
  const [muted, setMuted] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | undefined>()

  const handleConnect = useCallback(async () => {
    if (state === 'connecting' || state === 'connected') return
    setState('connecting')
    setErrorMessage(undefined)
    try {
      const sess = await createWidgetSession(apiKey, agentId, apiBase)
      setSession(sess)
    } catch (err) {
      setState('error')
      if (err instanceof WidgetAPIError) {
        setErrorMessage(err.message)
        onError?.({ error: err.code, message: err.message })
      } else {
        setErrorMessage('Unable to connect.')
        onError?.({ error: 'unknown', message: 'Unable to connect.' })
      }
    }
  }, [apiKey, agentId, apiBase, state, onError])

  const handleDisconnect = useCallback(() => {
    setState('disconnected')
    setSession(null)
    setMuted(false)
    onDisconnect?.()
    setTimeout(() => setState('idle'), 1500)
  }, [onDisconnect])

  const handleAgentConnected = useCallback(() => {
    setState('connected')
    onConnect?.()
  }, [onConnect])

  const handleClick = () => {
    if (state === 'connected') {
      handleDisconnect()
    } else if (state === 'idle' || state === 'error' || state === 'disconnected') {
      handleConnect()
    }
  }

  const handleMuteToggle = useCallback(() => {
    setMuted(m => !m)
  }, [])

  return (
    <div className={`tp-widget ${className || ''}`}>
      <WidgetStatus
        state={state}
        agentName={session?.agent_name || null}
        errorMessage={errorMessage}
      />
      <WidgetButton
        state={state}
        muted={muted}
        onClick={handleClick}
        onMuteToggle={handleMuteToggle}
      />
      {session && (
        <LiveKitRoom
          token={session.token}
          serverUrl={session.server_url}
          audio={!muted}
          video={false}
          connect={true}
        >
          <AudioHandler
            onAgentConnected={handleAgentConnected}
            onDisconnected={handleDisconnect}
          />
        </LiveKitRoom>
      )}
    </div>
  )
}
