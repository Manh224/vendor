"use client";

import { useEffect, useState } from "react";
import Modal from "@/components/ui/Modal";

interface Permission {
  id: string;
  module: string;
  action: string;
  resource: string;
  description: string | null;
}

interface RolePermission {
  id: string;
  permission: Permission;
}

interface Role {
  id: string;
  name: string;
  displayName: string;
  side: string;
  description: string | null;
  rolePermissions: RolePermission[];
  _count: { users: number };
}

const moduleLabels: Record<string, string> = {
  vendors: "Nhà cung cấp",
  products: "Sản phẩm",
  orders: "Đơn hàng",
  finance: "Tài chính",
  performance: "Hiệu suất",
  support: "Hỗ trợ",
  admin: "Quản trị",
  dashboard: "Dashboard",
};

const actionLabels: Record<string, string> = {
  view: "Xem",
  create: "Tạo",
  edit: "Sửa",
  update: "Sửa",
  delete: "Xóa",
  approve: "Duyệt",
  export: "Xuất",
  manage: "Quản lý",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit modal state
  const [editModal, setEditModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          setRoles(json.data.roles);
          setPermissions(json.data.permissions);
        }
        setLoading(false);
      });
  }, []);

  const openEdit = (role: Role) => {
    setEditingRole(role);
    setSelectedPerms(new Set(role.rolePermissions.map(rp => rp.permission.id)));
    setEditModal(true);
  };

  const togglePerm = (permId: string) => {
    setSelectedPerms(prev => {
      const next = new Set(prev);
      if (next.has(permId)) next.delete(permId);
      else next.add(permId);
      return next;
    });
  };

  const toggleModule = (module: string) => {
    const modulePerms = permissions.filter(p => p.module === module);
    const allSelected = modulePerms.every(p => selectedPerms.has(p.id));
    setSelectedPerms(prev => {
      const next = new Set(prev);
      modulePerms.forEach(p => {
        if (allSelected) next.delete(p.id);
        else next.add(p.id);
      });
      return next;
    });
  };

  const savePermissions = async () => {
    if (!editingRole) return;
    setSaving(true);

    const res = await fetch("/api/admin/roles", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleId: editingRole.id,
        permissionIds: Array.from(selectedPerms),
      }),
    });

    const json = await res.json();
    if (json.success) {
      // Update the role in local state
      setRoles(roles.map(r => r.id === editingRole.id ? json.data : r));
      setEditModal(false);
      setEditingRole(null);
    } else {
      alert(json.error || "Có lỗi xảy ra");
    }
    setSaving(false);
  };

  // Group permissions by module
  const permsByModule = permissions.reduce((acc: Record<string, Permission[]>, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {});

  if (loading) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00321B]">Vai trò & Quyền hạn</h1>
        <p className="text-[#6B6B6B] mt-1">Quản lý vai trò và phân quyền</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => {
          const canEdit = role.name !== "supermarket_admin";
          return (
            <div key={role.id} className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-[#00321B] font-semibold">{role.displayName || role.description || role.name}</h3>
                  <p className="text-gray-400 text-xs font-mono mt-0.5">{role.name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#067643]/10 text-[#067643] text-xs font-medium">
                    {role._count.users} người dùng
                  </span>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${
                    role.side === "supermarket" ? "bg-cyan-50 text-cyan-600" : "bg-amber-50 text-amber-600"
                  }`}>
                    {role.side === "supermarket" ? "Siêu thị" : "NCC"}
                  </span>
                </div>
              </div>

              {role.rolePermissions.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Quyền hạn ({role.rolePermissions.length})</p>
                  <div className="flex flex-wrap gap-1.5">
                    {role.rolePermissions.map((rp: any) => (
                      <span key={rp.id} className="inline-flex px-2 py-0.5 rounded-md bg-gray-50 text-[#00321B] text-xs">
                        {moduleLabels[rp.permission.module] || rp.permission.module}.{actionLabels[rp.permission.action] || rp.permission.action}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {role.rolePermissions.length === 0 && (
                <p className="text-gray-400 text-xs italic">Chưa có quyền hạn nào</p>
              )}

              {canEdit && (
                <button
                  onClick={() => openEdit(role)}
                  className="mt-4 px-4 py-2 rounded-xl bg-[#067643]/10 text-[#067643] text-sm font-medium hover:bg-[#067643]/20 transition-all border border-[#067643]/20"
                >
                  ✏️ Chỉnh sửa quyền hạn
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Permissions Modal */}
      <Modal
        open={editModal}
        onClose={() => { setEditModal(false); setEditingRole(null); }}
        title={`Chỉnh sửa quyền hạn — ${editingRole?.displayName || ""}`}
        maxWidth="max-w-2xl"
        actions={
          <>
            <button
              onClick={() => { setEditModal(false); setEditingRole(null); }}
              className="px-4 py-2 rounded-xl bg-gray-100 text-[#6B6B6B] text-sm hover:text-[#00321B] transition-all"
            >
              Hủy
            </button>
            <button
              onClick={savePermissions}
              disabled={saving}
              className="px-6 py-2 rounded-xl bg-[#067643] text-white text-sm font-medium hover:bg-[#01A258] transition-all disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : `Lưu (${selectedPerms.size} quyền)`}
            </button>
          </>
        }
      >
        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-[#6B6B6B] text-sm">
            Chọn các quyền hạn cho vai trò <strong className="text-[#00321B]">{editingRole?.displayName}</strong>.
            Click vào tên module để chọn/bỏ chọn tất cả quyền trong module.
          </p>

          {Object.entries(permsByModule).map(([module, perms]) => {
            const allSelected = perms.every(p => selectedPerms.has(p.id));
            const someSelected = perms.some(p => selectedPerms.has(p.id));

            return (
              <div key={module} className="border border-green-100 rounded-xl overflow-hidden">
                {/* Module header */}
                <button
                  onClick={() => toggleModule(module)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-[#f8ffef] hover:bg-[#eef8de] transition-colors text-left"
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                    allSelected
                      ? "bg-[#067643] border-[#067643]"
                      : someSelected
                      ? "bg-[#067643]/30 border-[#067643]/50"
                      : "border-gray-300"
                  }`}>
                    {(allSelected || someSelected) && (
                      <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={allSelected ? "M5 13l4 4L19 7" : "M5 12h14"} />
                      </svg>
                    )}
                  </span>
                  <span className="text-[#00321B] font-semibold text-sm">
                    {moduleLabels[module] || module}
                  </span>
                  <span className="text-gray-400 text-xs ml-auto">
                    {perms.filter(p => selectedPerms.has(p.id)).length}/{perms.length}
                  </span>
                </button>

                {/* Individual permissions */}
                <div className="divide-y divide-green-50">
                  {perms.map(perm => (
                    <label
                      key={perm.id}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#f8ffef]/60 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPerms.has(perm.id)}
                        onChange={() => togglePerm(perm.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#067643] focus:ring-[#067643]/30 accent-[#067643]"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-[#00321B] text-sm">
                          {actionLabels[perm.action] || perm.action}
                        </span>
                        <span className="text-gray-400 text-xs ml-2">
                          ({perm.resource})
                        </span>
                      </div>
                      {perm.description && (
                        <span className="text-gray-400 text-xs truncate max-w-[200px]" title={perm.description}>
                          {perm.description}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Modal>
    </div>
  );
}
