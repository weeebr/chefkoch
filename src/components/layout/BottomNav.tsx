import type { ActiveScreen } from "../../types";
import { MaterialIcon } from "../MaterialIcon";

type BottomNavProps = {
  active: ActiveScreen;
  onChange: (screen: ActiveScreen) => void;
};

const tabs: { id: ActiveScreen; label: string; icon: string }[] = [
  { id: "ingredients", label: "Zutaten", icon: "kitchen" },
  { id: "recipes", label: "Rezepte", icon: "restaurant" },
  { id: "settings", label: "Settings", icon: "settings" },
];

export function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <>
      <nav
        className="fixed bottom-0 left-0 z-50 grid w-full grid-cols-3 border-t border-outline-variant/10 bg-surface/90 px-2 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] backdrop-blur-xl"
        aria-label="Hauptnavigation"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={
                isActive
                  ? "flex min-h-[52px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl bg-secondary-lighter/35 px-1 py-2.5 text-secondary transition-transform active:scale-95"
                  : "flex min-h-[52px] w-full flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2.5 text-on-surface-variant/50 transition-colors active:text-secondary active:scale-95"
              }
            >
              <MaterialIcon name={tab.icon} className="shrink-0 text-[26px]" />
              <span className="max-w-full text-center text-[9px] font-bold uppercase leading-tight tracking-[0.12em]">
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
      <div
        className="h-[calc(7.25rem+env(safe-area-inset-bottom,0px))] shrink-0"
        aria-hidden
      />
    </>
  );
}
