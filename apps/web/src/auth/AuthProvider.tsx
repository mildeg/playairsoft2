import {
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'
import { AuthContext, type RegisterInput } from './AuthContext'

const TOKEN_STORAGE_KEY = 'playairsoft.token'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(() =>
    window.localStorage.getItem(TOKEN_STORAGE_KEY),
  )
  const [isLoading, setIsLoading] = useState(() =>
    Boolean(window.localStorage.getItem(TOKEN_STORAGE_KEY)),
  )
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) {
      return
    }

    initialized.current = true

    if (!token) {
      return
    }

    void api
      .getCurrentUser(token)
      .then((response) => {
        setUser(response.user)
      })
      .catch(() => {
        window.localStorage.removeItem(TOKEN_STORAGE_KEY)
        setToken(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [token])

  async function login(input: { email: string; password: string }) {
    const response = await api.login(input)

    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
  }

  async function register(input: RegisterInput) {
    const response = await api.register(input)

    window.localStorage.setItem(TOKEN_STORAGE_KEY, response.token)
    setToken(response.token)
    setUser(response.user)
  }

  async function completeTokenLogin(nextToken: string) {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken)
    setToken(nextToken)

    const response = await api.getCurrentUser(nextToken)
    setUser(response.user)
  }

  async function refreshUser() {
    if (!token) {
      return
    }

    const response = await api.getCurrentUser(token)
    setUser(response.user)
  }

  async function logout() {
    if (token) {
      await api.logout(token).catch(() => undefined)
    }

    window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: Boolean(user && token),
        login,
        register,
        completeTokenLogin,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
