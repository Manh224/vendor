"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface VendorListItem {
  id: string;
  companyName: string;
  taxCode: string;
  email: string | null;
  phone: string | null;
  status: string;
  currentRanking: string;
  city: string | null;
  createdAt: string;
  _count: { users: number; contracts: number };
}

const statusTabs = [
  { key: "all", label: "Tất cả" },
  { key: "pending_registration", label: "Chờ đăng ký" },
  { key: "pending_review", label: "Chờ duyệt" },
  { key: "active", label: "Đang hoạt động" },
  { key: "suspended", label: "Tạm ngưng" },
];

const rankingColors: Record<string, string> = {
  A: "text-emerald-600",
  B: "text-[#067643]",
  C: "text-amber-600",
  D: "text-red-600",
  "N/A": "text-gray-400",
};

export default function VendorsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Vendor side: redirect to their own profile
  useEffect(() => {
    if (user?.side === "vendor" && user?.vendorId) {
      router.replace(`/vendors/${user.vendorId}`);
    }
  }, [user, router]);

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search) params.set("search", search);

  const shouldFetch = user?.side !== "vendor";
  const { data, isLoading } = useSWR(shouldFetch ? `/api/vendors?${params.toString()}` : null, fetcher);
  
  const vendors = data?.data?.items || [];
  const totalPages = data?.data?.totalPages || 1;
  const total = data?.data?.total || 0;
  const loading = isLoading;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  // Don't render for vendor side (redirect in progress)
  if (user?.side === "vendor") return null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00321B]">Nhà cung cấp</h1>
          <p className="text-[#6B6B6B] mt-1">
            Quản lý danh sách và hồ sơ nhà cung cấp ({total} NCC)
          </p>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-1 mb-6 border-b border-green-200">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              statusFilter === tab.key
                ? "border-[#067643] text-[#067643]"
                : "border-transparent text-[#6B6B6B] hover:text-[#00321B] hover:border-[#067643]/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-md">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Tìm theo tên NCC hoặc mã số thuế..."
            className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30 focus:border-[#067643]/50 shadow-sm"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-green-100 bg-[#f8ffef]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Nhà cung cấp</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">MST</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Trạng thái</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Xếp hạng</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Khu vực</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Ngày tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">
                    Đang tải...
                  </td>
                </tr>
              ) : vendors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">
                    {search ? "Không tìm thấy NCC phù hợp" : "Chưa có nhà cung cấp nào"}
                  </td>
                </tr>
              ) : (
                vendors.map((vendor) => (
                  <tr
                    key={vendor.id}
                    onClick={() => router.push(`/vendors/${vendor.id}`)}
                    className="hover:bg-[#f8ffef]/60 transition-colors cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[#00321B] text-sm font-medium">{vendor.companyName}</p>
                        <p className="text-gray-400 text-xs">{vendor.email || "—"}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-[#00321B] text-sm font-mono">
                      {vendor.taxCode}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={vendor.status} type="vendor" />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-bold ${rankingColors[vendor.currentRanking] || "text-gray-400"}`}>
                        {vendor.currentRanking}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">
                      {vendor.city || "—"}
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">
                      {new Date(vendor.createdAt).toLocaleDateString("vi-VN")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
