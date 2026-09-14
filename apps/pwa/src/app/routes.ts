import type { RouteOptionId } from '../features/transport/index.js';
import type { Tile } from './shell/ScreenHeader.js';

/**
 * The screens, by the numbers in `docs/field-ledger.md`. A hash route keeps the app a single
 * static file that works from any path — including a phone that opened it from the home
 * screen with no network.
 */
export type Route =
  | { readonly screen: 'home' }
  // 1.2, but reachable from every screen: `from` is the tile whose crumb the header shows.
  | { readonly screen: 'listen'; readonly from: Tile }
  | { readonly screen: 'say' }
  | { readonly screen: 'arabic'; readonly phraseId: string }
  | { readonly screen: 'driver'; readonly phraseId: string }
  // 1.1. `placeId` is optional so the same screen serves an empty box, the mic's destination,
  // and — when tile 2 lands — a restaurant's "go there". Arriving with one is a navigation.
  | { readonly screen: 'transport'; readonly placeId?: string }
  // 1.1b
  | { readonly screen: 'nolocation' }
  // 1.3
  | { readonly screen: 'options'; readonly placeId: string }
  // 1.4
  | { readonly screen: 'steps'; readonly placeId: string; readonly optionId: RouteOptionId }
  | { readonly screen: 'soon'; readonly tile: 'food' | 'info' };

function isOptionId(value: string | undefined): value is RouteOptionId {
  return value === 'metro' || value === 'bus' || value === 'walk' || value === 'taxi';
}

function isTile(value: string | undefined): value is Tile {
  return value === 'transport' || value === 'food' || value === 'talk' || value === 'info';
}

export function parseRoute(hash: string): Route {
  const [name, arg, extra] = hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case 'listen':
      return { screen: 'listen', from: isTile(arg) ? arg : 'home' };
    case 'say':
      return { screen: 'say' };
    case 'arabic':
      return arg ? { screen: 'arabic', phraseId: arg } : { screen: 'say' };
    case 'driver':
      return arg ? { screen: 'driver', phraseId: arg } : { screen: 'say' };
    case 'transport':
      return arg ? { screen: 'transport', placeId: arg } : { screen: 'transport' };
    case 'nolocation':
      return { screen: 'nolocation' };
    case 'options':
      return arg ? { screen: 'options', placeId: arg } : { screen: 'transport' };
    case 'steps':
      return arg && isOptionId(extra)
        ? { screen: 'steps', placeId: arg, optionId: extra }
        : { screen: 'transport' };
    case 'soon':
      return arg === 'food' || arg === 'info' ? { screen: 'soon', tile: arg } : { screen: 'home' };
    default:
      return { screen: 'home' };
  }
}

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/';
    case 'listen':
      return `#/listen/${route.from}`;
    case 'say':
      return '#/say';
    case 'arabic':
      return `#/arabic/${route.phraseId}`;
    case 'driver':
      return `#/driver/${route.phraseId}`;
    case 'transport':
      return route.placeId === undefined ? '#/transport' : `#/transport/${route.placeId}`;
    case 'nolocation':
      return '#/nolocation';
    case 'options':
      return `#/options/${route.placeId}`;
    case 'steps':
      return `#/steps/${route.placeId}/${route.optionId}`;
    case 'soon':
      return `#/soon/${route.tile}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}
