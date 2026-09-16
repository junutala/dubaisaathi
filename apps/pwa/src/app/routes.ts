import type { RouteOptionId } from '../features/transport/index.js';

/**
 * The screens, by the numbers in `docs/field-ledger.md`: घर and its children, then one pillar
 * per digit — 1 खाना, 2 जाना, 3 जानना. A hash route keeps the app a single static file that
 * works from any path, including a phone that opened it from the home screen with no network.
 */
export type Route =
  | { readonly screen: 'home' }
  // घर.1 · मेरा होटल — the strip's hotel row opens it
  | { readonly screen: 'hotel' }
  // घर.2 · दस्तावेज़, and its add and view screens (घर.3)
  | { readonly screen: 'docs' }
  | { readonly screen: 'docAdd' }
  | { readonly screen: 'docView'; readonly docId: string }
  // घर.4 · पास
  | { readonly screen: 'pass' }
  // 1.1 / 1.2 · खाना — one screen; a dish in the box is what makes it 1.2
  | { readonly screen: 'food'; readonly dish?: string }
  // 1.3 · the outlet, 1.4 · its menu
  | { readonly screen: 'outlet'; readonly outletId: string }
  | { readonly screen: 'menu'; readonly outletId: string }
  // 2.1 · जाना, with the box already filled when a place was handed in
  | { readonly screen: 'go'; readonly placeId?: string }
  // 2.2 · options, 2.3 · steps, 2.4 · taxi, 2.5 · location refused
  | { readonly screen: 'options'; readonly placeId: string }
  | { readonly screen: 'steps'; readonly placeId: string; readonly optionId: RouteOptionId }
  | { readonly screen: 'taxi'; readonly placeId: string }
  | { readonly screen: 'nolocation' }
  // 3.1 · जानना, 3.2 · one place
  | { readonly screen: 'know' }
  | { readonly screen: 'place'; readonly placeId: string };

function isOptionId(value: string | undefined): value is RouteOptionId {
  return value === 'metro' || value === 'bus' || value === 'walk' || value === 'taxi';
}

export function parseRoute(hash: string): Route {
  const [name, arg, extra] = hash.replace(/^#\/?/, '').split('/');
  switch (name) {
    case 'hotel':
      return { screen: 'hotel' };
    case 'docs':
      return { screen: 'docs' };
    case 'doc-add':
      return { screen: 'docAdd' };
    case 'doc':
      return arg ? { screen: 'docView', docId: arg } : { screen: 'docs' };
    case 'pass':
      return { screen: 'pass' };
    case 'food':
      return arg ? { screen: 'food', dish: decodeURIComponent(arg) } : { screen: 'food' };
    case 'outlet':
      return arg ? { screen: 'outlet', outletId: arg } : { screen: 'food' };
    case 'menu':
      return arg ? { screen: 'menu', outletId: arg } : { screen: 'food' };
    case 'go':
      return arg ? { screen: 'go', placeId: arg } : { screen: 'go' };
    case 'options':
      return arg ? { screen: 'options', placeId: arg } : { screen: 'go' };
    case 'steps':
      return arg && isOptionId(extra)
        ? { screen: 'steps', placeId: arg, optionId: extra }
        : { screen: 'go' };
    case 'taxi':
      return arg ? { screen: 'taxi', placeId: arg } : { screen: 'go' };
    case 'nolocation':
      return { screen: 'nolocation' };
    case 'know':
      return { screen: 'know' };
    case 'place':
      return arg ? { screen: 'place', placeId: arg } : { screen: 'know' };
    default:
      return { screen: 'home' };
  }
}

export function href(route: Route): string {
  switch (route.screen) {
    case 'home':
      return '#/';
    case 'hotel':
      return '#/hotel';
    case 'docs':
      return '#/docs';
    case 'docAdd':
      return '#/doc-add';
    case 'docView':
      return `#/doc/${route.docId}`;
    case 'pass':
      return '#/pass';
    case 'food':
      return route.dish === undefined ? '#/food' : `#/food/${encodeURIComponent(route.dish)}`;
    case 'outlet':
      return `#/outlet/${route.outletId}`;
    case 'menu':
      return `#/menu/${route.outletId}`;
    case 'go':
      return route.placeId === undefined ? '#/go' : `#/go/${route.placeId}`;
    case 'options':
      return `#/options/${route.placeId}`;
    case 'steps':
      return `#/steps/${route.placeId}/${route.optionId}`;
    case 'taxi':
      return `#/taxi/${route.placeId}`;
    case 'nolocation':
      return '#/nolocation';
    case 'know':
      return '#/know';
    case 'place':
      return `#/place/${route.placeId}`;
  }
}

export function navigate(route: Route): void {
  window.location.hash = href(route);
}

/** Which pillar a screen belongs to, for the header's colour and the bar's lit item. */
export type Pillar = 'food' | 'go' | 'know' | 'docs' | 'home';

export function pillarOf(route: Route): Pillar {
  switch (route.screen) {
    case 'food':
    case 'outlet':
    case 'menu':
      return 'food';
    case 'go':
    case 'options':
    case 'steps':
    case 'taxi':
    case 'nolocation':
      return 'go';
    case 'know':
    case 'place':
      return 'know';
    case 'docs':
    case 'docAdd':
    case 'docView':
      return 'docs';
    case 'home':
    case 'hotel':
    case 'pass':
      return 'home';
  }
}
