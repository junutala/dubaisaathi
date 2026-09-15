/**
 * Making a phone photograph small enough to send from a street.
 *
 * A modern phone camera writes 3–4 MB per shot. The owner's first capture cost 6.7 MB for one
 * outlet — a front and a menu — and the plan is around 400 outlets, so roughly 2.7 GB of a
 * collector's mobile data, uploaded from Meena Bazaar on whatever signal is there. That is his
 * money and his afternoon, and none of those megabytes reach a traveller: the pack needs a small
 * picture, and review needs a readable one.
 *
 * So the two kinds are not treated alike:
 *
 *   - **The front** is for recognising a shop while standing in front of it. 1280px is more than
 *     a phone screen can show and about 200 KB.
 *   - **The menu** is read, not glanced at — it is where the dishes come from. It keeps 2000px
 *     and a higher quality, because a menu compressed until the prices blur has cost the visit
 *     rather than saved data.
 *
 * If anything here fails — an old browser, a format the canvas will not decode, a photo too large
 * to hold in memory — the original file is returned unchanged. A collector who walked to a shop
 * and asked a stranger five questions must never lose the photograph because we could not shrink
 * it. Slow is recoverable; missing is not.
 */

/** The front of a shop: recognisable, not archival. */
export const FRONT = { edge: 1280, quality: 0.75 };
/** A menu is read. Cheaper to send a bigger file than to send one nobody can use. */
export const MENU = { edge: 2000, quality: 0.82 };

/**
 * The size a photo becomes, fitted inside a square of `edge` with its shape kept.
 *
 * Never enlarges: a small photo from an old phone is left at its own size rather than blown up
 * into a bigger file that shows no more than it did.
 */
export function fitWithin(
  width: number,
  height: number,
  edge: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= edge || longest === 0) return { width, height };
  const scale = edge / longest;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export async function shrink(
  file: File,
  { edge, quality }: { edge: number; quality: number },
): Promise<Blob> {
  try {
    // `from-image` applies the EXIF rotation. Without it a photo taken in portrait arrives on
    // its side, and a sideways menu is a menu nobody can read.
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const size = fitWithin(bitmap.width, bitmap.height, edge);

    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (context === null) return file;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    bitmap.close();

    const shrunk = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });
    // A "smaller" file that is bigger than the original is not an improvement — which happens
    // with a photo that was already small, or already better compressed than JPEG.
    if (shrunk === null || shrunk.size >= file.size) return file;
    return shrunk;
  } catch {
    return file;
  }
}
