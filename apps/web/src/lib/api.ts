import type { Event, PaginatedResponse, TermsDocument, User, Venue } from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

type RequestOptions = {
  method?: string
  token?: string | null
  body?: unknown
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const message =
      payload.message ??
      (payload.errors
        ? Object.values(payload.errors).flat().join(' ')
        : 'No se pudo completar la solicitud.')

    throw new Error(message)
  }

  return payload as T
}

export const api = {
  getActiveTerms: () => request<{ data: TermsDocument | null }>('/terms/active'),
  login: (input: { email: string; password: string }) =>
    request<{ token: string; user: User; message: string }>('/auth/login', {
      method: 'POST',
      body: input,
    }),
  register: (input: Record<string, unknown>) =>
    request<{ token: string; user: User; message: string }>('/auth/register', {
      method: 'POST',
      body: input,
    }),
  getCurrentUser: (token: string) =>
    request<{ user: User }>('/auth/me', { token }),
  logout: (token: string) =>
    request<{ message: string }>('/auth/logout', { method: 'POST', token }),
  getPublicEvents: (search = '') => {
    const params = new URLSearchParams()

    if (search) {
      params.set('q', search)
    }

    return request<PaginatedResponse<Event>>(`/events?${params.toString()}`)
  },
  getEvent: (eventId: string) => request<{ data: Event }>(`/events/${eventId}`),
  getOwnerVenues: (token: string) =>
    request<PaginatedResponse<Venue>>('/owner/venues', { token }),
  createOwnerVenue: (token: string, input: Record<string, unknown>) =>
    request<{ data: Venue; message: string }>('/owner/venues', {
      method: 'POST',
      token,
      body: input,
    }),
  getOwnerEvents: (token: string) =>
    request<PaginatedResponse<Event>>('/owner/events', { token }),
  createOwnerEvent: (token: string, input: Record<string, unknown>) =>
    request<{ data: Event; message: string }>('/owner/events', {
      method: 'POST',
      token,
      body: input,
    }),
  getOwnerRegistrations: (token: string) =>
    request<PaginatedResponse<{
      id: number
      status: string
      payment_status: string
      event: Event
      player: User & {
        player_profile?: {
          city: string
          phone: string
        } | null
      }
      category: {
        id: number
        name: string
        price: number
      }
      ticket?: {
        code: string
      } | null
    }>>('/owner/registrations', { token }),
  createOwnerCheckin: (token: string, input: { ticket_code: string }) =>
    request<{ message: string; data: { id: number; status: string } }>('/owner/checkins', {
      method: 'POST',
      token,
      body: input,
    }),
  getPlayerRegistrations: (token: string) =>
    request<PaginatedResponse<{
      id: number
      status: string
      payment_status: string
      event: Event
      category: {
        id: number
        name: string
        price: number
        capacity: number
      }
      ticket?: {
        code: string
      } | null
    }>>('/player/registrations', { token }),
  createRegistration: (
    token: string,
    eventId: number,
    input: { event_category_id: number },
  ) =>
    request<{ data: { id: number; status: string }; message: string }>(
      `/events/${eventId}/registrations`,
      {
        method: 'POST',
        token,
        body: input,
      },
    ),
  cancelRegistration: (token: string, registrationId: number) =>
    request<{ data: { id: number; status: string }; message: string }>(
      `/registrations/${registrationId}/cancel`,
      {
        method: 'POST',
        token,
      },
    ),
  createAdminOwner: (token: string, input: Record<string, unknown>) =>
    request<{ data: User; message: string }>('/admin/owners', {
      method: 'POST',
      token,
      body: input,
    }),
  deactivateAdminOwner: (token: string, ownerId: number) =>
    request<{ message: string }>(`/admin/owners/${ownerId}`, {
      method: 'DELETE',
      token,
    }),
  getAdminOwners: (token: string) =>
    request<PaginatedResponse<User>>('/admin/owners', { token }),
}
