import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { HomePage }      from '@/pages/HomePage';
import { PortfolioPage } from '@/pages/PortfolioPage';
import { PhasesPage }    from '@/pages/PhasesPage';
import { GraphPage }     from '@/pages/GraphPage';
import { SearchPage }    from '@/pages/SearchPage';
import { SettingsPage }  from '@/pages/SettingsPage';
import { AboutPage }     from '@/pages/AboutPage';
import { useThemeStore, initTheme } from '@/store/themeStore';
import { Toaster }       from '@/components/ui/toaster';

export default function App() {
  const theme = useThemeStore(s => s.theme);

  useEffect(() => {
    initTheme(theme);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (theme !== 'system') return;
    const handler = () => initTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home"      element={<HomePage />} />
          <Route path="portfolio" element={<PortfolioPage />} />
          <Route path="phases"    element={<PhasesPage />} />
          <Route path="graph"     element={<GraphPage />} />
          <Route path="search"    element={<SearchPage />} />
          <Route path="settings"  element={<SettingsPage />} />
          <Route path="about"     element={<AboutPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
