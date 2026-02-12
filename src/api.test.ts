import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWidgetSession, WidgetAPIError } from './api'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
})

describe('createWidgetSession', () => {
  it('sends correct request to default API base', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ call_id: 1, token: 'tok', room_name: 'room', server_url: 'wss://lk', agent_name: 'Agent' }),
    })

    await createWidgetSession('pk_live_abc', 42)

    expect(mockFetch).toHaveBeenCalledWith('https://api.thunderphone.com/v1/widget/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': 'pk_live_abc' },
      body: JSON.stringify({ agent_id: 42 }),
    })
  })

  it('uses custom apiBase when provided', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ call_id: 1, token: 'tok', room_name: 'room', server_url: 'wss://lk', agent_name: 'Agent' }),
    })

    await createWidgetSession('pk_live_abc', 1, 'https://custom.api/v1')

    expect(mockFetch).toHaveBeenCalledWith('https://custom.api/v1/widget/session', expect.anything())
  })

  it('returns session response on success', async () => {
    const session = { call_id: 99, token: 'mytoken', room_name: 'room-99', server_url: 'wss://lk', agent_name: 'TestAgent' }
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(session) })

    const result = await createWidgetSession('pk_live_abc', 1)
    expect(result).toEqual(session)
  })

  it('throws WidgetAPIError with server error details', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'domain_not_allowed', message: 'Origin not allowed.' }),
    })

    await expect(createWidgetSession('pk_live_abc', 1)).rejects.toThrow(WidgetAPIError)
    await expect(createWidgetSession('pk_live_abc', 1)).rejects.toMatchObject({
      code: 'domain_not_allowed',
      message: 'Origin not allowed.',
    })
  })

  it('throws generic error when response body is not JSON', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.reject(new Error('not json')),
    })

    await expect(createWidgetSession('pk_live_abc', 1)).rejects.toThrow(WidgetAPIError)
    await expect(createWidgetSession('pk_live_abc', 1)).rejects.toMatchObject({
      code: 'unknown',
      message: 'Unable to connect.',
    })
  })
})
