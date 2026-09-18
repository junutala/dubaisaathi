/**
 * A photograph as a string, which is the only shape two different places want it in.
 *
 * The queue sends photographs as base64 inside the report's own request, and the picker shows a
 * pin's frontage in an `<img>` before it has ever reached the server. Both need the same handful
 * of lines, and a second copy of them is how one of the two quietly stops handling a failure.
 */

/** btoa takes a string, and a whole menu photograph at once overflows the argument list. */
function base64(bytes: Uint8Array): string {
  let binary = '';
  for (let at = 0; at < bytes.length; at += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(at, at + 0x8000));
  }
  return btoa(binary);
}

export async function asDataUrl(bytes: Blob): Promise<string> {
  const type = bytes.type === '' ? 'image/jpeg' : bytes.type;
  // Not every blob has it: `arrayBuffer` is absent on WebViews old enough to still be in a
  // collector's hand, and what IndexedDB hands back is not always the browser's own Blob.
  if (typeof bytes.arrayBuffer === 'function') {
    return `data:${type};base64,${base64(new Uint8Array(await bytes.arrayBuffer()))}`;
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // readAsDataURL always yields a string; the union is there for the other read methods.
      const result = reader.result;
      if (typeof result === 'string') resolve(result);
      else reject(new Error('the photograph did not read as a data URL'));
    };
    reader.onerror = () => {
      reject(new Error('could not read the photograph'));
    };
    reader.readAsDataURL(bytes);
  });
}
