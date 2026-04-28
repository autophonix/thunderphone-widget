import { useEffect, useRef, useCallback } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent, Track, type RemoteTrackPublication, type RemoteParticipant } from 'livekit-client'

interface AudioHandlerProps {
  onAgentConnected: () => void
  onDisconnected: () => void
  muted: boolean
  /** Called ~60 times/sec with a 0–1 audio level (max of local + remote). */
  onAudioLevel?: (level: number) => void
}

interface AnalyserHandle {
  ctx: AudioContext
  remoteAnalyser: AnalyserNode
  remoteSource: MediaStreamAudioSourceNode | null
  localAnalyser: AnalyserNode | null
  localSource: MediaStreamAudioSourceNode | null
  raf: number
}

export function AudioHandler({ onAgentConnected, onDisconnected, muted, onAudioLevel }: AudioHandlerProps) {
  const room = useRoomContext()
  const audioRef = useRef<HTMLAudioElement>(null)
  const handleRef = useRef<AnalyserHandle | null>(null)

  // Toggle local microphone when muted state changes
  useEffect(() => {
    room.localParticipant.setMicrophoneEnabled(!muted).catch(() => {})
  }, [muted, room])

  // Wire up the local mic analyser once the mic track is published
  const wireLocalMic = useCallback(() => {
    const h = handleRef.current
    if (!h || h.localAnalyser) return // already wired or no handle yet

    const micPub = room.localParticipant.getTrackPublication(Track.Source.Microphone)
    const micTrack = micPub?.track?.mediaStreamTrack
    if (!micTrack) return

    try {
      const stream = new MediaStream([micTrack])
      const source = h.ctx.createMediaStreamSource(stream)
      const analyser = h.ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.4
      source.connect(analyser)
      h.localAnalyser = analyser
      h.localSource = source
    } catch {
      // ignore
    }
  }, [room])

  // Start the combined analyser (remote + local) tick loop
  const startAnalyser = useCallback((remoteStream: MediaStream) => {
    if (!onAudioLevel) return
    if (handleRef.current) return

    try {
      const ctx = new AudioContext()
      const remoteSource = ctx.createMediaStreamSource(remoteStream)
      const remoteAnalyser = ctx.createAnalyser()
      remoteAnalyser.fftSize = 256
      remoteAnalyser.smoothingTimeConstant = 0.5
      remoteSource.connect(remoteAnalyser)

      const remoteData = new Uint8Array(remoteAnalyser.frequencyBinCount)
      const localData = new Uint8Array(remoteAnalyser.frequencyBinCount)

      const getLevel = (analyser: AnalyserNode, buf: Uint8Array): number => {
        analyser.getByteFrequencyData(buf)
        const bins = Math.min(24, buf.length)
        let sum = 0
        for (let i = 0; i < bins; i++) sum += buf[i]
        return sum / bins / 255
      }

      const h: AnalyserHandle = { ctx, remoteAnalyser, remoteSource, localAnalyser: null, localSource: null, raf: 0 }
      handleRef.current = h

      const tick = () => {
        const remoteLevel = getLevel(h.remoteAnalyser, remoteData)
        const localLevel = h.localAnalyser ? getLevel(h.localAnalyser, localData) : 0
        onAudioLevel(Math.max(remoteLevel, localLevel))
        h.raf = requestAnimationFrame(tick)
      }
      h.raf = requestAnimationFrame(tick)

      // Try to wire local mic immediately (may not be published yet)
      wireLocalMic()
    } catch {
      // degrade gracefully
    }
  }, [onAudioLevel, wireLocalMic])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const h = handleRef.current
      if (h) {
        cancelAnimationFrame(h.raf)
        h.ctx.close().catch(() => {})
        handleRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let didSignalConnected = false
    const signalConnected = () => {
      if (didSignalConnected) return
      didSignalConnected = true
      onAgentConnected()
    }

    if (room.remoteParticipants.size > 0) signalConnected()

    const handleParticipantConnected = () => signalConnected()
    const handleDisconnect = () => onDisconnected()

    // When the local mic track is published, wire the local analyser
    const handleLocalTrackPublished = () => wireLocalMic()

    const attachTrack = (
      track: { kind: Track.Kind; mediaStreamTrack: MediaStreamTrack },
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) => {
      if (track.kind !== Track.Kind.Audio || !audioRef.current) return

      // Playback via <audio> element
      const existing = audioRef.current.srcObject as MediaStream | null
      if (existing) {
        existing.addTrack(track.mediaStreamTrack)
      } else {
        const stream = new MediaStream([track.mediaStreamTrack])
        audioRef.current.srcObject = stream
        audioRef.current.play().catch(() => {})
        // Start the analyser with this first remote stream
        startAnalyser(new MediaStream([track.mediaStreamTrack]))
      }

      signalConnected()
    }

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.Disconnected, handleDisconnect)
    room.on(RoomEvent.TrackSubscribed, attachTrack)
    room.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)

    // Handle already-subscribed tracks
    const initialTracks: MediaStreamTrack[] = []
    for (const p of room.remoteParticipants.values()) {
      for (const pub of p.trackPublications.values()) {
        if (pub.track && pub.isSubscribed && pub.track.kind === Track.Kind.Audio) {
          initialTracks.push(pub.track.mediaStreamTrack)
        }
      }
    }
    if (initialTracks.length > 0) {
      if (audioRef.current) {
        audioRef.current.srcObject = new MediaStream(initialTracks)
        audioRef.current.play().catch(() => {})
      }
      startAnalyser(new MediaStream(initialTracks))
      signalConnected()
    }

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.Disconnected, handleDisconnect)
      room.off(RoomEvent.TrackSubscribed, attachTrack)
      room.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished)
    }
  }, [room, onAgentConnected, onDisconnected, startAnalyser, wireLocalMic])

  return <audio ref={audioRef} autoPlay />
}
