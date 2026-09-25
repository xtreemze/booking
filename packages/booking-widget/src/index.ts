import {
  businesses,
  defaultBusiness,
  findAvailability,
  formatMoney,
  formatSlot,
  type AvailableSlot,
  type DeliveryMode,
  type Reservation,
} from '@booking/domain';
import { css, html, LitElement, type PropertyValues } from 'lit';

export interface BookingSlotSelectedDetail {
  readonly businessId: string;
  readonly serviceId: string;
  readonly resourceId: string;
  readonly start: string;
  readonly end: string;
  readonly partySize: number;
  readonly deliveryMode: DeliveryMode;
}

function dateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export class BookingWidget extends LitElement {
  static override properties = {
    businessId: { type: String, attribute: 'business-id' },
    reservations: { attribute: false },
    date: { state: true },
    partySize: { state: true },
    serviceId: { state: true },
    deliveryMode: { state: true },
  };

  static override styles = css`
    :host {
      display: block;
      color: var(--booking-color, #101828);
      font: 500 0.95rem/1.45 system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    .surface {
      display: grid;
      gap: 1rem;
      padding: 1rem;
      border: 1px solid var(--booking-border, #d0d5dd);
      border-radius: var(--booking-radius, 1rem);
      background: var(--booking-background, #fff);
    }
    h2, p { margin: 0; }
    .muted { color: var(--booking-muted, #667085); }
    .controls, .services, .slots { display: grid; gap: 0.75rem; }
    .controls { grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); }
    .services, .slots { grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr)); }
    .delivery { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .delivery button { text-align: center; }
    label { display: grid; gap: 0.35rem; }
    input, button {
      min-height: 2.75rem;
      border: 1px solid var(--booking-border, #d0d5dd);
      border-radius: 0.75rem;
      background: #fff;
      color: inherit;
      font: inherit;
    }
    input { width: 100%; padding: 0.55rem 0.7rem; }
    button { padding: 0.65rem 0.8rem; cursor: pointer; text-align: left; }
    button[aria-pressed='true'] {
      border-color: var(--booking-accent, #175cd3);
      outline: 2px solid color-mix(in srgb, var(--booking-accent, #175cd3) 22%, transparent);
    }
    .slot { display: grid; gap: 0.15rem; }
    .slot small { color: var(--booking-muted, #667085); }
    @media (prefers-reduced-motion: no-preference) {
      button { transition: border-color 140ms ease, transform 140ms ease; }
      button:hover { transform: translateY(-1px); }
    }
  `;

  declare businessId: string;
  declare reservations: readonly Reservation[];
  private declare date: string;
  private declare partySize: number;
  private declare serviceId: string;
  private declare deliveryMode: DeliveryMode;

  constructor() {
    super();
    this.businessId = defaultBusiness.id;
    this.reservations = [];
    this.date = dateInputValue(new Date());
    this.partySize = 1;
    this.serviceId = defaultBusiness.services[0]?.id ?? '';
    this.deliveryMode = defaultBusiness.services[0]?.deliveryModes?.[0] ?? 'business';
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (!changed.has('businessId')) return;
    const business = this.business;
    this.serviceId = business.services[0]?.id ?? '';
    this.partySize = 1;
    this.deliveryMode = business.services[0]?.deliveryModes?.[0] ?? 'business';
  }

  private get business() {
    return businesses.find((business) => business.id === this.businessId) ?? defaultBusiness;
  }

  private get service() {
    return this.business.services.find((service) => service.id === this.serviceId) ?? this.business.services[0];
  }

  private get slots(): readonly AvailableSlot[] {
    const service = this.service;
    if (!service) return [];
    return findAvailability(
      { business: this.business, service, date: this.date, partySize: this.partySize },
      this.reservations,
    ).slice(0, 12);
  }

  private selectSlot(slot: AvailableSlot): void {
    const service = this.service;
    if (!service) return;
    this.dispatchEvent(
      new CustomEvent<BookingSlotSelectedDetail>('booking-slot-selected', {
        detail: {
          businessId: this.business.id,
          serviceId: service.id,
          resourceId: slot.resourceId,
          start: slot.start.toISOString(),
          end: slot.end.toISOString(),
          partySize: this.partySize,
          deliveryMode: this.deliveryMode,
        },
        bubbles: true,
        composed: true,
      }),
    );
  }

  override render() {
    const business = this.business;
    const service = this.service;
    if (!service) return html`<p>No services are configured.</p>`;
    const deliveryModes: readonly DeliveryMode[] = service.deliveryModes ?? ['business'];

    return html`
      <section class="surface" aria-label="Booking availability">
        <header>
          <p class="muted">Embeddable booking</p>
          <h2>${business.name}</h2>
          <p class="muted">${business.tagline}</p>
        </header>

        <div class="services" aria-label="Services">
          ${business.services.map(
            (item) => html`
              <button
                type="button"
                aria-pressed=${item.id === service.id}
                @click=${() => {
                  this.serviceId = item.id;
                  this.partySize = 1;
                  this.deliveryMode = item.deliveryModes?.[0] ?? 'business';
                }}
              >
                <strong>${item.name}</strong><br />
                <small>${formatMoney(item.priceCents, business.currency)}</small>
              </button>
            `,
          )}
        </div>

        <div class="delivery" role="group" aria-label="Service delivery">
          ${deliveryModes.map(
            (mode) => html`
              <button
                type="button"
                aria-pressed=${mode === this.deliveryMode}
                @click=${() => {
                  this.deliveryMode = mode;
                }}
              >
                ${mode === 'business' ? 'At the business' : mode === 'customer' ? 'At your location' : 'Online'}
              </button>
            `,
          )}
        </div>

        <div class="controls">
          <label>
            Date
            <input
              type="date"
              .value=${this.date}
              @change=${(event: Event) => {
                this.date = (event.currentTarget as HTMLInputElement).value;
              }}
            />
          </label>
          <label>
            Party size
            <input
              type="number"
              min="1"
              max=${service.maxPartySize}
              .value=${String(this.partySize)}
              @input=${(event: Event) => {
                const value = Number((event.currentTarget as HTMLInputElement).value);
                this.partySize = Math.min(service.maxPartySize, Math.max(1, value || 1));
              }}
            />
          </label>
        </div>

        <p class="muted">
          ${this.slots.length > 0
            ? `${this.slots.length} available option${this.slots.length === 1 ? '' : 's'}`
            : 'No availability'}
        </p>

        <div class="slots">
          ${this.slots.map(
            (slot) => html`
              <button class="slot" type="button" @click=${() => this.selectSlot(slot)}>
                <strong>${formatSlot(slot.start)}</strong>
                <small>
                  ${business.resources.find((resource) => resource.id === slot.resourceId)?.name ?? 'Resource'}
                </small>
              </button>
            `,
          )}
        </div>
      </section>
    `;
  }
}

if (!customElements.get('booking-widget')) {
  customElements.define('booking-widget', BookingWidget);
}

declare global {
  interface HTMLElementTagNameMap {
    'booking-widget': BookingWidget;
  }
}
