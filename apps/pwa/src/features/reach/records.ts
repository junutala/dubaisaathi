/**
 * A message a traveller wrote to us, on the phone until it has been sent (decision 026).
 *
 * The website's form posts straight to the `contact` function and is done. This one cannot:
 * the traveller who most wants to tell us something is the one standing in a Karama basement
 * with no signal, and a box that refuses them is worse than no box. So it is written here
 * first and goes when the phone has a connection — the same shape as the question log, for
 * the same reason (CLAUDE.md, rule 1: the network is for freshness, never for answering).
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
