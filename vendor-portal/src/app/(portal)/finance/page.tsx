"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import Tabs from "@/components/ui/Tabs";
import Pagination from "@/components/ui/Pagination";
import Modal from "@/components/ui/Modal";

const invoiceStatusMap: Record<string, { label: string; color: string }> = {
  submitted: { label: "Đã nộp", color: "bg-blue-50 text-blue-600" },
  under_review: { label: "Đang xem", color: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã duyệt", color: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Từ chối", color: "bg-red-50 text-red-600" },
  scheduled: { label: "Đã lên lịch", color: "bg-indigo-50 text-indigo-600" },
  paid: { label: "Đã thanh toán", color: "bg-[#067643]/10 text-[#067643]" },
  partially_paid: { label: "TT một phần", color: "bg-amber-50 text-amber-600" },
};

const debitStatusMap: Record<string, { label: string; color: string }> = {
  issued: { label: "Đã phát hành", color: "bg-red-50 text-red-600" },
  acknowledged: { label: "Đã xác nhận", color: "bg-amber-50 text-amber-600" },
  disputed: { label: "Khiếu nại", color: "bg-orange-50 text-orange-600" },
  resolved: { label: "Đã xử lý", color: "bg-emerald-50 text-emerald-600" },
};

export default function FinancePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isSupermarket = user?.side === "supermarket";

  const [invoices, setInvoices] = useState<any[]>([]);
  const [debitNotes, setDebitNotes] = useState<any[]>([]);
  const [invPage, setInvPage] = useState(1);
  const [invTotalPages, setInvTotalPages] = useState(1);
  const [dnPage, setDnPage] = useState(1);
  const [dnTotalPages, setDnTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("invoices");

  // Search states — Invoices
  const [invSearchInput, setInvSearchInput] = useState("");
  const [invSearch, setInvSearch] = useState("");
  const [invStatusFilter, setInvStatusFilter] = useState("");
  const [invShowAdvanced, setInvShowAdvanced] = useState(false);

  // Search states — Debit Notes
  const [dnSearchInput, setDnSearchInput] = useState("");
  const [dnSearch, setDnSearch] = useState("");
  const [dnStatusFilter, setDnStatusFilter] = useState("");
  const [dnTypeFilter, setDnTypeFilter] = useState("");
  const [dnShowAdvanced, setDnShowAdvanced] = useState(false);

  // Review modal
  const [reviewModal, setReviewModal] = useState<{ open: boolean; invoice: any }>({ open: false, invoice: null });
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected">("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Invoice detail modal
  const [detailModal, setDetailModal] = useState<{ open: boolean; invoice: any; loading: boolean }>({ open: false, invoice: null, loading: false });

  useEffect(() => { 
    if (activeTab === "invoices") fetchInvoices(); 
  }, [activeTab, invPage, invSearch, invStatusFilter]); // eslint-disable-line
  
  useEffect(() => { 
    if (activeTab === "debit-notes") fetchDebitNotes(); 
  }, [activeTab, dnPage, dnSearch, dnStatusFilter, dnTypeFilter]); // eslint-disable-line

  const fetchInvoices = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(invPage), pageSize: "20" });
    if (invSearch) params.set("search", invSearch);
    if (invStatusFilter) params.set("status", invStatusFilter);
    const res = await fetch(`/api/finance/invoices?${params}`);
    const json = await res.json();
    if (json.success) { setInvoices(json.data.items); setInvTotalPages(json.data.totalPages); }
    setLoading(false);
  };

  const fetchDebitNotes = async () => {
    const params = new URLSearchParams({ page: String(dnPage), pageSize: "20" });
    if (dnSearch) params.set("search", dnSearch);
    if (dnStatusFilter) params.set("status", dnStatusFilter);
    if (dnTypeFilter) params.set("debitType", dnTypeFilter);
    const res = await fetch(`/api/finance/debit-notes?${params}`);
    const json = await res.json();
    if (json.success) { setDebitNotes(json.data.items); setDnTotalPages(json.data.totalPages); }
  };

  const reviewInvoice = async () => {
    if (!reviewModal.invoice) return;
    setReviewing(true);
    await fetch(`/api/finance/invoices/${reviewModal.invoice.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: reviewAction, reviewNotes }),
    });
    setReviewModal({ open: false, invoice: null }); setReviewNotes(""); setReviewing(false);
    fetchInvoices();
  };

  const handleInvSearch = (e: React.FormEvent) => { e.preventDefault(); setInvPage(1); setInvSearch(invSearchInput); };
  const handleDnSearch = (e: React.FormEvent) => { e.preventDefault(); setDnPage(1); setDnSearch(dnSearchInput); };

  const clearInvFilters = () => { setInvSearchInput(""); setInvSearch(""); setInvStatusFilter(""); setInvPage(1); };
  const clearDnFilters = () => { setDnSearchInput(""); setDnSearch(""); setDnStatusFilter(""); setDnTypeFilter(""); setDnPage(1); };

  const fetchInvoiceDetail = async (inv: any) => {
    setDetailModal({ open: true, invoice: inv, loading: true });
    try {
      const res = await fetch(`/api/finance/invoices/${inv.id}`);
      const json = await res.json();
      if (json.success) {
        setDetailModal({ open: true, invoice: json.data, loading: false });
      } else {
        setDetailModal({ open: true, invoice: inv, loading: false });
      }
    } catch {
      setDetailModal({ open: true, invoice: inv, loading: false });
    }
  };

  const formatPrice = (p: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);
  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30";
  const selectClass = "px-3 py-2 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm focus:outline-none focus:ring-2 focus:ring-[#067643]/30";

  const hasInvFilters = invSearch || invStatusFilter;
  const hasDnFilters = dnSearch || dnStatusFilter || dnTypeFilter;

  const tabs = [
    { key: "invoices", label: "Hóa đơn" },
    { key: "debit-notes", label: "Phiếu ghi nợ" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00321B]">Tài chính</h1>
        <p className="text-[#6B6B6B] mt-1">Quản lý hóa đơn, thanh toán và phiếu ghi nợ</p>
      </div>

      <Tabs tabs={tabs} onTabChange={setActiveTab}>
        {(tab) => (
          <>
            {tab === "invoices" && (
              <div>
                {/* Search & Filters — Invoices */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <form onSubmit={handleInvSearch} className="flex-1 max-w-md">
                      <div className="relative">
                        <input type="text" value={invSearchInput} onChange={(e) => setInvSearchInput(e.target.value)} placeholder="Tìm theo số HĐ, tên NCC..." className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30 shadow-sm" />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                    </form>
                    <button onClick={() => setInvShowAdvanced(!invShowAdvanced)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${invShowAdvanced ? "bg-[#067643]/10 border-[#067643]/30 text-[#067643]" : "bg-white border-green-200 text-[#6B6B6B] hover:border-[#067643]/30"}`}>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        Bộ lọc
                      </span>
                    </button>
                    {hasInvFilters && <button onClick={clearInvFilters} className="px-3 py-2.5 rounded-xl text-xs text-red-500 hover:bg-red-50 transition-all">✕ Xóa lọc</button>}
                  </div>

                  {invShowAdvanced && (
                    <div className="flex items-center gap-3 p-3 bg-[#f8ffef] border border-green-200 rounded-xl">
                      <span className="text-xs text-[#6B6B6B] font-medium">Trạng thái:</span>
                      <select value={invStatusFilter} onChange={(e) => { setInvStatusFilter(e.target.value); setInvPage(1); }} className={selectClass}>
                        <option value="">Tất cả</option>
                        {Object.entries(invoiceStatusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-green-100 bg-[#f8ffef]">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Số HĐ</th>
                        {isSupermarket && <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">NCC</th>}
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">PO</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Tổng tiền</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Ngày HĐ</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Hạn TT</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Trạng thái</th>
                        {isSupermarket && <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase"></th>}
                      </tr></thead>
                      <tbody className="divide-y divide-green-50">
                        {loading ? <tr><td colSpan={8} className="px-6 py-12 text-center text-[#6B6B6B]">Đang tải...</td></tr>
                        : invoices.length === 0 ? <tr><td colSpan={8} className="px-6 py-12 text-center text-[#6B6B6B]">{hasInvFilters ? "Không tìm thấy hóa đơn phù hợp" : "Chưa có hóa đơn"}</td></tr>
                        : invoices.map((inv) => {
                          const sc = invoiceStatusMap[inv.status] || { label: inv.status, color: "bg-gray-100 text-gray-600" };
                          return (
                            <tr key={inv.id} onClick={() => fetchInvoiceDetail(inv)} className="hover:bg-[#f8ffef]/60 transition-colors cursor-pointer">
                              <td className="px-6 py-4 text-[#00321B] text-sm font-mono">{inv.invoiceNumber}</td>
                              {isSupermarket && <td className="px-6 py-4 text-[#6B6B6B] text-sm">{inv.vendor.companyName}</td>}
                              <td className="px-6 py-4 text-[#6B6B6B] text-sm font-mono">{inv.purchaseOrder?.poNumber || "—"}</td>
                              <td className="px-6 py-4 text-[#00321B] text-sm text-right font-mono">{formatPrice(Number(inv.totalAmount))}</td>
                              <td className="px-6 py-4 text-[#6B6B6B] text-sm">{new Date(inv.invoiceDate).toLocaleDateString("vi-VN")}</td>
                              <td className="px-6 py-4 text-[#6B6B6B] text-sm">{inv.paymentDueDate ? new Date(inv.paymentDueDate).toLocaleDateString("vi-VN") : "—"}</td>
                              <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                              {isSupermarket && <td className="px-6 py-4">
                                {inv.status === "submitted" && <button onClick={(e) => { e.stopPropagation(); setReviewModal({ open: true, invoice: inv }); }} className="text-[#067643] hover:text-[#01A258] text-xs font-medium transition-colors">Duyệt</button>}
                              </td>}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={invPage} totalPages={invTotalPages} onPageChange={setInvPage} />
                </div>
              </div>
            )}
            {tab === "debit-notes" && (
              <div>
                {/* Search & Filters — Debit Notes */}
                <div className="mb-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <form onSubmit={handleDnSearch} className="flex-1 max-w-md">
                      <div className="relative">
                        <input type="text" value={dnSearchInput} onChange={(e) => setDnSearchInput(e.target.value)} placeholder="Tìm theo số phiếu, lý do, NCC..." className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30 shadow-sm" />
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                      </div>
                    </form>
                    <button onClick={() => setDnShowAdvanced(!dnShowAdvanced)} className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${dnShowAdvanced ? "bg-[#067643]/10 border-[#067643]/30 text-[#067643]" : "bg-white border-green-200 text-[#6B6B6B] hover:border-[#067643]/30"}`}>
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                        Bộ lọc
                      </span>
                    </button>
                    {hasDnFilters && <button onClick={clearDnFilters} className="px-3 py-2.5 rounded-xl text-xs text-red-500 hover:bg-red-50 transition-all">✕ Xóa lọc</button>}
                  </div>

                  {dnShowAdvanced && (
                    <div className="flex items-center gap-4 p-3 bg-[#f8ffef] border border-green-200 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6B6B] font-medium">Trạng thái:</span>
                        <select value={dnStatusFilter} onChange={(e) => { setDnStatusFilter(e.target.value); setDnPage(1); }} className={selectClass}>
                          <option value="">Tất cả</option>
                          {Object.entries(debitStatusMap).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#6B6B6B] font-medium">Loại:</span>
                        <select value={dnTypeFilter} onChange={(e) => { setDnTypeFilter(e.target.value); setDnPage(1); }} className={selectClass}>
                          <option value="">Tất cả</option>
                          <option value="penalty">Phạt</option>
                          <option value="quality_deduction">Chất lượng</option>
                          <option value="shortage">Thiếu hàng</option>
                          <option value="return">Trả hàng</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-green-100 bg-[#f8ffef]">
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Số phiếu</th>
                        {isSupermarket && <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">NCC</th>}
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Lý do</th>
                        <th className="text-right px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Số tiền</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Loại</th>
                        <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Trạng thái</th>
                      </tr></thead>
                      <tbody className="divide-y divide-green-50">
                        {debitNotes.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">{hasDnFilters ? "Không tìm thấy phiếu ghi nợ phù hợp" : "Chưa có phiếu ghi nợ"}</td></tr>
                        : debitNotes.map((dn) => {
                          const sc = debitStatusMap[dn.status] || { label: dn.status, color: "bg-gray-100 text-gray-600" };
                          return (
                            <tr key={dn.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                              <td className="px-6 py-4 text-[#00321B] text-sm font-mono">{dn.debitNoteNumber}</td>
                              {isSupermarket && <td className="px-6 py-4 text-[#6B6B6B] text-sm">{dn.vendor.companyName}</td>}
                              <td className="px-6 py-4 text-[#00321B] text-sm">{dn.reason}</td>
                              <td className="px-6 py-4 text-red-600 text-sm text-right font-mono">-{formatPrice(Number(dn.amount))}</td>
                              <td className="px-6 py-4 text-[#6B6B6B] text-sm">{dn.debitType === "penalty" ? "Phạt" : dn.debitType === "quality_deduction" ? "Chất lượng" : dn.debitType}</td>
                              <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${sc.color}`}>{sc.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={dnPage} totalPages={dnTotalPages} onPageChange={setDnPage} />
                </div>
              </div>
            )}
          </>
        )}
      </Tabs>

      <Modal open={reviewModal.open} onClose={() => { setReviewModal({ open: false, invoice: null }); setReviewNotes(""); }}
        title={`Duyệt hóa đơn ${reviewModal.invoice?.invoiceNumber || ""}`}
        actions={<><button onClick={() => { setReviewModal({ open: false, invoice: null }); setReviewNotes(""); }} className="px-4 py-2 rounded-xl bg-gray-100 text-[#6B6B6B] text-sm hover:text-[#00321B] transition-all">Hủy</button>
          <button onClick={reviewInvoice} disabled={reviewing} className={`px-6 py-2 rounded-xl text-white text-sm font-medium transition-all disabled:opacity-50 ${reviewAction === "approved" ? "bg-[#067643]" : "bg-red-600"}`}>{reviewing ? "..." : reviewAction === "approved" ? "Duyệt" : "Từ chối"}</button></>}>
        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={() => setReviewAction("approved")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${reviewAction === "approved" ? "bg-[#067643]/15 text-[#067643] border border-[#067643]/30" : "bg-gray-50 text-[#6B6B6B] border border-transparent"}`}>✓ Duyệt</button>
            <button onClick={() => setReviewAction("rejected")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${reviewAction === "rejected" ? "bg-red-50 text-red-600 border border-red-200" : "bg-gray-50 text-[#6B6B6B] border border-transparent"}`}>✗ Từ chối</button>
          </div>
          <textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="Ghi chú..." rows={3} className={inputClass} />
        </div>
      </Modal>

      {/* Invoice Detail Modal */}
      <Modal open={detailModal.open} onClose={() => setDetailModal({ open: false, invoice: null, loading: false })}
        title={detailModal.invoice ? `Chi tiết hóa đơn ${detailModal.invoice.invoiceNumber}` : "Chi tiết hóa đơn"}
        maxWidth="max-w-4xl">
        {!detailModal.invoice ? (
          <div className="py-12 text-center text-[#6B6B6B]">Đang tải...</div>
        ) : (() => {
          const inv = detailModal.invoice;
          const paymentStatusMap: Record<string, { label: string; color: string }> = {
            unpaid: { label: "Chưa thanh toán", color: "bg-red-50 text-red-600" },
            partial: { label: "TT một phần", color: "bg-amber-50 text-amber-600" },
            paid: { label: "Đã thanh toán", color: "bg-emerald-50 text-emerald-600" },
          };
          const poStatusMap: Record<string, { label: string; color: string }> = {
            new: { label: "Mới", color: "bg-blue-50 text-blue-600" },
            confirmed: { label: "Xác nhận", color: "bg-emerald-50 text-emerald-600" },
            preparing: { label: "Chuẩn bị", color: "bg-cyan-50 text-cyan-600" },
            shipped: { label: "Đang giao", color: "bg-violet-50 text-violet-600" },
            received: { label: "Đã nhận", color: "bg-emerald-50 text-emerald-600" },
            partially_received: { label: "Nhận 1 phần", color: "bg-amber-50 text-amber-600" },
            completed: { label: "Hoàn thành", color: "bg-[#067643]/10 text-[#067643]" },
            cancelled: { label: "Đã hủy", color: "bg-red-50 text-red-500" },
          };
          const invSc = invoiceStatusMap[inv.status] || { label: inv.status, color: "bg-gray-100 text-gray-600" };
          const paySc = paymentStatusMap[inv.paymentStatus] || { label: inv.paymentStatus, color: "bg-gray-100 text-gray-600" };
          return (
            <div className="space-y-6 max-h-[70vh] overflow-y-auto">
              {/* Invoice Info */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Số hóa đơn</p>
                  <p className="text-sm font-mono font-medium text-[#00321B]">{inv.invoiceNumber}</p>
                </div>
                {inv.invoiceSymbol && <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Ký hiệu</p>
                  <p className="text-sm font-mono text-[#00321B]">{inv.invoiceSymbol}</p>
                </div>}
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Nhà cung cấp</p>
                  <p className="text-sm font-medium text-[#00321B]">{inv.vendor.companyName}</p>
                  {inv.vendor.taxCode && <p className="text-xs text-[#6B6B6B]">MST: {inv.vendor.taxCode}</p>}
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Ngày hóa đơn</p>
                  <p className="text-sm text-[#00321B]">{new Date(inv.invoiceDate).toLocaleDateString("vi-VN")}</p>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Trạng thái</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${invSc.color}`}>{invSc.label}</span>
                </div>
                <div>
                  <p className="text-xs text-[#6B6B6B] mb-1">Thanh toán</p>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${paySc.color}`}>{paySc.label}</span>
                </div>
              </div>

              {/* Amount Info */}
              <div className="bg-[#f8ffef] border border-green-200 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-1">Tiền hàng</p>
                    <p className="text-sm font-mono font-medium text-[#00321B]">{formatPrice(Number(inv.subtotal))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-1">Thuế ({Number(inv.taxRate)}%)</p>
                    <p className="text-sm font-mono text-[#00321B]">{formatPrice(Number(inv.taxAmount))}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[#6B6B6B] mb-1">Tổng cộng</p>
                    <p className="text-base font-mono font-bold text-[#067643]">{formatPrice(Number(inv.totalAmount))}</p>
                  </div>
                  {inv.paymentDueDate && <div>
                    <p className="text-xs text-[#6B6B6B] mb-1">Hạn thanh toán</p>
                    <p className="text-sm text-[#00321B]">{new Date(inv.paymentDueDate).toLocaleDateString("vi-VN")}</p>
                  </div>}
                </div>
              </div>

              {/* Invoice Items */}
              {detailModal.loading ? (
                <div className="py-8 text-center text-[#6B6B6B] text-sm animate-pulse">Đang tải chi tiết hàng hóa...</div>
              ) : inv.items && inv.items.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-[#00321B] mb-3">Chi tiết hàng hóa ({inv.items.length} mục)</h4>
                  <div className="bg-white border border-green-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-green-100 bg-[#f8ffef]">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Sản phẩm</th>
                        <th className="text-center px-4 py-3 text-xs font-semibold text-[#067643] uppercase">SL</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Đơn giá</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Thành tiền</th>
                      </tr></thead>
                      <tbody className="divide-y divide-green-50">
                        {inv.items.map((item: any) => (
                          <tr key={item.id} className="hover:bg-[#f8ffef]/40">
                            <td className="px-4 py-3">
                              <p className="text-sm text-[#00321B]">{item.product?.name || item.description || "—"}</p>
                              {item.product?.sku && <p className="text-xs text-[#6B6B6B] font-mono">{item.product.sku}</p>}
                              {item.poItem?.purchaseOrder?.poNumber && <p className="text-xs text-[#067643]">PO: {item.poItem.purchaseOrder.poNumber}</p>}
                            </td>
                            <td className="px-4 py-3 text-center text-sm text-[#00321B]">{item.quantity}</td>
                            <td className="px-4 py-3 text-right text-sm font-mono text-[#00321B]">{formatPrice(Number(item.unitPrice))}</td>
                            <td className="px-4 py-3 text-right text-sm font-mono font-medium text-[#00321B]">{formatPrice(Number(item.lineTotal))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}

              {/* Related Orders */}
              {detailModal.loading ? null : inv.relatedOrders && inv.relatedOrders.length > 0 ? (
                <div>
                  <h4 className="text-sm font-semibold text-[#00321B] mb-3">Đơn hàng liên quan ({inv.relatedOrders.length})</h4>
                  <div className="bg-white border border-green-100 rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-green-100 bg-[#f8ffef]">
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Số PO</th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Tổng tiền</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Ngày đặt</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Trạng thái</th>
                      </tr></thead>
                      <tbody className="divide-y divide-green-50">
                        {inv.relatedOrders.map((po: any) => {
                          const poSc = poStatusMap[po.status] || { label: po.status, color: "bg-gray-100 text-gray-600" };
                          return (
                            <tr key={po.id} onClick={() => window.open(`/orders/${po.id}`, '_blank')} className="hover:bg-[#f8ffef]/40 cursor-pointer transition-colors">
                              <td className="px-4 py-3 text-sm font-mono font-medium text-[#067643] hover:text-[#01A258]">{po.poNumber}</td>
                              <td className="px-4 py-3 text-right text-sm font-mono text-[#00321B]">{formatPrice(Number(po.totalAmount))}</td>
                              <td className="px-4 py-3 text-sm text-[#6B6B6B]">{new Date(po.orderDate).toLocaleDateString("vi-VN")}</td>
                              <td className="px-4 py-3"><span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${poSc.color}`}>{poSc.label}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-[#6B6B6B] text-sm bg-gray-50 rounded-xl">
                  Chưa có đơn hàng liên kết với hóa đơn này
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
