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
  /**
   * Where this sits among the places travellers actually ask for, 1 being the most asked. Absent
   * for the rest. It is content rather than code so that, once the learning loop is syncing,
   * real demand sets it instead of anyone's opinion of it (`voice_events.resolved_place_id`).
   */
  readonly popularity?: number;
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
/**
 * The neighbourhoods travellers and collectors both name. One list, so the chip a collector
 * taps in a shop and the word on a traveller's row cannot drift apart. An outlet's `areaId`
 * is one of these; a name a collector typed that is not here rides along as free text.
 */
export const AREAS = [
  { id: 'karama', en: 'Karama', hi: 'करामा' },
  { id: 'bur-dubai', en: 'Bur Dubai', hi: 'बुर दुबई' },
  { id: 'meena-bazaar', en: 'Meena Bazaar', hi: 'मीना बाज़ार' },
  { id: 'deira', en: 'Deira', hi: 'देरा' },
  { id: 'al-rigga', en: 'Al Rigga', hi: 'अल रिग्गा' },
  { id: 'satwa', en: 'Satwa', hi: 'सतवा' },
  { id: 'oud-metha', en: 'Oud Metha', hi: 'ऊद मेथा' },
  { id: 'al-nahda', en: 'Al Nahda', hi: 'अल नहदा' },
  { id: 'al-qusais', en: 'Al Qusais', hi: 'अल क़ुसैस' },
  { id: 'al-barsha', en: 'Al Barsha', hi: 'अल बरशा' },
  { id: 'business-bay', en: 'Business Bay', hi: 'बिज़नेस बे' },
  { id: 'jumeirah', en: 'Jumeirah', hi: 'जुमेरा' },
  { id: 'dubai-marina', en: 'Dubai Marina', hi: 'दुबई मरीना' },
  { id: 'jlt', en: 'JLT', hi: 'जेएलटी' },
  { id: 'discovery-gardens', en: 'Discovery Gardens', hi: 'डिस्कवरी गार्डन्स' },
  { id: 'international-city', en: 'International City', hi: 'इंटरनेशनल सिटी' },
] as const;
export type AreaId = (typeof AREAS)[number]['id'];

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
  /**
   * Whether it delivers, asked of a person like everything else here. Absent means nobody has
   * asked; it is never shown as a no. A call needs no data and no pack, which makes this the
   * most offline thing the app can offer a traveller who does not want to walk.
   */
  readonly delivers?: 'yes' | 'no';
  readonly notes?: LocalisedText;
  /**
   * What was asked in person, per `FieldReport.dietary`. Absent means nobody has asked yet —
   * which is shown as "पूछिए", never as a no. Claiming a kitchen cannot feed a Jain traveller
   * when nobody checked is the same defect as claiming it can.
   */
  readonly dietary?: Readonly<Record<string, 'yes' | 'on-request' | 'no'>>;
  /** Named dishes a collector confirmed, e.g. a Jain sambar. Worth more than a kitchen-level flag. */
  readonly confirmedDishes?: readonly ConfirmedDish[];
  /**
   * When it opens and closes, carried through from the visit rather than dropped at the last
   * step. The owner insisted this be collected and was right to: Dubai does not sleep, the late
   * places have no web presence, and a traveller at 2am is the moment this app earns the telling
   * of it. Collecting it and then not shipping it would have been the worst of both.
   */
  readonly hours?: OpeningHours;
  /** When a person last confirmed those hours, so a card can say "checked in March" honestly. */
  readonly hoursConfirmedAt?: Timestamp;
  /** Who answered — "Suresh, manager". It is what makes a dietary claim checkable later. */
  readonly spokeTo?: string;
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

/**
 * A sentence a traveller asked for and kept.
 *
 * The point is offline: a phrase translated once, on hotel wifi or before the flight, is theirs
 * for the rest of the trip with the radio off. Composed sentences are free — they rebuild from
 * their own words — but anything that needed a translator has to be kept or it is gone the
 * moment the signal is.
 *
 * It is also how a traveller prepares. Somebody who knows they will need to ask about a
 * wheelchair, or a SIM card, or their child's medicine can have those sentences ready before
 * they land, which no phrasebook we write in advance can anticipate.
 */
export interface SavedPhrase {
  readonly id: string;
  /** What they wrote, in their own words and script. */
  readonly said: string;
  readonly ar: string;
  /** Which engine produced the Arabic, so a bad batch can be found later. */
  readonly engine: string;
  readonly savedAt: Timestamp;
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
  /**
   * The Nol zone, '0001' to '0007'. Nol is charged by the number of zones a journey passes
   * through, never by its length, so this is what a fare is worked out from.
   *
   * Absent where the RTA does not put the stop in a Nol zone at all — the inter-emirate stops
   * in Sharjah, Ajman and Fujairah, and the marine stations. Those are a different tariff, and
   * a journey touching one cannot be priced from this table.
   */
  readonly zone?: string;
}

/**
 * One hop of one line, in the direction the vehicle actually travels. The RTA feed carries both
 * directions of every route as separate trips, so a loop route that only runs one way is one
 * way in the pack too; the planner never mirrors an edge.
 */
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
  /** Which of the line's two headsigns this hop runs toward (`TransportLine.towards`). */
  readonly direction?: 0 | 1;
  /**
   * First and last departure from `fromNodeId` on this line in this direction, on a typical
   * weekday, as `HH:MM` in Dubai time. This is the "is it still running" answer at the stop the
   * traveller is standing at — two clock times, not a timetable.
   */
  readonly firstDeparture?: string;
  readonly lastDeparture?: string;
}

/** A line or a numbered bus route, named in both interface languages. */
export interface TransportLine {
  readonly id: string;
  readonly mode: TransportMode;
  readonly name: LocalisedName;
  /** Typical minutes-between-vehicles on a weekday daytime, measured from the feed, in seconds. */
  readonly headwaySeconds?: number;
  /** The headsign in each direction (index = `TransportEdge.direction`): "Expo की ओर". */
  readonly towards?: readonly { readonly en: string; readonly hi: string }[];
}

/**
 * Nol's tariff for one class of card.
 *
 * Charged by the number of zones a journey passes through, never by how far it goes. Dubai has
 * seven; the RTA's own wording is "you will be charged according to the total number of zones
 * you have passed", and its table names exactly these three bands.
 */
export interface ZoneFare {
  readonly oneZone: number;
  /** Two zones, which for a journey that passes through them are always adjacent. */
  readonly twoZones: number;
  readonly moreZones: number;
}

/** The classes of Nol the RTA publishes a fare for. */
export const NOL_CLASSES = ['silver', 'personal', 'gold', 'redTicket', 'redTicketGold'] as const;
export type NolClass = (typeof NOL_CLASSES)[number];

/**
 * What the RTA allows inside one journey. A journey that breaks these is two journeys and two
 * fares, so a plan that exceeds them is quoting a price the traveller will not be charged.
 */
export interface JourneyRules {
  readonly maxTransfers: number;
  readonly maxJourneyMinutes: number;
  /** Leaving one mode and boarding another inside this many minutes keeps it one journey. */
  readonly modeChangeMinutes: number;
}

export interface TaxiFare {
  readonly flagFallAed: number;
  readonly perKmAed: number;
  readonly minimumAed: number;
  /** A meter is not a timetable: the fare is shown as a range this wide either side. */
  readonly spreadPercent: number;
}

/**
 * What a journey costs — its own pack, published on its own (`data/transport/fares.v1.json`).
 *
 * It used to live inside the transport network, which meant correcting a flag fall republished
 * 1.7 MB of stations to change four numbers. The RTA re-sets the taxi per-km rate every month
 * against fuel, so that is a monthly 1.7 MB for every phone. Split out it is under a kilobyte,
 * and a fare correction never has to wait behind a feed refresh or risk one.
 *
 * Nothing here comes from the RTA's GTFS: the feed carries no fare_attributes.txt and no
 * fare_rules.txt, so every figure is entered by hand against the published tariff and carries
 * the date it took effect.
 */
export interface FarePack {
  /** Moves whenever a figure below changes, and only then. Phones take the higher number. */
  readonly fareVersion: number;
  /** The date the RTA's tariff these figures describe came into force. */
  readonly effectiveFrom: string;
  readonly publishedAt: string;
  /** ISO 4217. Every amount in this pack is in it. */
  readonly currency: string;
  /** Where each figure was read from, so the next person does not have to guess. */
  readonly source: string;
  /** The class we quote on screen. A traveller on a 14-day trip holds a Silver card. */
  readonly quote: NolClass;
  /** Every class the RTA publishes, so a screen can show another without a data change. */
  readonly nol: Readonly<Record<NolClass, ZoneFare>>;
  readonly journeyRules: JourneyRules;
  readonly taxi: TaxiFare;
}

/**
 * The transport network as it ships: `data/transport/network.v1.json`, written by
 * `packages/content-tools/src/publishTransport.ts` from the RTA's GTFS feed and read by रास्ता.
 * Content, not code: a corrected station is a data release, and nothing here is fetched at
 * runtime.
 */
export interface TransportNetwork {
  readonly contentVersion: number;
  readonly publishedAt: string;
  /** Where the rows came from, so the next reader does not have to guess. */
  readonly source: string;
  /** The line the licence asks us to show wherever the rows are shown. */
  readonly attribution: string;
  readonly walkingMetresPerMinute: number;
  /** What a traveller spends on the platform before the doors open, by mode, when the line's own headway is not known. */
  readonly waitSeconds: Readonly<Record<'metro' | 'bus', number>>;
  readonly lines: readonly TransportLine[];
  readonly nodes: readonly TransportNode[];
  readonly edges: readonly TransportEdge[];
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
  // Understood perfectly, and we had nothing to answer with. This is not a parser fault and must
  // never be counted as one: it is a work order for collection. "Forty-seven people asked for
  // Jain sambar near Karama" is the most useful row in this table.
  | 'nothing-in-pack'
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
  /**
   * How many results the traveller was shown. Zero with no failure is impossible; zero with
   * `nothing-in-pack` is the row that says what to go and collect. Present on searches only.
   */
  readonly resultCount?: number;
  /**
   * The place the parser resolved, when it resolved one. This is what makes an aggregate
   * countable: "Mall of the Emirates" arrives as `mall of emirates`, `माला एमरेट्स` and `MOE`,
   * and counting the text would undercount every one of them.
   *
   * It is an id, not a position. Nothing anywhere records where a traveller physically went —
   * only what they asked for — so this aggregates to "40 devices asked the way to Mall of the
   * Emirates in 30 days" and can never reconstruct one person's trip.
   */
  readonly resolvedPlaceId?: string;
  /** Short clip kept only for failures, only with consent, deleted after sync. */
  readonly audioClipId?: string;
  readonly synced: boolean;
}

/**
 * Opening hours, in the only shape that can answer "is it open now?" on a phone with no
 * network. `closes` earlier than `opens` means past midnight: a 03:00 close belongs to the day
 * that opened, not to the next one.
 */
export interface DayHours {
  readonly opens: string;
  readonly closes: string;
}

export interface OpeningHours {
  /** The common case by far: the same times every day, so the collector answers once. */
  readonly everyDay?: DayHours;
  /** Sunday is 0. Only present when the outlet genuinely differs by day. */
  readonly byDay?: Readonly<Record<number, DayHours>>;
  /** Said plainly rather than derived at read time, because it is the 2am query. */
  readonly openLate?: boolean;
  readonly open24?: boolean;
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
  /**
   * The number printed on the paper form this pin belongs to (decision 029).
   *
   * A rider drops a numbered form at a counter, asks the five questions, staples the takeaway
   * menu to it, and then stands outside and records where he is. The paper carries the answers
   * and the menu; this carries the coordinates and the frontage. The serial is what joins them
   * at review — printed, never handwritten, because OCR on a hand-written 7 that reads as a 1
   * would put one shop's pin on another shop's answers, and खाना sorts nearest first.
   *
   * Its presence marks a report as a pin awaiting its paper: `toRestaurant` refuses to publish
   * one until the form's answers have been keyed in behind it.
   */
  readonly formSerial?: string;
  /** The neighbourhood, from the shared list when the collector tapped one. */
  readonly areaId?: AreaId;
  /** Or as the collector wrote it, when the list did not have it. */
  readonly areaName?: string;
  /** The number on the board, asked for whether or not they deliver: a traveller rings to ask. */
  readonly phone?: string;
  /** Asked in person, not read off a sign. */
  /**
   * Absent on a rider's pin (decision 029): the five answers are on the paper form and are keyed
   * in behind it. Absent means nobody has asked, which is what the traveller sees as पूछकर — the
   * one thing that must never be guessed at, in the data or in the interface.
   */
  readonly dietary?: {
    readonly jain: boolean | 'on-request';
    readonly vrat: boolean | 'on-request';
    readonly sattvik: boolean | 'on-request';
    readonly noOnionGarlic: boolean | 'on-request';
    readonly eggless: boolean | 'on-request';
  };
  /** What kind of kitchen it is — the first thing a card says, so it is one of the four required. */
  readonly kitchen?: KitchenKind;
  /** Asked, not assumed — a number on a signboard does not mean they will bring it to a hotel. */
  readonly delivers?: 'yes' | 'no';
  readonly deliveryPhone?: string;
  /**
   * When it opens and closes, structured rather than written out.
   *
   * The owner insisted this stays, and was right to: Dubai does not sleep, and a traveller at
   * 2am after a party is the moment this app becomes the reason they tell someone about it. The
   * late places have no web presence, so nobody else can answer it. Free text cannot — "11am to
   * late" computes nothing — so it is times, and `opens` may be later than `closes` when a
   * kitchen runs past midnight.
   */
  readonly hours?: OpeningHours;
  /** When a person last confirmed those hours, so a card can say "checked in March" honestly. */
  readonly hoursConfirmedAt?: Timestamp;
  /** Who answered the questions — "Suresh, manager". Makes a dietary claim checkable later. */
  readonly spokeTo?: string;
  /** Named dishes this kitchen said it will make to a constraint. The Jain sambar. */
  readonly confirmedDishes?: readonly ConfirmedDish[];
  readonly priceForOneAed?: number;
  readonly frontPhotoIds: readonly string[];
  readonly menuPhotoIds: readonly string[];
  readonly notes?: string;
  readonly status: FieldReportStatus;
  readonly reviewNote?: string;
}

/**
 * A message somebody sent us — the website's form writes one straight to `contact_messages`
 * (decision 023). The traveller's app briefly had a screen that wrote them too; that screen was
 * removed the day it shipped (decision 026, reversed), and Dexie's `messages` table stays behind
 * it because a phone that opened that build has a v7 database and must still be able to open it.
 */
export interface ContactMessage {
  /** Made on the device, so a retried send cannot duplicate the row on the server. */
  readonly id: string;
  readonly at: string;
  readonly name: string;
  /** Which dialling code was picked. The number itself is digits only. */
  readonly country: 'IN' | 'AE';
  readonly phone: string;
  readonly message: string;
  /** The catalogue they were reading, so the reply goes out in the language they chose. */
  readonly locale: 'hi' | 'en';
  /** The phone's own bookkeeping. The server never sees it. */
  readonly synced: boolean;
}
