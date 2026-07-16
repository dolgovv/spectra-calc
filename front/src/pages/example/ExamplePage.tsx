import ResultView from '../result/components/ResultView';
import ExampleNotice from './components/ExampleNotice';
import { EXAMPLE_RESULT } from './exampleResult';

/**
 * Static demo of a finished calculation. The result is a bundled fixture and its artifacts are
 * static files, so the page paints immediately — no upload, no backend, no loading state.
 */
export default function ExamplePage() {
  return <ResultView result={EXAMPLE_RESULT} notice={<ExampleNotice />} />;
}
