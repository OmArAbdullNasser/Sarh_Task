import { createContext, useContext, useLayoutEffect, useState, type ReactNode } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useI18n } from '../lib/i18n';

type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return localStorage.getItem('sarh-theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      localStorage.setItem('sarh-theme', theme);
    } catch {
      /* Storage is optional. */
    }
  }, [theme]);
  return (
    <ThemeContext.Provider
      value={{ theme, toggle: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')) }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeToggle() {
  const context = useContext(ThemeContext);
  const { t } = useI18n();
  if (!context) return null;
  const label = t(context.theme === 'dark' ? 'lightTheme' : 'darkTheme');
  return (
    <button
      className="theme-button"
      type="button"
      onClick={context.toggle}
      aria-label={label}
      title={label}
    >
      {context.theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}
