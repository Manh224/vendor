"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  side: string;
  role: string;
  roleName: string;
  vendorName: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

interface Vendor {
  id: string;
  companyName: string;
}

const supermarketRoles = [
  { value: "buyer", label: "Nhân viên mua hàng" },
  { value: "accountant", label: "Kế toán" },
  { value: "warehouse", label: "Nhân viên kho" },
  { value: "supermarket_admin", label: "Quản trị viên" },
];

const vendorRoles = [
  { value: "vendor_admin", label: "Quản trị viên NCC" },
  { value: "vendor_sales", label: "Nhân viên kinh doanh NCC" },
  { value: "vendor_accountant", label: "Kế toán NCC" },
];

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUser = session?.user as any;
  const currentUserId = currentUser?.id;
  const isSuperAdmin = currentUser?.role === "supermarket_admin";

  const [users, setUsers] = useState<User[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "", fullName: "", phone: "", side: "supermarket" as string,
    roleName: "buyer", vendorId: "", password: "",
  });

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.success) setUsers(data.data);
    setLoading(false);
  };

  const fetchVendors = async () => {
    const res = await fetch("/api/vendors?simple=true");
    const data = await res.json();
    if (data.success) setVendors(data.data || []);
  };

  useEffect(() => {
    fetchUsers();
    fetchVendors();
  }, []);

  // When side changes, reset roleName to first role of that side
  const handleSideChange = (newSide: string) => {
    const firstRole = newSide === "vendor" ? vendorRoles[0].value : supermarketRoles[0].value;
    setForm({ ...form, side: newSide, roleName: firstRole, vendorId: "" });
  };

  const availableRoles = form.side === "vendor" ? vendorRoles : supermarketRoles;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.side === "vendor" && !form.vendorId) {
      alert("Vui lòng chọn Nhà cung cấp cho tài khoản phía NCC");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setShowCreate(false);
        setForm({ email: "", fullName: "", phone: "", side: "supermarket", roleName: "buyer", vendorId: "", password: "" });
        fetchUsers();
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch {
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    }
    setCreating(false);
  };

  const toggleActive = async (userId: string, currentlyActive: boolean) => {
    const action = currentlyActive ? "tạm dừng" : "kích hoạt lại";
    if (!confirm(`Bạn có chắc muốn ${action} tài khoản này?`)) return;

    setToggling(userId);
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isActive: !currentlyActive }),
      });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        alert("Phiên đăng nhập hết hạn. Vui lòng tải lại trang.");
        window.location.reload();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setUsers(users.map(u => u.id === userId ? { ...u, isActive: !currentlyActive } : u));
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Toggle active error:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setToggling(null);
    }
  };

  const deleteUser = async (userId: string, email: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài khoản "${email}"?\nHành động này không thể hoàn tác.`)) return;

    setDeleting(userId);
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, { method: "DELETE" });

      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        alert("Phiên đăng nhập hết hạn. Vui lòng tải lại trang.");
        window.location.reload();
        return;
      }

      const data = await res.json();
      if (data.success) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        alert(data.error || "Có lỗi xảy ra");
      }
    } catch (err) {
      console.error("Delete user error:", err);
      alert("Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setDeleting(null);
    }
  };

  const inputClass = "px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30";
  const selectClass = "px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm focus:outline-none focus:ring-2 focus:ring-[#067643]/30";

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00321B]">Quản lý tài khoản</h1>
          <p className="text-[#6B6B6B] mt-1">Quản lý người dùng và phân quyền hệ thống</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF9811] to-[#E07B00] text-[#00321B] text-sm font-semibold hover:from-[#ffab3d] hover:to-[#FF9811] transition-all shadow-lg shadow-orange-500/25"
        >
          + Thêm tài khoản
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6 mb-6">
          <h3 className="text-[#00321B] font-semibold mb-4">Tạo tài khoản mới</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <input placeholder="Họ tên *" required value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })} className={inputClass} />
            <input placeholder="Email *" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
            <input placeholder="Số điện thoại" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />

            {/* Phía */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6B6B6B] font-medium">Phía *</label>
              <select value={form.side} onChange={(e) => handleSideChange(e.target.value)} className={selectClass}>
                <option value="supermarket">Siêu thị</option>
                <option value="vendor">Nhà cung cấp (NCC)</option>
              </select>
            </div>

            {/* Vai trò */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[#6B6B6B] font-medium">Vai trò *</label>
              <select value={form.roleName} onChange={(e) => setForm({ ...form, roleName: e.target.value })} className={selectClass}>
                {availableRoles.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* NCC — only when side = vendor */}
            {form.side === "vendor" && (
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#6B6B6B] font-medium">Nhà cung cấp *</label>
                <select value={form.vendorId} onChange={(e) => setForm({ ...form, vendorId: e.target.value })}
                  required className={selectClass}>
                  <option value="">— Chọn NCC —</option>
                  {vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.companyName}</option>
                  ))}
                </select>
              </div>
            )}

            <input placeholder="Mật khẩu *" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputClass} />
            <div className="flex gap-2 items-end">
              <button type="submit" disabled={creating}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50">
                {creating ? "Đang tạo..." : "Tạo tài khoản"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-[#6B6B6B] text-sm hover:text-[#00321B] transition-all">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      <div className="bg-white border border-green-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-green-100">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Người dùng</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Vai trò</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Phía</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">NCC</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Trạng thái</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Đăng nhập cuối</th>
                {isSuperAdmin && (
                  <th className="text-center px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Thao tác</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-green-50">
              {loading ? (
                <tr><td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center text-[#6B6B6B]">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={isSuperAdmin ? 7 : 6} className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có tài khoản nào</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-[#00321B] text-sm font-medium">{user.fullName}</p>
                        <p className="text-gray-400 text-xs">{user.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#067643]/10 text-[#067643] text-xs font-medium">
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs font-medium ${user.side === "supermarket" ? "text-cyan-600" : "text-amber-600"}`}>
                        {user.side === "supermarket" ? "Siêu thị" : "NCC"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">{user.vendorName || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        user.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                        {user.isActive ? "Hoạt động" : "Tạm dừng"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("vi-VN") : "Chưa đăng nhập"}
                    </td>
                    {isSuperAdmin && (
                      <td className="px-6 py-4">
                        {user.id !== currentUserId && user.roleName !== "supermarket_admin" ? (
                          <div className="flex items-center gap-2 justify-center">
                            <button
                              onClick={() => toggleActive(user.id, user.isActive)}
                              disabled={toggling === user.id || deleting === user.id}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                                user.isActive
                                  ? "bg-amber-50 text-amber-600 hover:bg-amber-100 border border-amber-200"
                                  : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
                              }`}
                            >
                              {toggling === user.id ? "..." : user.isActive ? "Tạm dừng" : "Kích hoạt lại"}
                            </button>
                            <button
                              onClick={() => deleteUser(user.id, user.email)}
                              disabled={toggling === user.id || deleting === user.id}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                            >
                              {deleting === user.id ? "..." : "Xóa"}
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 block text-center">—</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
