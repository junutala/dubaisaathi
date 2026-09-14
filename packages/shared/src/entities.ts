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

/**
 * Dietary tags an Indian traveller actually filters on. A runtime list as well as a type,
 * because the intent keyword pack is JSON and has to be checked against something.
 */
export const FOOD_TAGS = [
  'vegetarian',
  'jain',
  'sattvik',
  'no-onion',
  'no-garlic',
  'eggless',
  'vrat',
  'indian-vegetarian',
  'quick-snack',
  'south-indian',
  'north-indian',
  'gujarati',
  'punjabi',
  'chinese',
  'arabic',
  'thali',
] as const;
export type FoodTag = (typeof FOOD_TAGS)[number];

/**
 * What kind of kitchen it is — the first thing an Indian traveller needs to know and the first
 * thing a card says. Its own field rather than a tag because every outlet has exactly one, and
 * because the distinction a tag array cannot make is the one that matters: `pure-veg` is a
 * kitchen with no meat in it, `mixed` serves vegetarian food cooked alongside meat. For a great
 * many travellers those are not the same answer, and "vegetarian options available" hides it.
 */
export const KITCHEN_KINDS = ['pure-veg', 'mixed', 'non-veg'] as const;
export type KitchenKind = (typeof KITCHEN_KINDS)[number];

export interface Restaurant {
  readonly id: string;
  readonly name: LocalisedName;
  readonly location: LatLng;
  readonly areaId?: string;
  readonly kitchen: KitchenKind;
  readonly tags: readonly FoodTag[];
  /** Indicative cost for one person, in AED. */
  readonly approxCostAed?: number;
  readonly phone?: string;
  readonly notes?: LocalisedText;
  /**
   * What was asked in person, per `FieldReport.dietary`. Absent means nobody has asked yet —
   * which is shown as "पूछिए", never as a no. Claiming a kitchen cannot feed a Jain traveller
   * when nobody checked is the same defect as claiming it can.
   */
  readonly dietary?: Readonly<Record<string, 'yes' | 'on-request' | 'no'>>;
  /** Named dishes a collector confirmed, e.g. a Jain sambar. Worth more than a kitchen-level flag. */
  readonly confirmedDishes?: readonly ConfirmedDish[];
}

/**
 * One dish, named, that a collector was told this kitchen will make to a dietary constraint.
 * "यहाँ जैन सांबर मिलता है" is specific, checkable and useful; "जैन: पूछिए" is neither.
 */
export interface ConfirmedDish {
  readonly name: LocalisedName;
  readonly tags: readonly FoodTag[];
  readonly priceAed?: number;
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

export const TRANSPORT_MODES = ['walk', 'metro', 'tram', 'bus', 'taxi'] as const;
export type TransportMode = (typeof TRANSPORT_MODES)[number];

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

/**
 * Where a phrase is used — drives the grouping on 3.1. There is no emergency situation:
 * the app has no emergency feature (decision 002).
 */
export const PHRASE_SITUATIONS = ['taxi', 'hotel', 'shopping', 'restaurant'] as const;

export type PhraseSituation = (typeof PHRASE_SITUATIONS)[number];

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

/**
 * A pass is a token signed by the server and verified on the device with the public key
 * shipped in the app. Validity is read from the signature, never from a live check.
 * A family pass issues four of these at purchase: slot 0 on the buyer's phone, slots 1–3 as
 * QR codes; a member scans one and installs it offline. See docs/decisions/005.
 */
export interface Pass {
  readonly id: string;
  readonly kind: PassKind;
  readonly status: PassStatus;
  /** 0 for a solo pass or the family owner; 1–3 for the family QR slots. */
  readonly slot: number;
  readonly familyId?: string;
  /** Set only once arrival in Dubai is confirmed — never from a single GPS fix. */
  readonly activatedAt?: Timestamp;
  readonly expiresAt?: Timestamp;
  /** The server's signature over {id, kind, slot, familyId, expiresAt}. */
  readonly signature: string;
  /** Filled in when a device installs the pass; reported to the server on next sync. */
  readonly deviceId?: string;
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

// --- Learning loop and field collection ---------------------------------------------------

/** Why a voice interaction is worth looking at. Successes carry `null`. */
export type VoiceFailure =
  // The speech never arrived. These decide the PWA-vs-native gate: how often a traveller taps
  // the mic and the phone simply cannot hear Hindi.
  | 'no-permission'
  | 'no-speech'
  | 'no-engine'
  // Not the phone's fault: the page was not served over a secure origin, so the browser hid
  // speech recognition. Counted apart so it never lands in the gate's numbers.
  | 'insecure-context'
  | 'stt-error'
  // The speech arrived and the parser could not use it. These retrain the packs in `data/`.
  | 'unknown-intent'
  | 'low-confidence'
  | 'clarifier-shown'
  | 'unresolved-place'
  | 'unresolved-dish'
  | 'unresolved-document'
  | 'backed-out'
  | 'retried';

/**
 * One voice interaction, recorded on the device and synced when online. Keyed to the device
 * only. The failures are what retrain the aliases and intents in `data/`.
 */
export interface VoiceEvent {
  readonly id: string;
  readonly deviceId: string;
  readonly at: Timestamp;
  /** Which engine and model produced the transcript, so a regression is visible. */
  readonly sttEngine: string;
  readonly sttModel: string;
  readonly transcript: string;
  /**
   * What the engine heard, when the traveller corrected it before pressing send. The transcript is
   * then what they meant and this is what was recognised — a labelled pair, from the one person who
   * knows the right answer. It is the strongest signal in this table: every row with this field set
   * is a recogniser error with its own correction attached.
   */
  readonly correctedFrom?: string;
  /**
   * What the offline model heard with nothing constraining its vocabulary, when it differs from
   * the transcript above. The transcript comes from a recogniser biased toward the words in
   * `data/intents/`, which is what makes it hear place names; this is the unbiased reading, and
   * it is the only place a word we have never curated can appear. Absent for every other engine.
   */
  readonly unconstrainedTranscript?: string;
  /** Whether the transcript was Devanagari, Roman, or mixed — Hinglish is the common case. */
  readonly script: 'devanagari' | 'roman' | 'mixed';
  readonly intent: string;
  readonly confidence: number;
  /** The screen the parser routed to, e.g. `1.3`, or `clarifier`. */
  readonly landedOn: string;
  readonly failure: VoiceFailure | null;
  /** Which clarifier option was picked, when one was shown. */
  readonly clarifierChoice?: string;
  /** Short clip kept only for failures, only with consent, deleted after sync. */
  readonly audioClipId?: string;
  readonly synced: boolean;
}

export type FieldReportKind = 'restaurant' | 'place' | 'pharmacy' | 'hotel';

export type FieldReportStatus = 'draft' | 'queued' | 'uploaded' | 'approved' | 'rejected';

/**
 * What a collector captures standing in the restaurant. Reviewed in content-tools before it
 * becomes a Restaurant + Menu in the next ContentVersion.
 */
export interface FieldReport {
  readonly id: string;
  readonly kind: FieldReportKind;
  readonly collectorId: string;
  readonly capturedAt: Timestamp;
  readonly location: LatLng;
  readonly name: string;
  readonly nameHi?: string;
  readonly areaName?: string;
  /** Asked in person, not read off a sign. */
  readonly dietary: {
    readonly jain: boolean | 'on-request';
    readonly vrat: boolean | 'on-request';
    readonly sattvik: boolean | 'on-request';
    readonly noOnionGarlic: boolean | 'on-request';
    readonly eggless: boolean | 'on-request';
  };
  readonly deliveryPhone?: string;
  readonly hours?: string;
  readonly priceForOneAed?: number;
  readonly frontPhotoIds: readonly string[];
  readonly menuPhotoIds: readonly string[];
  readonly notes?: string;
  readonly status: FieldReportStatus;
  readonly reviewNote?: string;
}
