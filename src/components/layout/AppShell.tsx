import type { ReactNode } from "react";
import type { ActiveScreen } from "../../types";
import { BottomNav } from "./BottomNav";

type AppShellProps = {
  screen: ActiveScreen;
  onNavigate: (screen: ActiveScreen) => void;
  children: ReactNode;
};

export function AppShell({ screen, onNavigate, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-surface text-on-surface">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</div>
      <BottomNav active={screen} onChange={onNavigate} />
    </div>
  );
}
