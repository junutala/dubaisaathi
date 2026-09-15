/**
 * One comparison form for Hindi, Hinglish and the mix of both a real traveller speaks.
 *
 * CLAUDE.md rule 4: the parser is script-agnostic — it normalises to a comparison form before
 * matching and never branches on script. So "मुझे करामा जाना है" and "mujhe Karama jana hai"
 * arrive at the parser as the same string, and a Devanagari spelling nobody curated still
 * resolves.
 *
 * Two levels, because one is not enough:
 *   `fold`     — transliterate, then smooth away the spellings Indians differ on (aa/a, q/k,
 *                w/v, z/j, doubled letters, aspirates). Used for the confident match.
 *   `skeleton` — the consonants alone. Used for the "probably this" match, which is why
 *                "मॉल" (mol) still finds "mall" (mal).
 */

// Devanagari transliteration. Consonants carry an inherent 'a' unless a matra or a virama
// says otherwise, and Hindi drops that 'a' at the end of a word — करामा is karama, बुर is bur,
// not "bura". Getting that one rule right is what makes the two scripts meet.
const CONSONANTS: Record<string, string> = {
  क: 'k',
  ख: 'kh',
  ग: 'g',
  घ: 'gh',
  ङ: 'n',
  च: 'ch',
  छ: 'chh',
  ज: 'j',
  झ: 'jh',
  ञ: 'n',
  ट: 't',
  ठ: 'th',
  ड: 'd',
  ढ: 'dh',
  ण: 'n',
  त: 't',
  थ: 'th',
  द: 'd',
  ध: 'dh',
  न: 'n',
  प: 'p',
  फ: 'ph',
  ब: 'b',
  भ: 'bh',
  म: 'm',
  य: 'y',
  र: 'r',
  ल: 'l',
  ळ: 'l',
  व: 'v',
  श: 'sh',
  ष: 'sh',
  स: 's',
  ह: 'h',
};

/**
 * The Perso-Arabic sounds Hindi borrowed, written base + nukta: ख़लीफ़ा, ज़रूरी, बड़ा. Unicode
 * keeps these decomposed — the precomposed क़–य़ block is on the composition exclusion list,
 * so NFC pulls them apart rather than together — which means the nukta arrives as its own
 * character and rewrites the consonant just emitted. फ़ is the one that matters: without this,
 * ख़लीफ़ा transliterates with a 'p' and never meets "khalifa".
 */
const NUKTA_CONSONANTS: Record<string, string> = {
  क: 'k',
  ख: 'kh',
  ग: 'g',
  ज: 'z',
  ड: 'r',
  ढ: 'rh',
  फ: 'f',
  य: 'y',
  र: 'r',
  न: 'n',
};

const INDEPENDENT_VOWELS: Record<string, string> = {
  अ: 'a',
  आ: 'a',
  इ: 'i',
  ई: 'i',
  उ: 'u',
  ऊ: 'u',
  ऋ: 'ri',
  ए: 'e',
  ऐ: 'ai',
  ओ: 'o',
  औ: 'au',
  ऑ: 'o',
  ऍ: 'e',
  ॲ: 'a',
};

const MATRAS: Record<string, string> = {
  'ा': 'a',
  'ि': 'i',
  'ी': 'i',
  'ु': 'u',
  'ू': 'u',
  'ृ': 'ri',
  'े': 'e',
  'ै': 'ai',
  'ो': 'o',
  'ौ': 'au',
  'ॉ': 'o',
  'ॅ': 'e',
};

const DIGITS: Record<string, string> = {
  '०': '0',
  '१': '1',
  '२': '2',
  '३': '3',
  '४': '4',
  '५': '5',
  '६': '6',
  '७': '7',
  '८': '8',
  '९': '9',
};

const VIRAMA = '्';
const NUKTA = '़';
const ANUSVARA = ['ं', 'ँ']; // ं ँ — both become a nasal 'n'
const VISARGA = 'ः';

/** Devanagari → Roman letters. Anything already Roman passes through untouched. */
export function transliterate(input: string): string {
  const text = input.normalize('NFC');
  let out = '';
  // True when a consonant has been emitted whose inherent 'a' is not yet decided.
  let inherent = false;
  // The consonant just emitted, and where its letters start in `out`, so a nukta can rewrite it.
  let base: string | null = null;
  let baseAt = 0;

  const settle = () => {
    if (inherent) out += 'a';
    inherent = false;
  };

  for (const ch of text) {
    const consonant = CONSONANTS[ch];
    if (consonant !== undefined) {
      settle();
      base = ch;
      baseAt = out.length;
      out += consonant;
      inherent = true;
      continue;
    }
    const matra = MATRAS[ch];
    if (matra !== undefined) {
      inherent = false;
      out += matra;
      continue;
    }
    const vowel = INDEPENDENT_VOWELS[ch];
    if (vowel !== undefined) {
      settle();
      out += vowel;
      continue;
    }
    const digit = DIGITS[ch];
    if (digit !== undefined) {
      settle();
      out += digit;
      continue;
    }
    if (ch === NUKTA) {
      // Rewrites the consonant it sits under: फ → f, ज → z. Alone it carries no sound.
      const nukta = base === null ? undefined : NUKTA_CONSONANTS[base];
      if (nukta !== undefined) out = out.slice(0, baseAt) + nukta;
      continue;
    }
    if (ch === VIRAMA) {
      // A virama kills the inherent vowel: बुर्ज → burj, not buraja.
      inherent = false;
      continue;
    }
    if (ANUSVARA.includes(ch)) {
      settle();
      out += 'n';
      continue;
    }
    if (ch === VISARGA) {
      settle();
      out += 'h';
      continue;
    }
    // Anything else — a space, a Roman letter, punctuation — ends the syllable. The inherent
    // 'a' is dropped rather than settled, which is Hindi's own schwa deletion.
    inherent = false;
    base = null;
    out += ch;
  }
  return out;
}

/**
 * The confident comparison form: one spelling for every way a traveller might write a word.
 * Order matters — aspirates before doubled letters, doubled letters last.
 */
/**
 * Perso-Arabic, in one spelling.
 *
 * Whisper writes Hindi in Urdu script often enough that it has to be planned for rather than
 * argued with: the owner's phone produced "مجھے برجمان ... جنا ہے" for a sentence about BurJuman,
 * which is a correct hearing in the wrong alphabet. `fold` used to delete every one of those
 * characters, so a place we hold the Arabic name of matched nothing at all.
 *
 * Urdu and Arabic spell the same sounds with different letters — ی and ے for ي, ہ for ه, ک for
 * ك — and vowel marks are optional everywhere, so two true spellings of one word differ by
 * characters nobody pronounces. This is the standard normalisation: drop the marks and the
 * tatweel, then settle on one form of each letter that has several.
 */
function arabicOneWay(input: string): string {
  return (
    input
      .normalize('NFC')
      // Harakat and the other marks, plus the tatweel, which is decoration rather than a letter.
      .replace(/[\u064B-\u0652\u0670\u0640]/gu, '')
      .replace(/[\u0622\u0623\u0625\u0671]/gu, '\u0627')
      .replace(/[\u06CC\u06D2\u0649]/gu, '\u064A')
      .replace(/[\u06C1\u06C3\u0629]/gu, '\u0647')
      .replace(/\u06A9/gu, '\u0643')
      .replace(/\u06BE/gu, '\u0647')
      .replace(/[\u06AF]/gu, '\u06AF')
  );
}

export function fold(input: string): string {
  return (
    arabicOneWay(transliterate(input))
      .toLowerCase()
      // Strip accents an English keyboard might produce (ā, é) before dropping punctuation.
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      // Arabic letters survive. They used to be swept away with the punctuation, which meant a
      // sentence in Urdu script folded to nothing and matched nothing — including place names
      // whose Arabic spelling this app already ships.
      .replace(/[^a-z0-9\u0621-\u063A\u0641-\u064A]+/gu, ' ')
      .trim()
      // Letters Indians swap freely: Qarama/Karama, Hawai/Hawai, Bazaar/Bajaar, Taxi/Taksi.
      .replace(/q/g, 'k')
      .replace(/w/g, 'v')
      .replace(/x/g, 'ks')
      .replace(/z/g, 'j')
      // Aspirates: nobody agrees whether it is bhookh or bookh. ch and sh are real sounds
      // and stay; every other consonant loses a following h.
      .replace(/chh/g, 'ch')
      .replace(/([bdgjkptr])h/g, '$1')
      // Long vowels, written however the speaker felt: jaana/jana, deekho/dikho, bhookh/bhukh.
      .replace(/aa/g, 'a')
      .replace(/(?:ee|ii)/g, 'i')
      .replace(/(?:oo|uu)/g, 'u')
      // Anything still doubled is a spelling habit, not a sound: mall → mal, adda → ada.
      .replace(/([a-z])\1/g, '$1')
      // A silent h at the end of a word: Jumeirah is Jumeira, Sharjah is Sharja.
      .replace(/([aeiou])h\b/g, '$1')
      .replace(/ +/g, ' ')
  );
}

/**
 * The consonants alone. Two words with the same skeleton are the same word often enough to
 * offer, and not often enough to assume — so a skeleton match asks rather than acts, and is
 * ignored below `SKELETON_MIN` where the collisions start.
 */
export const SKELETON_MIN = 3;

export function skeleton(input: string): string {
  return fold(input).replace(/[aeiou ]/g, '');
}

/**
 * One folded word, next to the words the traveller actually used. The matcher works on `folded`;
 * everything shown back on screen uses `raw`, because "करामा" is what they said and "karama" is
 * only how the parser thinks.
 */
export interface Token {
  readonly raw: string;
  readonly folded: string;
}

export function tokenise(input: string): readonly Token[] {
  const tokens: Token[] = [];
  for (const raw of input.trim().split(/\s+/)) {
    const folded = fold(raw);
    if (folded === '') continue;
    // A raw word can fold to more than one — "मॉल/दुकान" or a hyphenated pair. Each folded word
    // becomes its own token so the window arithmetic stays simple; they share the same raw word.
    for (const word of folded.split(' ')) tokens.push({ raw, folded: word });
  }
  return tokens;
}
