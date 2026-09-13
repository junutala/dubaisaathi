/**
 * The screens, by the numbers in `docs/field-ledger.md`. A hash route keeps the app a single
 * static file that works from any path — including a phone that opened it from the home
 * screen with no network.
 */
export type Route =
  | { readonly screen: 'home' }
  | { readonly screen: 'say' }
  | { readonly screen: 'arabic'; readonly phraseId: string }
  | { readonly screen: 'driver'; readonly phraseId: string }
  | { readonly screen: 'soon'; readonly tile: 'transport' | 'food' | 'info' };

export function parseRoute(hash: string): Route {
  const [name, arg] = hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case 'say':
      return { screen: 'say' };
    case 'arabic':
      return arg ? { screen: 'arabic', phraseId: arg } : { screen: 'say' };
    case 'driver':
      return arg ? { screen: 'driver', phraseId: arg } : { screen: 'say' };
    case 'soon':
      return arg === 'transport' || arg === 'food' || arg === 'info'
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
    case 'say':
      return '#/say';
    case 'arabic':
      return `#/arabic/${route.phraseId}`;
    case 'driver':
      return `#/driver/${route.phraseId}`;
    case 'soon':
      return `#/soon/${route.tile}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}
