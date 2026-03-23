export type UserRole = 'admin' | 'owner' | 'player'

export type User = {
  id: number
  name: string
  email: string
  role: UserRole
  status: string
  social_provider?: string | null
  password_setup_completed?: boolean
  player_profile?: PlayerProfile | null
  owner_profile?: OwnerProfile | null
}

export type PlayerProfile = {
  dni: string
  alias?: string | null
  age: number
  phone: string
  city: string
  emergency_contact: string
  medical_notes?: string | null
}

export type OwnerProfile = {
  id: number
  organization_name: string
  slug: string
  bio?: string | null
  avatar_path?: string | null
  avatar_url?: string | null
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
  images?: VenueImage[]
}

export type VenueImage = {
  id: number
  venue_id: number
  path: string
  thumbnail_path?: string | null
  sort_order: number
  url: string
  thumbnail_url?: string | null
  created_at: string
  updated_at: string
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

export type EventImage = {
  id: number
  event_id: number
  path: string
  thumbnail_path?: string | null
  is_primary: boolean
  sort_order: number
  url: string
  thumbnail_url?: string | null
  created_at: string
  updated_at: string
}

export type Event = {
  id: number
  public_id: string
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
  rules?: string | null
  status: 'draft' | 'published' | 'cancelled' | 'completed'
  requires_payment_to_confirm: boolean
  allows_waitlist: boolean
  cancellation_deadline?: string | null
  images?: EventImage[]
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

export type UserNotification = {
  id: number
  type: string
  category?: string | null
  title: string
  body?: string | null
  priority: string
  icon?: string | null
  action_label?: string | null
  action_url?: string | null
  source_type?: string | null
  source_id?: number | null
  data?: Record<string, unknown> | null
  sent_at?: string | null
  read_at?: string | null
  dismissed_at?: string | null
  created_at: string
  updated_at: string
}

export type UserNotificationPreferences = {
  id: number
  user_id: number
  email_notifications: boolean
  new_event_alerts: boolean
  enrollment_reminders: boolean
  organizer_messages: boolean
  created_at: string
  updated_at: string
}

export type LocationOption = {
  id: number
  name: string
}

export type PaginatedResponse<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
  unread_count?: number
}
