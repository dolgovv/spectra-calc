import type { ReactNode } from "react";
import PageShell from "../../../common/components/PageShell";

export interface AdminLayoutProps {
  children?: ReactNode;
  /** Right of the title: the tabs and the logout button once logged in. */
  toolbar?: ReactNode;
}

export default function AdminLayout({ children, toolbar }: AdminLayoutProps) {
  return (
    <PageShell width="wide" className="pb-[90px] pt-7">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-[28px] font-semibold">Админка</h1>
        {toolbar}
      </div>
      {children}
    </PageShell>
  );
}
