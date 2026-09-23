/**
 * The WHATWG URL, which every runtime this package runs in has — the browser, Node and Deno — and
 * which the package's own `lib` (ES2022, no DOM) does not describe. Declared here, for this
 * package's own type-check only, rather than taking in the whole DOM: `mapsLink.ts` needs the
 * same URL parser the edge function fetches with, because an allowlist that parses a link
 * differently from the thing that follows it is no allowlist.
 */
declare class URL {
  constructor(url: string, base?: string);
  readonly href: string;
  readonly protocol: string;
  readonly username: string;
  readonly password: string;
  readonly hostname: string;
  readonly port: string;
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly searchParams: URLSearchParams;
}

declare class URLSearchParams {
  get(name: string): string | null;
}
