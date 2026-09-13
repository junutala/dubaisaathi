import 'fake-indexeddb/auto';

/**
 * jsdom implements neither of these, and both are read during the first render: the theme
 * follows the phone, and the strip shows whether there is a network. Stubbing them here rather
 * than in each test keeps the tests about the app rather than about the environment.
 */
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
