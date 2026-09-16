import { inflateRawSync } from 'node:zlib';

/**
 * Reads the members of a ZIP archive into memory, enough for a GTFS feed and nothing more:
 * stored and deflated entries, read from the central directory. No dependency, because the
 * feed is committed as data and this runs a few times a year on a build machine, not on a phone.
 */
export function readZip(archive: Buffer): ReadonlyMap<string, Buffer> {
  const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
  const CENTRAL_FILE_HEADER = 0x02014b50;
  const LOCAL_FILE_HEADER = 0x04034b50;

  let end = archive.length - 22;
  while (end >= 0 && archive.readUInt32LE(end) !== END_OF_CENTRAL_DIRECTORY) end--;
  if (end < 0) throw new Error('not a zip archive: no end-of-central-directory record');

  const entries = archive.readUInt16LE(end + 10);
  let offset = archive.readUInt32LE(end + 16);
  const files = new Map<string, Buffer>();

  for (let i = 0; i < entries; i++) {
    if (archive.readUInt32LE(offset) !== CENTRAL_FILE_HEADER) {
      throw new Error(`zip: bad central directory entry at ${String(offset)}`);
    }
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localOffset = archive.readUInt32LE(offset + 42);
    const name = archive.toString('utf8', offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;

    if (archive.readUInt32LE(localOffset) !== LOCAL_FILE_HEADER) {
      throw new Error(`zip: bad local header for ${name}`);
    }
    const localNameLength = archive.readUInt16LE(localOffset + 26);
    const localExtraLength = archive.readUInt16LE(localOffset + 28);
    const dataStart = localOffset + 30 + localNameLength + localExtraLength;
    const data = archive.subarray(dataStart, dataStart + compressedSize);

    if (method === 0) files.set(name, data);
    else if (method === 8) files.set(name, inflateRawSync(data));
    else throw new Error(`zip: ${name} uses compression method ${String(method)}, not supported`);
  }
  return files;
}
