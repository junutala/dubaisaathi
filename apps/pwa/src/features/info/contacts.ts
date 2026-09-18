import type { EmergencyPoint } from '@saathi/shared';
import raw from '../../../../../data/emergency/contacts.v1.json';

/**
 * The four numbers ज़रूरी जानकारी's first capsule shows (decision 028), out of the pack and
 * nowhere else — a traveller who needs them has no signal by definition of the situation.
 *
 * The consulate is here because an Indian in trouble in Dubai reaches for it and nothing in the
 * phone knows the number; the other three because an Indian otherwise dials 100, which is what
 * decision 002 said in September and what this finally builds.
 */
export type ContactKind = 'consulate' | 'police' | 'ambulance' | 'fire';

export interface Contact extends Pick<EmergencyPoint, 'id'> {
  readonly kind: ContactKind;
  /** Required here, unlike on `EmergencyPoint`: a contact with no number is not a contact. */
  readonly phone: string;
  readonly name: { readonly hi: string; readonly en: string };
  readonly where: { readonly hi: string; readonly en: string };
}

export const CONTACTS: readonly Contact[] = raw.contacts as readonly Contact[];
