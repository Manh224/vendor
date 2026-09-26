"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";

const poStatusMap: Record<string, { label: string; color: string }> = {
  new: { label: "Mới", color: "bg-[#067643]/10 text-[#067643]" }, confirmed: { label: "Đã xác nhận", color: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "NCC từ chối", color: "bg-red-500/10 text-red-600" }, modification_requested: { label: "Yêu cầu sửa", color: "bg-orange-500/10 text-orange-400" },
  preparing: { label: "Đang chuẩn bị", color: "bg-cyan-500/10 text-cyan-400" }, shipped: { label: "Đang giao", color: "bg-violet-500/10 text-violet-400" },
  received: { label: "Đã nhận", color: "bg-emerald-50 text-emerald-600" }, partially_received: { label: "Nhận 1 phần", color: "bg-amber-50 text-amber-600" },
  completed: { label: "Hoàn thành", color: "bg-emerald-500/10 text-emerald-600" }, cancelled: { label: "Đã hủy", color: "bg-red-500/10 text-red-500" },
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isVendor = user?.side === "vendor";

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("items");

  // Vendor response modal
  const [responseModal, setResponseModal] = useState<{ open: boolean; type: string }>({ open: false, type: "" });
  const [responseNotes, setResponseNotes] = useState("");
  const [responding, setResponding] = useState(false);

  // ASN form
  const [showAsnForm, setShowAsnForm] = useState(false);
  const [asnForm, setAsnForm] = useState({ asnNumber: "", carrierName: "", vehiclePlate: "", driverName: "", driverPhone: "", scheduledDate: "", scheduledTimeSlot: "" });
  const [savingAsn, setSavingAsn] = useState(false);

  // GRN form
  const [showGrnForm, setShowGrnForm] = useState(false);
  const [grnForm, setGrnForm] = useState<{ grnNumber: string; receiptStatus: string; notes: string; items: any[] }>({ grnNumber: "", receiptStatus: "full", notes: "", items: [] });
  const [savingGrn, setSavingGrn] = useState(false);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`);
    const json = await res.json();
    if (json.success) setOrder(json.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  const submitResponse = async () => {
    setResponding(true);
    await fetch(`/api/orders/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ vendorResponse: responseModal.type, vendorResponseNotes: responseNotes }),
    });
    setResponseModal({ open: false, type: "" }); setResponseNotes(""); setResponding(false);
    fetchOrder();
  };

  const submitAsn = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingAsn(true);
    await fetch(`/api/orders/${id}/asn`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(asnForm),
    });
    setShowAsnForm(false); setAsnForm({ asnNumber: "", carrierName: "", vehiclePlate: "", driverName: "", driverPhone: "", scheduledDate: "", scheduledTimeSlot: "" });
    setSavingAsn(false); fetchOrder();
  };

  const submitGrn = async (e: React.FormEvent) => {
    e.preventDefault(); setSavingGrn(true);
    await fetch(`/api/orders/${id}/grn`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(grnForm),
    });
    setShowGrnForm(false); setGrnForm({ grnNumber: "", receiptStatus: "full", notes: "", items: [] });
    setSavingGrn(false); fetchOrder();
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;
  if (!order) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Không tìm thấy đơn hàng</div>;

  const formatPrice = (p: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p);
  const sc = poStatusMap[order.status] || { label: order.status, color: "bg-gray-100 text-gray-600" };
  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#00321B] text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50";

  const tabs = [
    { key: "items", label: `Sản phẩm (${order.items.length})` },
    { key: "asn", label: `ASN (${order.asns.length})` },
    { key: "grn", label: `GRN (${order.goodsReceipts.length})` },
  ];

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push("/orders")} className="text-[#6B6B6B] hover:text-[#00321B] text-sm mb-2 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Danh sách đơn hàng
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#00321B]">PO: {order.poNumber}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${sc.color}`}>{sc.label}</span>
          </div>
          <p className="text-[#6B6B6B] mt-1">{order.vendor.companyName} • {formatPrice(Number(order.totalAmount))}</p>
        </div>
        <div className="flex gap-2">
          {isVendor && (order.status === "new" || order.status === "sent_to_vendor") && (
            <>
              <button onClick={() => setResponseModal({ open: true, type: "confirmed" })} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all">Xác nhận</button>
              <button onClick={() => setResponseModal({ open: true, type: "rejected" })} className="px-4 py-2 rounded-xl bg-red-600 text-[#00321B] text-sm font-medium hover:bg-red-500 transition-all">Từ chối</button>
            </>
          )}
          {isVendor && order.status === "confirmed" && (
            <button onClick={() => setShowAsnForm(true)} className="px-4 py-2 rounded-xl bg-blue-600 text-[#00321B] text-sm font-medium hover:bg-blue-500 transition-all">+ Tạo ASN</button>
          )}
          {!isVendor && ["preparing", "shipped"].includes(order.status) && (
            <button onClick={() => {
              setGrnForm({ ...grnForm, items: order.items.map((i: any) => ({ poItemId: i.id, receivedQty: i.orderedQty - i.actualReceivedQty, damagedQty: 0, shortageQty: 0 })) });
              setShowGrnForm(true);
              setActiveTab("grn");
            }} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-all">+ Nhận hàng (GRN)</button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Ngày đặt", value: new Date(order.orderDate).toLocaleDateString("vi-VN") },
          { label: "Giao hàng dự kiến", value: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString("vi-VN") : "—" },
          { label: "Tổng SP", value: order.items.length },
          { label: "Tổng tiền", value: formatPrice(Number(order.totalAmount)) },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-green-100 shadow-sm rounded-2xl p-4">
            <p className="text-gray-400 text-xs">{s.label}</p>
            <p className="text-[#00321B] text-lg font-semibold mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab}>
          {(tab) => (
            <>
              {tab === "items" && (
                <table className="w-full">
                  <thead><tr className="border-b border-green-100">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Sản phẩm</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">SL đặt</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Đơn giá</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Thành tiền</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-[#067643] uppercase">Đã nhận</th>
                  </tr></thead>
                  <tbody className="divide-y divide-green-50">
                    {order.items.map((item: any) => (
                      <tr key={item.id}><td className="px-4 py-3"><p className="text-[#00321B] text-sm">{item.product.name}</p><p className="text-gray-400 text-xs">{item.product.sku || ""}</p></td>
                        <td className="px-4 py-3 text-[#00321B] text-sm text-right">{item.orderedQty} {item.product.unit || ""}</td>
                        <td className="px-4 py-3 text-[#00321B] text-sm text-right font-mono">{formatPrice(Number(item.unitPrice))}</td>
                        <td className="px-4 py-3 text-[#00321B] text-sm text-right font-mono">{formatPrice(Number(item.lineTotal))}</td>
                        <td className="px-4 py-3 text-sm text-right"><span className={item.actualReceivedQty >= item.orderedQty ? "text-emerald-600" : item.actualReceivedQty > 0 ? "text-amber-600" : "text-slate-500"}>{item.actualReceivedQty}/{item.orderedQty}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === "asn" && (
                <div>
                  {showAsnForm && (
                    <form onSubmit={submitAsn} className="border border-green-100 rounded-xl p-4 mb-4 space-y-3">
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                        <input placeholder="Số ASN *" required value={asnForm.asnNumber} onChange={(e) => setAsnForm({ ...asnForm, asnNumber: e.target.value })} className={inputClass} />
                        <input placeholder="Nhà vận chuyển" value={asnForm.carrierName} onChange={(e) => setAsnForm({ ...asnForm, carrierName: e.target.value })} className={inputClass} />
                        <input placeholder="Biển số xe" value={asnForm.vehiclePlate} onChange={(e) => setAsnForm({ ...asnForm, vehiclePlate: e.target.value })} className={inputClass} />
                        <input placeholder="Tên tài xế" value={asnForm.driverName} onChange={(e) => setAsnForm({ ...asnForm, driverName: e.target.value })} className={inputClass} />
                        <input placeholder="SĐT tài xế" value={asnForm.driverPhone} onChange={(e) => setAsnForm({ ...asnForm, driverPhone: e.target.value })} className={inputClass} />
                        <div><label className="block text-xs text-[#6B6B6B] mb-1">Ngày giao *</label><input type="date" required value={asnForm.scheduledDate} onChange={(e) => setAsnForm({ ...asnForm, scheduledDate: e.target.value })} className={inputClass} /></div>
                      </div>
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingAsn} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">{savingAsn ? "Đang tạo..." : "Tạo ASN"}</button>
                        <button type="button" onClick={() => setShowAsnForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-[#00321B] transition-all">Hủy</button>
                      </div>
                    </form>
                  )}
                  {order.asns.length === 0 ? <p className="text-[#6B6B6B] text-sm">Chưa có ASN</p> : (
                    <div className="space-y-3">{order.asns.map((asn: any) => (
                      <div key={asn.id} className="border border-green-100 rounded-xl p-4">
                        <div className="flex justify-between"><p className="text-[#00321B] font-medium text-sm">ASN: {asn.asnNumber}</p><span className="text-xs text-slate-400">{new Date(asn.scheduledDate).toLocaleDateString("vi-VN")}</span></div>
                        <p className="text-gray-400 text-xs mt-1">{[asn.carrierName, asn.vehiclePlate, asn.driverName].filter(Boolean).join(" • ") || "—"}</p>
                      </div>
                    ))}</div>
                  )}
                </div>
              )}
              {tab === "grn" && (
                <div>
                  {showGrnForm && (
                    <form onSubmit={submitGrn} className="border border-green-100 rounded-xl p-4 mb-4 space-y-4">
                      <div className="grid grid-cols-2 gap-3">
                        <input placeholder="Số GRN *" required value={grnForm.grnNumber} onChange={(e) => setGrnForm({ ...grnForm, grnNumber: e.target.value })} className={inputClass} />
                        <select value={grnForm.receiptStatus} onChange={(e) => setGrnForm({ ...grnForm, receiptStatus: e.target.value })} className={inputClass}>
                          <option value="full" className="bg-white">Nhận đủ</option>
                          <option value="partial" className="bg-white">Nhận một phần</option>
                          <option value="rejected" className="bg-white">Từ chối nhận</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm text-[#00321B] font-medium block">Chi tiết số lượng nhận:</label>
                        {order.items.map((item: any, idx: number) => (
                          <div key={item.id} className="flex items-center gap-3">
                            <span className="text-sm text-[#6B6B6B] w-1/3 truncate" title={item.product.name}>{item.product.name} (Cần nhận: {item.orderedQty - item.actualReceivedQty})</span>
                            <input type="number" min="0" max={item.orderedQty - item.actualReceivedQty} required value={grnForm.items[idx]?.receivedQty ?? ""} onChange={(e) => {
                              const newItems = [...grnForm.items];
                              newItems[idx] = { ...newItems[idx], receivedQty: Number(e.target.value) };
                              setGrnForm({ ...grnForm, items: newItems });
                            }} placeholder="SL Nhận" className={`${inputClass} flex-1`} />
                          </div>
                        ))}
                      </div>
                      <textarea placeholder="Ghi chú" rows={2} value={grnForm.notes} onChange={(e) => setGrnForm({ ...grnForm, notes: e.target.value })} className={inputClass} />
                      <div className="flex gap-2">
                        <button type="submit" disabled={savingGrn} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">{savingGrn ? "Đang tạo..." : "Tạo GRN"}</button>
                        <button type="button" onClick={() => setShowGrnForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-[#00321B] transition-all">Hủy</button>
                      </div>
                    </form>
                  )}
                  {order.goodsReceipts.length === 0 ? <p className="text-[#6B6B6B] text-sm">Chưa có GRN</p> : (
                    <div className="space-y-3">{order.goodsReceipts.map((grn: any) => (
                      <div key={grn.id} className="border border-green-100 rounded-xl p-4">
                        <div className="flex justify-between"><p className="text-[#00321B] font-medium text-sm">GRN: {grn.grnNumber}</p>
                          <span className={`text-xs font-medium ${grn.receiptStatus === "full" ? "text-emerald-600" : grn.receiptStatus === "partial" ? "text-amber-600" : "text-red-600"}`}>{grn.receiptStatus === "full" ? "Đủ" : grn.receiptStatus === "partial" ? "Một phần" : "Từ chối"}</span></div>
                        <p className="text-gray-400 text-xs mt-1">Nhận bởi: {grn.receiver?.fullName || "—"} • {new Date(grn.receivedDate).toLocaleDateString("vi-VN")}</p>
                        {grn.notes && <p className="text-gray-400 text-xs mt-1">{grn.notes}</p>}
                      </div>
                    ))}</div>
                  )}
                </div>
              )}
            </>
          )}
        </Tabs>
      </div>

      {/* Vendor response modal */}
      <Modal open={responseModal.open} onClose={() => { setResponseModal({ open: false, type: "" }); setResponseNotes(""); }}
        title={responseModal.type === "confirmed" ? "Xác nhận đơn hàng" : "Từ chối đơn hàng"}
        actions={<><button onClick={() => { setResponseModal({ open: false, type: "" }); setResponseNotes(""); }} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
          <button onClick={submitResponse} disabled={responding} className={`px-6 py-2 rounded-xl text-[#00321B] text-sm font-medium transition-all disabled:opacity-50 ${responseModal.type === "confirmed" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>{responding ? "Đang xử lý..." : "Xác nhận"}</button></>}>
        <textarea value={responseNotes} onChange={(e) => setResponseNotes(e.target.value)} placeholder="Ghi chú..." rows={3} className={inputClass} />
      </Modal>
    </div>
  );
}
