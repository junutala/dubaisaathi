/**
 * Entity types for Dubai Saathi.
 *
 * These names are fixed by CLAUDE.md ("Data entities") and come from the product concept.
 * Defined once here, imported by both the PWA and the API — do not redeclare them locally.
 */

/** ISO-8601 instant, e.g. `2026-09-13T04:12:00Z`. */
export type Timestamp = string;

/** WGS84 coordinate. */
export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/**
 * Multi-script name. Hinglish is first-class, so every user-facing name carries Roman and
 * Devanagari forms plus the misspellings travellers actually type or say.
 */
export interface LocalisedName {
  /** Canonical English/Roman form shown in UI, e.g. `Karama`. */
  readonly en: string;
  /** Devanagari Hindi form, e.g. `करामा`. */
  readonly hi: string;
  /** Arabic form, where it matters for showing to a local. */
  readonly ar?: string;
  /**
   * Extra strings that should resolve to this entity: Roman variants, common misspellings,
   * spoken forms. Matched after normalisation, so case and diacritics do not matter.
   */
  readonly aliases: readonly string[];
}

// --- Traveller-facing content -------------------------------------------------------------

export type PlaceKind =
  | 'neighbourhood'
  | 'landmark'
  | 'mall'
  | 'hotel'
  | 'airport'
  | 'beach'
  | 'souk'
  | 'park'
  | 'transport';

export interface DubaiPlace {
  readonly id: string;
  readonly name: LocalisedName;
  readonly kind: PlaceKind;
  readonly location: LatLng;
  /** Neighbourhood this sits in, for "near me" grouping. */
  readonly areaId?: string;
}

/** Dietary tags an Indian traveller actually filters on. */
export type FoodTag =
  | 'vegetarian'
  | 'jain'
  | 'sattvik'
  | 'no-onion'
  | 'no-garlic'
  | 'eggless'
  | 'vrat'
  | 'indian-vegetarian'
  | 'quick-snack'
  | 'south-indian'
  | 'gujarati'
  | 'thali';

export interface Restaurant {
  readonly id: string;
  readonly name: LocalisedName;
  readonly location: LatLng;
  readonly areaId?: string;
  readonly tags: readonly FoodTag[];
  /** Indicative cost for one person, in AED. */
  readonly approxCostAed?: number;
  readonly phone?: string;
  readonly notes?: LocalisedText;
}

export interface Menu {
  readonly id: string;
  readonly restaurantId: string;
  /** Curated for the MVP — photographs of the real menu are acceptable content. */
  readonly photoPaths: readonly string[];
  readonly items: readonly MenuItem[];
}

export interface MenuItem {
  readonly name: LocalisedName;
  readonly tags: readonly FoodTag[];
  readonly priceAed?: number;
}

// --- Transport ----------------------------------------------------------------------------

export type TransportMode = 'walk' | 'metro' | 'tram' | 'bus' | 'taxi';

export interface TransportNode {
  readonly id: string;
  readonly name: LocalisedName;
  readonly location: LatLng;
  /** Modes served at this node; an interchange serves more than one. */
  readonly modes: readonly TransportMode[];
}

export interface TransportEdge {
  readonly id: string;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly mode: TransportMode;
  readonly durationSeconds: number;
  /** Nominal fare in AED where known; taxi is estimated, not tabulated. */
  readonly fareAed?: number;
  /** Line or route label shown to the traveller, e.g. `Red Line`, `C7`. */
  readonly line?: string;
}

export interface RouteLeg {
  readonly mode: TransportMode;
  readonly fromNodeId: string;
  readonly toNodeId: string;
  readonly durationSeconds: number;
  readonly line?: string;
}

export interface Route {
  readonly id: string;
  readonly legs: readonly RouteLeg[];
  readonly totalDurationSeconds: number;
  readonly totalFareAed?: number;
  readonly walkingSeconds: number;
  readonly interchangeCount: number;
}

// --- Communication and emergency ----------------------------------------------------------

/** Where a phrase is used — drives the phrasebook grouping. */
export type PhraseSituation = 'taxi' | 'restaurant' | 'shopping' | 'hotel' | 'emergency';

export interface LocalisedText {
  readonly hi: string;
  readonly en: string;
  readonly ar?: string;
}

export interface Phrase {
  readonly id: string;
  readonly situation: PhraseSituation;
  /** Hindi (Devanagari) as displayed back to the traveller. */
  readonly hi: string;
  /** Roman/Hinglish form, for readers who do not read Devanagari comfortably. */
  readonly hinglish: string;
  readonly en: string;
  /** Arabic to show the driver or waiter. */
  readonly ar: string;
  /** Arabic in Roman letters, so the traveller can attempt it aloud. */
  readonly arTranslit?: string;
}

export type EmergencyKind = 'police' | 'ambulance' | 'fire' | 'hospital' | 'pharmacy' | 'consulate';

export interface EmergencyPoint {
  readonly id: string;
  readonly kind: EmergencyKind;
  readonly name: LocalisedName;
  readonly phone?: string;
  readonly location?: LatLng;
  readonly open24h?: boolean;
}

// --- Accounts, passes and entitlement -----------------------------------------------------

export interface User {
  readonly id: string;
  readonly phone?: string;
  readonly email?: string;
  readonly createdAt: Timestamp;
}

export interface Device {
  readonly id: string;
  readonly userId?: string;
  readonly label?: string;
  readonly registeredAt: Timestamp;
}

export type PassKind = 'trial' | 'solo' | 'family';

export type PassStatus = 'inactive' | 'active' | 'expired';

export interface Pass {
  readonly id: string;
  readonly kind: PassKind;
  readonly status: PassStatus;
  /** Set only once arrival in Dubai is confirmed — never from a single GPS fix. */
  readonly activatedAt?: Timestamp;
  readonly expiresAt?: Timestamp;
  readonly ownerUserId?: string;
}

export interface Family {
  readonly id: string;
  readonly passId: string;
  readonly ownerUserId: string;
  readonly maxDevices: number;
}

export interface FamilyDevice {
  readonly familyId: string;
  readonly deviceId: string;
  readonly joinedAt: Timestamp;
  readonly revokedAt?: Timestamp;
}

/** Version stamp for a downloaded offline data pack. */
export interface ContentVersion {
  readonly id: string;
  readonly version: number;
  readonly publishedAt: Timestamp;
  readonly downloadedAt?: Timestamp;
}
