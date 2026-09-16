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

  if (pack.edges.length < previous.edges.length) {
    // A feed that shrinks the network is a broken feed or a broken converter, never a release.
    throw new Error(
      `converted pack has ${String(pack.edges.length)} edges, the current one ${String(previous.edges.length)}. Nothing written.`,
    );
  }

  if (!same) await writeFile(OUT, `${JSON.stringify(pack)}\n`, 'utf8');
  console.log(same ? 'unchanged — nothing written' : 'written');
  console.log(
    `${String(pack.lines.length)} lines, ${String(pack.nodes.length)} stops, ${String(pack.edges.length)} hops → ${OUT} (v${String(pack.contentVersion)})`,
  );
  const unnamed = stations.filter((s) => !pack.nodes.some((n) => n.id === s.id));
  for (const s of unnamed) console.log(`  curated station not found in the feed: ${s.id}`);
}

await main();
