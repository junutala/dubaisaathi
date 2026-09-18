import { buildCorpus, type IntentCorpus } from './corpus.js';
import places from '../../../../../data/intents/places.v1.json';
import keywords from '../../../../../data/intents/keywords.v1.json';

/**
 * The parser's vocabulary, bound to the packs that ship with the app. Built once, at module
 * load, so a malformed pack fails at boot rather than on the first sentence someone speaks.
 */
export const intentCorpus: IntentCorpus = buildCorpus(places, keywords);
