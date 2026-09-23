"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Modal from "@/components/ui/Modal";

interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  currentPrice: number | null;
  unit: string | null;
  packSize: string | null;
  weight: number | null;
  shelfLifeDays: number | null;
  status: string;
  barcodes: string[];
  images: string[];
  certifications: string[];
  vendor: { id: string; companyName: string };
  category: { id: string; name: string; code: string } | null;
  approver: { fullName: string } | null;
  creator: { fullName: string } | null;
  approvedAt: string | null;
  createdAt: string;
  priceChangeRequests: any[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "bg-gray-100 text-gray-600" },
  pending_review: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã duyệt", color: "bg-[#067643]/10 text-[#067643]" },
  active: { label: "Đang bán", color: "bg-emerald-50 text-emerald-600" },
  discontinued: { label: "Ngừng bán", color: "bg-red-500/10 text-red-600" },
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isSupermarket = user?.side === "supermarket";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Price change modal
  const [priceModal, setPriceModal] = useState(false);
  const [priceForm, setPriceForm] = useState({ proposedPrice: "", reason: "", effectiveDate: "" });
  const [savingPrice, setSavingPrice] = useState(false);

  // Status change
  const [statusModal, setStatusModal] = useState<{ open: boolean; action: string; label: string }>({ open: false, action: "", label: "" });
  const [changingStatus, setChangingStatus] = useState(false);

  const fetchProduct = useCallback(async () => {
    const res = await fetch(`/api/products/${id}`);
    const json = await res.json();
    if (json.success) setProduct(json.data);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchProduct(); }, [fetchProduct]);

  const startEditing = () => {
    if (!product) return;
    setEditForm({
      name: product.name, sku: product.sku || "", description: product.description || "",
      unit: product.unit || "", packSize: product.packSize || "", weight: product.weight || "",
      shelfLifeDays: product.shelfLifeDays || "", currentPrice: product.currentPrice || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...editForm, weight: editForm.weight ? Number(editForm.weight) : null, shelfLifeDays: editForm.shelfLifeDays ? Number(editForm.shelfLifeDays) : null, currentPrice: editForm.currentPrice ? Number(editForm.currentPrice) : null }),
    });
    if (res.ok) { setEditing(false); fetchProduct(); }
    setSaving(false);
  };

  const changeStatus = async () => {
    setChangingStatus(true);
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusModal.action }),
    });
    if (res.ok) { setStatusModal({ open: false, action: "", label: "" }); fetchProduct(); }
    setChangingStatus(false);
  };

  const submitPriceChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPrice(true);
    const res = await fetch("/api/price-changes", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id, proposedPrice: Number(priceForm.proposedPrice), reason: priceForm.reason, effectiveDate: priceForm.effectiveDate }),
    });
    if (res.ok) { setPriceModal(false); setPriceForm({ proposedPrice: "", reason: "", effectiveDate: "" }); fetchProduct(); }
    setSavingPrice(false);
  };

  const formatPrice = (p: number | null) => p ? new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(p) : "—";

  if (loading) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;
  if (!product) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Không tìm thấy sản phẩm</div>;

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#00321B] text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50";
  const sc = statusConfig[product.status] || statusConfig.draft;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push("/products")} className="text-[#6B6B6B] hover:text-[#00321B] text-sm mb-2 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Danh sách sản phẩm
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#00321B]">{product.name}</h1>
            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${sc.color}`}>{sc.label}</span>
          </div>
          <p className="text-[#6B6B6B] mt-1">{product.vendor.companyName} {product.sku ? `• SKU: ${product.sku}` : ""}</p>
        </div>
        <div className="flex gap-2">
          {isSupermarket && product.status === "pending_review" && (
            <>
              <button onClick={() => setStatusModal({ open: true, action: "approved", label: "Duyệt" })} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all">Duyệt</button>
              <button onClick={() => setStatusModal({ open: true, action: "draft", label: "Từ chối" })} className="px-4 py-2 rounded-xl bg-red-600 text-[#00321B] text-sm font-medium hover:bg-red-500 transition-all">Từ chối</button>
            </>
          )}
          {isSupermarket && product.status === "approved" && (
            <button onClick={() => setStatusModal({ open: true, action: "active", label: "Cho phép bán" })} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all">Cho phép bán</button>
          )}
          {!isSupermarket && product.status === "draft" && (
            <button onClick={() => setStatusModal({ open: true, action: "pending_review", label: "Gửi duyệt" })} className="px-4 py-2 rounded-xl bg-blue-600 text-[#00321B] text-sm font-medium hover:bg-blue-500 transition-all">Gửi duyệt</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#00321B] font-semibold">Thông tin sản phẩm</h3>
              {!isSupermarket && ["draft", "approved"].includes(product.status) && !editing && (
                <button onClick={startEditing} className="text-[#067643] hover:text-[#01A258] text-sm font-medium transition-colors">✏️ Sửa</button>
              )}
            </div>
            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">Tên SP</label><input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">SKU</label><input value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">ĐVT</label><input value={editForm.unit} onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">Quy cách</label><input value={editForm.packSize} onChange={(e) => setEditForm({ ...editForm, packSize: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">Trọng lượng (kg)</label><input type="number" step="0.001" value={editForm.weight} onChange={(e) => setEditForm({ ...editForm, weight: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">HSD (ngày)</label><input type="number" value={editForm.shelfLifeDays} onChange={(e) => setEditForm({ ...editForm, shelfLifeDays: e.target.value })} className={inputClass} /></div>
                  <div><label className="block text-xs text-[#6B6B6B] mb-1">Giá hiện tại (VND)</label><input type="number" value={editForm.currentPrice} onChange={(e) => setEditForm({ ...editForm, currentPrice: e.target.value })} className={inputClass} /></div>
                </div>
                <div><label className="block text-xs text-[#6B6B6B] mb-1">Mô tả</label><textarea rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className={inputClass} /></div>
                <div className="flex gap-2">
                  <button onClick={saveEdit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">{saving ? "Đang lưu..." : "Lưu"}</button>
                  <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
                </div>
              </div>
            ) : (
              <dl className="grid grid-cols-2 gap-4">
                {[
                  ["SKU", product.sku], ["ĐVT", product.unit], ["Quy cách", product.packSize],
                  ["Trọng lượng", product.weight ? `${product.weight} kg` : null],
                  ["Hạn sử dụng", product.shelfLifeDays ? `${product.shelfLifeDays} ngày` : null],
                  ["Danh mục", product.category?.name],
                  ["Người tạo", product.creator?.fullName], ["Người duyệt", product.approver?.fullName],
                ].map(([l, v]) => (
                  <div key={l as string}><dt className="text-gray-400 text-xs">{l}</dt><dd className="text-[#00321B] text-sm mt-0.5">{v || "—"}</dd></div>
                ))}
                {product.description && (
                  <div className="col-span-2"><dt className="text-gray-400 text-xs">Mô tả</dt><dd className="text-[#00321B] text-sm mt-0.5">{product.description}</dd></div>
                )}
              </dl>
            )}
          </div>

          {/* Price change history */}
          <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[#00321B] font-semibold">Lịch sử thay đổi giá</h3>
              {!isSupermarket && product.status === "active" && (
                <button onClick={() => setPriceModal(true)} className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-medium hover:bg-amber-500/20 transition-all">
                  Yêu cầu đổi giá
                </button>
              )}
            </div>
            {product.priceChangeRequests.length === 0 ? (
              <p className="text-[#6B6B6B] text-sm">Chưa có yêu cầu thay đổi giá</p>
            ) : (
              <div className="space-y-3">
                {product.priceChangeRequests.map((pcr: any) => (
                  <div key={pcr.id} className="flex items-center justify-between py-2 border-b border-green-100/50 last:border-0">
                    <div>
                      <p className="text-[#00321B] text-sm">{formatPrice(Number(pcr.currentPrice))} → {formatPrice(Number(pcr.proposedPrice))}</p>
                      <p className="text-gray-400 text-xs">{pcr.reason}</p>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${pcr.status === "approved" ? "bg-emerald-50 text-emerald-600" : pcr.status === "rejected" ? "bg-red-500/10 text-red-600" : "bg-amber-50 text-amber-600"}`}>
                      {pcr.status === "approved" ? "Duyệt" : pcr.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
            <h3 className="text-[#00321B] font-semibold mb-4">Giá bán</h3>
            <p className="text-3xl font-bold text-white">{formatPrice(product.currentPrice ? Number(product.currentPrice) : null)}</p>
            <p className="text-[#6B6B6B] text-sm mt-1">/ {product.unit || "đơn vị"}</p>
          </div>

          <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
            <h3 className="text-[#00321B] font-semibold mb-3">Thời gian</h3>
            <dl className="space-y-2">
              <div><dt className="text-gray-400 text-xs">Ngày tạo</dt><dd className="text-[#00321B] text-sm">{new Date(product.createdAt).toLocaleDateString("vi-VN")}</dd></div>
              {product.approvedAt && <div><dt className="text-gray-400 text-xs">Ngày duyệt</dt><dd className="text-[#00321B] text-sm">{new Date(product.approvedAt).toLocaleDateString("vi-VN")}</dd></div>}
            </dl>
          </div>
        </div>
      </div>

      {/* Status modal */}
      <Modal open={statusModal.open} onClose={() => setStatusModal({ open: false, action: "", label: "" })} title={statusModal.label}
        actions={<><button onClick={() => setStatusModal({ open: false, action: "", label: "" })} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
          <button onClick={changeStatus} disabled={changingStatus} className="px-6 py-2 rounded-xl bg-blue-600 text-[#00321B] text-sm font-medium hover:bg-blue-500 transition-all disabled:opacity-50">{changingStatus ? "Đang xử lý..." : "Xác nhận"}</button></>}>
        <p className="text-[#00321B] text-sm">Xác nhận <strong>{statusModal.label?.toLowerCase()}</strong> sản phẩm <strong>{product.name}</strong>?</p>
      </Modal>

      {/* Price change modal */}
      <Modal open={priceModal} onClose={() => setPriceModal(false)} title="Yêu cầu thay đổi giá"
        actions={<><button onClick={() => setPriceModal(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
          <button onClick={submitPriceChange as any} disabled={savingPrice} className="px-6 py-2 rounded-xl bg-amber-600 text-[#00321B] text-sm font-medium hover:bg-amber-500 transition-all disabled:opacity-50">{savingPrice ? "Đang gửi..." : "Gửi yêu cầu"}</button></>}>
        <div className="space-y-4">
          <p className="text-[#6B6B6B] text-sm">Giá hiện tại: <strong className="text-white">{formatPrice(product.currentPrice ? Number(product.currentPrice) : null)}</strong></p>
          <div><label className="block text-xs text-[#6B6B6B] mb-1">Giá đề xuất (VND) *</label><input type="number" required value={priceForm.proposedPrice} onChange={(e) => setPriceForm({ ...priceForm, proposedPrice: e.target.value })} className={inputClass} /></div>
          <div><label className="block text-xs text-[#6B6B6B] mb-1">Lý do *</label><textarea rows={2} required value={priceForm.reason} onChange={(e) => setPriceForm({ ...priceForm, reason: e.target.value })} className={inputClass} /></div>
          <div><label className="block text-xs text-[#6B6B6B] mb-1">Ngày áp dụng *</label><input type="date" required value={priceForm.effectiveDate} onChange={(e) => setPriceForm({ ...priceForm, effectiveDate: e.target.value })} className={inputClass} /></div>
        </div>
      </Modal>
    </div>
  );
}
