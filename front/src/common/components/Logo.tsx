// Imported, not a literal path: Vite resolves it at build time and emits a hashed URL, so a
// missing file fails the build instead of 404-ing in production.
import logoWhite from '../../assets/logo-white.svg';

/** Brand mark. Decorative — the adjacent "SpectraCalc" wordmark carries the name. */
export default function Logo() {
  return (
    <div className="relative flex h-[34px] w-[34px] items-center justify-center rounded-mark font-display text-base font-bold text-background">
      <img className="flex scale-150" src={logoWhite} alt="" />
    </div>
  );
}
