import type { ReactNode } from "react";
import Panel from "../../../common/components/Panel";

export interface StatTileProps {
  label: string;
  value: string;
  /** One quiet line under the value: the same measure for a shorter period, a size, a limit. */
  detail?: ReactNode;
}

/** A headline number. Sans and proportional figures: mono digits look loose at this size. */
export default function StatTile({ label, value, detail }: StatTileProps) {
  return (
    <Panel className="px-5 py-[18px]">
      <div className="text-[12.5px] text-muted">{label}</div>
      <div className="mt-1.5 font-sans text-[28px] font-semibold leading-tight text-foreground">
        {value}
      </div>
      {detail && <div className="mt-1 font-mono text-[11.5px] text-muted-faint">{detail}</div>}
    </Panel>
  );
}
