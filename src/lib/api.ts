import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios'

let accessToken: string | null = null
let refreshPromise: Promise<string> | null = null
let onSessionExpired: (() => void) | null = null

export const tokenStore = {
  get: () => accessToken,
  set: (token: string | null) => { accessToken = token },
  onExpired: (callback: () => void) => { onSessionExpired = callback },
}

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`
  return config
})

api.interceptors.response.use(
  response => {
    const contentType = String(response.headers['content-type'] || '')
    if (response.config.responseType !== 'blob' && contentType.includes('json') && response.data?.success === true && 'data' in response.data) {
      const envelope = response.data
      response.data = envelope.data
      if (envelope.meta !== undefined) response.headers['x-response-meta'] = JSON.stringify(envelope.meta)
    }
    return response
  },
  async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined
    const isAuthCall = original?.url?.includes('/auth/')
    if (error.response?.status !== 401 || !original || original._retry || isAuthCall) return Promise.reject(error)
    original._retry = true
    try {
      refreshPromise ??= api.post<{ accessToken: string }>('/auth/refresh').then(({ data }) => {
        accessToken = data.accessToken
        return data.accessToken
      }).finally(() => { refreshPromise = null })
      const token = await refreshPromise
      original.headers.Authorization = `Bearer ${token}`
      return api(original)
    } catch (refreshError) {
      accessToken = null
      onSessionExpired?.()
      return Promise.reject(refreshError)
    }
  },
)

export const messageFromError = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { error?: { message?: string; details?: unknown }; message?: string } | undefined
    return data?.error?.message || data?.message || error.message
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}

export const downloadFile = async (path: string, filename: string, params?: Record<string, string>) => {
  const { data } = await api.get<Blob>(path, { params, responseType: 'blob' })
  const url = URL.createObjectURL(data)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
