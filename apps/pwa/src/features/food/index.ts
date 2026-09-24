/**
 * खाना — the pillar's public face. Everything outside this folder comes through here (CLAUDE.md:
 * "cross-feature imports go through a feature's index.ts barrel").
 */
export { FoodListScreen } from './FoodListScreen.js';
export { MenuScreen } from './MenuScreen.js';
export { searchOutlets, nearbyOutlets, type OutletSearch, type OutletHit } from './search.js';
export { outletById } from './outlets.js';
