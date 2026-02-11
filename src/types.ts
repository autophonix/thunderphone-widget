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
}
