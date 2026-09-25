"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import StatusBadge from "@/components/ui/StatusBadge";
import Tabs from "@/components/ui/Tabs";
import Modal from "@/components/ui/Modal";

interface Vendor {
  id: string;
  companyName: string;
  taxCode: string;
  address: string | null;
  city: string | null;
  district: string | null;
  ward: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  bankName: string | null;
  bankBranch: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  status: string;
  statusNotes: string | null;
  currentRanking: string;
  createdAt: string;
  contacts: Contact[];
  documents: Document[];
  contracts: Contract[];
  users: VendorUser[];
}

interface Contact {
  id: string;
  fullName: string;
  position: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface Document {
  id: string;
  documentType: { id: string; name: string; code: string };
  documentNumber: string | null;
  fileUrl: string;
  fileName: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  status: string;
  reviewedAt: string | null;
  reviewNotes: string | null;
  reviewer: { fullName: string } | null;
  createdAt: string;
}

interface Contract {
  id: string;
  contractNumber: string;
  contractType: string;
  title: string | null;
  startDate: string;
  endDate: string;
  status: string;
  paymentTermsDays: number;
  discountRate: number;
  displayFee: number;
  marketingSupportFee: number;
  creator: { fullName: string } | null;
  createdAt: string;
}

interface VendorUser {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
}

// Valid next statuses for action buttons
const statusActions: Record<string, { label: string; nextStatus: string; color: string }[]> = {
  pending_registration: [
    { label: "Gửi duyệt", nextStatus: "pending_review", color: "bg-blue-600 hover:bg-blue-500" },
  ],
  pending_review: [
    { label: "Duyệt", nextStatus: "approved", color: "bg-emerald-600 hover:bg-emerald-500" },
    { label: "Yêu cầu bổ sung", nextStatus: "requires_supplement", color: "bg-amber-600 hover:bg-amber-500" },
    { label: "Từ chối", nextStatus: "terminated", color: "bg-red-600 hover:bg-red-500" },
  ],
  requires_supplement: [
    { label: "Gửi duyệt lại", nextStatus: "pending_review", color: "bg-blue-600 hover:bg-blue-500" },
  ],
  approved: [
    { label: "Chuyển ký HĐ", nextStatus: "contract_signing", color: "bg-indigo-600 hover:bg-indigo-500" },
  ],
  contract_signing: [
    { label: "Kích hoạt", nextStatus: "active", color: "bg-emerald-600 hover:bg-emerald-500" },
  ],
  active: [
    { label: "Tạm ngưng", nextStatus: "suspended", color: "bg-red-600 hover:bg-red-500" },
  ],
  suspended: [
    { label: "Kích hoạt lại", nextStatus: "active", color: "bg-emerald-600 hover:bg-emerald-500" },
    { label: "Chấm dứt", nextStatus: "terminated", color: "bg-red-600 hover:bg-red-500" },
  ],
};

export default function VendorDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isSupermarket = user?.side === "supermarket";

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Status change modal
  const [statusModal, setStatusModal] = useState<{ open: boolean; action: any }>({
    open: false, action: null,
  });
  const [statusNotes, setStatusNotes] = useState("");
  const [changingStatus, setChangingStatus] = useState(false);

  // Delete vendor modal
  const [deleteModal, setDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Contact form
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ fullName: "", position: "", email: "", phone: "", isPrimary: false });
  const [savingContact, setSavingContact] = useState(false);

  // Document form
  const [showDocForm, setShowDocForm] = useState(false);
  const [docForm, setDocForm] = useState({ documentTypeId: "", documentNumber: "", fileUrl: "", fileName: "", issuedDate: "", expiryDate: "" });
  const [docTypes, setDocTypes] = useState<{ id: string; name: string; code: string }[]>([]);
  const [savingDoc, setSavingDoc] = useState(false);

  // Document review modal
  const [reviewModal, setReviewModal] = useState<{ open: boolean; doc: Document | null }>({ open: false, doc: null });
  const [reviewStatus, setReviewStatus] = useState<"approved" | "rejected">("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);

  // Contract form
  const [showContractForm, setShowContractForm] = useState(false);
  const [contractForm, setContractForm] = useState({
    contractNumber: "", contractType: "principal", title: "", startDate: "", endDate: "",
    paymentTermsDays: "30", discountRate: "0", displayFee: "0", marketingSupportFee: "0", penaltyTerms: "",
  });
  const [savingContract, setSavingContract] = useState(false);

  const fetchVendor = useCallback(async () => {
    const res = await fetch(`/api/vendors/${id}`);
    const json = await res.json();
    if (json.success) {
      setVendor(json.data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchVendor();
  }, [fetchVendor]);

  // Fetch document types when doc form opens
  useEffect(() => {
    if (showDocForm && docTypes.length === 0) {
      fetch(`/api/vendors/${id}/documents`)
        .then((r) => r.json())
        .then((json) => {
          if (json.success) setDocTypes(json.data.documentTypes);
        });
    }
  }, [showDocForm, docTypes.length, id]);

  const startEditing = () => {
    if (!vendor) return;
    setEditForm({
      companyName: vendor.companyName || "",
      address: vendor.address || "",
      city: vendor.city || "",
      district: vendor.district || "",
      ward: vendor.ward || "",
      phone: vendor.phone || "",
      email: vendor.email || "",
      website: vendor.website || "",
      bankName: vendor.bankName || "",
      bankBranch: vendor.bankBranch || "",
      bankAccountNo: vendor.bankAccountNo || "",
      bankAccountName: vendor.bankAccountName || "",
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const res = await fetch(`/api/vendors/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    });
    if (res.ok) {
      setEditing(false);
      fetchVendor();
    }
    setSaving(false);
  };

  const changeStatus = async () => {
    if (!statusModal.action) return;
    setChangingStatus(true);
    const res = await fetch(`/api/vendors/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: statusModal.action.nextStatus, notes: statusNotes }),
    });
    if (res.ok) {
      setStatusModal({ open: false, action: null });
      setStatusNotes("");
      fetchVendor();
    }
    setChangingStatus(false);
  };

  const addContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContact(true);
    const res = await fetch(`/api/vendors/${id}/contacts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(contactForm),
    });
    if (res.ok) {
      setShowContactForm(false);
      setContactForm({ fullName: "", position: "", email: "", phone: "", isPrimary: false });
      fetchVendor();
    }
    setSavingContact(false);
  };

  const addDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDoc(true);
    const res = await fetch(`/api/vendors/${id}/documents`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(docForm),
    });
    if (res.ok) {
      setShowDocForm(false);
      setDocForm({ documentTypeId: "", documentNumber: "", fileUrl: "", fileName: "", issuedDate: "", expiryDate: "" });
      fetchVendor();
    }
    setSavingDoc(false);
  };

  const reviewDocument = async () => {
    if (!reviewModal.doc) return;
    setReviewing(true);
    const res = await fetch(`/api/vendors/${id}/documents/${reviewModal.doc.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: reviewStatus, reviewNotes }),
    });
    if (res.ok) {
      setReviewModal({ open: false, doc: null });
      setReviewNotes("");
      fetchVendor();
    }
    setReviewing(false);
  };

  const addContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingContract(true);
    const res = await fetch(`/api/vendors/${id}/contracts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...contractForm,
        paymentTermsDays: parseInt(contractForm.paymentTermsDays),
        discountRate: parseFloat(contractForm.discountRate),
        displayFee: parseFloat(contractForm.displayFee),
        marketingSupportFee: parseFloat(contractForm.marketingSupportFee),
      }),
    });
    if (res.ok) {
      setShowContractForm(false);
      setContractForm({
        contractNumber: "", contractType: "principal", title: "", startDate: "", endDate: "",
        paymentTermsDays: "30", discountRate: "0", displayFee: "0", marketingSupportFee: "0", penaltyTerms: "",
      });
      fetchVendor();
    }
    setSavingContract(false);
  };

  const deleteVendor = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/vendors/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        router.push("/vendors");
      } else {
        alert(data.error || "Có lỗi xảy ra");
        setDeleteModal(false);
      }
    } catch {
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
      setDeleteModal(false);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;
  }

  if (!vendor) {
    return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Không tìm thấy nhà cung cấp</div>;
  }

  const canEdit = isSupermarket || ["pending_registration", "requires_supplement", "active"].includes(vendor.status);
  const actions = isSupermarket ? (statusActions[vendor.status] || []) : [];
  const isSuperAdmin = user?.role === "supermarket_admin";
  const canDelete = isSuperAdmin && ["pending_registration", "pending_review"].includes(vendor.status);

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#00321B] text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50";

  const tabs = [
    { key: "info", label: "Thông tin chung" },
    { key: "contacts", label: `Liên hệ (${vendor.contacts.length})` },
    { key: "documents", label: `Giấy tờ (${vendor.documents.length})` },
    { key: "contracts", label: `Hợp đồng (${vendor.contracts.length})` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <button onClick={() => router.push("/vendors")} className="text-[#6B6B6B] hover:text-[#00321B] text-sm mb-2 flex items-center gap-1 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Danh sách NCC
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-[#00321B]">{vendor.companyName}</h1>
            <StatusBadge status={vendor.status} type="vendor" />
          </div>
          <p className="text-[#6B6B6B] mt-1">MST: {vendor.taxCode}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {actions.map((action) => (
            <button
              key={action.nextStatus}
              onClick={() => setStatusModal({ open: true, action })}
              className={`px-4 py-2 rounded-xl text-white text-sm font-medium transition-all ${action.color}`}
            >
              {action.label}
            </button>
          ))}
          {canDelete && (
            <button
              onClick={() => setDeleteModal(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all"
            >
              🗑 Xóa NCC
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {deleteModal && vendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-600 text-lg">⚠️</span>
              </div>
              <h3 className="text-[#00321B] font-semibold text-lg">Xóa Nhà cung cấp</h3>
            </div>
            <p className="text-[#444] text-sm leading-relaxed mb-6">
              Bạn có muốn xóa Nhà cung cấp <strong>{vendor.companyName}</strong> khỏi hệ thống vendorportal của Pavelmart không?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-gray-100 text-[#6B6B6B] text-sm hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                onClick={deleteVendor}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-all disabled:opacity-50"
              >
                {deleting ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tabs content */}
      <Tabs tabs={tabs}>
        {(activeTab) => (
          <>
            {/* ===== TAB: Thông tin chung ===== */}
            {activeTab === "info" && (
              <div className="space-y-6">
                {/* Edit toggle */}
                {canEdit && !editing && (
                  <button onClick={startEditing} className="text-[#067643] hover:text-[#01A258] text-sm font-medium transition-colors">
                    ✏️ Chỉnh sửa thông tin
                  </button>
                )}

                {editing ? (
                  <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
                    <h3 className="text-[#00321B] font-semibold mb-4">Chỉnh sửa thông tin</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Tên công ty</label>
                        <input value={editForm.companyName} onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Email</label>
                        <input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Số điện thoại</label>
                        <input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Website</label>
                        <input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} className={inputClass} />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm text-[#6B6B6B] mb-1">Địa chỉ</label>
                        <input value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Tỉnh/Thành phố</label>
                        <input value={editForm.city} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Quận/Huyện</label>
                        <input value={editForm.district} onChange={(e) => setEditForm({ ...editForm, district: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Phường/Xã</label>
                        <input value={editForm.ward} onChange={(e) => setEditForm({ ...editForm, ward: e.target.value })} className={inputClass} />
                      </div>
                    </div>

                    <h4 className="text-[#00321B] font-semibold mt-6 mb-4">Thông tin ngân hàng</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Ngân hàng</label>
                        <input value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Chi nhánh</label>
                        <input value={editForm.bankBranch} onChange={(e) => setEditForm({ ...editForm, bankBranch: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Số tài khoản</label>
                        <input value={editForm.bankAccountNo} onChange={(e) => setEditForm({ ...editForm, bankAccountNo: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-sm text-[#6B6B6B] mb-1">Tên tài khoản</label>
                        <input value={editForm.bankAccountName} onChange={(e) => setEditForm({ ...editForm, bankAccountName: e.target.value })} className={inputClass} />
                      </div>
                    </div>

                    <div className="flex gap-2 mt-6">
                      <button onClick={saveEdit} disabled={saving} className="px-6 py-2.5 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">
                        {saving ? "Đang lưu..." : "Lưu thay đổi"}
                      </button>
                      <button onClick={() => setEditing(false)} className="px-4 py-2.5 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">
                        Hủy
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Company info */}
                    <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
                      <h3 className="text-[#00321B] font-semibold mb-4">Thông tin công ty</h3>
                      <dl className="space-y-3">
                        {[
                          ["Tên công ty", vendor.companyName],
                          ["Mã số thuế", vendor.taxCode],
                          ["Email", vendor.email],
                          ["Số điện thoại", vendor.phone],
                          ["Website", vendor.website],
                          ["Địa chỉ", [vendor.address, vendor.ward, vendor.district, vendor.city].filter(Boolean).join(", ")],
                        ].map(([label, value]) => (
                          <div key={label as string} className="flex justify-between">
                            <dt className="text-[#6B6B6B] text-sm">{label}</dt>
                            <dd className="text-[#00321B] text-sm text-right max-w-[60%]">{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Bank info */}
                    <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
                      <h3 className="text-[#00321B] font-semibold mb-4">Thông tin ngân hàng</h3>
                      <dl className="space-y-3">
                        {[
                          ["Ngân hàng", vendor.bankName],
                          ["Chi nhánh", vendor.bankBranch],
                          ["Số tài khoản", vendor.bankAccountNo],
                          ["Tên tài khoản", vendor.bankAccountName],
                        ].map(([label, value]) => (
                          <div key={label as string} className="flex justify-between">
                            <dt className="text-[#6B6B6B] text-sm">{label}</dt>
                            <dd className="text-[#00321B] text-sm">{value || "—"}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>

                    {/* Vendor users */}
                    {vendor.users.length > 0 && (
                      <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6 lg:col-span-2">
                        <h3 className="text-[#00321B] font-semibold mb-4">Tài khoản người dùng ({vendor.users.length})</h3>
                        <div className="space-y-2">
                          {vendor.users.map((u) => (
                            <div key={u.id} className="flex items-center justify-between py-2">
                              <div>
                                <p className="text-[#00321B] text-sm">{u.fullName}</p>
                                <p className="text-gray-400 text-xs">{u.email}</p>
                              </div>
                              <span className={`text-xs ${u.isActive ? "text-emerald-600" : "text-red-600"}`}>
                                {u.isActive ? "Hoạt động" : "Đã khóa"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ===== TAB: Liên hệ ===== */}
            {activeTab === "contacts" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[#00321B] font-semibold">Danh bạ liên hệ</h3>
                  {canEdit && (
                    <button onClick={() => setShowContactForm(!showContactForm)} className="px-4 py-2 rounded-xl bg-blue-600 text-[#00321B] text-sm font-medium hover:bg-blue-500 transition-all">
                      + Thêm liên hệ
                    </button>
                  )}
                </div>

                {showContactForm && (
                  <form onSubmit={addContact} className="bg-white border border-green-100 shadow-sm rounded-2xl p-6 mb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <input placeholder="Họ tên *" required value={contactForm.fullName} onChange={(e) => setContactForm({ ...contactForm, fullName: e.target.value })} className={inputClass} />
                      <input placeholder="Chức vụ" value={contactForm.position} onChange={(e) => setContactForm({ ...contactForm, position: e.target.value })} className={inputClass} />
                      <input placeholder="Email" type="email" value={contactForm.email} onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })} className={inputClass} />
                      <input placeholder="Số điện thoại" value={contactForm.phone} onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })} className={inputClass} />
                    </div>
                    <div className="flex items-center gap-4 mt-4">
                      <label className="flex items-center gap-2 text-sm text-slate-400">
                        <input type="checkbox" checked={contactForm.isPrimary} onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })} className="rounded" />
                        Liên hệ chính
                      </label>
                      <button type="submit" disabled={savingContact} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">
                        {savingContact ? "Đang lưu..." : "Thêm"}
                      </button>
                      <button type="button" onClick={() => setShowContactForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-green-100 shadow-sm rounded-2xl overflow-hidden">
                  {vendor.contacts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có liên hệ nào</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-green-100">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Họ tên</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Chức vụ</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Email</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Điện thoại</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Vai trò</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-50">
                        {vendor.contacts.map((c) => (
                          <tr key={c.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                            <td className="px-6 py-3 text-[#00321B] text-sm">{c.fullName}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">{c.position || "—"}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">{c.email || "—"}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">{c.phone || "—"}</td>
                            <td className="px-6 py-3">
                              {c.isPrimary && (
                                <span className="inline-flex px-2 py-0.5 rounded-md bg-[#067643]/10 text-[#067643] text-xs font-medium">Liên hệ chính</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== TAB: Giấy tờ ===== */}
            {activeTab === "documents" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[#00321B] font-semibold">Giấy tờ & Chứng nhận</h3>
                  {canEdit && (
                    <button onClick={() => setShowDocForm(!showDocForm)} className="px-4 py-2 rounded-xl bg-blue-600 text-[#00321B] text-sm font-medium hover:bg-blue-500 transition-all">
                      + Tải lên giấy tờ
                    </button>
                  )}
                </div>

                {showDocForm && (
                  <form onSubmit={addDocument} className="bg-white border border-green-100 shadow-sm rounded-2xl p-6 mb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <select required value={docForm.documentTypeId} onChange={(e) => setDocForm({ ...docForm, documentTypeId: e.target.value })} className={inputClass}>
                        <option value="" className="bg-white">-- Chọn loại giấy tờ --</option>
                        {docTypes.map((t) => (
                          <option key={t.id} value={t.id} className="bg-white">{t.name}</option>
                        ))}
                      </select>
                      <input placeholder="Số giấy tờ" value={docForm.documentNumber} onChange={(e) => setDocForm({ ...docForm, documentNumber: e.target.value })} className={inputClass} />
                      <input placeholder="URL file *" required value={docForm.fileUrl} onChange={(e) => setDocForm({ ...docForm, fileUrl: e.target.value })} className={inputClass} />
                      <input placeholder="Tên file" value={docForm.fileName} onChange={(e) => setDocForm({ ...docForm, fileName: e.target.value })} className={inputClass} />
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Ngày cấp</label>
                        <input type="date" value={docForm.issuedDate} onChange={(e) => setDocForm({ ...docForm, issuedDate: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Ngày hết hạn</label>
                        <input type="date" value={docForm.expiryDate} onChange={(e) => setDocForm({ ...docForm, expiryDate: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="submit" disabled={savingDoc} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">
                        {savingDoc ? "Đang lưu..." : "Tải lên"}
                      </button>
                      <button type="button" onClick={() => setShowDocForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-green-100 shadow-sm rounded-2xl overflow-hidden">
                  {vendor.documents.length === 0 ? (
                    <div className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có giấy tờ nào</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-green-100">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Loại giấy tờ</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Số giấy tờ</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Hết hạn</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Trạng thái</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Người duyệt</th>
                          {isSupermarket && <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase"></th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-50">
                        {vendor.documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                            <td className="px-6 py-3 text-[#00321B] text-sm">{doc.documentType.name}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm font-mono">{doc.documentNumber || "—"}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">
                              {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString("vi-VN") : "—"}
                            </td>
                            <td className="px-6 py-3">
                              <StatusBadge status={doc.status} type="document" />
                            </td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">{doc.reviewer?.fullName || "—"}</td>
                            {isSupermarket && (
                              <td className="px-6 py-3">
                                {doc.status === "pending" && (
                                  <button onClick={() => setReviewModal({ open: true, doc })} className="text-[#067643] hover:text-[#01A258] text-xs font-medium transition-colors">
                                    Duyệt
                                  </button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* ===== TAB: Hợp đồng ===== */}
            {activeTab === "contracts" && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[#00321B] font-semibold">Hợp đồng</h3>
                  {isSupermarket && (
                    <button onClick={() => setShowContractForm(!showContractForm)} className="px-4 py-2 rounded-xl bg-blue-600 text-[#00321B] text-sm font-medium hover:bg-blue-500 transition-all">
                      + Tạo hợp đồng
                    </button>
                  )}
                </div>

                {showContractForm && (
                  <form onSubmit={addContract} className="bg-white border border-green-100 shadow-sm rounded-2xl p-6 mb-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                      <input placeholder="Số hợp đồng *" required value={contractForm.contractNumber} onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })} className={inputClass} />
                      <select value={contractForm.contractType} onChange={(e) => setContractForm({ ...contractForm, contractType: e.target.value })} className={inputClass}>
                        <option value="principal" className="bg-white">Hợp đồng chính</option>
                        <option value="appendix" className="bg-white">Phụ lục</option>
                      </select>
                      <input placeholder="Tiêu đề" value={contractForm.title} onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })} className={inputClass} />
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Ngày bắt đầu *</label>
                        <input type="date" required value={contractForm.startDate} onChange={(e) => setContractForm({ ...contractForm, startDate: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Ngày kết thúc *</label>
                        <input type="date" required value={contractForm.endDate} onChange={(e) => setContractForm({ ...contractForm, endDate: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Thời hạn thanh toán (ngày)</label>
                        <input type="number" value={contractForm.paymentTermsDays} onChange={(e) => setContractForm({ ...contractForm, paymentTermsDays: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Tỷ lệ chiết khấu (%)</label>
                        <input type="number" step="0.01" value={contractForm.discountRate} onChange={(e) => setContractForm({ ...contractForm, discountRate: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Phí trưng bày (VND)</label>
                        <input type="number" value={contractForm.displayFee} onChange={(e) => setContractForm({ ...contractForm, displayFee: e.target.value })} className={inputClass} />
                      </div>
                      <div>
                        <label className="block text-xs text-[#6B6B6B] mb-1">Phí hỗ trợ MKT (VND)</label>
                        <input type="number" value={contractForm.marketingSupportFee} onChange={(e) => setContractForm({ ...contractForm, marketingSupportFee: e.target.value })} className={inputClass} />
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-xs text-[#6B6B6B] mb-1">Điều khoản phạt</label>
                      <textarea rows={2} value={contractForm.penaltyTerms} onChange={(e) => setContractForm({ ...contractForm, penaltyTerms: e.target.value })} className={inputClass} />
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button type="submit" disabled={savingContract} className="px-4 py-2 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">
                        {savingContract ? "Đang tạo..." : "Tạo hợp đồng"}
                      </button>
                      <button type="button" onClick={() => setShowContractForm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">Hủy</button>
                    </div>
                  </form>
                )}

                <div className="bg-white border border-green-100 shadow-sm rounded-2xl overflow-hidden">
                  {vendor.contracts.length === 0 ? (
                    <div className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có hợp đồng nào</div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-green-100">
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Số HĐ</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Loại</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Tiêu đề</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Hiệu lực</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Thanh toán</th>
                          <th className="text-left px-6 py-3 text-xs font-semibold text-[#067643] uppercase">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-green-50">
                        {vendor.contracts.map((c) => (
                          <tr key={c.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                            <td className="px-6 py-3 text-[#00321B] text-sm font-mono">{c.contractNumber}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">
                              {c.contractType === "principal" ? "Hợp đồng chính" : "Phụ lục"}
                            </td>
                            <td className="px-6 py-3 text-[#00321B] text-sm">{c.title || "—"}</td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">
                              {new Date(c.startDate).toLocaleDateString("vi-VN")} — {new Date(c.endDate).toLocaleDateString("vi-VN")}
                            </td>
                            <td className="px-6 py-3 text-[#6B6B6B] text-sm">{c.paymentTermsDays} ngày</td>
                            <td className="px-6 py-3">
                              <StatusBadge status={c.status} type="contract" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </Tabs>

      {/* Status change modal */}
      <Modal
        open={statusModal.open}
        onClose={() => { setStatusModal({ open: false, action: null }); setStatusNotes(""); }}
        title={statusModal.action?.label || "Thay đổi trạng thái"}
        actions={
          <>
            <button onClick={() => { setStatusModal({ open: false, action: null }); setStatusNotes(""); }} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">
              Hủy
            </button>
            <button onClick={changeStatus} disabled={changingStatus} className={`px-6 py-2 rounded-xl text-[#00321B] text-sm font-medium transition-all disabled:opacity-50 ${statusModal.action?.color || "bg-blue-600"}`}>
              {changingStatus ? "Đang xử lý..." : "Xác nhận"}
            </button>
          </>
        }
      >
        <p className="text-[#00321B] text-sm mb-4">
          Bạn có chắc muốn <strong>{statusModal.action?.label?.toLowerCase()}</strong> nhà cung cấp <strong>{vendor.companyName}</strong>?
        </p>
        <textarea
          value={statusNotes}
          onChange={(e) => setStatusNotes(e.target.value)}
          placeholder="Ghi chú (không bắt buộc)..."
          rows={3}
          className={inputClass}
        />
      </Modal>

      {/* Document review modal */}
      <Modal
        open={reviewModal.open}
        onClose={() => { setReviewModal({ open: false, doc: null }); setReviewNotes(""); }}
        title={`Duyệt giấy tờ: ${reviewModal.doc?.documentType.name || ""}`}
        actions={
          <>
            <button onClick={() => { setReviewModal({ open: false, doc: null }); setReviewNotes(""); }} className="px-4 py-2 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all">
              Hủy
            </button>
            <button onClick={reviewDocument} disabled={reviewing} className={`px-6 py-2 rounded-xl text-[#00321B] text-sm font-medium transition-all disabled:opacity-50 ${reviewStatus === "approved" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-red-600 hover:bg-red-500"}`}>
              {reviewing ? "Đang xử lý..." : reviewStatus === "approved" ? "Duyệt" : "Từ chối"}
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-3">
            <button onClick={() => setReviewStatus("approved")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${reviewStatus === "approved" ? "bg-emerald-500/20 text-emerald-600 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-transparent"}`}>
              ✓ Duyệt
            </button>
            <button onClick={() => setReviewStatus("rejected")} className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all ${reviewStatus === "rejected" ? "bg-red-500/20 text-red-600 border border-red-500/30" : "bg-white/5 text-slate-400 border border-transparent"}`}>
              ✗ Từ chối
            </button>
          </div>
          <textarea
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
            placeholder="Ghi chú duyệt (không bắt buộc)..."
            rows={3}
            className={inputClass}
          />
        </div>
      </Modal>
    </div>
  );
}
