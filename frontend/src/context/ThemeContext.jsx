import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const DEFAULT_THEME_CONTEXT = {
  theme: 'dark',
  resolvedTheme: 'dark',
  isDark: true,
  setTheme: () => {}
};

const ThemeContext = createContext(DEFAULT_THEME_CONTEXT);

const STORAGE_KEY = 'feedbackmind_theme';

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    if (typeof window === 'undefined') return 'dark';
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        return stored;
      }
    } catch {
      // Fallback if localStorage is inaccessible
    }
    return 'dark'; // Dark Mode is default for first-time users
  });

  const [systemIsDark, setSystemIsDark] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return true;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for OS color scheme preference changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e) => setSystemIsDark(e.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  const resolvedTheme = useMemo(() => {
    if (theme === 'system') {
      return systemIsDark ? 'dark' : 'light';
    }
    return theme;
  }, [theme, systemIsDark]);

  const isDark = resolvedTheme === 'dark';

  // Apply dark class and colorScheme to HTML element
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, [isDark]);

  const setTheme = useCallback((newTheme) => {
    if (newTheme !== 'dark' && newTheme !== 'light' && newTheme !== 'system') return;
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // Ignore write errors
    }
  }, []);

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    isDark,
    setTheme
  }), [theme, resolvedTheme, isDark, setTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  return context || DEFAULT_THEME_CONTEXT;
}
