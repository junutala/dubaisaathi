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
  | { readonly screen: 'info' }
  | { readonly screen: 'hotelAdd' }
  | { readonly screen: 'docAdd' }
  | { readonly screen: 'docView'; readonly docId: string }
  | { readonly screen: 'soon'; readonly tile: 'transport' | 'food' | 'info' };

function isTile(value: string | undefined): value is Tile {
  return value === 'transport' || value === 'food' || value === 'talk' || value === 'info';
}

export function parseRoute(hash: string): Route {
  const [name, arg] = hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case 'listen':
      return { screen: 'listen', from: isTile(arg) ? arg : 'home' };
    case 'say':
      return { screen: 'say' };
    case 'arabic':
      return arg ? { screen: 'arabic', phraseId: arg } : { screen: 'say' };
    case 'driver':
      return arg ? { screen: 'driver', phraseId: arg } : { screen: 'say' };
    case 'info':
      return { screen: 'info' };
    case 'hotel-add':
      return { screen: 'hotelAdd' };
    case 'doc-add':
      return { screen: 'docAdd' };
    case 'doc':
      return arg ? { screen: 'docView', docId: arg } : { screen: 'info' };
    case 'soon':
      // ज़रूरी जानकारी is built, so `#/soon/info` is a bookmark and a mic landing that predate
      // it. Both open the real screen rather than being told it is still being made.
      if (arg === 'info') return { screen: 'info' };
      return arg === 'transport' || arg === 'food'
        ? { screen: 'soon', tile: arg }
        : { screen: 'home' };
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
    case 'info':
      return '#/info';
    case 'hotelAdd':
      return '#/hotel-add';
    case 'docAdd':
      return '#/doc-add';
    case 'docView':
      return `#/doc/${route.docId}`;
    case 'soon':
      // The same redirect as the parser's, so "did the mic land me here?" compares equal on
      // the screen the traveller actually reached.
      return route.tile === 'info' ? '#/info' : `#/soon/${route.tile}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}
