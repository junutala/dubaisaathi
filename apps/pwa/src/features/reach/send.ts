import { PROJECT_URL, supabaseHeaders } from '../../lib/supabase.js';
import { markSent, pendingMessages } from './outbox.js';

/**
 * Sending the outbox, when the phone happens to have a connection.
 *
 * Like the question log's sync and for the same reasons: never awaited by a screen, never
 * blocking a tap, and if the radio is off or the function is down the queue simply waits. The
 * phone marks sent only what the server accepted, so a lost response costs a second send
 * rather than a lost message — and the id was made on the device, so the server sees the
 * duplicate for what it is.
 */

const CONTACT = `${PROJECT_URL}/functions/v1/contact`;

export async function sendOutbox(): Promise<number> {
  const waiting = await pendingMessages();
  if (waiting.length === 0) return 0;

  const sent: string[] = [];
  for (const row of waiting) {
    let response: Response;
    try {
      response = await fetch(CONTACT, {
        method: 'POST',
        headers: supabaseHeaders(),
        body: JSON.stringify({
          // Everyone writing from inside the app is a traveller; the operators and the outlets
          // write from the website, where the form asks (decision 023).
          who: 'traveller',
          name: row.name,
          country: row.country,
          phone: row.phone,
          message: row.message,
          locale: row.locale,
        }),
      });
    } catch {
      // No radio, or the function is unreachable. Everything after this one waits too: they
      // are in the order the traveller wrote them and there is nothing to gain from racing.
      break;
    }
    // 429 is the throttle. The message is ours and it is not going to become acceptable by
    // being sent again, so it is marked done rather than left to retry for ever.
    if (response.ok || response.status === 429) sent.push(row.id);
    else if (response.status >= 500) break;
    else sent.push(row.id);
  }

  await markSent(sent);
  return sent.length;
}

/**
 * Once on boot and again whenever the phone says it is back online — no timer, no retry loop.
 * A traveller opens this app several times a day and each open is an attempt.
 */
export function startOutboxSync(): () => void {
  const attempt = () => {
    void sendOutbox();
  };
  attempt();
  window.addEventListener('online', attempt);
  return () => {
    window.removeEventListener('online', attempt);
  };
}
