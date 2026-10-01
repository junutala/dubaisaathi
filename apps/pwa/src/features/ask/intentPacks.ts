import { buildCorpus, type IntentCorpus } from './corpus.js';
import { transitPlaces } from './transitPlaces.js';
import places from '../../../../../data/intents/places.v1.json';
import keywords from '../../../../../data/intents/keywords.v1.json';
import network from '../../../../../data/transport/network.v1.json';

/**
 * The parser's vocabulary, bound to the packs that ship with the app. Built once, at module
 * load, so a malformed pack fails at boot rather than on the first sentence someone speaks.
 *
 * The curated places first, then every station and stop in the RTA network the app already
 * carries for routing (the owner, 1 October). A stop is reached by where it is, so a newer
 * network downloaded later (decision 030) routes to it just the same.
 */
export const intentCorpus: IntentCorpus = buildCorpus(places, keywords, transitPlaces(network));
