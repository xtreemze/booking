export type BusinessPreset =
  | 'barber'
  | 'clinic'
  | 'restaurant'
  | 'hotel'
  | 'studio'
  | 'interior-design'
  | 'audio-consulting'
  | 'legal'
  | 'tutoring'
  | 'home-service'
  | 'photography'
  | 'beauty'
  | 'pet-care';

export type BookingMode = 'appointment' | 'capacity' | 'stay';
export type ResourceKind = 'person' | 'table' | 'room' | 'equipment' | 'space' | 'virtual';
export type ResourceSharing = 'exclusive' | 'pooled';
export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled';
export type DeliveryMode = 'business' | 'customer' | 'virtual';
export type IntakeFieldType = 'text' | 'textarea' | 'select';

export interface TimeWindow {
  readonly start: string;
  readonly end: string;
}

export type WeeklyHours = Readonly<Record<number, readonly TimeWindow[]>>;

export interface BookingPolicy {
  readonly slotStepMinutes: number;
  readonly minimumNoticeMinutes: number;
  readonly bookingHorizonDays: number;
  readonly cancellationNoticeMinutes: number;
  readonly requiresApproval: boolean;
  readonly depositsEnabled: boolean;
  readonly depositPercent: number;
}

export interface IntakeField {
  readonly id: string;
  readonly label: string;
  readonly type: IntakeFieldType;
  readonly required: boolean;
  readonly placeholder?: string;
  readonly options?: readonly string[];
}

export interface Service {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly mode: BookingMode;
  readonly durationMinutes: number;
  readonly bufferBeforeMinutes: number;
  readonly bufferAfterMinutes: number;
  readonly priceCents: number;
  readonly maxPartySize: number;
  readonly resourceKinds: readonly ResourceKind[];
  readonly deliveryModes?: readonly DeliveryMode[];
  readonly intakeFields?: readonly IntakeField[];
  readonly startTimes?: readonly string[];
}

export interface Resource {
  readonly id: string;
  readonly name: string;
  readonly kind: ResourceKind;
  readonly sharing: ResourceSharing;
  readonly capacity: number;
  readonly serviceIds: readonly string[];
  readonly availability?: WeeklyHours;
}

export interface BusinessConfig {
  readonly id: string;
  readonly preset: BusinessPreset;
  readonly name: string;
  readonly tagline: string;
  readonly timezone: string;
  readonly currency: string;
  readonly hours: WeeklyHours;
  readonly policy: BookingPolicy;
  readonly services: readonly Service[];
  readonly resources: readonly Resource[];
}

export interface Guest {
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly notes: string;
}

export interface Reservation {
  readonly id: string;
  readonly businessId: string;
  readonly serviceId: string;
  readonly resourceId: string;
  readonly start: string;
  readonly end: string;
  readonly partySize: number;
  readonly status: ReservationStatus;
  readonly guest: Guest;
  readonly createdAt: string;
  readonly customerId?: string;
  readonly deliveryMode?: DeliveryMode;
  readonly intake?: Readonly<Record<string, string>>;
}

export interface AvailabilityRequest {
  readonly business: BusinessConfig;
  readonly service: Service;
  readonly date: string;
  readonly partySize: number;
  readonly durationMinutes?: number;
  readonly now?: Date;
}

export interface AvailableSlot {
  readonly start: Date;
  readonly end: Date;
  readonly resourceId: string;
  readonly remainingCapacity: number;
}
