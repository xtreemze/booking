import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import {
  BedDouble,
  CalendarCheck2,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Dumbbell,
  RotateCcw,
  Scissors,
  Settings2,
  ShieldCheck,
  Stethoscope,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { createReservationId, loadReservations, persistReservations } from './data/reservations';
import { findAvailability, formatMoney, formatSlot } from './domain/availability';
import { businesses, defaultBusiness } from './domain/presets';
import type {
  AvailableSlot,
  BusinessConfig,
  BusinessPreset,
  Guest,
  Reservation,
  Service,
} from './domain/types';

const presetMeta: Record<BusinessPreset, { readonly label: string; readonly icon: LucideIcon }> = {
  barber: { label: 'Barber', icon: Scissors },
  clinic: { label: 'Clinic', icon: Stethoscope },
  restaurant: { label: 'Restaurant', icon: UtensilsCrossed },
  hotel: { label: 'Hotel', icon: BedDouble },
  studio: { label: 'Class / studio', icon: Dumbbell },
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

function ReservationReceipt({ reservation, business, service }: {
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
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reservation.start))}.
        </p>
        <p className="muted">Reference {reservation.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </section>
  );
}

export function App() {
  const today = useMemo(() => dateInputValue(new Date()), []);
  const [businessId, setBusinessId] = useState<string>(defaultBusiness.id);
  const business: BusinessConfig = businesses.find((item) => item.id === businessId) ?? defaultBusiness;
  const [serviceId, setServiceId] = useState<string>(business.services[0]?.id ?? '');
  const service = business.services.find((item) => item.id === serviceId) ?? business.services[0];
  const [date, setDate] = useState(today);
  const [partySize, setPartySize] = useState(1);
  const [nights, setNights] = useState(1);
  const [selectedSlot, setSelectedSlot] = useState<string>('');
  const [guest, setGuest] = useState<Guest>({ name: '', email: '', phone: '', notes: '' });
  const [reservations, setReservations] = useState<readonly Reservation[]>(() => loadReservations());
  const [receipt, setReceipt] = useState<Reservation | null>(null);

  const slots = useMemo(() => {
    if (!service) return [];
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
  }, [business, date, nights, partySize, reservations, service]);

  const chosenSlot = slots.find((slot) => slotKey(slot) === selectedSlot);
  const businessReservations = reservations
    .filter((reservation) => reservation.businessId === business.id && reservation.status !== 'cancelled')
    .sort((a, b) => a.start.localeCompare(b.start));

  function chooseBusiness(next: BusinessConfig): void {
    setBusinessId(next.id);
    setServiceId(next.services[0]?.id ?? '');
    setPartySize(1);
    setNights(1);
    setSelectedSlot('');
    setReceipt(null);
  }

  function chooseService(next: Service): void {
    setServiceId(next.id);
    setPartySize(1);
    setNights(1);
    setSelectedSlot('');
    setReceipt(null);
  }

  function updateGuest(field: keyof Guest, value: string): void {
    setGuest((current) => ({ ...current, [field]: value }));
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!service || !chosenSlot || !guest.name.trim() || !guest.email.trim()) return;

    const reservation: Reservation = {
      id: createReservationId(),
      businessId: business.id,
      serviceId: service.id,
      resourceId: chosenSlot.resourceId,
      start: chosenSlot.start.toISOString(),
      end: chosenSlot.end.toISOString(),
      partySize,
      status: business.policy.requiresApproval ? 'pending' : 'confirmed',
      guest: {
        name: guest.name.trim(),
        email: guest.email.trim(),
        phone: guest.phone.trim(),
        notes: guest.notes.trim(),
      },
      createdAt: new Date().toISOString(),
    };

    const next = [...reservations, reservation];
    setReservations(next);
    persistReservations(next);
    setReceipt(reservation);
    setSelectedSlot('');
  }

  function clearDemoData(): void {
    setReservations([]);
    persistReservations([]);
    setReceipt(null);
    setSelectedSlot('');
  }

  if (!service) {
    return <main className="fatal">This business has no configured services.</main>;
  }

  const Icon = presetMeta[business.preset].icon;
  const duration = service.mode === 'stay' ? `${nights} night${nights === 1 ? '' : 's'}` : `${service.durationMinutes} min`;
  const price = service.mode === 'stay'
    ? formatMoney(service.priceCents * nights, business.currency)
    : formatMoney(service.priceCents, business.currency);

  return (
    <div className="app-shell">
      <header className="hero">
        <div className="brand-mark"><CalendarCheck2 aria-hidden="true" /></div>
        <div>
          <p className="eyebrow">Booking / configurable reservation engine</p>
          <h1>One booking system. Different operational realities.</h1>
          <p className="hero-copy">
            Appointments, tables, rooms and pooled capacity use one scheduling core while keeping the policies that make each business different.
          </p>
        </div>
      </header>

      <nav className="preset-switcher" aria-label="Business examples">
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
              <p className="eyebrow">{presetMeta[business.preset].label} preset</p>
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
                      <small>{item.mode === 'stay' ? 'Per night' : `${item.durationMinutes} min`} · {formatMoney(item.priceCents, business.currency)}</small>
                    </button>
                  );
                })}
              </div>
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
                    onChange={(event) => { setDate(event.target.value); setSelectedSlot(''); setReceipt(null); }}
                  />
                </label>
                <label>
                  {service.mode === 'appointment' ? 'Guests' : 'Party size'}
                  <input
                    type="number"
                    min={1}
                    max={service.maxPartySize}
                    value={partySize}
                    onChange={(event) => { setPartySize(Math.max(1, Number(event.target.value))); setSelectedSlot(''); }}
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
                      onChange={(event) => { setNights(Math.max(1, Number(event.target.value))); setSelectedSlot(''); }}
                    />
                  </label>
                ) : null}
              </div>

              <div className="slot-section">
                <div className="section-label">
                  <Clock3 aria-hidden="true" />
                  <span>{slots.length > 0 ? `${slots.length} available option${slots.length === 1 ? '' : 's'}` : 'No availability for this date'}</span>
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
                        onClick={() => { setSelectedSlot(key); setReceipt(null); }}
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
                  <input required autoComplete="name" value={guest.name} onChange={(event) => updateGuest('name', event.target.value)} />
                </label>
                <label>
                  Email
                  <input required type="email" autoComplete="email" value={guest.email} onChange={(event) => updateGuest('email', event.target.value)} />
                </label>
                <label>
                  Phone
                  <input type="tel" autoComplete="tel" value={guest.phone} onChange={(event) => updateGuest('phone', event.target.value)} />
                </label>
                <label>
                  Notes
                  <input value={guest.notes} onChange={(event) => updateGuest('notes', event.target.value)} placeholder="Accessibility, seating or other needs" />
                </label>
              </div>
            </fieldset>

            <div className="checkout-bar">
              <div>
                <span>{service.name} · {duration}</span>
                <strong>{price}</strong>
              </div>
              <button className="primary-button" type="submit" disabled={!chosenSlot}>
                {business.policy.requiresApproval ? 'Request reservation' : 'Confirm reservation'}
              </button>
            </div>
          </form>
        </section>

        <aside className="control-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Configuration preview</p>
              <h2>Operational model</h2>
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
            <h3>Resource semantics</h3>
            {business.resources.map((resource) => (
              <div className="resource-row" key={resource.id}>
                <div><strong>{resource.name}</strong><span>{resource.kind} · {resource.sharing}</span></div>
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
                  <span>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reservation.start))}</span>
                </div>
                <span className="status" data-status={reservation.status}>{reservation.status}</span>
              </div>
            ))}
          </section>

          <button className="text-button" type="button" onClick={clearDemoData} disabled={reservations.length === 0}>
            <RotateCcw aria-hidden="true" /> Reset local demo data
          </button>
          <p className="footnote">This MVP stores demo reservations in this browser. The domain and storage boundary are separated so production deployments can replace it with a transactional API.</p>
        </aside>
      </main>
    </div>
  );
}
