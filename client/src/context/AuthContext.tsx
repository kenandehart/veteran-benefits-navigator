import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

const POST_LOGIN_REDIRECT_FROM: string[] = ['/reset-password', '/forgot-password']

interface User {
  id: number
  username: string
  email: string | null
  created_at: string
  hasResults: boolean
}

interface AuthContextValue {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<User>
  register: (
    username: string,
    password: string,
    email?: string,
    answers?: unknown,
    matchedBenefitIds?: unknown,
  ) => Promise<void>
  logout: () => Promise<void>
  clearUser: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json()
        return null
      })
      .then((data: User | null) => setUser(data))
      .catch(() => setUser(null))
      .finally(() => setIsLoading(false))
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<User> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ username, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Login failed')
    }
    const loggedInUser: User = await res.json()
    setUser(loggedInUser)
    if (POST_LOGIN_REDIRECT_FROM.includes(window.location.pathname)) {
      navigate('/')
    }
    return loggedInUser
  }, [navigate])

  const register = useCallback(
    async (
      username: string,
      password: string,
      email?: string,
      answers?: unknown,
      matchedBenefitIds?: unknown,
    ) => {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password, email, answers, matchedBenefitIds }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Registration failed')
      }
      setUser(await res.json())
    },
    [],
  )

  const logout = useCallback(async () => {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error ?? 'Logout failed')
    }
    setUser(null)
  }, [])

  const clearUser = useCallback(() => setUser(null), [])

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, clearUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return ctx
}
