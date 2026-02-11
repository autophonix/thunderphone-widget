import { useCallback, useState, type ReactNode, createElement } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { AudioHandler } from './AudioHandler'
import { createWidgetSession, WidgetAPIError } from './api'
import type { WidgetState, WidgetSessionResponse } from './types'

export interface UseThunderPhoneOptions {
  apiKey: string
  agentId: number
  apiBase?: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: { error: string; message: string }) => void
}

export interface UseThunderPhoneReturn {
  state: WidgetState
  connect: () => void
  disconnect: () => void
  toggleMute: () => void
  isMuted: boolean
  error: string | undefined
  agentName: string | undefined
  /** Render this somewhere in your tree — it's invisible but handles audio. */
  audio: ReactNode
}

export function useThunderPhone(opts: UseThunderPhoneOptions): UseThunderPhoneReturn {
  const [state, setState] = useState<WidgetState>('idle')
  const [session, setSession] = useState<WidgetSessionResponse | null>(null)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const handleDisconnect = useCallback(() => {
    setState('disconnected')
    setSession(null)
    setMuted(false)
    opts.onDisconnect?.()
    setTimeout(() => setState('idle'), 1500)
  }, [opts.onDisconnect])

  const handleAgentConnected = useCallback(() => {
    setState('connected')
    opts.onConnect?.()
  }, [opts.onConnect])

  const connect = useCallback(async () => {
    if (state === 'connecting' || state === 'connected') return
    setState('connecting')
    setError(undefined)
    try {
      const sess = await createWidgetSession(opts.apiKey, opts.agentId, opts.apiBase)
      setSession(sess)
    } catch (err) {
      setState('error')
      if (err instanceof WidgetAPIError) {
        setError(err.message)
        opts.onError?.({ error: err.code, message: err.message })
      } else {
        setError('Unable to connect.')
        opts.onError?.({ error: 'unknown', message: 'Unable to connect.' })
      }
    }
  }, [opts.apiKey, opts.agentId, opts.apiBase, state, opts.onError])

  const disconnect = useCallback(() => {
    handleDisconnect()
  }, [handleDisconnect])

  const toggleMute = useCallback(() => setMuted(m => !m), [])

  const audio: ReactNode = session
    ? createElement(
        LiveKitRoom,
        {
          token: session.token,
          serverUrl: session.server_url,
          audio: !muted,
          video: false,
          connect: true,
        },
        createElement(AudioHandler, {
          onAgentConnected: handleAgentConnected,
          onDisconnected: handleDisconnect,
        }),
      )
    : null

  return {
    state,
    connect,
    disconnect,
    toggleMute,
    isMuted: muted,
    error,
    agentName: session?.agent_name,
    audio,
  }
}
