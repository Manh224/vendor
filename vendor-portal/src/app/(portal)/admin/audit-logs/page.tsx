"use client";

import { useEffect, useState } from "react";
import Pagination from "@/components/ui/Pagination";

const actionColors: Record<string, string> = {
  CREATE: "text-emerald-600", UPDATE: "text-blue-400", DELETE: "text-red-600",
  STATUS_CHANGE: "text-amber-600", APPROVE: "text-emerald-600", REJECT: "text-red-600",
  VENDOR_RESPONSE: "text-indigo-400", LOGIN: "text-cyan-400",
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [moduleFilter, setModuleFilter] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => { fetchLogs(); }, [page, moduleFilter, search]); // eslint-disable-line

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "50" });
    if (moduleFilter) params.set("module", moduleFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/admin/audit-logs?${params}`);
    const json = await res.json();
    if (json.success) { setLogs(json.data.items); setTotalPages(json.data.totalPages); }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setPage(1); setSearch(searchInput); };

  const modules = ["vendors", "products", "orders", "finance", "support"];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00321B]">Nhật ký hoạt động</h1>
        <p className="text-[#6B6B6B] mt-1">Theo dõi tất cả hoạt động trên hệ thống</p>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex gap-1">
          <button onClick={() => { setModuleFilter(""); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${!moduleFilter ? "bg-[#067643]/10 text-[#067643]" : "text-slate-400 hover:text-white"}`}>Tất cả</button>
          {modules.map((m) => (
            <button key={m} onClick={() => { setModuleFilter(m); setPage(1); }} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize ${moduleFilter === m ? "bg-[#067643]/10 text-[#067643]" : "text-slate-400 hover:text-white"}`}>{m}</button>
          ))}
        </div>
        <form onSubmit={handleSearch} className="flex-1 max-w-sm">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm kiếm..." className="w-full px-4 py-2 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30" />
        </form>
      </div>

      <div className="bg-white border border-green-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead><tr className="border-b border-green-100">
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Thời gian</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Người dùng</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Hành động</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Module</th>
              <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Mô tả</th>
            </tr></thead>
            <tbody className="divide-y divide-green-50">
              {loading ? <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6B6B6B]">Đang tải...</td></tr>
              : logs.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6B6B6B]">Không có log nào</td></tr>
              : logs.map((log) => (
                <tr key={log.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                  <td className="px-6 py-3 text-gray-400 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="px-6 py-3">
                    <p className="text-[#00321B] text-sm">{log.user?.fullName || "System"}</p>
                    <p className="text-gray-400 text-xs">{log.user?.email || ""}</p>
                  </td>
                  <td className="px-6 py-3"><span className={`text-xs font-bold uppercase ${actionColors[log.action] || "text-slate-400"}`}>{log.action}</span></td>
                  <td className="px-6 py-3 text-gray-400 text-xs uppercase">{log.module}</td>
                  <td className="px-6 py-3 text-[#00321B] text-sm max-w-md truncate">{log.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
