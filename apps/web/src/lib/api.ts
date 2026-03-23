import type {
  Event,
  EventImage,
  LocationOption,
  OwnerProfile,
  PaginatedResponse,
  TermsDocument,
  User,
  UserNotification,
  UserNotificationPreferences,
  Venue,
  VenueImage,
} from './types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api'

type RequestOptions = {
  method?: string
  token?: string | null
  body?: unknown
}

function isFormDataBody(body: unknown): body is FormData {
  return body instanceof FormData
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const rawBody = options.body
  const isFormData = isFormDataBody(rawBody)
  let requestBody: BodyInit | undefined

  if (rawBody === undefined || rawBody === null) {
    requestBody = undefined
  } else if (isFormDataBody(rawBody)) {
    requestBody = rawBody
  } else {
    requestBody = JSON.stringify(rawBody)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/json',
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: requestBody,
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
  getGoogleAuthUrl: () => `${API_BASE_URL}/auth/google/redirect`,
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
  getPlayerProfile: (token: string) =>
    request<{ data: User['player_profile']; profile_complete: boolean }>('/player/profile', {
      token,
    }),
  upsertPlayerProfile: (
    token: string,
    input: {
      dni: string
      alias?: string
      age: number
      phone: string
      city: string
      emergency_contact: string
      medical_notes?: string
    },
  ) =>
    request<{ message: string; data: NonNullable<User['player_profile']>; user: User }>(
      '/player/profile',
      {
        method: 'PUT',
        token,
        body: input,
      },
    ),
  logout: (token: string) =>
    request<{ message: string }>('/auth/logout', { method: 'POST', token }),
  changePassword: (
    token: string,
    input: {
      current_password: string
      password: string
      password_confirmation: string
    },
  ) =>
    request<{ message: string }>('/auth/password', {
      method: 'PUT',
      token,
      body: input,
    }),
  getPublicEvents: (search = '') => {
    const params = new URLSearchParams()

    if (search) {
      params.set('q', search)
    }

    return request<PaginatedResponse<Event>>(`/events?${params.toString()}`)
  },
  getEvent: (eventId: string) => request<{ data: Event }>(`/events/${eventId}`),
  getPublicVenue: (venueId: number) =>
    request<{ data: Venue & { upcoming_events: Event[] } }>(`/venues/${venueId}`),
  getPublicOwnerProfile: (slug: string) =>
    request<{ data: OwnerProfile & { active_events: Event[]; active_venues: Venue[] } }>(
      `/owners/${slug}`,
    ),
  updateOwnerAvatar: (token: string, avatar: File) => {
    const formData = new FormData()
    formData.append('avatar', avatar)

    return request<{ data: OwnerProfile; message: string }>('/owner/profile/avatar', {
      method: 'POST',
      token,
      body: formData,
    })
  },
  getCountries: () => request<{ data: LocationOption[] }>('/locations/countries'),
  getProvinces: (countryId: number) =>
    request<{ data: LocationOption[] }>(`/locations/provinces?country_id=${countryId}`),
  getCities: (provinceId: number) =>
    request<{ data: LocationOption[] }>(`/locations/cities?province_id=${provinceId}`),
  getOwnerVenues: (token: string) =>
    request<PaginatedResponse<Venue>>('/owner/venues', { token }),
  getOwnerVenue: (token: string, venueId: number) =>
    request<{ data: Venue }>(`/owner/venues/${venueId}`, { token }),
  createOwnerVenue: (token: string, input: Record<string, unknown>) =>
    request<{ data: Venue; message: string }>('/owner/venues', {
      method: 'POST',
      token,
      body: input,
    }),
  updateOwnerVenue: (token: string, venueId: number, input: Record<string, unknown>) =>
    request<{ data: Venue; message: string }>(`/owner/venues/${venueId}`, {
      method: 'PATCH',
      token,
      body: input,
    }),
  uploadOwnerVenueImages: (
    token: string,
    venueId: number,
    input: { images: File[]; thumbnails?: File[] },
  ) => {
    const formData = new FormData()

    input.images.forEach((file) => {
      formData.append('images[]', file)
    })

    ;(input.thumbnails ?? []).forEach((file) => {
      formData.append('thumbnails[]', file)
    })

    return request<{ data: VenueImage[]; message: string; created?: VenueImage[] }>(
      `/owner/venues/${venueId}/images`,
      {
        method: 'POST',
        token,
        body: formData,
      },
    )
  },
  setOwnerVenueBanner: (token: string, venueId: number, imageId: number) =>
    request<{ data: VenueImage[]; message: string }>(`/owner/venues/${venueId}/images/banner`, {
      method: 'PATCH',
      token,
      body: { image_id: imageId },
    }),
  reorderOwnerVenueImages: (
    token: string,
    venueId: number,
    input: {
      image_ids: number[]
    },
  ) =>
    request<{ data: VenueImage[]; message: string }>(`/owner/venues/${venueId}/images/reorder`, {
      method: 'PATCH',
      token,
      body: input,
    }),
  deleteOwnerVenueImage: (token: string, venueId: number, imageId: number) =>
    request<{ message: string }>(`/owner/venues/${venueId}/images/${imageId}`, {
      method: 'DELETE',
      token,
    }),
  getOwnerEvents: (token: string) =>
    request<PaginatedResponse<Event>>('/owner/events', { token }),
  getOwnerEvent: (token: string, eventId: number) =>
    request<{ data: Event }>(`/owner/events/${eventId}`, { token }),
  createOwnerEvent: (token: string, input: Record<string, unknown>) =>
    request<{ data: Event; message: string }>('/owner/events', {
      method: 'POST',
      token,
      body: input,
    }),
  updateOwnerEvent: (token: string, eventId: number, input: Record<string, unknown>) =>
    request<{ data: Event; message: string }>(`/owner/events/${eventId}`, {
      method: 'PATCH',
      token,
      body: input,
    }),
  uploadOwnerEventImages: (
    token: string,
    eventId: number,
    input: { images: File[]; thumbnails?: File[] },
  ) => {
    const formData = new FormData()

    input.images.forEach((file) => {
      formData.append('images[]', file)
    })

    ;(input.thumbnails ?? []).forEach((file) => {
      formData.append('thumbnails[]', file)
    })

    return request<{ data: EventImage[]; message: string }>(
      `/owner/events/${eventId}/images`,
      {
        method: 'POST',
        token,
        body: formData,
      },
    )
  },
  deleteOwnerEventImage: (token: string, eventId: number, imageId: number) =>
    request<{ message: string }>(`/owner/events/${eventId}/images/${imageId}`, {
      method: 'DELETE',
      token,
    }),
  reorderOwnerEventImages: (
    token: string,
    eventId: number,
    input: {
      image_ids: number[]
      primary_image_id: number
    },
  ) =>
    request<{ data: EventImage[]; message: string }>(`/owner/events/${eventId}/images/reorder`, {
      method: 'PATCH',
      token,
      body: input,
    }),
  getOwnerRegistrations: (
    token: string,
    publishedOnly = false,
    recentDays?: number,
  ) => {
    const params = new URLSearchParams()

    if (publishedOnly) {
      params.set('published_only', '1')
    }
    if (typeof recentDays === 'number' && recentDays > 0) {
      params.set('recent_days', String(recentDays))
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''

    return request<PaginatedResponse<{
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
    }>>(`/owner/registrations${suffix}`, { token })
  },
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
  getNotifications: (token: string, unreadOnly = false) => {
    const params = new URLSearchParams()

    if (unreadOnly) {
      params.set('unread_only', '1')
    }

    const suffix = params.toString() ? `?${params.toString()}` : ''

    return request<PaginatedResponse<UserNotification>>(`/notifications${suffix}`, { token })
  },
  markNotificationAsRead: (token: string, notificationId: number) =>
    request<{ message: string; data: UserNotification; unread_count: number }>(
      `/notifications/${notificationId}/read`,
      {
        method: 'POST',
        token,
      },
    ),
  markAllNotificationsAsRead: (token: string) =>
    request<{ message: string; unread_count: number }>('/notifications/read-all', {
      method: 'POST',
      token,
    }),
  getNotificationPreferences: (token: string) =>
    request<{ data: UserNotificationPreferences }>('/notification-preferences', {
      token,
    }),
  updateNotificationPreferences: (
    token: string,
    input: {
      email_notifications: boolean
      new_event_alerts: boolean
      enrollment_reminders: boolean
      organizer_messages: boolean
    },
  ) =>
    request<{ message: string; data: UserNotificationPreferences }>(
      '/notification-preferences',
      {
        method: 'PUT',
        token,
        body: input,
      },
    ),
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
