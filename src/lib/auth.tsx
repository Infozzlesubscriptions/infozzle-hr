import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, tokenStore } from './api'
import type { User } from './types'

interface AuthContextValue {
  user: User | null
  initializing: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    tokenStore.onExpired(() => setUser(null))
    api.post<{ accessToken: string; user: User }>('/auth/refresh')
      .then(({ data }) => { tokenStore.set(data.accessToken); setUser(data.user) })
      .catch(() => tokenStore.set(null))
      .finally(() => setInitializing(false))
  }, [])

  const login = async (email: string, password: string) => {
    const { data } = await api.post<{ accessToken: string; user: User }>('/auth/login', { email, password })
    if (!['MD', 'HR'].includes(data.user.role)) throw new Error('This portal is restricted to MD and HR accounts.')
    tokenStore.set(data.accessToken)
    setUser(data.user)
  }

  const logout = async () => {
    try { await api.post('/auth/logout') } finally { tokenStore.set(null); setUser(null) }
  }

  return <AuthContext.Provider value={{ user, initializing, login, logout }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
