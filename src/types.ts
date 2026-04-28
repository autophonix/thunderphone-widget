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

export type WidgetPosition = 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'

export type WidgetTheme = 'light' | 'dark'

export interface ThunderPhoneWidgetProps {
  publishableKey: string
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
  /**
   * Fixed position on the viewport. Defaults to `'bottom-right'`.
   */
  position?: WidgetPosition
  /**
   * Primary accent color for the widget. Any valid CSS color.
   * Defaults to `'#6366f1'` (indigo).
   */
  primaryColor?: string
  /**
   * Title text shown in the widget. Defaults to `'Voice assistant'`.
   */
  title?: string
  /**
   * Color theme. `'light'` (default) or `'dark'`.
   */
  theme?: WidgetTheme
}
