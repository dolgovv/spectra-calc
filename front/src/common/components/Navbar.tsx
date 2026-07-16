import { Link } from "react-router-dom";
import Logo from "./Logo";
import { ROUTES } from "../../router/routes";
import { cn } from "../../lib/cn";

export interface NavbarProps {
  /** Content-width class, matched to the page below so the brand lines up with it. */
  width: string;
}

/** Decorative ruler ticks — echoes the interval scale, every third tick short. */
function TicksRule() {
  return (
    <div className="hidden h-2 items-end gap-1.5 opacity-50 sm:flex">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          className={cn(
            "w-px bg-muted-faint",
            (i + 1) % 3 === 0 ? "h-[60%]" : "h-full",
          )}
        />
      ))}
    </div>
  );
}

export default function Navbar({ width }: NavbarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/[.78] backdrop-blur-lg">
      <div
        className={cn(
          "mx-auto flex items-center justify-between px-6 py-[18px]",
          width,
        )}
      >
        <Link to={ROUTES.home} className="flex items-center gap-3">
          <Logo />
          <span className="flex flex-col leading-[1.1]">
            <span className="font-display text-[17px] font-semibold">
              SpectraCalc
            </span>
          </span>
        </Link>
        <div className="flex items-center gap-5">
          <TicksRule />
          <a
            href="https://github.com/dolgovv"
            target="_blank"
            rel="noopener"
            className="rounded-full border border-border bg-surface px-3 py-1.5 text-[11px] text-muted transition hover:text-foreground"
          >
            by dolgovv
          </a>
        </div>
      </div>
    </header>
  );
}
