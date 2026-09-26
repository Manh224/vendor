"use client";

import { useState } from "react";

interface Tab {
  key: string;
  label: string;
  icon?: string;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (key: string) => void;
  children: (activeTab: string) => React.ReactNode;
}

export default function Tabs({ tabs, defaultTab, activeTab: controlledActiveTab, onTabChange, children }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab || tabs[0]?.key || "");
  
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalTab;

  const handleTabChange = (key: string) => {
    if (controlledActiveTab === undefined) {
      setInternalTab(key);
    }
    onTabChange?.(key);
  };

  return (
    <div>
      <div className="flex gap-1 border-b border-green-200 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              activeTab === tab.key
                ? "border-[#067643] text-[#067643]"
                : "border-transparent text-[#6B6B6B] hover:text-[#00321B] hover:border-[#067643]/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {children(activeTab)}
    </div>
  );
}
