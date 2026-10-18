import { useEffect } from 'react';
import { useThemeStore, initTheme } from '@/store/themeStore';

export function useTheme() {
  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    initTheme(theme);
  }, [theme]);

  return { theme, setTheme };
}
