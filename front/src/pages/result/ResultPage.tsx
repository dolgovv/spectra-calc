import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResultHeader from './components/ResultHeader';
import HeatmapCard from './components/HeatmapCard';
import StatsCard from './components/StatsCard';
import TextOutputBox from './components/TextOutputBox';
import ParametersCard from './components/ParametersCard';
import { loadResultData } from './actions/loadResultData';
import { ROUTES } from '../../router/routes';

export default function ResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const result = loadResultData(location.state);

  useEffect(() => {
    if (!result) {
      navigate(ROUTES.home, { replace: true });
    }
  }, [result, navigate]);

  if (!result) return null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <ResultHeader result={result} />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <HeatmapCard result={result} />
        </div>
        <div className="flex flex-col gap-6">
          <StatsCard interval={result.interval} stats={result.stats} />
          <TextOutputBox result={result} />
          <ParametersCard result={result} />
        </div>
      </div>
    </main>
  );
}
