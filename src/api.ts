import type { WidgetSessionResponse, WidgetError } from './types'

const DEFAULT_API_BASE = 'https://api.thunderphone.com/v1'

export class WidgetAPIError extends Error {
  constructor(public code: string, message: string) {
    super(message)
    this.name = 'WidgetAPIError'
  }
}

export async function createWidgetSession(
  apiKey: string,
  agentId: number,
  apiBase?: string,
): Promise<WidgetSessionResponse> {
  const base = apiBase || DEFAULT_API_BASE
  const response = await fetch(`${base}/widget/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify({ agent_id: agentId }),
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
