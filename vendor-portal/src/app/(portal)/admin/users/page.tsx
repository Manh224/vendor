"use client";

import { useEffect, useState } from "react";

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

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    email: "", fullName: "", phone: "", roleName: "buyer", password: "",
  });

  const fetchUsers = async () => {
    const res = await fetch("/api/admin/users");
    const data = await res.json();
    if (data.success) setUsers(data.data);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setShowCreate(false);
      setForm({ email: "", fullName: "", phone: "", roleName: "buyer", password: "" });
      fetchUsers();
    }
    setCreating(false);
  };

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
          <h3 className="text-[#00321B] font-semibold mb-4">Tạo tài khoản mới (Siêu thị)</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            <input
              placeholder="Họ tên *" required value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30"
            />
            <input
              placeholder="Email *" type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30"
            />
            <input
              placeholder="Số điện thoại" value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30"
            />
            <select
              value={form.roleName}
              onChange={(e) => setForm({ ...form, roleName: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[#00321B] text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            >
              <option value="buyer" className="bg-white">Nhân viên mua hàng</option>
              <option value="accountant" className="bg-white">Kế toán</option>
              <option value="warehouse" className="bg-white">Nhân viên kho</option>
              <option value="supermarket_admin" className="bg-white">Quản trị viên</option>
            </select>
            <input
              placeholder="Mật khẩu *" type="password" required value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="px-4 py-2.5 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30"
            />
            <div className="flex gap-2">
              <button type="submit" disabled={creating}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 text-[#00321B] text-sm font-medium hover:bg-emerald-500 transition-all disabled:opacity-50"
              >
                {creating ? "Đang tạo..." : "Tạo"}
              </button>
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-xl bg-white/5 text-[#6B6B6B] text-sm hover:text-white transition-all"
              >
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
              </tr>
            </thead>
            <tbody className="divide-y divide-green-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">Đang tải...</td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có tài khoản nào</td></tr>
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
                      <span className={`text-xs font-medium ${user.side === "supermarket" ? "text-cyan-400" : "text-amber-600"}`}>
                        {user.side === "supermarket" ? "Siêu thị" : "NCC"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">{user.vendorName || "—"}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                        user.isActive ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.isActive ? "bg-emerald-400" : "bg-red-400"}`} />
                        {user.isActive ? "Hoạt động" : "Đã khóa"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">
                      {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString("vi-VN") : "Chưa đăng nhập"}
                    </td>
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
