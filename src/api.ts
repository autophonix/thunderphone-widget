import type { WidgetSessionResponse, WidgetError } from './types'

const DEFAULT_API_BASE = 'https://api.thunderphone.com/v1'

export class WidgetAPIError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'WidgetAPIError'
  }
}

export interface CreateWidgetSessionOptions {
  language?: string
  voice?: string
  context?: string
  analyticsDistinctId?: string
  analyticsReplayUrl?: string
}

export async function createWidgetSession(
  publishableKey: string,
  apiBase?: string,
  options: CreateWidgetSessionOptions = {},
): Promise<WidgetSessionResponse> {
  const base = apiBase || DEFAULT_API_BASE
  const body: Record<string, string> = {}
  if (options.language) body.language = options.language
  if (options.voice) body.voice = options.voice
  if (options.context) body.context = options.context
  if (options.analyticsDistinctId) body.analytics_distinct_id = options.analyticsDistinctId
  if (options.analyticsReplayUrl) body.analytics_replay_url = options.analyticsReplayUrl
  const response = await fetch(`${base}/widget/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': publishableKey,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const data: WidgetError = await response.json().catch(() => ({
      error: 'unknown',
      message: 'Unable to connect.',
    }))
    throw new WidgetAPIError(data.error, data.message)
  }

  return response.json()
}
