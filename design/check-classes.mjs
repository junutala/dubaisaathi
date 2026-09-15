/**
 * Fails the build when a className has no CSS behind it.
 *
 * खाना shipped with its entire outlet card unstyled — `.food-name`, `.food-tags`,
 * `.food-kitchen` and eight more were written in the JSX and never given a rule. The screen did
 * not break; it just looked like nobody had finished it, with the name running into the distance
 * and every tag concatenated into "Pure vegVegEgglessNo onion". `.pass-big`, the number a
 * traveller opens घर.1 to read, was the same. Nothing caught either, because a missing style is
 * not an error anywhere — it is just absence, and absence is invisible to a type checker, a test
 * and a linter alike.
 *
 * So it is checked here, where the design rules are already checked.
 *
 * A dynamic class — `wave-bar-${n}` — is satisfied by any rule starting with that prefix, which
 * is the most that can be known without running the app. A static one has to match exactly.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const APPS = [
  { name: 'pwa', src: 'apps/pwa/src', css: ['apps/pwa/src/styles.css'] },
  { name: 'field', src: 'apps/field/src', css: ['apps/field/src/styles.css'] },
];

/** Stands in for a `${…}` hole while the class name is being split on whitespace. */
const HOLE = 'DYNAMICxHOLE';

function walk(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
}

let bad = 0;

for (const app of APPS) {
  const css = app.css.map((file) => readFileSync(file, 'utf8')).join('\n');
  const defined = new Set();
  for (const match of css.matchAll(/\.([a-zA-Z][\w-]*)/g)) defined.add(match[1]);

  const used = new Map();
  for (const file of walk(app.src).filter((f) => ['.tsx', '.ts'].includes(extname(f)))) {
    if (file.includes('.test.')) continue;
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
      const literal = match[1] ?? match[2] ?? '';
      const templated = match[2] !== undefined && literal.includes('${');
      const cleaned = literal.replace(/\$\{[^}]*\}/g, templated ? HOLE : ' ');
      for (const token of cleaned.split(/\s+/).filter(Boolean)) {
        const dynamic = token.includes(HOLE);
        const name = token.split(HOLE)[0];
        if (name === '') continue;
        if (!used.has(name)) used.set(name, { file, dynamic });
      }
    }
  }

  for (const [name, { file, dynamic }] of [...used].sort()) {
    const ok = dynamic ? [...defined].some((rule) => rule.startsWith(name)) : defined.has(name);
    if (ok) continue;
    console.error(`${app.name}: .${name} is used but has no CSS rule — ${file}`);
    bad += 1;
  }
}

if (bad > 0) {
  console.error(`\n${String(bad)} class(es) used with no style. A screen half-built looks broken.`);
  process.exit(1);
}
console.log('every className has a rule behind it');
