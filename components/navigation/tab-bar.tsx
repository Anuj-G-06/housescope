"use client";

import { Home, ScanLine, Settings } from "lucide-react";

export type TabId = "home" | "scan" | "settings";

interface TabBarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const tabs: { id: TabId; icon: typeof Home }[] = [
  { id: "home", icon: Home },
  { id: "scan", icon: ScanLine },
  { id: "settings", icon: Settings },
];

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-50 bg-white border-t border-[var(--color-border)] h-14 flex items-center justify-around px-4"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      {tabs.map(({ id, icon: Icon }) => (
        <button
          key={id}
          onClick={() => onTabChange(id)}
          className="flex items-center justify-center w-12 h-12 rounded-xl transition-colors"
        >
          <Icon
            size={24}
            strokeWidth={activeTab === id ? 2.5 : 1.5}
            className={activeTab === id ? "text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}
          />
        </button>
      ))}
    </nav>
  );
}
