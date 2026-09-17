/**
 * The device, which is the identity (decision 001): an id the phone made for itself on first
 * contact, and the coarse platform it reports beside it. Both the question log and the pass
 * send them, so they live here rather than in either feature.
 */

const KEY = 'saathi.deviceId';

/** Made once, kept for the life of the install. Never a fingerprint: nothing else is read. */
export function deviceId(): string {
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

/** Coarse and self-reported, for reading the data by platform. Never a fingerprint. */
export function platform(): 'android' | 'ios' | 'other' {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return 'android';
  if (/iPhone|iPad|iPod/i.test(agent)) return 'ios';
  return 'other';
}
