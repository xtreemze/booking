import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BedDouble,
  CalendarCheck2,
  Camera,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Dumbbell,
  GraduationCap,
  MapPin,
  Palette,
  PawPrint,
  RotateCcw,
  Scale,
  Scissors,
  Settings2,
  ShieldCheck,
  Sparkles,
  Speaker,
  Stethoscope,
  Store,
  Users,
  UtensilsCrossed,
  Video,
  Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  createBrowserReservationStore,
  createReservationId,
  VISITOR_CUSTOMER_ID,
} from './data/reservations';
import { findAvailability, formatMoney, formatSlot } from './domain/availability';
import { businesses, defaultBusiness } from './domain/presets';
import type {
  AvailableSlot,
  BusinessConfig,
  BusinessPreset,
  DeliveryMode,
  Guest,
  IntakeField,
  Reservation,
  Service,
} from './domain/types';

const presetMeta: Record<BusinessPreset, { readonly label: string; readonly icon: LucideIcon }> = {
  barber: { label: 'Barber', icon: Scissors },
  clinic: { label: 'Clinic', icon: Stethoscope },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed },
  hotel: { label: 'Hotel', icon: BedDouble },
  studio: { label: 'Class / studio', icon: Dumbbell },
  'interior-design': { label: 'Interior design', icon: Palette },
  'audio-consulting': { label: 'Audio / AV', icon: Speaker },
  legal: { label: 'Legal', icon: Scale },
  tutoring: { label: 'Tutoring', icon: GraduationCap },
  'home-service': { label: 'Home service', icon: Wrench },
  photography: { label: 'Photography', icon: Camera },
  beauty: { label: 'Beauty', icon: Sparkles },
  'pet-care': { label: 'Pet care', icon: PawPrint },
};

const deliveryMeta: Record<DeliveryMode, { readonly label: string; readonly icon: LucideIcon }> = {
  business: { label: 'At the business', icon: Store },
  customer: { label: 'At your location', icon: MapPin },
  virtual: { label: 'Online', icon: Video },
};

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function slotKey(slot: AvailableSlot): string {
  return `${slot.start.toISOString()}::${slot.resourceId}`;
}

function resourceLabel(business: BusinessConfig, resourceId: string): string {
  return business.resources.find((resource) => resource.id === resourceId)?.name ?? 'Available resource';
}

function serviceForReservation(business: BusinessConfig, reservation: Reservation): Service | undefined {
  return business.services.find((service) => service.id === reservation.serviceId);
}

function requiredIntakeComplete(service: Service, intake: Readonly<Record<string, string>>): boolean {
  return (service.intakeFields ?? []).every(
    (field) => !field.required || Boolean(intake[field.id]?.trim()),
  );
}

function ReservationReceipt({
  reservation,
  business,
  service,
}: {
  readonly reservation: Reservation;
  readonly business: BusinessConfig;
  readonly service: Service;
}) {
  return (
    <section className="confirmation" aria-live="polite">
      <CheckCircle2 aria-hidden="true" />
      <div>
        <p className="eyebrow">Reservation received</p>
        <h2>{reservation.status === 'pending' ? 'Request pending approval' : 'You are booked'}</h2>
        <p>
          {service.name} at {business.name} on{' '}
          {new Intl.DateTimeFormat(undefined, {
            dateStyle: 'medium',
            timeStyle: 'short',
          }).format(new Date(reservation.start))}
          .
        </p>
        <p className="muted">Reference {reservation.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </section>
  );
}

function IntakeControl({
  field,
  value,
  onChange,
}: {
  readonly field: IntakeField;
  readonly value: string;
  readonly onChange: (value: string) => void;
}) {
  const label = (
    <>
      {field.label}
      {field.required ? <span className="required-mark" aria-hidden="true"> *</span> : null}
    </>
  );

  if (field.type === 'textarea') {
    return (
      <label className="intake-wide">
        <span>{label}</span>
        <textarea
          required={field.required}
          value={value}
          placeholder={field.placeholder}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  if (field.type === 'select') {
    return (
      <label>
        <span>{label}</span>
        <select required={field.required} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choose an option</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      <span>{label}</span>
      <input
        required={field.required}
        value={value}
        placeholder={field.placeholder}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

export function App() {
  const today = useMemo(() => dateInputValue(new Date()), []);
  const store = useMemo(() => createBrowserReservationStore(), []);
  const [businessId, setBusinessId] = useState<string>(defaultBusiness.id);
  const business: BusinessConfig = businesses.find((item) => item.id === businessId) ?? defaultBusiness;
  const [serviceId, setServiceId] = useState<string>(business.services[0]?.id ?? '');
  const service = business.services.find((item) => item.id === serviceId) ?? business.services[0];
  const [date, setDate] = useState(today);
  const [partySize, setPartySize] = useState(1);
  const [nights, setNights] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [guest, setGuest] = useState<Guest>({ name: '', email: '', phone: '', notes: '' });
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>(
    business.services[0]?.deliveryModes?.[0] ?? 'business',
  );
  const [intake, setIntake] = useState<Record<string, string>>({});
  const [reservations, setReservations] = useState<readonly Reservation[]>([]);
  const [reservationsLoaded, setReservationsLoaded] = useState(false);
  const [receipt, setReceipt] = useState<Reservation | null>(null);

  useEffect(() => {
    let active = true;

    void store.load().then((loaded) => {
      if (!active) return;
      setReservations(loaded);
      setReservationsLoaded(true);
    });

    return () => {
      active = false;
    };
  }, [store]);

  const slots = useMemo(() => {
    if (!service || !reservationsLoaded) return [];
    return findAvailability(
      {
        business,
        service,
        date,
        partySize,
        ...(service.mode === 'stay' ? { durationMinutes: nights * 24 * 60 } : {}),
      },
      reservations,
    );
  }, [business, date, nights, partySize, reservations, reservationsLoaded, service]);

  const chosenSlot = slots.find((slot) => slotKey(slot) === selectedSlot);
  const businessReservations = reservations
    .filter((reservation) => reservation.businessId === business.id && reservation.status !== 'cancelled')
    .sort((a, b) => a.start.localeCompare(b.start));

  const visitorReservations = reservations
    .filter(
      (reservation) =>
        reservation.customerId === VISITOR_CUSTOMER_ID && reservation.status !== 'cancelled',
    )
    .sort((a, b) => a.start.localeCompare(b.start));
  const visitorReservation = visitorReservations[0] ?? null;
  const visitorBusiness = visitorReservation
    ? businesses.find((item) => item.id === visitorReservation.businessId)
    : undefined;
  const visitorService =
    visitorReservation && visitorBusiness
      ? serviceForReservation(visitorBusiness, visitorReservation)
      : undefined;
  const visitorDeliveryMode = visitorReservation?.deliveryMode;
  const VisitorDeliveryIcon = visitorDeliveryMode ? deliveryMeta[visitorDeliveryMode].icon : null;

  function resetBookingInputs(nextService: Service | undefined): void {
    setPartySize(1);
    setNights(1);
    setSelectedSlot('');
    setReceipt(null);
    setDeliveryMode(nextService?.deliveryModes?.[0] ?? 'business');
    setIntake({});
  }

  function chooseBusiness(next: BusinessConfig): void {
    const nextService = next.services[0];
    setBusinessId(next.id);
    setServiceId(nextService?.id ?? '');
    resetBookingInputs(nextService);
  }

  function chooseService(next: Service): void {
    setServiceId(next.id);
    resetBookingInputs(next);
  }

  function updateGuest(field: keyof Guest, value: string): void {
    setGuest((current) => ({ ...current, [field]: value }));
  }

  function updateIntake(fieldId: string, value: string): void {
    setIntake((current) => ({ ...current, [fieldId]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (
      !service ||
      !chosenSlot ||
      !guest.name.trim() ||
      !guest.email.trim() ||
      !requiredIntakeComplete(service, intake)
    ) {
      return;
    }

    const reservation: Reservation = {
      id: createReservationId(),
      businessId: business.id,
      serviceId: service.id,
      resourceId: chosenSlot.resourceId,
      start: chosenSlot.start.toISOString(),
      end: chosenSlot.end.toISOString(),
      partySize,
      status: business.policy.requiresApproval ? 'pending' : 'confirmed',
      customerId: VISITOR_CUSTOMER_ID,
      deliveryMode,
      intake: Object.fromEntries(
        Object.entries(intake)
          .map(([key, value]) => [key, value.trim()])
          .filter(([, value]) => value.length > 0),
      ),
      guest: {
        name: guest.name.trim(),
        email: guest.email.trim(),
        phone: guest.phone.trim(),
        notes: guest.notes.trim(),
      },
      createdAt: new Date().toISOString(),
    };

    const next = [...reservations, reservation];
    await store.save(next);
    setReservations(next);
    setReceipt(reservation);
    setSelectedSlot('');
  }

  async function resetDemoData(): Promise<void> {
    if (!store.reset) return;
    const seeded = await store.reset();
    setReservations(seeded);
    setReceipt(null);
    setSelectedSlot('');
  }

  if (!service) {
    return <main className="fatal">This business has no configured services.</main>;
  }

  const Icon = presetMeta[business.preset].icon;
  const duration =
    service.mode === 'stay'
      ? `${nights} night${nights === 1 ? '' : 's'}`
      : `${service.durationMinutes} min`;
  const price =
    service.mode === 'stay'
      ? formatMoney(service.priceCents * nights, business.currency)
      : formatMoney(service.priceCents, business.currency);
  const serviceDeliveryModes: readonly DeliveryMode[] = service.deliveryModes ?? ['business'];
  const intakeComplete = requiredIntakeComplete(service, intake);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="brand-mark"><CalendarCheck2 aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">Booking / configurable reservation engine</p>
          <h1>Book time, expertise, space or capacity.</h1>
          <p className="hero-copy">
            One mobile-first flow covers appointments, consultations, field visits, tables,
            rooms, classes and other reservation models by composing shared booking capabilities.
          </p>
        </div>
      </header>

      {visitorReservation && visitorBusiness && visitorService ? (
        <section className="visitor-booking" aria-labelledby="visitor-booking-title">
          <div className="visitor-booking-icon"><CalendarCheck2 aria-hidden="true" /></div>
          <div className="visitor-booking-copy">
            <p className="eyebrow">Your upcoming booking</p>
            <h2 id="visitor-booking-title">{visitorService.name}</h2>
            <p>
              {visitorBusiness.name} ·{' '}
              {new Intl.DateTimeFormat(undefined, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(visitorReservation.start))}
            </p>
            <div className="booking-meta">
              {visitorDeliveryMode && VisitorDeliveryIcon ? (
                <span>
                  <VisitorDeliveryIcon aria-hidden="true" />
                  {deliveryMeta[visitorDeliveryMode].label}
                </span>
              ) : null}
              <span className="status" data-status={visitorReservation.status}>
                {visitorReservation.status}
              </span>
            </div>
          </div>
          <button
            className="secondary-button"
            type="button"
            onClick={() => chooseBusiness(visitorBusiness)}
          >
            View availability
          </button>
        </section>
      ) : null}

      <nav className="preset-switcher" aria-label="Booking service examples">
        {businesses.map((item) => {
          const MetaIcon = presetMeta[item.preset].icon;
          const active = item.id === business.id;
          return (
            <button
              className="preset-button"
              data-active={active}
              aria-pressed={active}
              key={item.id}
              type="button"
              onClick={() => chooseBusiness(item)}
            >
              <MetaIcon aria-hidden="true" />
              <span>{presetMeta[item.preset].label}</span>
            </button>
          );
        })}
      </nav>

      <main className="workspace">
        <section className="booking-card">
          <div className="business-heading">
            <div className="business-icon"><Icon aria-hidden="true" /></div>
            <div>
              <p className="eyebrow">{presetMeta[business.preset].label} example</p>
              <h2>{business.name}</h2>
              <p>{business.tagline}</p>
            </div>
          </div>

          {receipt ? <ReservationReceipt reservation={receipt} business={business} service={service} /> : null}

          <form onSubmit={submit}>
            <fieldset>
              <legend><span>1</span> Choose what to book</legend>
              <div className="service-grid">
                {business.services.map((item) => {
                  const active = item.id === service.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="service-card"
                      data-active={active}
                      aria-pressed={active}
                      onClick={() => chooseService(item)}
                    >
                      <strong>{item.name}</strong>
                      <span>{item.description}</span>
                      <small>
                        {item.mode === 'stay' ? 'Per night' : `${item.durationMinutes} min`} ·{' '}
                        {formatMoney(item.priceCents, business.currency)}
                      </small>
                    </button>
                  );
                })}
              </div>

              <fieldset className="delivery-choices">
                <legend className="section-label">
                  <MapPin aria-hidden="true" />
                  Where the service happens
                </legend>
                <div className="choice-row">
                  {serviceDeliveryModes.map((mode) => {
                    const DeliveryIcon = deliveryMeta[mode].icon;
                    return (
                      <button
                        key={mode}
                        className="choice-button"
                        type="button"
                        aria-pressed={deliveryMode === mode}
                        onClick={() => setDeliveryMode(mode)}
                      >
                        <DeliveryIcon aria-hidden="true" />
                        {deliveryMeta[mode].label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </fieldset>

            <fieldset>
              <legend><span>2</span> Find availability</legend>
              <div className="input-row">
                <label>
                  Date
                  <input
                    type="date"
                    min={today}
                    value={date}
                    onChange={(event) => {
                      setDate(event.target.value);
                      setSelectedSlot('');
                      setReceipt(null);
                    }}
                  />
                </label>
                <label>
                  {service.mode === 'appointment' ? 'Attendees' : 'Party size'}
                  <input
                    type="number"
                    min={1}
                    max={service.maxPartySize}
                    value={partySize}
                    onChange={(event) => {
                      setPartySize(Math.max(1, Number(event.target.value)));
                      setSelectedSlot('');
                    }}
                  />
                </label>
                {service.mode === 'stay' ? (
                  <label>
                    Nights
                    <input
                      type="number"
                      min={1}
                      max={14}
                      value={nights}
                      onChange={(event) => {
                        setNights(Math.max(1, Number(event.target.value)));
                        setSelectedSlot('');
                      }}
                    />
                  </label>
                ) : null}
              </div>

              <div className="slot-section">
                <div className="section-label">
                  <Clock3 aria-hidden="true" />
                  <span>
                    {!reservationsLoaded
                      ? 'Loading availability'
                      : slots.length > 0
                        ? `${slots.length} available option${slots.length === 1 ? '' : 's'}`
                        : 'No availability for this date'}
                  </span>
                </div>
                <div className="slot-grid">
                  {slots.slice(0, 24).map((slot) => {
                    const key = slotKey(slot);
                    const active = key === selectedSlot;
                    return (
                      <button
                        type="button"
                        key={key}
                        className="slot"
                        data-active={active}
                        aria-pressed={active}
                        onClick={() => {
                          setSelectedSlot(key);
                          setReceipt(null);
                        }}
                      >
                        <strong>{formatSlot(slot.start)}</strong>
                        <span>{resourceLabel(business, slot.resourceId)}</span>
                        {business.resources.find((resource) => resource.id === slot.resourceId)?.sharing === 'pooled'
                          ? <small>{slot.remainingCapacity} places left</small>
                          : null}
                      </button>
                    );
                  })}
                </div>
              </div>
            </fieldset>

            <fieldset>
              <legend><span>3</span> Reservation details</legend>
              <div className="input-row two-column">
                <label>
                  Name
                  <input
                    required
                    autoComplete="name"
                    value={guest.name}
                    onChange={(event) => updateGuest('name', event.target.value)}
                  />
                </label>
                <label>
                  Email
                  <input
                    required
                    type="email"
                    autoComplete="email"
                    value={guest.email}
                    onChange={(event) => updateGuest('email', event.target.value)}
                  />
                </label>
                <label>
                  Phone
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={guest.phone}
                    onChange={(event) => updateGuest('phone', event.target.value)}
                  />
                </label>
                <label>
                  Notes
                  <input
                    value={guest.notes}
                    onChange={(event) => updateGuest('notes', event.target.value)}
                    placeholder="Accessibility, seating or other needs"
                  />
                </label>
              </div>

              {(service.intakeFields?.length ?? 0) > 0 ? (
                <section className="intake-section" aria-labelledby="intake-title">
                  <div>
                    <p className="eyebrow">Service intake</p>
                    <h3 id="intake-title">A few details help prepare the appointment</h3>
                  </div>
                  <div className="intake-grid">
                    {(service.intakeFields ?? []).map((field) => (
                      <IntakeControl
                        key={field.id}
                        field={field}
                        value={intake[field.id] ?? ''}
                        onChange={(value) => updateIntake(field.id, value)}
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </fieldset>

            <div className="checkout-bar">
              <div>
                <span>{service.name} · {duration}</span>
                <strong>{price}</strong>
              </div>
              <button
                className="primary-button"
                type="submit"
                disabled={!reservationsLoaded || !chosenSlot || !intakeComplete}
              >
                {business.policy.requiresApproval ? 'Request reservation' : 'Confirm reservation'}
              </button>
            </div>
          </form>
        </section>

        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Configuration preview</p>
              <h2>Shared booking capabilities</h2>
            </div>
            <Settings2 aria-hidden="true" />
          </div>

          <div className="stat-grid">
            <div><Users aria-hidden="true" /><strong>{business.resources.length}</strong><span>resources</span></div>
            <div><Clock3 aria-hidden="true" /><strong>{business.policy.slotStepMinutes}m</strong><span>slot step</span></div>
            <div><ShieldCheck aria-hidden="true" /><strong>{business.policy.requiresApproval ? 'Yes' : 'No'}</strong><span>approval</span></div>
            <div><CircleDollarSign aria-hidden="true" /><strong>{business.policy.depositsEnabled ? `${business.policy.depositPercent}%` : 'Off'}</strong><span>deposit</span></div>
          </div>

          <section className="panel-section">
            <h3>Composable components</h3>
            <div className="capability-list">
              <span>Service + duration</span>
              <span>Delivery / location</span>
              <span>Resource + capacity</span>
              <span>Availability + buffers</span>
              <span>Customer intake</span>
              <span>Approval + deposits</span>
              <span>Reservation status</span>
              <span>Pluggable persistence</span>
            </div>
          </section>

          <section className="panel-section">
            <h3>Resource semantics</h3>
            {business.resources.map((resource) => (
              <div className="resource-row" key={resource.id}>
                <div>
                  <strong>{resource.name}</strong>
                  <span>{resource.kind} · {resource.sharing}</span>
                </div>
                <span>capacity {resource.capacity}</span>
              </div>
            ))}
          </section>

          <section className="panel-section">
            <h3>Current reservations</h3>
            {businessReservations.length === 0 ? <p className="muted">No demo reservations yet.</p> : null}
            {businessReservations.slice(0, 6).map((reservation) => (
              <div className="reservation-row" key={reservation.id}>
                <div>
                  <strong>{reservation.guest.name}</strong>
                  <span>
                    {new Intl.DateTimeFormat(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(reservation.start))}
                  </span>
                </div>
                <span className="status" data-status={reservation.status}>{reservation.status}</span>
              </div>
            ))}
          </section>

          <button
            className="text-button"
            type="button"
            onClick={() => {
              void resetDemoData();
            }}
            disabled={!reservationsLoaded || !store.reset}
          >
            <RotateCcw aria-hidden="true" /> Reset relative demo data
          </button>
          <p className="footnote">
            The demo uses a local reservation-store adapter and re-seeds example appointments
            relative to the current day. Production can replace that adapter with a transactional
            API without changing the scheduling domain.
          </p>
        </aside>
      </main>
    </div>
  );
}
