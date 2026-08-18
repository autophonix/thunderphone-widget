import { useCallback, useEffect, useRef, useState, type ReactNode, createElement } from 'react'
import { LiveKitRoom } from '@livekit/components-react'
import { AudioHandler } from './AudioHandler'
import { createWidgetSession, WidgetAPIError } from './api'
import type { WidgetAnalyticsContext, WidgetState, WidgetSessionResponse } from './types'

const DEFAULT_RINGTONE_URL = 'https://cdn.thunderphone.com/widget/assets/ringtone-default.mp3'

export interface UseThunderPhoneOptions {
  publishableKey: string
  apiBase?: string
  /** Optional per-session language code or locale, e.g. "en", "es", or "fr-FR". */
  language?: string
  /** Optional per-session voice name, e.g. "maria". */
  voice?: string
  /** Optional per-session factual website/page context. */
  context?: string
  /**
   * Called when a call starts; return the visitor's current analytics
   * identifiers so the platform can join the call to the visitor's
   * analytics session. A function (not static values) because replay URLs
   * and distinct ids typically arrive after mount.
   */
  analytics?: () => WidgetAnalyticsContext | undefined
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
  /** 0–1 audio level (static snapshot, for convenience). */
  audioLevel: number
  /** Mutable ref with real-time 0–1 audio level. Read from rAF loops for smooth animation. */
  audioLevelRef: React.RefObject<number>
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
  const audioLevelRef = useRef(0)
  const setAudioLevel = useCallback((v: number) => { audioLevelRef.current = v }, [])

  // --- Warm-mic management ---
  // The stream acquired at connect() is held (not stopped) until the call
  // leaves 'connecting'. Releasing it immediately would let the OS drop the
  // audio device out of communications mode, and LiveKit's own capture at
  // room connect would re-engage it — an audible output dropout mid-call-
  // setup (a long one on Bluetooth headsets, which switch profiles). Holding
  // the stream keeps the device mode engaged so LiveKit's capture is silent.
  const warmMicRef = useRef<MediaStream | null>(null)
  const stateRef = useRef<WidgetState>('idle')

  useEffect(() => {
    stateRef.current = state
  }, [state])

  const releaseWarmMic = useCallback(() => {
    const stream = warmMicRef.current
    if (!stream) return
    warmMicRef.current = null
    stream.getTracks().forEach((t) => t.stop())
  }, [])

  // Release once connected (LiveKit has its own capture by then), on
  // error/disconnect (never hold the mic outside a connection attempt),
  // and on unmount.
  useEffect(() => {
    if (state !== 'connecting') releaseWarmMic()
  }, [state, releaseWarmMic])

  useEffect(() => releaseWarmMic, [releaseWarmMic])

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
    // needed) overlaps with the API call, and HOLD the stream until the call
    // leaves 'connecting' (see warm-mic management above) so the audio
    // device is already in communications mode when LiveKit captures.
    navigator.mediaDevices.getUserMedia({ audio: true }).then(
      (stream) => {
        // The attempt may already be over (fast error path, user hung up).
        if (stateRef.current !== 'connecting') {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        releaseWarmMic()
        warmMicRef.current = stream
      },
      () => {},
    )

    try {
      const analyticsContext = opts.analytics?.()
      const sess = await createWidgetSession(opts.publishableKey, opts.apiBase, {
        language: opts.language,
        voice: opts.voice,
        context: opts.context,
        analyticsDistinctId: analyticsContext?.distinctId,
        analyticsReplayUrl: analyticsContext?.replaySessionUrl,
      })
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
  }, [opts.publishableKey, opts.apiBase, opts.language, opts.voice, opts.context, opts.analytics, state, opts.onError, releaseWarmMic])

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
          muted,
          onAudioLevel: setAudioLevel,
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
    audioLevel: 0, // deprecated — use audioLevelRef for real-time reads
    audioLevelRef,
    audio,
  }
}
