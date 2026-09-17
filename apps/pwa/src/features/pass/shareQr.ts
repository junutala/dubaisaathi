import { qrPng } from './qr.js';

/**
 * भेजें — handing one family slot to another phone.
 *
 * The owner tapped it expecting something he could put in a WhatsApp message and got "a huge
 * URL": a signed pass is hundreds of characters, and a wall of characters is not a thing anyone
 * sends. The QR itself is. So the picture goes first — it is the pass, it scans off the screen
 * it lands on, and it needs no explaining — and the link stays as the way through when this
 * phone will not share a file.
 *
 * Nothing here decides in advance what the phone can do. `canShare` is asked with the very file
 * that would go, the sheet is opened, and only a refusal moves to the next way. A traveller who
 * closes the sheet has not failed at anything: that ends it, quietly.
 */

export type ShareOutcome =
  /** The sheet took the PNG — the picture is on its way. */
  | 'image'
  /** No file share here, but the sheet took the link. */
  | 'link'
  /** No sheet at all; the link is on the clipboard. */
  | 'copied'
  /** The traveller closed the sheet. Not an error, and nothing to say. */
  | 'dismissed'
  /** Neither a sheet nor a clipboard. The QR on the screen is still the pass. */
  | 'refused';

export interface ShareRequest {
  /** The pass, as the link the other phone's camera opens. */
  readonly url: string;
  /** The slot, as the sheet's title. */
  readonly title: string;
  /** The one line a person would actually send alongside the picture. Never the link. */
  readonly text: string;
  /** Printed under the QR in the picture, so it explains itself out of a chat. */
  readonly caption: string;
  /** What the PNG is called when it lands in someone's gallery. */
  readonly fileName: string;
}

/** A sheet the traveller closed, rather than a phone that could not open one. */
function wasDismissed(error: unknown): boolean {
  if (error instanceof DOMException) return error.name === 'AbortError';
  return error instanceof Error && error.name === 'AbortError';
}

export async function shareFamilyQr(request: ShareRequest): Promise<ShareOutcome> {
  const { url, title, text, caption, fileName } = request;

  const png = await qrPng(url, caption);
  if (png !== null) {
    const file = new File([png], fileName, { type: 'image/png' });
    // Asked of the object, not of the type: `canShare` is missing on older browsers however
    // confidently TypeScript's lib declares it. And asked with the very file that would go.
    if ('canShare' in navigator && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title, text });
        return 'image';
      } catch (error) {
        if (wasDismissed(error)) return 'dismissed';
        // Some other refusal from the sheet — the link below is still a way to send the pass.
      }
    }
  }

  if ('share' in navigator) {
    try {
      await navigator.share({ url, title, text });
      return 'link';
    } catch (error) {
      if (wasDismissed(error)) return 'dismissed';
    }
  }

  try {
    await navigator.clipboard.writeText(url);
    return 'copied';
  } catch {
    return 'refused';
  }
}
