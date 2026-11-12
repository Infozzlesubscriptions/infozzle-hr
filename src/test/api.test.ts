import { api, messageFromError, tokenStore } from '../lib/api'

describe('API authentication', () => {
  it('attaches the in-memory access token', async () => {
    tokenStore.set('secret-token')
    const adapter = vi.fn(async config => ({ data: {}, status: 200, statusText: 'OK', headers: {}, config }))
    await api.get('/test', { adapter })
    expect(adapter.mock.calls[0][0].headers.Authorization).toBe('Bearer secret-token')
    tokenStore.set(null)
  })

  it('unwraps JSON envelopes while preserving the Axios response', async () => {
    const adapter = vi.fn(async config => ({ data: { success: true, data: { id: '1' }, meta: { total: 1 } }, status: 200, statusText: 'OK', headers: { 'content-type': 'application/json' }, config }))
    const response = await api.get<{ id: string }>('/test', { adapter })
    expect(response.status).toBe(200)
    expect(response.data).toEqual({ id: '1' })
    expect(JSON.parse(String(response.headers['x-response-meta']))).toEqual({ total: 1 })
  })

  it('does not unwrap Blob downloads', async () => {
    const blob = new Blob(['csv'])
    const adapter = vi.fn(async config => ({ data: blob, status: 200, statusText: 'OK', headers: { 'content-type': 'text/csv' }, config }))
    const response = await api.get<Blob>('/report', { adapter, responseType: 'blob' })
    expect(response.data).toBe(blob)
  })

  it('reads the backend error envelope', () => {
    expect(messageFromError({ isAxiosError: true, message: 'fallback', response: { data: { error: { message: 'Request validation failed' } } } })).toBe('Request validation failed')
  })
})
