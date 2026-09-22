/**
 * Turns the RTA's GTFS archive into the pack रास्ता reads.
 *
 *   npm run publish:transport --workspace @saathi/content-tools
 *
 * The archive is `data/transport/rta-gtfs.zip`, committed as data and fetched by a person a few
 * times a year (docs/transport-and-maps-strategy.md): a build that depends on a government
 * portal being up is a build that fails on a Sunday. The station names come from
 * `data/transport/stations.v1.json`; the fares and the fallback waits are kept from the pack
 * being replaced, because the feed carries neither.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { TransportNetwork } from '@saathi/shared';
import { csvRows } from './gtfs/csv.ts';
import { readZip } from './gtfs/zip.ts';
import { toTransportNetwork, type CuratedStation } from './toTransport.ts';

const here = dirname(fileURLToPath(import.meta.url));
const DATA = resolve(here, '..', '..', '..', 'data', 'transport');
const ARCHIVE = resolve(DATA, 'rta-gtfs.zip');
const STATIONS = resolve(DATA, 'stations.v1.json');
const OUT = resolve(DATA, 'network.v1.json');

const FILES = ['routes.txt', 'stops.txt', 'trips.txt', 'stop_times.txt'] as const;
/** A feed may carry its calendar either way, and its headways as frequencies. */
const OPTIONAL_FILES = ['calendar.txt', 'calendar_dates.txt', 'frequencies.txt'] as const;

async function main(): Promise<void> {
  const archive = readZip(await readFile(ARCHIVE));
  const feed: Record<string, string> = {};
  for (const name of [...FILES, ...OPTIONAL_FILES]) {
    // Windows' "Compress to ZIP" puts a folder's files under the folder's name; the feed's
    // files are found by their own names wherever they sit.
    const found = [...archive.entries()].find(
      ([path]) => path === name || path.endsWith(`/${name}`),
    );
    if (!found) {
      if ((OPTIONAL_FILES as readonly string[]).includes(name)) continue;
      throw new Error(`${ARCHIVE} has no ${name}; it is not a GTFS feed`);
    }
    feed[name] = found[1].toString('utf8');
  }

  const stations = (JSON.parse(await readFile(STATIONS, 'utf8')) as { stations: CuratedStation[] })
    .stations;
  const previous = JSON.parse(await readFile(OUT, 'utf8')) as TransportNetwork;

  const converted = toTransportNetwork(feed, {
    contentVersion: previous.contentVersion,
    publishedAt: previous.publishedAt,
    stations,
    walkingMetresPerMinute: previous.walkingMetresPerMinute,
    fares: previous.fares,
    waitSeconds: previous.waitSeconds,
  });

  // The version moves only when the rows do: a re-run over the same feed is not a release,
  // and every phone would otherwise reload 6,000 rows for nothing.
  const same =
    JSON.stringify({ ...converted, publishedAt: '' }) ===
    JSON.stringify({ ...previous, publishedAt: '' });
  const pack: TransportNetwork = same
    ? previous
    : {
        ...converted,
        contentVersion: previous.contentVersion + 1,
        publishedAt: new Date().toISOString(),
      };

  /**
   * A feed that collapses the network is a broken feed or a broken converter, never a release.
   *
   * It is not a straight "never smaller", though, because a real feed does shrink in places: the
   * 2025 edition renumbered the bus network — 11A and 11B became 11, the 20 became 20A and 20B —
   * and came out with twenty-six more lines, two hundred more stops and seventy-five fewer hops.
   * A percentage tells the two apart: churn moves a point or two, a broken conversion loses most
   * of the network at once.
   */
  const FLOOR = 0.9;
  for (const [what, now, before] of [
    ['edges', pack.edges.length, previous.edges.length],
    ['nodes', pack.nodes.length, previous.nodes.length],
  ] as const) {
    if (now < before * FLOOR) {
      throw new Error(
        `converted pack has ${String(now)} ${what}, the current one ${String(before)} — more than ` +
          `${String(Math.round((1 - FLOOR) * 100))}% down. Nothing written.`,
      );
    }
  }

  if (!same) await writeFile(OUT, `${JSON.stringify(pack)}\n`, 'utf8');
  console.log(same ? 'unchanged — nothing written' : 'written');
  console.log(
    `${String(pack.lines.length)} lines, ${String(pack.nodes.length)} stops, ${String(pack.edges.length)} hops → ${OUT} (v${String(pack.contentVersion)})`,
  );
  console.log(
    `  was ${String(previous.lines.length)} lines, ${String(previous.nodes.length)} stops, ${String(previous.edges.length)} hops`,
  );

  // Which lines the RTA added and dropped: the one summary worth reading on every refresh.
  const before = new Set(previous.lines.map((line) => line.id));
  const now = new Set(pack.lines.map((line) => line.id));
  const gone = [...before].filter((id) => !now.has(id)).sort();
  const added = [...now].filter((id) => !before.has(id)).sort();
  if (gone.length > 0) console.log(`  lines gone: ${gone.join(' ')}`);
  if (added.length > 0) console.log(`  lines new:  ${added.join(' ')}`);

  const unnamed = stations.filter((s) => !pack.nodes.some((n) => n.id === s.id));
  for (const s of unnamed) console.log(`  curated station not found in the feed: ${s.id}`);

  /**
   * A bus bay is pinned by the feed's own stop id, and the RTA retires those. When a pinned id
   * is gone the curated name does not go with it — it falls through to the nearest bay within
   * 150 m and is printed over whatever stands there. That is how "Al Sabkha" came to be the name
   * of Deira Post Office. A name on the wrong stop sends somebody to the wrong door, so a dead
   * pin is said out loud rather than quietly absorbed.
   */
  const inFeed = new Set(csvRows(feed['stops.txt'] ?? '').map((row) => row.stop_id ?? ''));
  for (const s of stations) {
    if (s.stopId !== undefined && !inFeed.has(s.stopId)) {
      console.log(
        `  ** ${s.id} is pinned to stop ${s.stopId}, which this feed does not have — ` +
          `repin it or the name lands on a neighbour`,
      );
    }
  }
}

await main();
