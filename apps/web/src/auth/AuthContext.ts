import { createContext } from 'react'
import type { User } from '../lib/types'

export type RegisterInput = {
  name: string
  email: string
  password: string
  password_confirmation: string
  terms_document_id: number
  accept_terms: boolean
}

export type AuthContextValue = {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (input: { email: string; password: string }) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  completeTokenLogin: (token: string) => Promise<void>
  refreshUser: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
