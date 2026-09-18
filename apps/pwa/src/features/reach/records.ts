/**
 * A message a traveller wrote to us, on the phone until it has been sent.
 *
 * Nothing writes one any more: the screen that did was taken out the day it shipped (decision
 * 026, reversed). The type and its table stay because a phone that opened that build has a v7
 * database, and a schema that stops declaring `messages` makes Dexie refuse to open it —
 * taking the traveller's hotel and documents with it. A release never takes something away
 * from a phone, and that includes the shape of what is already there.
 */
export interface ContactMessage {
  /** Made on the device, so a retried send cannot duplicate the row on the server. */
  readonly id: string;
  readonly at: string;
  readonly name: string;
  /** Which dialling code was picked. The number itself is digits only. */
  readonly country: 'IN' | 'AE';
  readonly phone: string;
  readonly message: string;
  /** The catalogue they were reading, so the reply goes out in the language they chose. */
  readonly locale: 'hi' | 'en';
  /** The phone's own bookkeeping. The server never sees it. */
  readonly synced: boolean;
}
