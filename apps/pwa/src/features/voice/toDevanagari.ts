import { foldArabic } from './normalise.js';

/**
 * Hindi written in Urdu script, put back into Devanagari — for reading, and for nothing else.
 *
 * The offline recogniser hears Hindi correctly and writes it in the other alphabet: the owner
 * said "mujhe BurJuman jana hai" and his phone showed him "مجھے برجمان جنا ہے". Same words, same
 * grammar, same meaning — Hindi and Urdu are one spoken language with two writing systems, so
 * nothing was mistranslated. But the screen above that box asks "Is this right?", and a question
 * in an alphabet the traveller cannot read is not a question. They cannot confirm it and they
 * cannot correct it; they can only guess.
 *
 * **Display only, and that is the whole licence this takes.** Matching already works in every
 * script (`fold` keeps Arabic letters, and a place's Arabic name is an alias like any other), and
 * the learning loop records what the model actually produced. So a letter this gets wrong costs
 * legibility and never correctness — which is what makes an approximation acceptable here and
 * would not make it acceptable anywhere else.
 *
 * It is an approximation because it has to be. Urdu does not write short vowels: "مجھے" is
 * m-jh-e on the page and "mujhe" in the mouth, and the `u` is simply not there to convert. So
 * three things happen in order, and the first two are exact:
 *
 *   1. names we ship in both scripts — every place in the pack carries `ar` and `hi`;
 *   2. the ordinary words of a traveller's sentence, listed below, where the vowels are known;
 *   3. letter by letter for everything else, which yields a vowel-light but readable word.
 */

/** Aspirates: the do-chashmi he modifies the consonant before it rather than standing alone. */
const PAIRS: readonly (readonly [string, string])[] = [
  ['بھ', 'भ'],
  ['پھ', 'फ'],
  ['تھ', 'थ'],
  ['ٹھ', 'ठ'],
  ['جھ', 'झ'],
  ['چھ', 'छ'],
  ['دھ', 'ध'],
  ['ڈھ', 'ढ'],
  ['کھ', 'ख'],
  ['گھ', 'घ'],
  ['ڑھ', 'ढ़'],
];

const LETTERS: ReadonlyMap<string, string> = new Map([
  ['ب', 'ब'],
  ['پ', 'प'],
  ['ت', 'त'],
  ['ٹ', 'ट'],
  ['ث', 'स'],
  ['ج', 'ज'],
  ['چ', 'च'],
  ['ح', 'ह'],
  ['خ', 'ख'],
  ['د', 'द'],
  ['ڈ', 'ड'],
  ['ذ', 'ज'],
  ['ر', 'र'],
  ['ڑ', 'ड़'],
  ['ز', 'ज़'],
  ['ژ', 'ज़'],
  ['س', 'स'],
  ['ش', 'श'],
  ['ص', 'स'],
  ['ض', 'ज़'],
  ['ط', 'त'],
  ['ظ', 'ज़'],
  ['ع', ''],
  ['غ', 'ग'],
  ['ف', 'फ'],
  ['ق', 'क'],
  ['ك', 'क'],
  ['گ', 'ग'],
  ['ل', 'ल'],
  ['م', 'म'],
  ['ن', 'न'],
  ['ں', 'ं'],
  ['ه', 'ह'],
  ['ء', ''],
]);

/**
 * The ordinary words of the sentences this product hears, where the missing vowels are known.
 *
 * Not a dictionary and not trying to be. These are the words that turn up in "take me to", "how
 * do I get to", "is there", "how much" — the frame around the place name, which is the part a
 * traveller reads to check that the sentence is theirs. The place name itself comes from the
 * pack, exactly, because we ship it in both scripts.
 */
const WORDS: ReadonlyMap<string, string> = new Map(
  (
    [
      ['مجھے', 'मुझे'],
      ['مجهے', 'मुझे'],
      ['ہمیں', 'हमें'],
      ['میں', 'में'],
      ['میرا', 'मेरा'],
      ['میری', 'मेरी'],
      ['آپ', 'आप'],
      ['جانا', 'जाना'],
      ['جنا', 'जाना'],
      ['ہے', 'है'],
      ['ہیں', 'हैं'],
      ['تھا', 'था'],
      ['کہاں', 'कहाँ'],
      ['کیسے', 'कैसे'],
      ['کتنا', 'कितना'],
      ['کتنے', 'कितने'],
      ['کیا', 'क्या'],
      ['کب', 'कब'],
      ['کون', 'कौन'],
      ['چاہیے', 'चाहिए'],
      ['ملے', 'मिले'],
      ['ملتا', 'मिलता'],
      ['لے', 'ले'],
      ['چلو', 'चलो'],
      ['چلیے', 'चलिए'],
      ['تک', 'तक'],
      ['تاک', 'तक'],
      ['سے', 'से'],
      ['کا', 'का'],
      ['کی', 'की'],
      ['کے', 'के'],
      ['کو', 'को'],
      ['پر', 'पर'],
      ['اور', 'और'],
      ['یا', 'या'],
      ['نہیں', 'नहीं'],
      ['ہاں', 'हाँ'],
      ['بھائی', 'भाई'],
      ['پاس', 'पास'],
      ['قریب', 'क़रीब'],
      ['جگہ', 'जगह'],
      ['کھانا', 'खाना'],
      ['پانی', 'पानी'],
      ['ہوٹل', 'होटल'],
      ['ٹیکسی', 'टैक्सी'],
      ['میٹرو', 'मेट्रो'],
      ['بس', 'बस'],
      ['روپے', 'रुपये'],
      ['درہم', 'दिरहम'],
      ['شکریہ', 'शुक्रिया'],
      ['خراب', 'ख़राब'],
      ['ٹھیک', 'ठीक'],
      ['بند', 'बंद'],
      ['کھلا', 'खुला'],
      // English words a traveller uses inside a Hindi sentence, spelled by ear in Urdu. Letter
      // by letter "اے سی" becomes "अी से"; it is "ए सी", and a traveller reads it at a glance.
      ['اے', 'ए'],
      ['سی', 'सी'],
      ['مال', 'मॉल'],
      ['ڈرائیور', 'ड्राइवर'],
      ['ایئرپورٹ', 'एयरपोर्ट'],
      ['اسٹیشن', 'स्टेशन'],
      ['یہ', 'यह'],
      ['وہ', 'वह'],
      ['اس', 'इस'],
      ['ایک', 'एक'],
      ['دو', 'दो'],
      ['تین', 'तीन'],
      ['بجے', 'बजे'],
      ['صبح', 'सुबह'],
      ['شام', 'शाम'],
      ['رات', 'रात'],
      ['دکھاؤ', 'दिखाओ'],
      ['بتاؤ', 'बताओ'],
    ] as const
  ).map(([urdu, hindi]) => [foldArabic(urdu), hindi] as const),
);

/** Whether this reads as Perso-Arabic — the question of which alphabet, not which language. */
export function isPersoArabic(text: string): boolean {
  return /[؀-ۿ]/u.test(text);
}

/**
 * The shortest run of letters worth recognising inside a longer word.
 *
 * The recogniser does not always put spaces between words: a real phone produced "برجمانتاک" —
 * BurJuman and तक with nothing between them — and a whole-word lookup found neither, so the
 * place we ship in both alphabets came out letter by letter as "बरजमान". Scanning inside the
 * word fixes that and would break more than it fixed if it were allowed to match two-letter
 * particles, which occur inside ordinary words constantly. Three letters and up only.
 */
const INSIDE_A_WORD = 3;

/** One word, by the three routes in order: a name we ship, a word we listed, then letters. */
function wordToDevanagari(word: string, known: ReadonlyMap<string, string>): string {
  const settled = foldArabic(word);
  const named = known.get(settled) ?? WORDS.get(settled);
  if (named !== undefined) return named;

  // Longest first, so "برجمان" is never cut short by a shorter name that opens the same way.
  const inside = [...known, ...WORDS]
    .filter(([urdu]) => urdu.length >= INSIDE_A_WORD)
    .sort((a, b) => b[0].length - a[0].length);

  let out = '';
  let rest = settled;
  let first = true;
  while (rest !== '') {
    const found = inside.find(([urdu]) => rest.startsWith(urdu));
    if (found) {
      out += `${found[1]} `;
      rest = rest.slice(found[0].length);
      first = true;
      continue;
    }
    const pair = PAIRS.find(([urdu]) => rest.startsWith(urdu));
    if (pair) {
      out += pair[1];
      rest = rest.slice(pair[0].length);
      first = false;
      continue;
    }
    const letter = rest[0] ?? '';
    rest = rest.slice(1);
    // The three letters that are a vowel in the middle of a word and a consonant at the front of
    // one. Urdu makes no distinction in writing; Devanagari must.
    if (letter === 'ا' || letter === 'آ') out += first ? 'अ' : 'ा';
    else if (letter === 'و') out += first ? 'व' : 'ो';
    else if (letter === 'ي') out += first ? 'य' : 'ी';
    else out += LETTERS.get(letter) ?? letter;
    first = false;
  }
  // A recognised name inside a longer word becomes a word of its own, which can leave a space at
  // an edge or two together. The traveller sees words, not the seams of how they were found.
  return out.replace(/ +/gu, ' ').trim();
}

/**
 * The sentence in Devanagari, leaving anything that is not Perso-Arabic exactly as it is.
 *
 * `known` maps a folded Perso-Arabic name to its Devanagari spelling, and comes from the place
 * pack — every place carries both, because the Arabic is what a driver is shown. Names are the
 * part a traveller checks hardest and the part an approximation would fumble worst, so they are
 * looked up rather than converted.
 */
export function toDevanagari(text: string, known: ReadonlyMap<string, string>): string {
  if (!isPersoArabic(text)) return text;
  return text
    .split(/(\s+)/u)
    .map((part) => (isPersoArabic(part) ? wordToDevanagari(part, known) : part))
    .join('');
}
