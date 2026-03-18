import { useCallback, useEffect, useRef, useState, type ReactNode, createElement } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { AudioHandler } from './AudioHandler'
import { createWidgetSession, WidgetAPIError } from './api'
import type { WidgetState, WidgetSessionResponse } from './types'

const DEFAULT_RINGTONE_URL = 'https://storage.googleapis.com/thunderphone-widget-cdn/widget/assets/ringtone-default.mp3'

export interface UseThunderPhoneOptions {
  publishableKey: string
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

/** Fade out an audio element over ~200ms, then pause and reset it. */
function fadeOutAndStop(audio: HTMLAudioElement) {
  if (audio.paused) return
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
  }, 20) // 10 steps × 20ms = 200ms fade
  // Return the interval ID so callers can cancel if needed.
  return fadeInterval
}

export function useThunderPhone(opts: UseThunderPhoneOptions): UseThunderPhoneReturn {
  const [state, setState] = useState<WidgetState>('idle')
  const [session, setSession] = useState<WidgetSessionResponse | null>(null)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState<string | undefined>()

  // --- Ringtone management ---
  const ringtoneUrl = resolveRingtoneUrl(opts.ringtone)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null)
  const fadeRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined)

  // Preload the ringtone audio element once when configured.
  useEffect(() => {
    if (!ringtoneUrl) {
      ringtoneRef.current = null
      return
    }
    const audio = new Audio()
    audio.crossOrigin = 'anonymous'
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 1.0
    audio.src = ringtoneUrl
    ringtoneRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
      ringtoneRef.current = null
    }
  }, [ringtoneUrl])

  // Stop ringtone when leaving the 'connecting' state.
  // Starting the ringtone is done synchronously inside connect() so it
  // executes within the user-gesture call stack (required by browsers).
  useEffect(() => {
    if (state !== 'connecting') {
      const audio = ringtoneRef.current
      if (audio && !audio.paused) {
        // Cancel any previous fade that's still running.
        if (fadeRef.current) clearInterval(fadeRef.current)
        fadeRef.current = fadeOutAndStop(audio)
      }
    }

    return () => {
      if (fadeRef.current) {
        clearInterval(fadeRef.current)
        fadeRef.current = undefined
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

    // Start ringtone immediately — this MUST happen synchronously within
    // the user-gesture (click) call stack or the browser will block it.
    const ringtoneAudio = ringtoneRef.current
    if (ringtoneAudio) {
      // Cancel any lingering fade from a previous attempt.
      if (fadeRef.current) {
        clearInterval(fadeRef.current)
        fadeRef.current = undefined
      }
      ringtoneAudio.currentTime = 0
      ringtoneAudio.volume = 1.0
      ringtoneAudio.play().catch(() => {})
    }

    // Warm up mic permission in the background so the browser prompt (if
    // needed) overlaps with the API call.  This is fire-and-forget: if the
    // session request fails we simply discard the stream without the user
    // noticing an unnecessary permission prompt — getUserMedia only shows
    // the prompt once per origin, so subsequent calls are instant.
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (stream) => { stream.getTracks().forEach((t) => t.stop()) },
      () => {},
    )

    try {
      const sess = await createWidgetSession(opts.publishableKey, opts.apiBase)
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
  }, [opts.publishableKey, opts.apiBase, state, opts.onError])

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
