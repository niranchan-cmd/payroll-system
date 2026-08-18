import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  {
    id: 'midnight',
    name: 'Midnight Indigo',
    type: 'dark',
    primary: '#4f6ef7',
    bg: '#0b0f1a',
    surface: '#111827',
  },
  {
    id: 'light',
    name: 'Executive Light',
    type: 'light',
    primary: '#3b5bdb',
    bg: '#f8fafc',
    surface: '#ffffff',
  },
  {
    id: 'emerald',
    name: 'Emerald Wealth',
    type: 'dark',
    primary: '#10b981',
    bg: '#06130e',
    surface: '#0d201a',
  },
  {
    id: 'amethyst',
    name: 'Royal Amethyst',
    type: 'dark',
    primary: '#8b5cf6',
    bg: '#0f0c1b',
    surface: '#18142a',
  },
  {
    id: 'amber',
    name: 'Sunset Copper',
    type: 'dark',
    primary: '#f59e0b',
    bg: '#140f09',
    surface: '#201912',
  },
  {
    id: 'slate',
    name: 'Nordic Cyan',
    type: 'dark',
    primary: '#06b6d4',
    bg: '#09131a',
    surface: '#101e28',
  },
];

const ThemeContext = createContext({
  theme: 'midnight',
  setTheme: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('payease_theme') || 'midnight';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('payease_theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
