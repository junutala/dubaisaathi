/**
 * What a content pack's digest is computed over (decision 030).
 *
 * Both sides have to agree on this exactly, and they nearly did not: the publisher hashed the
 * file as it sits on disk, indented and newline-ended, while the phone hashed the body it had
 * parsed and re-serialised. Two honest digests of the same content that never match — every
 * pack would have been refused on arrival as damaged, and the failure would have looked like a
 * network problem rather than a disagreement about whitespace.
 *
 * So the digest is over this and only this: the body, serialised the one way. It lives in
 * `shared` because it is a contract between two programs, and a contract with two copies is a
 * contract with a bug waiting in it.
 */
export function packDigestInput(body: unknown): string {
  return JSON.stringify(body);
}
