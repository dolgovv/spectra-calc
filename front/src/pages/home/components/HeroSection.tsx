import { Link } from 'react-router-dom';
import Button from '../../../common/components/Button';
import { ROUTES } from '../../../router/routes';

export default function HeroSection() {
  return (
    <section className="max-w-[680px] pb-7 pt-16">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface py-1.5 pl-2.5 pr-3 text-[11px] uppercase tracking-[.1em] text-muted">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
        Спектроскопия комбинационного рассеяния · онлайн-расчёт
      </span>

      <h1 className="mb-[18px] mt-[22px] font-display text-4xl font-semibold leading-[1.02] tracking-[-0.015em] sm:text-[52px]">
        Анализ химических спектров
        <br />
        <em className="not-italic text-accent">в пару кликов</em>
      </h1>

      <p className="max-w-[520px] text-[17px] leading-[1.55] text-muted">
        Загрузите архив с данными, задайте интервал — и получите карту интенсивности и статистику за
        секунды.
      </p>

      <Link to={ROUTES.example} className="mt-[26px] inline-block">
        <Button variant="ghost">Пример результата →</Button>
      </Link>
    </section>
  );
}
