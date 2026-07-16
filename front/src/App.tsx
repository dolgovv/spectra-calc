import { Route, Routes } from 'react-router-dom';
import HomePage from './pages/home/HomePage';
import ResultPage from './pages/result/ResultPage';
import ExamplePage from './pages/example/ExamplePage';
import { ROUTES } from './router/routes';

/**
 * Each page renders its own chrome via PageShell — header width and footer note differ per route.
 * No background here on purpose: body carries it, so BackgroundMatrix (a negative z-index canvas)
 * still paints above the page background. A background on this wrapper would cover it.
 */
export default function App() {
  return (
    <div className="min-h-screen">
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.result} element={<ResultPage />} />
        <Route path={ROUTES.example} element={<ExamplePage />} />
      </Routes>
    </div>
  );
}
