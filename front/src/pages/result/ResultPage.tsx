import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResultView from './components/ResultView';
import TruncationNotice from './components/TruncationNotice';
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
    <ResultView
      result={result}
      notice={result.spectraDropped > 0 ? <TruncationNotice result={result} /> : undefined}
    />
  );
}
