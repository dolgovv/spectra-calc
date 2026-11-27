import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import HomePage from './pages/home/HomePage';
import ResultPage from './pages/result/ResultPage';
import ExamplePage from './pages/example/ExamplePage';
import { ROUTES } from './router/routes';
import { trackPageView } from './lib/trackPageView';

// A chunk of its own: visitors never download the admin.
const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

/**
 * Each page renders its own chrome via PageShell — header width and footer note differ per route.
 * No background here on purpose: body carries it, so BackgroundMatrix (a negative z-index canvas)
 * still paints above the page background. A background on this wrapper would cover it.
 */
export default function App() {
  const { pathname } = useLocation();

  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.result} element={<ResultPage />} />
        <Route path={ROUTES.example} element={<ExamplePage />} />
        <Route
          path={`${ROUTES.admin}/*`}
          element={
            <Suspense fallback={null}>
              <AdminApp />
            </Suspense>
          }
        />
      </Routes>
    </div>
  );
}
