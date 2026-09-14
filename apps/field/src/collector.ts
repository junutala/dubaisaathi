/**
 * Who is collecting. Not authentication — there are two people and they are the owner and his
 * driver, so a login would be a gate in front of an open door (the owner's call, 14 September).
 *
 * It is attribution: every report carries who captured it, because six months from now the
 * question "who said this kitchen does a Jain sambar" has to have an answer. Asked once, on
 * first open, and never again.
 */

const KEY = 'saathi.collector';

export function collectorName(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function setCollectorName(name: string): void {
  try {
    localStorage.setItem(KEY, name.trim());
  } catch {
    /* they will be asked again next time, which is survivable */
  }
}
