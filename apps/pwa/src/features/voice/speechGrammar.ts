import type { KeywordPack, PlacePack } from './corpus.js';

/**
 * The word list the offline recogniser is allowed to hear.
 *
 * Vosk's small Hindi model decodes against a general 50,000-word language model, and on a phone
 * that is what makes it usable for ordinary sentences and useless for the words this product
 * exists to hear. Measured on a real phone on 13 September: "Mall of the Emirates" came back as
 * "माला एमरेट्स". Proper nouns are rare in the text the model was trained on, so a common word
 * that sounds roughly similar always wins.
 *
 * Kaldi can be told to decode against a much smaller vocabulary instead — `KaldiRecognizer`
 * takes a grammar — and a recogniser choosing between four hundred words makes a different class
 * of mistake than one choosing between fifty thousand. That is the whole idea: the app does not
 * need to hear Hindi. It needs to hear the two hundred words a traveller uses to ask for a place,
 * a mode, a meal or a sentence for a driver.
 *
 * Three properties of this list matter, and each is a test in `speechGrammar.test.ts`:
 *
 *  - **Devanagari only.** The lexicon of a Hindi model is written in Devanagari; a Roman alias
 *    like "karama" is not a word it can output, so putting one in the grammar at best does
 *    nothing. The Roman aliases stay where they are useful — the parser, which reads what a
 *    person types as well as what the model heard.
 *  - **Words, not phrases.** A grammar of phrases only accepts those phrases in that order, and
 *    real Hinglish word order is not something to bet a trip on. A grammar of words accepts any
 *    order, and the saving still comes from the vocabulary being two hundred words instead of
 *    fifty thousand.
 *  - **Built from `data/intents/`, never written by hand.** The same two files feed the parser,
 *    so the recogniser can hear exactly what the parser can resolve. When the learning loop adds
 *    an alias, the recogniser gains it in the same commit — no second list to remember.
 */

/**
 * Kaldi's out-of-vocabulary token. Without it the grammar is a closed world and anything else a
 * traveller says is forced onto the nearest word in the list, which is a confidently wrong
 * answer — the worst thing this product can give someone standing on a kerb. With it, speech the
 * grammar does not cover comes back marked as unknown, and the screen asks.
 */
export const GRAMMAR_UNKNOWN = '[unk]';

/**
 * The glue a traveller speaks around the words that carry meaning. None of these change the
 * intent — the parser ignores every one of them — but the recogniser has to be allowed to hear
 * them, because a grammar that forbids "मुझे" hears something else in its place and that
 * something else is a word the parser does read.
 */
export const GLUE: readonly string[] = [
  'मुझे',
  'मैं',
  'मै',
  'हम',
  'हमें',
  'आप',
  'मेरा',
  'मेरी',
  'मेरे',
  'यहाँ',
  'वहाँ',
  'इस',
  'उस',
  'यह',
  'वह',
  'को',
  'का',
  'की',
  'के',
  'में',
  'से',
  'तक',
  'पर',
  'और',
  'या',
  'भी',
  'ही',
  'नहीं',
  'हाँ',
  'क्या',
  'कहाँ',
  'कैसे',
  'कितना',
  'कितनी',
  'कौन',
  'कब',
  'क्यों',
  'है',
  'हैं',
  'हूँ',
  'हो',
  'था',
  'थी',
  'चाहिए',
  'सकता',
  'सकती',
  'सकते',
  'करना',
  'बताओ',
  'बताइए',
  'मिलेगा',
  'मिलेगी',
  'मिलता',
  'मिलती',
  'करे',
  'करो',
  'बनाने',
  'आज',
  'कल',
  'दो',
  'देना',
  'भाई',
  'जी',
  'अच्छा',
  'ठीक',
  'थोड़ा',
  'ज़्यादा',
  'पास',
  'दूर',
  'जल्दी',
  'अभी',
  'एक',
  'तीन',
];

/**
 * The same glue as typed rather than spoken. Folding unifies most pairs — "मुझे" and "mujhe"
 * both become `muje` — but not all of them, and typing is the front door now (decision 014).
 * Only the Devanagari list above goes into the recogniser's grammar; this one exists for
 * reading what someone wrote.
 */
export const ROMAN_GLUE: readonly string[] = [
  'mujhe',
  'main',
  'mai',
  'hum',
  'humein',
  'aap',
  'mera',
  'meri',
  'mere',
  'yahan',
  'wahan',
  'is',
  'us',
  'yeh',
  'woh',
  'ko',
  'ka',
  'ki',
  'ke',
  'mein',
  'me',
  'se',
  'tak',
  'par',
  'aur',
  'ya',
  'bhi',
  'hi',
  'nahi',
  'haan',
  'kya',
  'kahan',
  'kaise',
  'kitna',
  'chalo',
  'jaana',
  'jana',
  'hai',
  'hain',
  'wala',
  'wali',
  'paas',
  'pass',
  'near',
  'the',
  'a',
  'to',
  'at',
  'in',
  'on',
  'of',
];

/** Devanagari, and nothing Roman mixed in — see the note on the lexicon above. */
const DEVANAGARI = /^[ऀ-ॿ‌‍]+$/u;

/**
 * Splits a curated phrase into the words a recogniser could emit, dropping the Roman ones.
 *
 * A hyphen is a spelling convention, not a sound: "वाई-फ़ाई" is one written word and two spoken
 * ones, and which of the three forms a given lexicon holds is not something this side can know.
 * So all three go in — the joined form and both halves — and the ones the model cannot say cost
 * nothing but a line in the list.
 */
function devanagariWords(phrase: string): readonly string[] {
  const out: string[] = [];
  for (const raw of phrase.normalize('NFC').split(/\s+/u)) {
    const word = raw.replace(/[।.,?!]/gu, '');
    for (const form of [word.replace(/-/gu, ''), ...word.split('-')]) {
      if (form !== '' && DEVANAGARI.test(form)) out.push(form);
    }
  }
  return out;
}

/**
 * Every Devanagari word in the two intent packs, plus the glue and the unknown token.
 *
 * Takes the packs raw rather than the built corpus on purpose: the corpus keeps only the folded
 * Roman comparison form, and folding is one-way — "करामा" and "kaarama" both fold to "karama",
 * and neither folded form is something a Hindi model can say.
 */
export function buildSpeechGrammar(rawPlaces: unknown, rawKeywords: unknown): readonly string[] {
  const placePack = rawPlaces as PlacePack;
  const pack = rawKeywords as KeywordPack;

  const words = new Set<string>();
  const add = (phrase: string) => {
    for (const word of devanagariWords(phrase)) words.add(word);
  };

  for (const place of placePack.places) {
    add(place.name.hi);
    for (const alias of place.name.aliases) add(alias);
  }

  const tables = [pack.intents, pack.modes, pack.foodTags, pack.documents, pack.phrases];
  for (const table of tables) {
    for (const phrases of Object.values(table)) {
      for (const phrase of phrases) add(phrase);
    }
  }
  for (const phrase of pack.hotel) add(phrase);
  for (const word of GLUE) add(word);

  if (words.size === 0) {
    throw new Error('speech grammar: no Devanagari words in the intent packs');
  }

  // Sorted so the grammar is stable between builds: it is hashed into nothing, but a list that
  // reorders itself makes a diff unreadable and a bug report impossible to compare.
  return [...words].sort((a, b) => a.localeCompare(b, 'hi')).concat(GRAMMAR_UNKNOWN);
}

/**
 * Takes Kaldi's out-of-vocabulary token back out of a transcript.
 *
 * A grammar-constrained recogniser writes `[unk]` wherever it heard something the grammar has no
 * word for. It is a marker for us, not a word: shown to a traveller it is noise, and handed to the
 * parser it is a token that matches nothing. What is left is the words that were recognised, and
 * the gap where they were not — which is what both the screen and the parser should see.
 */
export function withoutUnknownWords(text: string): string {
  return text
    .split(/\s+/u)
    .filter((word) => word !== GRAMMAR_UNKNOWN && word !== '')
    .join(' ');
}
