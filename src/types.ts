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

export interface WidgetAnalyticsContext {
  /** Host page's analytics distinct id (e.g. PostHog), read at call time. */
  distinctId?: string
  /** Session-replay deep-link for the visitor's current recording. */
  replaySessionUrl?: string
}

export interface ThunderPhoneWidgetProps {
  publishableKey: string
  apiBase?: string
  /**
   * Optional per-session language code or locale, e.g. "en", "es", or "fr-FR".
   */
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
   * Defaults to `'#000000'` in the light theme and `'#ffffff'` in dark.
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
