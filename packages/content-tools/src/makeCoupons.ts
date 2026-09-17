/**
 * Makes a batch of coupon codes and puts them in `coupons` (decision 018).
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… \
 *   npm run coupons -- --kind family --discount 100 --count 30 --redemptions 1 \
 *                      --until 2026-10-31 --batch "Meta launch" [--note "…"] [--price 99]
 *
 *   npm run coupons -- --report        # the coupon_uptake view, one code per line
 *
 * Prints the codes one per line and writes `coupons-<batch>-<date>.txt` in the current
 * directory for whoever is putting them on the advertisement. The file is not committed
 * (.gitignore). The key is read from the environment and never written to the repo; it has to
 * be the service role, because `coupons` has RLS on with no policies by design.
 *
 * `--kind family` makes `SS-` codes that sell 1–4 phones; `--kind single` makes `OP-` codes
 * locked to one phone, for an operator handing them out at a counter. The prefix is only a
 * convention for people; the app reads `kind`.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';
import {
  batchSlug,
  couponRows,
  parseCouponArgs,
  uptakeTable,
  type UptakeRow,
} from './couponBatch.ts';

function connection(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url === undefined || key === undefined) {
    throw new Error(
      'SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set. The key never lives in the repo.',
    );
  }
  return { url, key };
}

async function report(): Promise<void> {
  const { url, key } = connection();
  const answer = await fetch(`${url}/rest/v1/coupon_uptake?order=batch.asc,code.asc`, {
    headers: { apikey: key, authorization: `Bearer ${key}` },
  });
  if (!answer.ok) throw new Error(`Supabase said ${String(answer.status)}: ${await answer.text()}`);
  const rows = (await answer.json()) as UptakeRow[];
  console.log(rows.length === 0 ? 'no coupons yet' : uptakeTable(rows));
}

async function make(argv: readonly string[]): Promise<void> {
  const args = parseCouponArgs(argv);
  const { url, key } = connection();
  const rows = couponRows(args, (bytes) => webcrypto.getRandomValues(bytes));

  const answer = await fetch(`${url}/rest/v1/coupons`, {
    method: 'POST',
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      'content-type': 'application/json',
      prefer: 'return=minimal',
    },
    body: JSON.stringify(rows),
  });
  if (!answer.ok) throw new Error(`Supabase said ${String(answer.status)}: ${await answer.text()}`);

  const codes = rows.map((row) => row.code);
  const file = resolve(
    process.cwd(),
    `coupons-${batchSlug(args.batch)}-${new Date().toISOString().slice(0, 10)}.txt`,
  );
  await writeFile(file, `${codes.join('\n')}\n`, 'utf8');

  for (const code of codes) console.log(code);
  console.log('');
  console.log(
    `${String(codes.length)} ${args.kind} codes, ${
      args.price === undefined ? `${String(args.discount)}% off` : `₹${String(args.price)} flat`
    }, ${String(args.redemptions)} use(s) each${
      args.until === undefined ? '' : `, till ${args.until}`
    } — batch "${args.batch}" → ${file}`,
  );
}

const argv = process.argv.slice(2);
if (argv.includes('--report')) await report();
else await make(argv);
