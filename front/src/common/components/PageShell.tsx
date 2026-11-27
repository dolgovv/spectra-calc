import type { ReactNode } from "react";
import Navbar from "./Navbar";
import BackgroundMatrix from "./BackgroundMatrix";
import { cn } from "../../lib/cn";

export interface PageShellProps {
  children: ReactNode;
  /** Home is the narrower editorial column; result pages need the extra width for the grid. */
  width?: "narrow" | "wide";
  /** Paints the blurred colour-field canvas behind the page (Home only). */
  background?: boolean;
  className?: string;
}

const WIDTHS = {
  narrow: "max-w-[1080px]",
  wide: "max-w-[1180px]",
} as const;

/** Header + content column + footer. Every page renders through this so the chrome stays identical. */
export default function PageShell({
  children,
  width = "narrow",
  background = false,
  className,
}: PageShellProps) {
  const maxWidth = WIDTHS[width];
  return (
    <>
      {background && <BackgroundMatrix />}
      <Navbar width={maxWidth} />
      <main className={cn("mx-auto px-6", maxWidth, className)}>
        {children}
      </main>
      <footer
        className={cn(
          "mx-auto mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border",
          "px-6 pb-14 pt-7 font-mono text-[11.5px] text-muted-faint",
          maxWidth,
        )}
      >
        <span>
          SpectraCalc — Спектроскопия комбинационного рассеяния онлайн
        </span>
      </footer>
    </>
  );
}
