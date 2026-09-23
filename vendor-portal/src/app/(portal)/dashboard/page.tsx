"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

interface DashboardStats {
  activeVendors?: number;
  ordersThisMonth: number;
  invoicesPending: number;
  ticketsInProgress: number;
}

const statConfigs = [
  { key: "activeVendors", label: "NCC đang hợp tác", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4", color: "from-[#067643] to-[#01A258]", supermarketOnly: true },
  { key: "ordersThisMonth", label: "Đơn hàng tháng này", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2", color: "from-[#FF9811] to-[#E07B00]", supermarketOnly: false },
  { key: "invoicesPending", label: "Hóa đơn chờ duyệt", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z", color: "from-[#62B303] to-[#067643]", supermarketOnly: false },
  { key: "ticketsInProgress", label: "Ticket đang xử lý", icon: "M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z", color: "from-[#01A258] to-[#79DE01]", supermarketOnly: false },
];

export default function DashboardPage() {
  const { data: session } = useSession();
  const userName = session?.user?.name || "User";
  const side = (session?.user as any)?.side;

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/stats")
      .then(r => r.json())
      .then(json => {
        if (json.success) setStats(json.data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const visibleStats = statConfigs.filter(s => !s.supermarketOnly || side === "supermarket");

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#00321B]">
          Xin chào, {userName}! 👋
        </h1>
        <p className="text-[#6B6B6B] mt-1">
          {side === "vendor"
            ? "Quản lý hồ sơ, sản phẩm và đơn hàng của bạn"
            : "Tổng quan hệ thống Vendor Portal"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 ${visibleStats.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 mb-8`}>
        {visibleStats.map((stat) => {
          const value = loading ? "..." : (stats ? (stats as any)[stat.key] ?? "—" : "—");
          return (
            <div
              key={stat.key}
              className="bg-white border border-green-100 rounded-2xl p-5 hover:border-[#01A258]/30 hover:shadow-md transition-all duration-200 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                >
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={stat.icon} />
                  </svg>
                </div>
              </div>
              <p className="text-3xl font-bold text-[#00321B]">{value}</p>
              <p className="text-[#6B6B6B] text-sm mt-1">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Quick actions */}
      <div className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#00321B] mb-4">Thao tác nhanh</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: "Xem đơn hàng", href: "/orders", color: "bg-[#067643]/10 text-[#067643] hover:bg-[#067643]/20" },
            { label: "Quản lý sản phẩm", href: "/products", color: "bg-[#01A258]/10 text-[#01A258] hover:bg-[#01A258]/20" },
            { label: "Đối chiếu công nợ", href: "/finance", color: "bg-[#FF9811]/10 text-[#E07B00] hover:bg-[#FF9811]/20" },
            { label: "Tạo ticket hỗ trợ", href: "/support", color: "bg-[#62B303]/10 text-[#62B303] hover:bg-[#62B303]/20" },
          ].map((action) => (
            <a
              key={action.label}
              href={action.href}
              className={`${action.color} rounded-xl p-4 text-center text-sm font-medium transition-all duration-200`}
            >
              {action.label}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
