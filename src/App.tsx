import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { NotFoundPage } from '@/components/NotFoundPage';
import { useThemeStore, initTheme } from '@/store/themeStore';
import { Toaster }       from '@/components/ui/toaster';

const HomePage      = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const PortfolioPage = lazy(() => import('@/pages/PortfolioPage').then(m => ({ default: m.PortfolioPage })));
const PhasesPage    = lazy(() => import('@/pages/PhasesPage').then(m => ({ default: m.PhasesPage })));
const GraphPage     = lazy(() => import('@/pages/GraphPage').then(m => ({ default: m.GraphPage })));
const SearchPage    = lazy(() => import('@/pages/SearchPage').then(m => ({ default: m.SearchPage })));
const PlanningPage  = lazy(() => import('@/pages/PlanningPage').then(m => ({ default: m.PlanningPage })));
const SettingsPage  = lazy(() => import('@/pages/SettingsPage').then(m => ({ default: m.SettingsPage })));
const AboutPage     = lazy(() => import('@/pages/AboutPage').then(m => ({ default: m.AboutPage })));

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
          <Route path="planning"  element={<PlanningPage />} />
          <Route path="settings"  element={<SettingsPage />} />
          <Route path="about"     element={<AboutPage />} />
          <Route path="*"         element={<NotFoundPage />} />
        </Route>
      </Routes>
      <Toaster />
    </BrowserRouter>
  );
}
