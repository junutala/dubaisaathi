import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import {
  detectLocale,
  storeLocale,
  translate,
  type Locale,
  type StringKey,
} from '../i18n/index.js';
import { applyTheme, type ThemeName } from '../lib/tokens.js';

/**
 * The two things the traveller can change about how the app presents itself, and the one
 * thing they cannot: whether there is a network. All three live on the status strip.
 */
interface Settings {
  readonly locale: Locale;
  readonly theme: ThemeName;
  readonly online: boolean;
  readonly setLocale: (locale: Locale) => void;
  readonly toggleTheme: () => void;
  readonly t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<Settings | null>(null);

const THEME_KEY = 'saathi.theme';

function detectTheme(): ThemeName {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  // Follow the phone: browsers cannot read the ambient light sensor, so the phone's own
  // dark-mode schedule is the automatic path (CLAUDE.md, theme).
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);
  const [theme, setTheme] = useState<ThemeName>(detectTheme);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    applyTheme(theme);
    document.documentElement.lang = locale;
  }, [theme, locale]);

  useEffect(() => {
    const update = () => {
      setOnline(navigator.onLine);
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    storeLocale(next);
    setLocaleState(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next: ThemeName = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem(THEME_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<Settings>(
    () => ({
      locale,
      theme,
      online,
      setLocale,
      toggleTheme,
      t: (key, vars) => translate(locale, key, vars),
    }),
    [locale, theme, online, setLocale, toggleTheme],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Settings {
  const value = useContext(SettingsContext);
  if (!value) throw new Error('useSettings used outside SettingsProvider');
  return value;
}
