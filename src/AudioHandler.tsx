import { useEffect, useRef } from 'react'
import { useRoomContext } from '@livekit/components-react'
import { RoomEvent, Track, type RemoteTrackPublication, type RemoteParticipant } from 'livekit-client'

interface AudioHandlerProps {
  onAgentConnected: () => void
  onDisconnected: () => void
}

export function AudioHandler({ onAgentConnected, onDisconnected }: AudioHandlerProps) {
  const room = useRoomContext()
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (room.remoteParticipants.size > 0) {
      onAgentConnected()
    }

    const handleParticipantConnected = () => onAgentConnected()
    const handleDisconnect = () => onDisconnected()

    // The bot publishes multiple audio tracks (tts, bg noise, hold music).
    // Add each track to a single MediaStream so the browser mixes them.
    const attachTrack = (
      track: { kind: Track.Kind; mediaStreamTrack: MediaStreamTrack },
      _pub: RemoteTrackPublication,
      _participant: RemoteParticipant,
    ) => {
      if (track.kind === Track.Kind.Audio && audioRef.current) {
        const existing = audioRef.current.srcObject as MediaStream | null
        if (existing) {
          existing.addTrack(track.mediaStreamTrack)
        } else {
          audioRef.current.srcObject = new MediaStream([track.mediaStreamTrack])
          audioRef.current.play().catch(() => {})
        }
      }
    }

    room.on(RoomEvent.ParticipantConnected, handleParticipantConnected)
    room.on(RoomEvent.Disconnected, handleDisconnect)
    room.on(RoomEvent.TrackSubscribed, attachTrack)

    const initialTracks: MediaStreamTrack[] = []
    for (const participant of room.remoteParticipants.values()) {
      for (const pub of participant.trackPublications.values()) {
        if (pub.track && pub.isSubscribed && pub.track.kind === Track.Kind.Audio) {
          initialTracks.push(pub.track.mediaStreamTrack)
        }
      }
    }
    if (initialTracks.length > 0 && audioRef.current) {
      audioRef.current.srcObject = new MediaStream(initialTracks)
      audioRef.current.play().catch(() => {})
    }

    return () => {
      room.off(RoomEvent.ParticipantConnected, handleParticipantConnected)
      room.off(RoomEvent.Disconnected, handleDisconnect)
      room.off(RoomEvent.TrackSubscribed, attachTrack)
    }
  }, [room, onAgentConnected, onDisconnected])

  return <audio ref={audioRef} autoPlay />
}
