import { reconcilePass } from './bind.js';
import { installPass } from './entitlement.js';
import { decodePass } from './signedPass.js';

/**
 * A family QR was opened — `#/pass/<token>` on this phone, from its own camera or from a link
 * on WhatsApp. The pass inside is verified against the key in the bundle and installed with
 * no connection at all (decision 005). Then, if there happens to be signal, the slot is
 * reported so a second phone opening the same link is turned away at its own report.
 */
export async function installFromToken(token: string): Promise<'installed' | 'invalid'> {
  const pass = decodePass(token);
  if (pass === null) return 'invalid';
  if (!(await installPass(pass))) return 'invalid';
  void reconcilePass({ force: true });
  return 'installed';
}
