export interface WidgetSessionResponse {
  call_id: number
  token: string
  room_name: string
  server_url: string
  agent_name: string
}

export interface WidgetError {
  error: string
  message: string
}

export type WidgetState = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'

export interface ThunderPhoneWidgetProps {
  apiKey: string
  agentId: number
  apiBase?: string
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: WidgetError) => void
  className?: string
  /**
   * Play a ringtone while connecting. Opt-in — disabled by default.
   * - `true` plays the default ringtone from the ThunderPhone CDN.
   * - A string URL plays a custom audio file.
   * - `false` or omitted disables the ringtone.
   */
  ringtone?: boolean | string
}
