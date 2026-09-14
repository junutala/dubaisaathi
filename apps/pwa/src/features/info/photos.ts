import { useEffect, useState } from 'react';
import type { Locale } from '../../i18n/index.js';

/**
 * A photograph in IndexedDB is a `Blob`, and an `<img>` needs a URL, so every screen that
 * shows one needs the same three lines and the same revoke on the way out. Missing the revoke
 * leaks the photo for as long as the app is open, which on a cheap phone full of documents is
 * exactly the memory the tourist does not have.
 */
export function useBlobUrl(blob: Blob | undefined): string | undefined {
  const [url, setUrl] = useState<string>();

  useEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const objectUrl = URL.createObjectURL(blob);
    setUrl(objectUrl);
    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [blob]);

  return url;
}

/** "जोड़ा 10 सित॰" — the day it was added, in the language the interface is in. */
export function formatDay(locale: Locale, iso: string): string {
  return new Intl.DateTimeFormat(locale === 'hi' ? 'hi-IN' : 'en-GB', {
    day: 'numeric',
    month: 'short',
  }).format(new Date(iso));
}
