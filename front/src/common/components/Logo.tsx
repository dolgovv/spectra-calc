/** Paper-white "S" tile with the accent dot punched out of its top-right corner. */
export default function Logo() {
  return (
    <div className="relative flex h-[34px] w-[34px] items-center justify-center rounded-mark bg-foreground font-display text-base font-bold text-background">
      S
      <span className="absolute -right-[3px] -top-[3px] h-1.5 w-1.5 rounded-full bg-accent" />
    </div>
  );
}
