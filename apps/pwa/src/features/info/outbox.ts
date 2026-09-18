import { db } from '../../db/schema.js';
import type { ContactMessage } from '@saathi/shared';

/**
 * The outbox: what has been written and not yet sent — फ़ीडबैक, the third capsule of
 * ज़रूरी जानकारी (decision 028).
 *
 * Nothing here is allowed to fail in front of a traveller. Writing is the whole of what the
 * screen promises — "we have it, we will read it" — and that promise is kept by the phone, not
 * by the network.
 */

/** Digits only, out of whatever was typed: +91, a trunk zero and spaces are not mistakes. */
export function nationalNumber(raw: string, country: 'IN' | 'AE'): string {
  let digits = raw.replace(/\D/g, '');
  const code = country === 'IN' ? '91' : '971';
  if (digits.length > code.length && digits.startsWith(`00${code}`)) {
    digits = digits.slice(2 + code.length);
  } else if (digits.length > code.length && digits.startsWith(code)) {
    digits = digits.slice(code.length);
  }
  return digits.replace(/^0+/, '');
}

export async function writeMessage(
  fields: Omit<ContactMessage, 'id' | 'at' | 'synced'>,
): Promise<ContactMessage> {
  const row: ContactMessage = {
    ...fields,
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    synced: false,
  };
  await db.messages.add(row);
  return row;
}

export async function pendingMessages(): Promise<ContactMessage[]> {
  // Dexie indexes booleans as 0/1; `where('synced').equals(0)` is how the queue is read.
  return db.messages.filter((row) => !row.synced).toArray();
}

export async function markSent(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return;
  await db.messages.bulkUpdate(ids.map((id) => ({ key: id, changes: { synced: true } })));
}

/** How many are still waiting, for the one line घर.7 shows when the radio is off. */
export async function waitingCount(): Promise<number> {
  return (await pendingMessages()).length;
}
