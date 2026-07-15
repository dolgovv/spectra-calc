import { Route, Routes } from 'react-router-dom';
import Navbar from './common/components/Navbar';
import HomePage from './pages/home/HomePage';
import ResultPage from './pages/result/ResultPage';
import { ROUTES } from './router/routes';

export default function App() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Routes>
        <Route path={ROUTES.home} element={<HomePage />} />
        <Route path={ROUTES.result} element={<ResultPage />} />
      </Routes>
    </div>
  );
}
