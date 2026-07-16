import { Info } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ROUTES } from '../../../router/routes';

export default function ExampleNotice() {
  return (
    <div className="mb-6 flex items-start gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4">
      <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
      <p className="text-sm text-muted">
        Это готовый пример расчёта — результат подготовлен заранее и открывается сразу, ничего
        не считается.{' '}
        <Link to={ROUTES.home} className="font-medium text-accent transition hover:underline">
          Загрузите свой архив
        </Link>
        , чтобы получить собственную карту.
      </p>
    </div>
  );
}
