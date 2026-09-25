import {
  businesses,
  defaultBusiness,
  findAvailability,
  formatMoney,
  formatSlot,
  type AvailableSlot,
  type BusinessConfig,
  type BusinessPreset,
  type Guest,
  type Reservation,
  type Service,
} from '@booking/domain';
import { createMemo, createSignal, For, onMount, Show } from 'solid-js';
import { createReservationId, loadReservations, persistReservations } from '../data/reservations';

const presetMeta: Record<BusinessPreset, { readonly label: string; readonly mark: string }> = {
  barber: { label: 'Barber', mark: 'BR' },
  clinic: { label: 'Clinic', mark: 'CL' },
  restaurant: { label: 'Restaurant', mark: 'RT' },
  hotel: { label: 'Hotel', mark: 'HT' },
  studio: { label: 'Class / studio', mark: 'ST' },
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

function ReservationReceipt(props: {
  readonly reservation: Reservation;
  readonly business: BusinessConfig;
  readonly service: Service;
}) {
  return (
    <section class="confirmation" aria-live="polite">
      <div class="confirmation-mark" aria-hidden="true">✓</div>
      <div>
        <p class="eyebrow">Reservation received</p>
        <h2>{props.reservation.status === 'pending' ? 'Request pending approval' : 'You are booked'}</h2>
        <p>
          {props.service.name} at {props.business.name} on{' '}
          {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
            new Date(props.reservation.start),
          )}
          .
        </p>
        <p class="muted">Reference {props.reservation.id.slice(0, 8).toUpperCase()}</p>
      </div>
    </section>
  );
}

export default function BookingApp() {
  const today = dateInputValue(new Date());
  const [businessId, setBusinessId] = createSignal(defaultBusiness.id);
  const business = createMemo<BusinessConfig>(
    () => businesses.find((item) => item.id === businessId()) ?? defaultBusiness,
  );
  const [serviceId, setServiceId] = createSignal(defaultBusiness.services[0]?.id ?? '');
  const service = createMemo(() => business().services.find((item) => item.id === serviceId()) ?? business().services[0]);
  const [date, setDate] = createSignal(today);
  const [partySize, setPartySize] = createSignal(1);
  const [nights, setNights] = createSignal(1);
  const [selectedSlot, setSelectedSlot] = createSignal('');
  const [guest, setGuest] = createSignal<Guest>({ name: '', email: '', phone: '', notes: '' });
  const [reservations, setReservations] = createSignal<readonly Reservation[]>([]);
  const [receipt, setReceipt] = createSignal<Reservation | null>(null);

  onMount(() => {
    setReservations(loadReservations());
  });

  const slots = createMemo<readonly AvailableSlot[]>(() => {
    const currentService = service();
    if (!currentService) return [];

    return findAvailability(
      {
        business: business(),
        service: currentService,
        date: date(),
        partySize: partySize(),
        ...(currentService.mode === 'stay' ? { durationMinutes: nights() * 24 * 60 } : {}),
      },
      reservations(),
    );
  });

  const chosenSlot = createMemo(() => slots().find((slot) => slotKey(slot) === selectedSlot()));
  const businessReservations = createMemo(() =>
    reservations()
      .filter((reservation) => reservation.businessId === business().id && reservation.status !== 'cancelled')
      .sort((a, b) => a.start.localeCompare(b.start)),
  );

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

  function submit(event: Event): void {
    event.preventDefault();
    const currentService = service();
    const currentSlot = chosenSlot();
    const currentGuest = guest();
    if (!currentService || !currentSlot || !currentGuest.name.trim() || !currentGuest.email.trim()) return;

    const reservation: Reservation = {
      id: createReservationId(),
      businessId: business().id,
      serviceId: currentService.id,
      resourceId: currentSlot.resourceId,
      start: currentSlot.start.toISOString(),
      end: currentSlot.end.toISOString(),
      partySize: partySize(),
      status: business().policy.requiresApproval ? 'pending' : 'confirmed',
      guest: {
        name: currentGuest.name.trim(),
        email: currentGuest.email.trim(),
        phone: currentGuest.phone.trim(),
        notes: currentGuest.notes.trim(),
      },
      createdAt: new Date().toISOString(),
    };

    const next = [...reservations(), reservation];
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

  return (
    <div class="app-shell">
      <header class="hero">
        <div class="brand-mark" aria-hidden="true">BK</div>
        <div>
          <p class="eyebrow">Booking / configurable reservation engine</p>
          <h1>One booking system. Different operational realities.</h1>
          <p class="hero-copy">
            Appointments, tables, rooms and pooled capacity use one scheduling core while keeping the policies that make
            each business different.
          </p>
        </div>
      </header>

      <nav class="preset-switcher" aria-label="Business examples">
        <For each={businesses}>
          {(item) => (
            <button
              class="preset-button"
              data-active={item.id === business().id}
              aria-pressed={item.id === business().id}
              type="button"
              onClick={() => chooseBusiness(item)}
            >
              <span class="preset-mark" aria-hidden="true">{presetMeta[item.preset].mark}</span>
              <span>{presetMeta[item.preset].label}</span>
            </button>
          )}
        </For>
      </nav>

      <Show when={service()} fallback={<main class="fatal">This business has no configured services.</main>}>
        {(currentService) => {
          const duration = createMemo(() =>
            currentService().mode === 'stay'
              ? `${nights()} night${nights() === 1 ? '' : 's'}`
              : `${currentService().durationMinutes} min`,
          );
          const price = createMemo(() =>
            currentService().mode === 'stay'
              ? formatMoney(currentService().priceCents * nights(), business().currency)
              : formatMoney(currentService().priceCents, business().currency),
          );

          return (
            <main class="workspace">
              <section class="booking-card">
                <div class="business-heading">
                  <div class="business-icon" aria-hidden="true">{presetMeta[business().preset].mark}</div>
                  <div>
                    <p class="eyebrow">{presetMeta[business().preset].label} preset</p>
                    <h2>{business().name}</h2>
                    <p>{business().tagline}</p>
                  </div>
                </div>

                <Show when={receipt()}>
                  {(currentReceipt) => (
                    <ReservationReceipt
                      reservation={currentReceipt()}
                      business={business()}
                      service={currentService()}
                    />
                  )}
                </Show>

                <form onSubmit={submit}>
                  <fieldset>
                    <legend><span>1</span> Choose what to book</legend>
                    <div class="service-grid">
                      <For each={business().services}>
                        {(item) => (
                          <button
                            type="button"
                            class="service-card"
                            data-active={item.id === currentService().id}
                            aria-pressed={item.id === currentService().id}
                            onClick={() => chooseService(item)}
                          >
                            <strong>{item.name}</strong>
                            <span>{item.description}</span>
                            <small>
                              {item.mode === 'stay' ? 'Per night' : `${item.durationMinutes} min`} ·{' '}
                              {formatMoney(item.priceCents, business().currency)}
                            </small>
                          </button>
                        )}
                      </For>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend><span>2</span> Find availability</legend>
                    <div class="input-row">
                      <label>
                        Date
                        <input
                          type="date"
                          min={today}
                          value={date()}
                          onChange={(event) => {
                            setDate(event.currentTarget.value);
                            setSelectedSlot('');
                            setReceipt(null);
                          }}
                        />
                      </label>
                      <label>
                        {currentService().mode === 'appointment' ? 'Guests' : 'Party size'}
                        <input
                          type="number"
                          min={1}
                          max={currentService().maxPartySize}
                          value={partySize()}
                          onInput={(event) => {
                            setPartySize(Math.max(1, Number(event.currentTarget.value)));
                            setSelectedSlot('');
                          }}
                        />
                      </label>
                      <Show when={currentService().mode === 'stay'}>
                        <label>
                          Nights
                          <input
                            type="number"
                            min={1}
                            max={14}
                            value={nights()}
                            onInput={(event) => {
                              setNights(Math.max(1, Number(event.currentTarget.value)));
                              setSelectedSlot('');
                            }}
                          />
                        </label>
                      </Show>
                    </div>

                    <div class="slot-section">
                      <div class="section-label">
                        <span aria-hidden="true">◷</span>
                        <span>
                          {slots().length > 0
                            ? `${slots().length} available option${slots().length === 1 ? '' : 's'}`
                            : 'No availability for this date'}
                        </span>
                      </div>
                      <div class="slot-grid">
                        <For each={slots().slice(0, 24)}>
                          {(slot) => {
                            const key = slotKey(slot);
                            const active = () => key === selectedSlot();
                            const resource = () =>
                              business().resources.find((candidate) => candidate.id === slot.resourceId);
                            return (
                              <button
                                type="button"
                                class="slot"
                                data-active={active()}
                                aria-pressed={active()}
                                onClick={() => {
                                  setSelectedSlot(key);
                                  setReceipt(null);
                                }}
                              >
                                <strong>{formatSlot(slot.start)}</strong>
                                <span>{resourceLabel(business(), slot.resourceId)}</span>
                                <Show when={resource()?.sharing === 'pooled'}>
                                  <small>{slot.remainingCapacity} places left</small>
                                </Show>
                              </button>
                            );
                          }}
                        </For>
                      </div>
                    </div>
                  </fieldset>

                  <fieldset>
                    <legend><span>3</span> Reservation details</legend>
                    <div class="input-row two-column">
                      <label>
                        Name
                        <input
                          required
                          autocomplete="name"
                          value={guest().name}
                          onInput={(event) => updateGuest('name', event.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Email
                        <input
                          required
                          type="email"
                          autocomplete="email"
                          value={guest().email}
                          onInput={(event) => updateGuest('email', event.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Phone
                        <input
                          type="tel"
                          autocomplete="tel"
                          value={guest().phone}
                          onInput={(event) => updateGuest('phone', event.currentTarget.value)}
                        />
                      </label>
                      <label>
                        Notes
                        <input
                          value={guest().notes}
                          onInput={(event) => updateGuest('notes', event.currentTarget.value)}
                          placeholder="Accessibility, seating or other needs"
                        />
                      </label>
                    </div>
                  </fieldset>

                  <div class="checkout-bar">
                    <div>
                      <span>{currentService().name} · {duration()}</span>
                      <strong>{price()}</strong>
                    </div>
                    <button class="primary-button" type="submit" disabled={!chosenSlot()}>
                      {business().policy.requiresApproval ? 'Request reservation' : 'Confirm reservation'}
                    </button>
                  </div>
                </form>
              </section>

              <aside class="control-panel">
                <div class="panel-heading">
                  <div>
                    <p class="eyebrow">Configuration preview</p>
                    <h2>Operational model</h2>
                  </div>
                  <div class="panel-mark" aria-hidden="true">CFG</div>
                </div>

                <div class="stat-grid">
                  <div>
                    <span class="stat-mark" aria-hidden="true">R</span>
                    <strong>{business().resources.length}</strong>
                    <span>resources</span>
                  </div>
                  <div>
                    <span class="stat-mark" aria-hidden="true">S</span>
                    <strong>{business().policy.slotStepMinutes}m</strong>
                    <span>slot step</span>
                  </div>
                  <div>
                    <span class="stat-mark" aria-hidden="true">A</span>
                    <strong>{business().policy.requiresApproval ? 'Yes' : 'No'}</strong>
                    <span>approval</span>
                  </div>
                  <div>
                    <span class="stat-mark" aria-hidden="true">$</span>
                    <strong>
                      {business().policy.depositsEnabled ? `${business().policy.depositPercent}%` : 'Off'}
                    </strong>
                    <span>deposit</span>
                  </div>
                </div>

                <section class="panel-section">
                  <h3>Resource semantics</h3>
                  <For each={business().resources}>
                    {(resource) => (
                      <div class="resource-row">
                        <div><strong>{resource.name}</strong><span>{resource.kind} · {resource.sharing}</span></div>
                        <span>capacity {resource.capacity}</span>
                      </div>
                    )}
                  </For>
                </section>

                <section class="panel-section">
                  <h3>Current reservations</h3>
                  <Show
                    when={businessReservations().length > 0}
                    fallback={<p class="muted">No demo reservations yet.</p>}
                  >
                    <For each={businessReservations().slice(0, 6)}>
                      {(reservation) => (
                        <div class="reservation-row">
                          <div>
                            <strong>{reservation.guest.name}</strong>
                            <span>
                              {new Intl.DateTimeFormat(undefined, {
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              }).format(new Date(reservation.start))}
                            </span>
                          </div>
                          <span class="status" data-status={reservation.status}>{reservation.status}</span>
                        </div>
                      )}
                    </For>
                  </Show>
                </section>

                <button
                  class="text-button"
                  type="button"
                  onClick={clearDemoData}
                  disabled={reservations().length === 0}
                >
                  Reset local demo data
                </button>
                <p class="footnote">
                  This demo stores reservations in this browser. The domain and persistence boundary are separated so a
                  production deployment can replace it with a transactional API.
                </p>
              </aside>
            </main>
          );
        }}
      </Show>
    </div>
  );
}
