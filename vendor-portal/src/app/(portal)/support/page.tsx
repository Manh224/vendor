"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import Tabs from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";

const ticketStatusMap: Record<string, { label: string; color: string }> = {
  new: { label: "Mới", color: "bg-blue-50 text-blue-600" },
  in_progress: { label: "Đang xử lý", color: "bg-amber-50 text-amber-600" },
  waiting_vendor: { label: "Chờ NCC", color: "bg-orange-50 text-orange-600" },
  resolved: { label: "Đã xử lý", color: "bg-emerald-50 text-emerald-600" },
  closed: { label: "Đã đóng", color: "bg-gray-100 text-gray-600" },
};

const priorityMap: Record<string, { label: string; color: string }> = {
  low: { label: "Thấp", color: "text-gray-500" },
  medium: { label: "Trung bình", color: "text-[#067643]" },
  high: { label: "Cao", color: "text-[#FF9811]" },
  critical: { label: "Khẩn cấp", color: "text-red-600" },
};

const categoryMap: Record<string, string> = {
  general: "Chung",
  order: "Đơn hàng",
  payment: "Thanh toán",
  product: "Sản phẩm",
  contract: "Hợp đồng",
  technical: "Kỹ thuật",
};

export default function SupportPage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isSupermarket = user?.side === "supermarket";

  const [tickets, setTickets] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [ticketPage, setTicketPage] = useState(1);
  const [ticketTotalPages, setTicketTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Search & filter states
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  const [createModal, setCreateModal] = useState(false);
  const [ticketForm, setTicketForm] = useState({ title: "", category: "general", priority: "medium", description: "" });
  const [creating, setCreating] = useState(false);

  useEffect(() => { fetchTickets(); }, [ticketPage, search, statusFilter, priorityFilter, categoryFilter]); // eslint-disable-line
  useEffect(() => { fetchAnnouncements(); }, []); // eslint-disable-line

  const fetchTickets = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(ticketPage), pageSize: "20" });
    if (search) params.set("search", search);
    if (statusFilter) params.set("status", statusFilter);
    if (priorityFilter) params.set("priority", priorityFilter);
    if (categoryFilter) params.set("category", categoryFilter);
    const res = await fetch(`/api/support/tickets?${params}`);
    const json = await res.json();
    if (json.success) { setTickets(json.data.items); setTicketTotalPages(json.data.totalPages); }
    setLoading(false);
  };

  const fetchAnnouncements = async () => {
    const res = await fetch("/api/support/announcements");
    const json = await res.json();
    if (json.success) setAnnouncements(json.data.items);
  };

  const openTicket = useCallback(async (id: string) => {
    const res = await fetch(`/api/support/tickets/${id}`);
    const json = await res.json();
    if (json.success) {
      setSelectedTicket(json.data);
      setMessages(json.data.messages || []);
    }
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);
    const res = await fetch(`/api/support/tickets/${selectedTicket.id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMessage }),
    });
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) => [...prev, json.data]);
      setNewMessage("");
    }
    setSending(false);
  };

  const createTicket = async (e: React.FormEvent) => {
    e.preventDefault(); setCreating(true);
    const res = await fetch("/api/support/tickets", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ticketForm),
    });
    if (res.ok) {
      setCreateModal(false); setTicketForm({ title: "", category: "general", priority: "medium", description: "" });
      fetchTickets();
    }
    setCreating(false);
  };

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setTicketPage(1); setSearch(searchInput); };
  const clearFilters = () => { setSearchInput(""); setSearch(""); setStatusFilter(""); setPriorityFilter(""); setCategoryFilter(""); setTicketPage(1); };
  const hasFilters = search || statusFilter || priorityFilter || categoryFilter;

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30";
  const selectClass = "px-3 py-2 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm focus:outline-none focus:ring-2 focus:ring-[#067643]/30";

  const tabs = [
    { key: "tickets", label: "Yêu cầu hỗ trợ" },
    { key: "announcements", label: "Thông báo" },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00321B]">Hỗ trợ</h1>
          <p className="text-[#6B6B6B] mt-1">Yêu cầu hỗ trợ và thông báo</p>
        </div>
        <button onClick={() => setCreateModal(true)} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF9811] to-[#E07B00] text-white text-sm font-semibold hover:from-[#ffab3d] hover:to-[#FF9811] transition-all shadow-lg shadow-orange-500/25">
          + Tạo yêu cầu
        </button>
      </div>

      <Tabs tabs={tabs}>
        {(tab) => (
          <>
            {tab === "tickets" && (
              <div>
                {/* Search & Filters */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <form onSubmit={handleSearch} className="flex-1 max-w-md">
                      <div className="relative">
                        <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm theo mã ticket, tiêu đề..." className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30 shadow-sm" />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                    </form>
                    <button onClick={() => setShowAdvanced(!showAdvanced)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${showAdvanced ? "bg-[#067643]/10 border-[#067643]/30 text-[#067643]" : "bg-white border-green-200 text-[#6B6B6B] hover:border-[#067643]/30"}`}>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        Bộ lọc
                      </span>
                    </button>
                    {hasFilters && <button onClick={clearFilters} className="px-3 py-2.5 rounded-xl text-xs text-red-500 hover:bg-red-50 transition-all">✕ Xóa lọc</button>}
                  </div>

                  {showAdvanced && (
                    <div className="flex items-center gap-4 p-3 bg-[#f8ffef] border border-green-200 rounded-xl flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6B6B] font-medium">Trạng thái:</span>
                        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setTicketPage(1); }} className={selectClass}>
                          <option value="">Tất cả</option>
                          {Object.entries(ticketStatusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6B6B] font-medium">Ưu tiên:</span>
                        <select value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setTicketPage(1); }} className={selectClass}>
                          <option value="">Tất cả</option>
                          {Object.entries(priorityMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6B6B] font-medium">Danh mục:</span>
                        <select value={categoryFilter} onChange={(e) => { setCategoryFilter(e.target.value); setTicketPage(1); }} className={selectClass}>
                          <option value="">Tất cả</option>
                          {Object.entries(categoryMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-6">
                  <div className={`${selectedTicket ? "w-1/2" : "w-full"} transition-all`}>
                    <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
                      {loading ? <div className="p-12 text-center text-[#6B6B6B]">Đang tải...</div>
                      : tickets.length === 0 ? <div className="p-12 text-center text-[#6B6B6B]">{hasFilters ? "Không tìm thấy yêu cầu phù hợp" : "Chưa có yêu cầu nào"}</div>
                      : <div className="divide-y divide-green-50">
                        {tickets.map((t) => {
                          const sc = ticketStatusMap[t.status] || { label: t.status, color: "bg-gray-100 text-gray-600" };
                          const pc = priorityMap[t.priority] || priorityMap.medium;
                          return (
                            <div key={t.id} onClick={() => openTicket(t.id)} className={`px-6 py-4 cursor-pointer transition-colors hover:bg-[#f8ffef]/60 ${selectedTicket?.id === t.id ? "bg-[#f8ffef]" : ""}`}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-mono text-gray-400">{t.ticketNumber}</span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${sc.color}`}>{sc.label}</span>
                              </div>
                              <p className="text-[#00321B] text-sm font-medium">{t.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className={`text-xs ${pc.color}`}>{pc.label}</span>
                                <span className="text-xs text-gray-400">{categoryMap[t.category] || t.category}</span>
                                <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString("vi-VN")}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>}
                      <Pagination page={ticketPage} totalPages={ticketTotalPages} onPageChange={setTicketPage} />
                    </div>
                  </div>

                  {selectedTicket && (
                    <div className="w-1/2">
                      <div className="bg-white border border-green-100 rounded-2xl flex flex-col h-[600px] shadow-sm">
                        <div className="px-6 py-4 border-b border-green-100 flex items-center justify-between">
                          <div>
                            <p className="text-[#00321B] font-semibold text-sm">{selectedTicket.title}</p>
                            <p className="text-gray-400 text-xs">{selectedTicket.ticketNumber} • {selectedTicket.vendor?.companyName || ""}</p>
                          </div>
                          <button onClick={() => setSelectedTicket(null)} className="text-gray-400 hover:text-[#00321B] p-1 transition-colors">✕</button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                          {selectedTicket.description && (
                            <div className="bg-[#067643]/5 border border-[#067643]/10 rounded-xl p-3">
                              <p className="text-[#00321B] text-sm">{selectedTicket.description}</p>
                            </div>
                          )}
                          {messages.map((m: any) => (
                            <div key={m.id} className={`flex ${m.sender?.side === user?.side ? "justify-end" : "justify-start"}`}>
                              <div className={`max-w-[80%] rounded-xl px-4 py-2.5 ${m.sender?.side === user?.side ? "bg-[#067643] text-white" : "bg-gray-50 text-[#00321B]"}`}>
                                <p className="text-xs font-medium mb-1 opacity-60">{m.sender?.fullName}</p>
                                <p className="text-sm">{m.message}</p>
                                <p className="text-xs opacity-40 mt-1">{new Date(m.createdAt).toLocaleString("vi-VN")}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="px-4 py-3 border-t border-green-100 flex gap-2">
                          <input value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} placeholder="Nhập tin nhắn..." className={`flex-1 ${inputClass}`} />
                          <button onClick={sendMessage} disabled={sending || !newMessage.trim()} className="px-4 py-2.5 rounded-xl bg-[#067643] text-white text-sm font-medium hover:bg-[#01A258] transition-all disabled:opacity-50">
                            Gửi
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {tab === "announcements" && (
              <div className="space-y-4">
                {announcements.length === 0 ? <div className="bg-white border border-green-100 rounded-2xl p-12 text-center text-[#6B6B6B] shadow-sm">Chưa có thông báo</div>
                : announcements.map((a) => (
                  <div key={a.id} className={`bg-white border rounded-2xl p-6 shadow-sm ${a.isImportant ? "border-[#FF9811]/30" : "border-green-100"}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          {a.isImportant && <span className="text-[#FF9811] text-xs">⚠️ Quan trọng</span>}
                        </div>
                        <h3 className="text-[#00321B] font-semibold">{a.title}</h3>
                        <p className="text-[#6B6B6B] text-sm mt-2">{a.content}</p>
                      </div>
                      <span className="text-gray-400 text-xs whitespace-nowrap">{new Date(a.createdAt).toLocaleDateString("vi-VN")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Tabs>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Tạo yêu cầu hỗ trợ"
        actions={<><button onClick={() => setCreateModal(false)} className="px-4 py-2 rounded-xl bg-gray-100 text-[#6B6B6B] text-sm hover:text-[#00321B] transition-all">Hủy</button>
          <button onClick={createTicket as any} disabled={creating} className="px-6 py-2 rounded-xl bg-[#067643] text-white text-sm font-medium hover:bg-[#01A258] transition-all disabled:opacity-50">{creating ? "Đang tạo..." : "Tạo"}</button></>}>
        <div className="space-y-4">
          <input placeholder="Tiêu đề *" required value={ticketForm.title} onChange={(e) => setTicketForm({ ...ticketForm, title: e.target.value })} className={inputClass} />
          <div className="grid grid-cols-2 gap-3">
            <select value={ticketForm.category} onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })} className={inputClass}>
              {Object.entries(categoryMap).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select value={ticketForm.priority} onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })} className={inputClass}>
              <option value="low">Thấp</option>
              <option value="medium">Trung bình</option>
              <option value="high">Cao</option>
              <option value="critical">Khẩn cấp</option>
            </select>
          </div>
          <textarea rows={4} placeholder="Mô tả chi tiết... *" value={ticketForm.description} onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })} className={inputClass} />
        </div>
      </Modal>
    </div>
  );
}
