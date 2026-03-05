import { useCallback, useEffect, useRef, useState, type ReactNode, createElement } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { AudioHandler } from './AudioHandler'
import { createWidgetSession, WidgetAPIError } from './api'
import type { WidgetState, WidgetSessionResponse } from './types'

const DEFAULT_RINGTONE_URL = 'https://cdn.thunderphone.com/widget/assets/ringtone-default.mp3'

export interface UseThunderPhoneOptions {
  apiKey: string
  agentId: number
  apiBase?: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: { error: string; message: string }) => void
  /**
   * Play a ringtone while connecting. Opt-in — disabled by default.
   * - `true` plays the default ringtone from the ThunderPhone CDN.
   * - A string URL plays a custom audio file.
   * - `false` or omitted disables the ringtone.
   */
  ringtone?: boolean | string
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

/** Resolve the ringtone option to a URL or null. */
function resolveRingtoneUrl(ringtone: boolean | string | undefined): string | null {
  if (ringtone === true || ringtone === 'default') return DEFAULT_RINGTONE_URL
  if (typeof ringtone === 'string' && ringtone.length > 0) return ringtone
  return null
}

export function useThunderPhone(opts: UseThunderPhoneOptions): UseThunderPhoneReturn {
  const [state, setState] = useState<WidgetState>('idle')
  const [session, setSession] = useState<WidgetSessionResponse | null>(null)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // --- Ringtone management ---
  const ringtoneUrl = resolveRingtoneUrl(opts.ringtone)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)

  // Preload the ringtone audio element once when configured.
  useEffect(() => {
    if (!ringtoneUrl) {
      ringtoneRef.current = null
      return
    }
    const audio = new Audio(ringtoneUrl)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 1.0
    ringtoneRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      ringtoneRef.current = null
    }
  }, [ringtoneUrl])

  // Start/stop ringtone based on state.
  useEffect(() => {
    const audio = ringtoneRef.current
    if (!audio) return

    if (state === 'connecting') {
      // Reset to start and play (catch handles browsers that block autoplay
      // before a user gesture — unlikely here since connect() is click-driven).
      audio.currentTime = 0
      audio.volume = 1.0
      audio.play().catch(() => {})
    } else {
      // Fade out briefly (~200ms) for a smooth stop.
      if (!audio.paused) {
        const fadeInterval = setInterval(() => {
          const next = audio.volume - 0.1
          if (next <= 0) {
            clearInterval(fadeInterval)
            audio.pause()
            audio.currentTime = 0
            audio.volume = 1.0
          } else {
            audio.volume = next
          }
        }, 20) // 10 steps * 20ms = 200ms fade
      }
    }
  }, [state])

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
      // Request mic permission in parallel with the API call so the browser
      // permission prompt (if needed) doesn't add latency after the token arrives.
      const [sess] = await Promise.all([
        createWidgetSession(opts.apiKey, opts.agentId, opts.apiBase),
        navigator.mediaDevices.getUserMedia({ audio: true }).then(
          // Release the stream immediately — LiveKitRoom will re-acquire.
          // The permission grant persists for the page lifetime.
          (stream) => { stream.getTracks().forEach((t) => t.stop()) },
          // Mic denial is not fatal here; LiveKitRoom will handle the error.
          () => {},
        ),
      ])
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
