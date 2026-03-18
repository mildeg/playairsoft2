import {
  createContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'
import { api } from '../lib/api'
import type { User } from '../lib/types'

type RegisterInput = {
  name: string
  email: string
  password: string
  password_confirmation: string
  dni: string
  age: number
  phone: string
  city: string
  emergency_contact: string
  terms_document_id: number
  accept_terms: boolean
}

type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const TOKEN_STORAGE_KEY = 'playairsoft.token'

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) {
      return
    }

    initialized.current = true

    const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY)

    if (!storedToken) {
      setIsLoading(false)
      return
    }

    setToken(storedToken)

    void api
      .getCurrentUser(storedToken)
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
  }, [])

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
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
