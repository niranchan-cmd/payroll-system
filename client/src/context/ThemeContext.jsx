import { createContext, useContext, useState, useEffect } from 'react';

const THEMES = [
  {
    id: 'light',
    name: 'Swiss Clean White',
    type: 'light',
    primary: '#023326',
    bg: '#ffffff',
    surface: '#f8fafc',
  },
  {
    id: 'emerald',
    name: 'Obsidian & Emerald',
    type: 'dark',
    primary: '#10b981',
    bg: '#030712',
    surface: '#0b0f17',
  },
  {
    id: 'midnight',
    name: 'Executive Midnight',
    type: 'dark',
    primary: '#4f6ef7',
    bg: '#090d16',
    surface: '#0f172a',
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
];

export const ThemeContext = createContext({
  theme: 'light',
  setTheme: () => {},
  themes: THEMES,
});

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    // Default to 'light' (Swiss Clean White)
    const saved = localStorage.getItem('ployepe_theme');
    // If previously saved as 'emerald' (old muddy theme), reset to 'light' for clean experience
    if (!saved || saved === 'emerald') return 'light';
    return saved;
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ployepe_theme', theme);
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
