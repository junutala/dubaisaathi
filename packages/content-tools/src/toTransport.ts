import type {
  LatLng,
  LocalisedName,
  TransportEdge,
  TransportLine,
  TransportMode,
  TransportNetwork,
  TransportNode,
} from '@saathi/shared';
import { csvRows, readCsv } from './gtfs/csv.ts';

/**
 * The RTA's GTFS feed → the pack रास्ता reads. Pure: files in, network out, so the graph
 * conversion — where the bugs will be — is tested without a zip or a disk.
 *
 * What is taken (docs/transport-and-maps-strategy.md): the topology (every stop, every hop of
 * every route in the direction it runs), the typical weekday headway per line, and the first
 * and last departure at every stop of every line. What is dropped: the trips themselves, the
 * calendar exceptions, the shapes, the marine routes (no mode for them yet). A traveller asks
 * "how do I get there" and "is it still running", never "does the 8 leave at 14:37".
 *
 * Platforms collapse into stations for the metro and the tram — the feed lists "BurJuman Metro
 * Station 1" and "… 2" as two stops fifty metres apart, and a traveller is at BurJuman. Bus
 * stops stay as the RTA signs them, one per side of the road, with their English names: two
 * thousand of them is not a list anyone curates, and the matcher folds Hinglish typing onto
 * English already.
 */

/** The text of each file in the archive, by its GTFS name. */
export type GtfsFiles = Readonly<Record<string, string>>;

/** A station whose name we chose: the signage English, its Devanagari, its aliases. */
export interface CuratedStation {
  readonly id: string;
  readonly mode: TransportMode;
  readonly name: LocalisedName;
  readonly location: LatLng;
  /** For a bus stop: the feed's own id of the bay, which beats any distance. */
  readonly stopId?: string;
}

export interface ConvertOptions {
  readonly contentVersion: number;
  readonly publishedAt: string;
  readonly stations: readonly CuratedStation[];
  readonly walkingMetresPerMinute: number;
  readonly waitSeconds: TransportNetwork['waitSeconds'];
}

/**
 * The feed's own route codes for the rail lines, and the ids the app has always used.
 *
 * The RTA re-cut the Red Line between the 2021 and 2025 feeds: `MRed` (Centrepoint–Expo) and
 * `MBrch` (the UAE Exchange branch) became `MRed1` and `MRed2`, which are the same two services
 * under new codes — MRed1 still runs to Expo, MRed2 to Life Pharmacy, the station that was UAE
 * Exchange. Both spellings stay here, so an older archive still converts to the same line ids
 * and the pack's edge ids do not churn.
 */
const RAIL_LINE_IDS: Readonly<Record<string, string>> = {
  MRed: 'red',
  MRed1: 'red',
  MGrn: 'green',
  MBrch: 'red-branch',
  MRed2: 'red-branch',
  T1: 'tram',
};

const RAIL_LINE_NAMES: Readonly<Record<string, { readonly en: string; readonly hi: string }>> = {
  red: { en: 'Red Line', hi: 'रेड लाइन' },
  green: { en: 'Green Line', hi: 'ग्रीन लाइन' },
  'red-branch': { en: 'Red Line (Life Pharmacy branch)', hi: 'रेड लाइन (लाइफ़ फ़ार्मेसी शाखा)' },
  tram: { en: 'Tram', hi: 'ट्राम' },
};

/** GTFS `route_type` → our modes. Anything else (the marine routes are type 4) is left out. */
const MODE_OF_ROUTE_TYPE: Readonly<Record<string, TransportMode>> = {
  '0': 'tram',
  '1': 'metro',
  '3': 'bus',
};

/**
 * Dubai's seven Nol zones, as `stops.txt` labels them.
 *
 * The feed puts a `zone_id` on every stop, but not all of them are Nol zones: the Sharjah,
 * Ajman and Fujairah stops carry their own stop id in that column, and the marine stations
 * carry theirs. Those journeys are priced by a different tariff altogether, so a stop outside
 * this set carries no zone rather than a wrong one — the fare then says it does not know,
 * which is the only honest answer for a bus to Ajman.
 */
const NOL_ZONES = new Set(['0001', '0002', '0003', '0004', '0005', '0006', '0007']);

/** A rail platform this close to a curated station, or a bus stop this close to a curated bus station, takes its name. */
const CURATED_RAIL_METRES = 300;
const CURATED_BUS_METRES = 150;
/** Two platform groups with the same name this close together are one station (BurJuman on both lines). */
const SAME_STATION_METRES = 300;
/** The daytime window the headway is measured over. */
const HEADWAY_FROM = 7 * 3600;
const HEADWAY_TO = 21 * 3600;

interface Stop {
  readonly id: string;
  readonly name: string;
  readonly location: LatLng;
  /** The Nol zone the RTA puts this stop in, when it is one of Dubai's seven. */
  readonly zone: string | undefined;
}

interface Trip {
  readonly line: string;
  readonly weekday: boolean;
  readonly direction: 0 | 1;
  readonly headsign: string;
}

interface Call {
  readonly sequence: number;
  readonly stopId: string;
  readonly departure: number;
}

function tidy(name: string): string {
  return name.replace(/\s+/g, ' ').trim();
}

/** The form two spellings of one station agree on: no platform number, no line in brackets. */
function stationName(name: string): string {
  const bare = tidy(tidy(name).replace(/\([^)]*\)/g, ' '));
  // "BurJuman Metro Station 2" → BurJuman; "Dubai Marina1" (a tram platform, digit glued on) →
  // Dubai Marina; "Jumeirah Beach Residence 1" is a station's own name and is left alone.
  const marked = bare.replace(/\s*(Metro|Tram) Station\s*\d*$/i, '');
  return tidy(marked === bare ? bare.replace(/(\D)\d+$/, '$1') : marked);
}

function fold(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/[^a-z0-9\p{Script=Devanagari}]+/gu, ' ')
    .trim();
}

function slug(name: string): string {
  return fold(name).replace(/\s+/g, '-');
}

function metres(a: LatLng, b: LatLng): number {
  const r = 6_371_008.8;
  const toRad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * toRad;
  const dLng = (b.lng - a.lng) * toRad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * toRad) * Math.cos(b.lat * toRad) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function round5(n: number): number {
  return Math.round(n * 1e5) / 1e5;
}

/** GTFS times run past midnight ("25:10:00" is ten past one); seconds since the service day. */
function seconds(hhmmss: string): number | null {
  const parts = hhmmss.split(':').map(Number);
  const [h, m, s] = parts;
  if (parts.length !== 3 || h === undefined || m === undefined || s === undefined) return null;
  if (!Number.isFinite(h) || !Number.isFinite(m) || !Number.isFinite(s)) return null;
  return h * 3600 + m * 60 + s;
}

function clock(secondsOfDay: number): string {
  const inDay = ((secondsOfDay % 86400) + 86400) % 86400;
  const h = Math.floor(inDay / 3600);
  const m = Math.floor((inDay % 3600) / 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = sorted[Math.floor(sorted.length / 2)];
  return middle ?? 0;
}

function mostCommon(values: readonly string[]): string {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  let best = '';
  let bestCount = 0;
  for (const [value, count] of counts) {
    if (count > bestCount) {
      best = value;
      bestCount = count;
    }
  }
  return best;
}

function readLines(feed: GtfsFiles): Map<string, TransportLine> {
  const lines = new Map<string, TransportLine>();
  for (const row of csvRows(feed['routes.txt'] ?? '')) {
    const mode = MODE_OF_ROUTE_TYPE[row.route_type ?? ''];
    if (mode === undefined) continue;
    const short = tidy(row.route_short_name ?? '');
    const id = RAIL_LINE_IDS[short] ?? (short || tidy(row.route_long_name ?? row.route_id ?? ''));
    const rail = RAIL_LINE_NAMES[id];
    const name: LocalisedName = rail
      ? { en: rail.en, hi: rail.hi, aliases: [short.toLowerCase()] }
      : { en: `Bus ${id}`, hi: `बस ${id}`, aliases: [id.toLowerCase()] };
    lines.set(row.route_id ?? '', { id, mode, name });
  }
  return lines;
}

function readStops(feed: GtfsFiles): Map<string, Stop> {
  const stops = new Map<string, Stop>();
  for (const row of csvRows(feed['stops.txt'] ?? '')) {
    const lat = Number(row.stop_lat);
    const lng = Number(row.stop_lon);
    const id = row.stop_id ?? '';
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || id === '') continue;
    const zone = row.zone_id ?? '';
    stops.set(id, {
      id,
      name: tidy(row.stop_name ?? ''),
      location: { lat, lng },
      zone: NOL_ZONES.has(zone) ? zone : undefined,
    });
  }
  return stops;
}

/**
 * Services that run on a Monday: the "typical weekday" the first/last times are quoted for.
 * From `calendar.txt` when the feed has one; otherwise from `calendar_dates.txt`, where a
 * service is a weekday one if most of the dates it is added on fall Monday to Thursday.
 */
function weekdayServices(feed: GtfsFiles): ReadonlySet<string> {
  const services = new Set<string>();
  for (const row of csvRows(feed['calendar.txt'] ?? '')) {
    if (row.monday === '1') services.add(row.service_id ?? '');
  }
  if (services.size > 0) return services;

  const weekdays = new Map<string, number>();
  const weekends = new Map<string, number>();
  for (const row of csvRows(feed['calendar_dates.txt'] ?? '')) {
    if (row.exception_type !== '1') continue;
    const date = row.date ?? '';
    const id = row.service_id ?? '';
    const day = new Date(
      Number(date.slice(0, 4)),
      Number(date.slice(4, 6)) - 1,
      Number(date.slice(6, 8)),
    ).getDay();
    const tally = day >= 1 && day <= 4 ? weekdays : weekends;
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  for (const [id, count] of weekdays) {
    if (count >= (weekends.get(id) ?? 0)) services.add(id);
  }
  return services;
}

interface Frequency {
  readonly start: number;
  readonly end: number;
  readonly headway: number;
}

/**
 * A feed may describe a route as one template trip plus "every 6 minutes from 05:00 to
 * 23:00" instead of listing every trip. Those windows become the departures the pack quotes.
 */
function readFrequencies(feed: GtfsFiles): ReadonlyMap<string, readonly Frequency[]> {
  const byTrip = new Map<string, Frequency[]>();
  for (const row of csvRows(feed['frequencies.txt'] ?? '')) {
    const start = seconds(row.start_time ?? '');
    const end = seconds(row.end_time ?? '');
    const headway = Number(row.headway_secs);
    if (start === null || end === null || !(headway > 0)) continue;
    const list = byTrip.get(row.trip_id ?? '') ?? [];
    list.push({ start, end, headway });
    byTrip.set(row.trip_id ?? '', list);
  }
  return byTrip;
}

/** The departure times a template trip stands for at a call `offset` seconds into it. */
function departuresAt(frequencies: readonly Frequency[], offset: number): number[] {
  const times: number[] = [];
  for (const window of frequencies) {
    for (let t = window.start; t < window.end; t += window.headway) times.push(t + offset);
  }
  return times;
}

function readTrips(
  feed: GtfsFiles,
  lines: ReadonlyMap<string, TransportLine>,
  weekday: ReadonlySet<string>,
): Map<string, Trip> {
  const trips = new Map<string, Trip>();
  for (const row of csvRows(feed['trips.txt'] ?? '')) {
    const line = lines.get(row.route_id ?? '');
    if (!line) continue;
    trips.set(row.trip_id ?? '', {
      line: line.id,
      weekday: weekday.size === 0 || weekday.has(row.service_id ?? ''),
      direction: row.direction_id === '1' ? 1 : 0,
      headsign: tidy(row.trip_headsign ?? ''),
    });
  }
  return trips;
}

function readCalls(feed: GtfsFiles, trips: ReadonlyMap<string, Trip>): Map<string, Call[]> {
  const calls = new Map<string, Call[]>();
  readCsv(feed['stop_times.txt'] ?? '', (row) => {
    const tripId = row.trip_id ?? '';
    if (!trips.has(tripId)) return;
    // A stop with no departure time (the feed leaves a few blank) is timed by its arrival.
    const stamp =
      row.departure_time === undefined || row.departure_time === ''
        ? row.arrival_time
        : row.departure_time;
    const departure = seconds(stamp ?? '');
    if (departure === null) return;
    const call: Call = {
      sequence: Number(row.stop_sequence),
      stopId: row.stop_id ?? '',
      departure,
    };
    const list = calls.get(tripId);
    if (list) list.push(call);
    else calls.set(tripId, [call]);
  });
  for (const list of calls.values()) list.sort((a, b) => a.sequence - b.sequence);
  return calls;
}

interface Station {
  readonly key: string;
  readonly mode: TransportMode;
  readonly name: string;
  readonly stopIds: string[];
  location: LatLng;
}

/** A station's zone is whatever its platforms agree on; they are metres apart, so they do. */
function zoneOf(stopIds: readonly string[], stops: ReadonlyMap<string, Stop>): string | undefined {
  const votes = stopIds
    .map((id) => stops.get(id)?.zone)
    .filter((zone): zone is string => zone !== undefined);
  return votes.length === 0 ? undefined : mostCommon(votes);
}

/**
 * Rail platforms → stations. Group by the feed's stop-id prefix (one station's platforms share
 * it), then merge groups that carry the same name and stand together: BurJuman's Red Line
 * platforms and its Green Line platforms are one place with two ids in the feed.
 */
function groupStations(
  stops: ReadonlyMap<string, Stop>,
  railStops: ReadonlyMap<string, TransportMode>,
): Station[] {
  const byPrefix = new Map<string, Station>();
  for (const [stopId, mode] of railStops) {
    const stop = stops.get(stopId);
    if (!stop) continue;
    const prefix = `${mode}:${stopId.length >= 5 ? stopId.slice(0, -2) : stopId}`;
    const group = byPrefix.get(prefix);
    if (group) group.stopIds.push(stopId);
    else {
      byPrefix.set(prefix, {
        key: prefix,
        mode,
        name: stationName(stop.name),
        stopIds: [stopId],
        location: stop.location,
      });
    }
  }
  const stations: Station[] = [];
  for (const group of byPrefix.values()) {
    const centre = centroid(group.stopIds.map((id) => stops.get(id)?.location ?? group.location));
    group.location = centre;
    const twin = stations.find(
      (s) =>
        s.mode === group.mode &&
        fold(s.name) === fold(group.name) &&
        metres(s.location, centre) <= SAME_STATION_METRES,
    );
    if (twin) {
      twin.stopIds.push(...group.stopIds);
      twin.location = centroid(twin.stopIds.map((id) => stops.get(id)?.location ?? centre));
    } else stations.push(group);
  }
  return stations;
}

function centroid(points: readonly LatLng[]): LatLng {
  const n = Math.max(1, points.length);
  return {
    lat: points.reduce((sum, p) => sum + p.lat, 0) / n,
    lng: points.reduce((sum, p) => sum + p.lng, 0) / n,
  };
}

function curatedFor(
  stations: readonly CuratedStation[],
  mode: TransportMode,
  name: string,
  location: LatLng,
  withinMetres: number,
  byName: boolean,
): CuratedStation | undefined {
  const folded = fold(name);
  if (byName) {
    const named = stations.find(
      (s) =>
        s.mode === mode &&
        (fold(s.name.en) === folded || s.name.aliases.some((alias) => fold(alias) === folded)),
    );
    if (named) return named;
  }
  let best: CuratedStation | undefined;
  let bestMetres = withinMetres;
  for (const s of stations) {
    if (s.mode !== mode) continue;
    const d = metres(s.location, location);
    if (d <= bestMetres) {
      best = s;
      bestMetres = d;
    }
  }
  return best;
}

export function toTransportNetwork(feed: GtfsFiles, options: ConvertOptions): TransportNetwork {
  const lineByRoute = readLines(feed);
  const lines = new Map<string, TransportLine>();
  for (const line of lineByRoute.values()) lines.set(line.id, line);
  const stops = readStops(feed);
  const trips = readTrips(feed, lineByRoute, weekdayServices(feed));
  const calls = readCalls(feed, trips);
  const frequencies = readFrequencies(feed);

  // Which stops the rail lines call at — those are platforms, and become stations.
  const railStops = new Map<string, TransportMode>();
  for (const [tripId, trip] of trips) {
    const mode = lines.get(trip.line)?.mode;
    if (mode !== 'metro' && mode !== 'tram') continue;
    for (const call of calls.get(tripId) ?? []) railStops.set(call.stopId, mode);
  }

  const nodeOfStop = new Map<string, string>();
  const nodes = new Map<string, TransportNode>();
  const usedCurated = new Set<string>();

  for (const station of groupStations(stops, railStops)) {
    const curated = curatedFor(
      options.stations,
      station.mode,
      station.name,
      station.location,
      CURATED_RAIL_METRES,
      true,
    );
    const { id, name } = claim(
      curated,
      usedCurated,
      station.name,
      `${station.mode}-${slug(station.name)}`,
    );
    const zone = zoneOf(station.stopIds, stops);
    nodes.set(id, {
      id,
      name,
      location: { lat: round5(station.location.lat), lng: round5(station.location.lng) },
      modes: [station.mode],
      ...(zone === undefined ? {} : { zone }),
    });
    for (const stopId of station.stopIds) nodeOfStop.set(stopId, id);
  }

  const busStop = (stopId: string): string | undefined => {
    const known = nodeOfStop.get(stopId);
    if (known !== undefined) return known;
    const stop = stops.get(stopId);
    if (!stop) return undefined;
    /**
     * A pinned entry names one bay and no other. It has to be kept out of the distance fallback
     * as well, or a neighbour fifty metres away takes the name first simply by being reached
     * first — which is how our "Al Sabkha" ended up printed over Deira Post Office once the
     * Sabkha bay left the feed, and how Dubai Mall's name landed on bay 2 while the pin said 7.
     */
    const curated =
      options.stations.find((s) => s.mode === 'bus' && s.stopId === stopId) ??
      curatedFor(
        options.stations.filter((s) => s.stopId === undefined),
        'bus',
        stop.name,
        stop.location,
        CURATED_BUS_METRES,
        false,
      );
    const { id, name } = claim(curated, usedCurated, stop.name, `s${stopId}`);
    nodes.set(id, {
      id,
      name,
      location: { lat: round5(stop.location.lat), lng: round5(stop.location.lng) },
      modes: ['bus'],
      ...(stop.zone === undefined ? {} : { zone: stop.zone }),
    });
    nodeOfStop.set(stopId, id);
    return id;
  };

  interface EdgeFacts {
    readonly line: string;
    readonly mode: TransportMode;
    readonly from: string;
    readonly to: string;
    direction: 0 | 1;
    readonly durations: number[];
    readonly departures: number[];
  }
  const edges = new Map<string, EdgeFacts>();
  const headsigns = new Map<string, string[]>();
  const firstDepartures = new Map<string, number[]>();
  const weekdayLines = new Set<string>();
  for (const trip of trips.values()) if (trip.weekday) weekdayLines.add(trip.line);

  for (const [tripId, trip] of trips) {
    const line = lines.get(trip.line);
    const sequence = calls.get(tripId);
    if (!line || !sequence || sequence.length < 2) continue;
    // A line with no weekday service at all is quoted on the days it does run.
    const counts = trip.weekday || !weekdayLines.has(trip.line);
    headsigns.set(`${line.id}|${String(trip.direction)}`, [
      ...(headsigns.get(`${line.id}|${String(trip.direction)}`) ?? []),
      trip.headsign,
    ]);

    // The stop the vehicle has just left: none until the first call ('' is not a node id).
    let previousNode = '';
    let previousDeparture = 0;
    let firstNode: string | null = null;
    const windows = frequencies.get(tripId);
    const tripStart = sequence[0]?.departure ?? 0;
    // Every departure a call stands for: the one listed, or one per headway in each window.
    const timesAt = (departure: number): number[] =>
      windows === undefined ? [departure] : departuresAt(windows, departure - tripStart);
    for (const call of sequence) {
      const node = line.mode === 'bus' ? busStop(call.stopId) : nodeOfStop.get(call.stopId);
      if (node === undefined) continue;
      if (firstNode === null) {
        firstNode = node;
        if (counts) {
          const key = `${line.id}|${String(trip.direction)}|${node}`;
          firstDepartures.set(key, [
            ...(firstDepartures.get(key) ?? []),
            ...timesAt(call.departure),
          ]);
        }
      }
      if (previousNode !== '' && previousNode !== node) {
        const id = `${line.id}:${previousNode}:${node}`;
        let facts = edges.get(id);
        if (!facts) {
          facts = {
            line: line.id,
            mode: line.mode,
            from: previousNode,
            to: node,
            direction: trip.direction,
            durations: [],
            departures: [],
          };
          edges.set(id, facts);
        }
        const took = call.departure - previousDeparture;
        if (took > 0) facts.durations.push(took);
        if (counts) facts.departures.push(...timesAt(previousDeparture));
      }
      if (previousNode !== node) {
        previousNode = node;
        previousDeparture = call.departure;
      }
    }
  }

  const headway = new Map<string, number>();
  for (const [key, departures] of firstDepartures) {
    const lineId = key.split('|')[0] ?? '';
    const best = headway.get(`${lineId}|count`) ?? 0;
    if (departures.length <= best) continue;
    const sorted = [...departures].sort((a, b) => a - b);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const at = sorted[i] ?? 0;
      const before = sorted[i - 1] ?? 0;
      if (before >= HEADWAY_FROM && at <= HEADWAY_TO && at > before) gaps.push(at - before);
    }
    if (gaps.length === 0) continue;
    headway.set(`${lineId}|count`, departures.length);
    headway.set(lineId, median(gaps));
  }

  const packEdges: TransportEdge[] = [];
  const modesOfNode = new Map<string, Set<TransportMode>>();
  for (const [id, facts] of edges) {
    if (facts.durations.length === 0) continue;
    const edge: TransportEdge = {
      id,
      fromNodeId: facts.from,
      toNodeId: facts.to,
      mode: facts.mode,
      durationSeconds: Math.max(30, Math.round(median(facts.durations))),
      line: facts.line,
      direction: facts.direction,
      ...(facts.departures.length > 0
        ? {
            firstDeparture: clock(facts.departures.reduce((a, b) => Math.min(a, b))),
            lastDeparture: clock(facts.departures.reduce((a, b) => Math.max(a, b))),
          }
        : {}),
    };
    packEdges.push(edge);
    for (const nodeId of [facts.from, facts.to]) {
      const modes = modesOfNode.get(nodeId) ?? new Set<TransportMode>();
      modes.add(facts.mode);
      modesOfNode.set(nodeId, modes);
    }
  }

  const packNodes: TransportNode[] = [];
  for (const node of nodes.values()) {
    const modes = modesOfNode.get(node.id);
    if (!modes) continue; // a stop nothing calls at is not a place to send anyone
    packNodes.push({ ...node, modes: [...modes].sort() });
  }

  const usedLines = new Set(packEdges.map((edge) => edge.line));
  const packLines: TransportLine[] = [];
  for (const line of lines.values()) {
    if (!usedLines.has(line.id)) continue;
    const towards = [0, 1].map((direction) => {
      const sign = mostCommon(headsigns.get(`${line.id}|${String(direction)}`) ?? []);
      const clean = stationName(sign.replace(/\bBus Stn\b/i, ' '));
      const curated = curatedFor(options.stations, line.mode, clean, { lat: 0, lng: 0 }, 0, true);
      return { en: curated?.name.en ?? clean, hi: curated?.name.hi ?? clean };
    });
    const measured = headway.get(line.id);
    packLines.push({
      ...line,
      ...(measured === undefined ? {} : { headwaySeconds: Math.round(measured) }),
      towards,
    });
  }

  const byId = (a: { readonly id: string }, b: { readonly id: string }): number =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  packLines.sort(byId);
  packNodes.sort(byId);
  packEdges.sort(byId);

  return {
    contentVersion: options.contentVersion,
    publishedAt: options.publishedAt,
    source:
      'Converted from the RTA GTFS open feed (rta_gtfs-open, Dubai Pulse; the copy Transitland ' +
      'mirrors as f-dubai~rta) by packages/content-tools/src/publishTransport.ts. Stops, routes ' +
      'and stop sequences from the feed; rail platforms collapsed into stations and named from ' +
      'data/transport/stations.v1.json; bus stops keep the RTA English name. Durations are the ' +
      'median over the feed; first/last departures and headways are for a typical weekday (the ' +
      "feed's Monday services). No fares are in here: the RTA's GTFS carries no " +
      'fare_attributes.txt or fare_rules.txt, so what a journey costs is its own pack, ' +
      'data/transport/fares.v1.json, versioned and published on its own. Nothing here is ' +
      'fetched at runtime and no tiles are downloaded (CLAUDE.md rule 7).',
    attribution: 'Transport data: Roads and Transport Authority (RTA), Dubai — open data.',
    walkingMetresPerMinute: options.walkingMetresPerMinute,
    waitSeconds: options.waitSeconds,
    lines: packLines,
    nodes: packNodes,
    edges: packEdges,
  };
}

/** A curated name is used once: the first platform group or bay to claim it gets it. */
function claim(
  curated: CuratedStation | undefined,
  used: Set<string>,
  feedName: string,
  fallbackId: string,
): { readonly id: string; readonly name: LocalisedName } {
  if (curated === undefined || used.has(curated.id)) {
    return { id: fallbackId, name: { en: feedName, hi: feedName, aliases: [] } };
  }
  used.add(curated.id);
  return {
    id: curated.id,
    name: {
      ...curated.name,
      aliases: [...new Set([...curated.name.aliases, ...aliasIfNew(curated.name, feedName)])],
    },
  };
}

/** The feed's own spelling stays reachable when it differs from the sign ("max" for Al Jafiliya). */
function aliasIfNew(name: LocalisedName, feedName: string): readonly string[] {
  const folded = fold(feedName);
  if (folded === '' || folded === fold(name.en)) return [];
  if (name.aliases.some((alias) => fold(alias) === folded)) return [];
  return [feedName.toLowerCase()];
}
