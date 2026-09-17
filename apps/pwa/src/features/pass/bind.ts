import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';
import { deviceId } from '../../lib/device.js';
import { clearPass, entitlement, noteBindChecked } from './entitlement.js';

/**
 * Decision 005's reconciliation, from the phone's side: "each phone reports its slot when
 * next online, and a second phone reporting an already-bound slot is rejected at its own next
 * sync." That is the whole anti-sharing mechanism, and it never stands in a traveller's way —
 * nothing here runs without a connection, and nothing waits on it.
 *
 * Asked right after a scan when there is signal, and at most once a day after that. A `taken`
 * or `revoked` answer clears the pass on this phone (decision 005 again); anything else — an
 * unknown pass, a dead server, a proxy — changes nothing, because an answer the phone does not
 * understand is not a reason to take something away.
 */

const BIND = `${PROJECT_URL}/functions/v1/bind`;
const DAY = 24 * 3600_000;

export type BindOutcome =
  | 'nothing-to-bind'
  | 'offline'
  | 'checked-recently'
  | 'bound'
  | 'taken'
  | 'revoked'
  | 'unknown'
  | 'failed';

export async function reconcilePass(options?: { readonly force?: boolean }): Promise<BindOutcome> {
  const state = entitlement();
  if (state.paid !== true || state.pass === undefined) return 'nothing-to-bind';
  if (typeof navigator !== 'undefined' && !navigator.onLine) return 'offline';
  if (
    options?.force !== true &&
    state.bindCheckedAt !== undefined &&
    Date.now() - new Date(state.bindCheckedAt).getTime() < DAY
  ) {
    return 'checked-recently';
  }

  let body: { bound?: unknown; reason?: unknown };
  try {
    const response = await fetch(BIND, {
      method: 'POST',
      headers: supabaseHeaders(),
      body: JSON.stringify({
        deviceId: deviceId(),
        ...state.pass.claims,
        signature: state.pass.signature,
      }),
    });
    if (!response.ok) return 'failed';
    body = (await response.json()) as { bound?: unknown; reason?: unknown };
  } catch {
    return 'failed';
  }

  if (body.bound === true) {
    noteBindChecked();
    return 'bound';
  }
  if (body.reason === 'taken' || body.reason === 'revoked') {
    clearPass(body.reason);
    return body.reason;
  }
  return 'unknown';
}

/** On boot and whenever the phone says it is back online. No timer: each open is an attempt. */
export function startPassReconcile(): () => void {
  const attempt = () => {
    void reconcilePass();
  };
  attempt();
  window.addEventListener('online', attempt);
  return () => {
    window.removeEventListener('online', attempt);
  };
}
