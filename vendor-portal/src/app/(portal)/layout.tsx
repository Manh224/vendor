"use client";

import { SessionProvider } from "next-auth/react";
import Sidebar from "@/components/layout/Sidebar";

export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <div className="flex min-h-screen bg-[#f0f7e6]">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SessionProvider>
  );
}
