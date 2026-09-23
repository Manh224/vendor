"use client";

import { useEffect, useState } from "react";

export default function RolesPage() {
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/roles")
      .then((r) => r.json())
      .then((json) => { if (json.success) setRoles(json.data); setLoading(false); });
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00321B]">Vai trò & Quyền hạn</h1>
        <p className="text-[#6B6B6B] mt-1">Quản lý vai trò và phân quyền</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role) => (
          <div key={role.id} className="bg-white border border-green-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-[#00321B] font-semibold">{role.description || role.name}</h3>
                <p className="text-gray-400 text-xs font-mono mt-0.5">{role.name}</p>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#067643]/10 text-[#067643] text-xs font-medium">
                {role._count.users} người dùng
              </span>
            </div>

            {role.rolePermissions.length > 0 && (
              <div>
                <p className="text-gray-400 text-xs font-semibold uppercase mb-2">Quyền hạn ({role.rolePermissions.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {role.rolePermissions.map((rp: any) => (
                    <span key={rp.id} className="inline-flex px-2 py-0.5 rounded-md bg-gray-50 text-[#00321B] text-xs">
                      {rp.permission.module}.{rp.permission.action}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
