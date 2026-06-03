/** Domain models mirroring the ShoDumo NestJS API contract. */

export type Role = 'ATTENDEE' | 'ORGANIZER' | 'ADMIN';

export type EventStatus = 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'ARCHIVED';

export type AttendanceType = 'GOING' | 'SAVED';

export type Lang = 'uk' | 'en';

export interface AuthProfile {
  id: string;
  email: string;
  name: string | null;
  role: Role;
}

export interface City {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

export interface Category {
  id: string;
  name: string;
  nameEn?: string | null;
  slug: string;
}

export interface OrganizerProfile {
  id: string;
  userId?: string;
  name: string;
  bio?: string | null;
  bioEn?: string | null;
  avatar?: string | null;
  links?: Record<string, string> | null;
}

export interface Media {
  id: string;
  eventId: string;
  url: string;
  sortOrder: number;
}

/** A read of an event. EN raw fields are present only on owner/admin reads. */
export interface EventModel {
  id: string;
  slug: string;
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  startsAt: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  coverImage?: string | null;
  isPaid: boolean;
  price?: number | string | null;
  status: EventStatus;
  createdAt?: string;
  cityId?: string;
  categoryId?: string;
  city?: City | null;
  category?: Category | null;
  organizer?: OrganizerProfile | null;
  organizerId?: string;
  media?: Media[] | null;
  goingCount?: number;
  savedCount?: number;
  attendeeCount?: number;
  /** Personalized flags — present when a logged-in user reads the event. */
  isAttending?: boolean;
  isSaved?: boolean;
  _count?: { attendees?: number } | null;
}

export interface OrganizerDetail extends OrganizerProfile {
  events: EventModel[];
}

export interface EventWritePayload {
  title: string;
  titleEn?: string | null;
  description: string;
  descriptionEn?: string | null;
  cityId: string;
  categoryId: string;
  startsAt: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  coverImage?: string | null;
  isPaid: boolean;
  price?: number | null;
}

export interface OrganizerWritePayload {
  name?: string;
  bio?: string | null;
  bioEn?: string | null;
  avatar?: string | null;
  links?: Record<string, string> | null;
}

export interface TaxonomyWritePayload {
  name: string;
  nameEn?: string | null;
  slug?: string;
}

export interface Paginated<T> {
  data: T[];
  meta: { total: number; page: number; limit: number; pageCount: number };
}

export interface EventQuery {
  city?: string;
  category?: string;
  date?: string;
  isPaid?: boolean;
  near?: string;
  radiusKm?: number;
  q?: string;
  page?: number;
  limit?: number;
}
