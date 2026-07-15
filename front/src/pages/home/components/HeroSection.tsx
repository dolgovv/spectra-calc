import Badge from "../../../common/components/Badge";

export default function HeroSection() {
  return (
    <div className="mx-auto max-w-3xl px-6 pb-10 pt-16 text-center">
      <Badge
        tone="accent"
        icon={<span className="h-1.5 w-1.5 rounded-full bg-accent" />}
      >
        Рамановская спектроскопия · онлайн-расчёт
      </Badge>
      <h1 className="mt-6 text-4xl font-bold leading-tight">
        Анализ химических спектров <br />
        <span className="text-accent">в пару кликов</span>
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-lg text-muted">
        Загрузите архив с данными, задайте интервал — и получите карту
        интенсивности и статистику за секунды.
      </p>
    </div>
  );
}
