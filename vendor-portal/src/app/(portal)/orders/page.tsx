"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import Pagination from "@/components/ui/Pagination";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const poStatusMap: Record<string, { label: string; color: string }> = {
  new: { label: "Mới", color: "bg-blue-50 text-blue-600" },
  sent_to_vendor: { label: "Đã gửi NCC", color: "bg-indigo-50 text-indigo-600" },
  confirmed: { label: "NCC xác nhận", color: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "NCC từ chối", color: "bg-red-50 text-red-600" },
  modification_requested: { label: "Yêu cầu sửa", color: "bg-orange-50 text-orange-600" },
  preparing: { label: "Đang chuẩn bị", color: "bg-cyan-50 text-cyan-600" },
  shipped: { label: "Đang giao", color: "bg-violet-50 text-violet-600" },
  received: { label: "Đã nhận", color: "bg-emerald-50 text-emerald-600" },
  partially_received: { label: "Nhận 1 phần", color: "bg-amber-50 text-amber-600" },
  completed: { label: "Hoàn thành", color: "bg-[#067643]/10 text-[#067643]" },
  cancelled: { label: "Đã hủy", color: "bg-red-50 text-red-500" },
};

interface POItem {
  id: string;
  poNumber: string;
  status: string;
  totalAmount: number;
  orderDate: string;
  expectedDeliveryDate: string | null;
  isReturnOrder: boolean;
  vendor: { id: string; companyName: string };
  invoices: { id: string; invoiceNumber: string }[];
  _count: { items: number; asns: number; goodsReceipts: number };
}

const statusTabs = [
  { key: "all", label: "Tất cả" },
  { key: "new", label: "Mới" },
  { key: "confirmed", label: "Đã xác nhận" },
  { key: "preparing", label: "Đang giao" },
  { key: "received", label: "Đã nhận" },
];

export default function OrdersPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isVendor = user?.side === "vendor";

  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (search) params.set("search", search);

  const { data, isLoading } = useSWR(`/api/orders?${params.toString()}`, fetcher);
  const orders = data?.data?.items || [];
  const totalPages = data?.data?.totalPages || 1;
  const total = data?.data?.total || 0;
  const loading = isLoading;

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearch(searchInput); };

  const formatPrice = (p: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00321B]">Đơn hàng</h1>
          <p className="text-[#6B6B6B] mt-1">{isVendor ? "Đơn hàng từ siêu thị" : `Tổng cộng ${total} đơn hàng`}</p>
        </div>
      </div>

      <div className="flex gap-1 mb-6 border-b border-green-200">
        {statusTabs.map((tab) => (
          <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${statusFilter === tab.key ? "border-[#067643] text-[#067643]" : "border-transparent text-[#6B6B6B] hover:text-[#00321B] hover:border-[#067643]/30"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-md">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm theo số PO hoặc tên NCC..." className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30 focus:border-[#067643]/50 shadow-sm" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </form>

      <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-green-100 bg-[#f8ffef]">
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Số PO</th>
              {!isVendor && <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">NCC</th>}
              <th className="text-right px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Tổng tiền</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Ngày đặt</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Giao hàng</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Trạng thái</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Mã HĐ</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">SP</th>
            </tr></thead>
            <tbody className="divide-y divide-green-50">
              {loading ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[#6B6B6B]">Đang tải...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có đơn hàng nào</td></tr>
              ) : orders.map((o) => {
                const sc = poStatusMap[o.status] || { label: o.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <tr key={o.id} onClick={() => router.push(`/orders/${o.id}`)} className="hover:bg-[#f8ffef]/60 transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <p className="text-[#00321B] text-sm font-mono font-medium">{o.poNumber}</p>
                      {o.isReturnOrder && <span className="text-xs text-red-500">Trả hàng</span>}
                    </td>
                    {!isVendor && <td className="px-6 py-4 text-[#6B6B6B] text-sm">{o.vendor.companyName}</td>}
                    <td className="px-6 py-4 text-[#00321B] text-sm text-right font-mono">{formatPrice(Number(o.totalAmount))}</td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">{new Date(o.orderDate).toLocaleDateString("vi-VN")}</td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">{o.expectedDeliveryDate ? new Date(o.expectedDeliveryDate).toLocaleDateString("vi-VN") : "—"}</td>
                    <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                    <td className="px-6 py-4 text-sm font-mono">
                      {(o.status === "completed" || o.status === "partially_received") && o.invoices.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {o.invoices.map((inv) => (
                            <span key={inv.id} className="text-[#067643] hover:text-[#01A258] cursor-pointer">{inv.invoiceNumber}</span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[#6B6B6B]">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center text-[#6B6B6B] text-sm">{o._count.items}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
