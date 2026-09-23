import Link from "next/link";

export default function AdminPage() {
  const sections = [
    {
      title: "Quản lý tài khoản",
      description: "Tạo, chỉnh sửa và phân quyền tài khoản người dùng",
      href: "/admin/users",
      icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z",
      color: "from-[#067643] to-[#01A258]",
    },
    {
      title: "Vai trò & Quyền hạn",
      description: "Quản lý vai trò và phân quyền chi tiết theo module",
      href: "/admin/roles",
      icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
      color: "from-[#FF9811] to-[#E07B00]",
    },
    {
      title: "Nhật ký hệ thống",
      description: "Xem lịch sử thao tác và kiểm toán hoạt động",
      href: "/admin/audit-logs",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4",
      color: "from-[#62B303] to-[#067643]",
    },
    {
      title: "Tích hợp API",
      description: "Quản lý kết nối với Dynamics 365 Business Central",
      href: "/admin/integrations",
      icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4",
      color: "from-[#01A258] to-[#79DE01]",
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#00321B]">Quản trị hệ thống</h1>
        <p className="text-[#6B6B6B] mt-1">Cài đặt, bảo mật và quản lý hệ thống Vendor Portal</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sections.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="bg-white border border-green-100 rounded-2xl p-6 hover:border-[#01A258]/30 hover:shadow-md transition-all duration-200 group shadow-sm"
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${section.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-105 transition-transform`}>
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={section.icon} />
              </svg>
            </div>
            <h3 className="text-[#00321B] font-semibold text-lg mb-1">{section.title}</h3>
            <p className="text-[#6B6B6B] text-sm">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
