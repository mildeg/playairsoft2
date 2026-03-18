export type UserRole = 'admin' | 'owner' | 'player'

export type User = {
  id: number
  name: string
  email: string
  role: UserRole
  status: string
  player_profile?: PlayerProfile | null
  owner_profile?: OwnerProfile | null
}

export type PlayerProfile = {
  dni: string
  age: number
  phone: string
  city: string
  emergency_contact: string
}

export type OwnerProfile = {
  id: number
  organization_name: string
  slug: string
  bio?: string | null
  status: string
}

export type Venue = {
  id: number
  name: string
  description?: string | null
  address: string
  rental_equipment: boolean
  parking: boolean
  buffet: boolean
  amenities?: string[] | null
  events_count?: number
}

export type EventCategory = {
  id?: number
  name: string
  description?: string | null
  price: number
  capacity: number
  sort_order?: number
  is_active?: boolean
}

export type Event = {
  id: number
  title: string
  slug: string
  format?: string | null
  short_description: string
  long_description?: string | null
  event_date: string
  starts_at: string
  ends_at: string
  base_price?: string | number | null
  capacity: number
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  requires_payment_to_confirm: boolean
  allows_waitlist: boolean
  cancellation_deadline?: string | null
  venue: Venue
  owner_profile?: OwnerProfile
  categories: EventCategory[]
}

export type TermsDocument = {
  id: number
  type: string
  version: string
  content: string
}

export type PaginatedResponse<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
}
