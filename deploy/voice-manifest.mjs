/**
 * Writes the list of files a traveller downloads to get offline Hindi speech.
 *
 * Run inside the image build, over the directories that were actually fetched, so the app never
 * holds a second copy of this list. A hand-maintained array in the app would drift the first time
 * Hugging Face renamed a file: the app would report the voice ready while one file was missing,
 * and the traveller would find out in a taxi rather than on wifi.
 *
 * It is a file rather than a `node -e` one-liner in the Dockerfile for a duller reason. The
 * one-liner needed a backslash at the end of every line, which Docker strips and a shell does
 * not, so it could not be run or tested anywhere except inside a real image build — the exact
 * shape of thing that is discovered by a failed deploy.
 *
 * Usage: node voice-manifest.mjs <out.json> <path> [path...]   (a path is a file or a directory)
 */
import { createHash } from 'node:crypto';
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, sep } from 'node:path';

/**
 * Files under a path. A single file is named on purpose in one case: four ONNX runtimes are in
 * the image, because which one a browser asks for is not knowable here, but only the one this
 * app pins goes in the manifest. Walking that directory would have put 77 MB of runtime into a
 * traveller's download to use 26 MB of it.
 */
function walk(target) {
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(join(target, entry.name)) : [join(target, entry.name)],
  );
}

const [out, ...targets] = process.argv.slice(2);
if (out === undefined || targets.length === 0) {
  console.error('usage: node voice-manifest.mjs <out.json> <path> [path...]');
  process.exit(2);
}

const files = targets
  .flatMap((target) => walk(target))
  // The app refuses any path outside /models/, so the served path is built here rather than
  // assembled there from a directory name it would have to be told.
  .map((file) => ({ path: `/models/${file.split(sep).join('/')}`, bytes: statSync(file).size }));

if (files.length === 0) {
  console.error('voice-manifest: nothing was fetched — refusing to write an empty manifest');
  process.exit(1);
}

const totalBytes = files.reduce((sum, file) => sum + file.bytes, 0);

/**
 * A name for this exact set of files, so the app can ask for them past a cache that is holding
 * an older set.
 *
 * Derived from the paths and sizes rather than from the build, on purpose: it changes when the
 * model changes and not when anything else does. Tying it to the commit would re-download 68 MB
 * on a phone every time an unrelated line of the app moved.
 */
const version = createHash('sha256').update(JSON.stringify(files)).digest('hex').slice(0, 12);

writeFileSync(out, `${JSON.stringify({ version, files, totalBytes }, null, 2)}\n`);
console.error(
  `VOICE DOWNLOAD  ${String(files.length)} files  ${String(Math.round(totalBytes / 1048576))} MB  version ${version}`,
);
