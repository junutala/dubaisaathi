/**
 * Passing the app on.
 *
 * Nothing here decides in advance what the phone can do (CLAUDE.md): the sheet is opened and
 * only a refusal moves to the next way. WhatsApp first, because that is what the owner asked
 * for and what a traveller's friends are on; then the phone's own share sheet, which reaches
 * everything else; then the clipboard.
 *
 * None of it needs a network. `wa.me` opens the app that is already on the phone.
 */

export const APP_LINK = 'https://dubai.saafarsaathi.in';

export type ShareWay = 'whatsapp' | 'sheet' | 'copied' | 'refused';

export function invite(locale: 'hi' | 'en'): string {
  return locale === 'hi'
    ? `दुबई में आपका हिंदी साथी — खाना, रास्ता, बोर्ड पढ़ना। 24 घंटे मुफ़्त। ${APP_LINK}`
    : `Your Hindi companion in Dubai — food, directions, reading boards. Free for 24 hours. ${APP_LINK}`;
}

export function whatsappLink(locale: 'hi' | 'en'): string {
  return `https://wa.me/?text=${encodeURIComponent(invite(locale))}`;
}

/** The phone's own sheet, for a traveller whose friends are not on WhatsApp. */
export async function shareAnywhere(locale: 'hi' | 'en'): Promise<ShareWay> {
  const text = invite(locale);
  if ('share' in navigator) {
    try {
      await navigator.share({ text });
      return 'sheet';
    } catch (error) {
      // A closed sheet is not a failure and must not fall through to the clipboard behind it.
      const name = error instanceof Error ? error.name : '';
      if (name === 'AbortError') return 'sheet';
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    return 'copied';
  } catch {
    return 'refused';
  }
}
