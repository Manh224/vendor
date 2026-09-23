"use client";

const vendorStatusMap: Record<string, { label: string; color: string }> = {
  pending_registration: { label: "Chờ đăng ký", color: "bg-gray-100 text-gray-600" },
  pending_review: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  requires_supplement: { label: "Cần bổ sung", color: "bg-orange-50 text-orange-600" },
  approved: { label: "Đã duyệt", color: "bg-[#067643]/10 text-[#067643]" },
  contract_signing: { label: "Ký hợp đồng", color: "bg-indigo-50 text-indigo-600" },
  active: { label: "Đang hoạt động", color: "bg-emerald-50 text-emerald-600" },
  suspended: { label: "Tạm ngưng", color: "bg-red-50 text-red-600" },
  terminated: { label: "Đã chấm dứt", color: "bg-red-50 text-red-500" },
};

const contractStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "bg-gray-100 text-gray-600" },
  pending_review: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  pending_signature: { label: "Chờ ký", color: "bg-indigo-50 text-indigo-600" },
  active: { label: "Có hiệu lực", color: "bg-emerald-50 text-emerald-600" },
  expired: { label: "Hết hạn", color: "bg-red-50 text-red-500" },
  terminated: { label: "Đã chấm dứt", color: "bg-red-50 text-red-600" },
};

const documentStatusMap: Record<string, { label: string; color: string }> = {
  pending: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã duyệt", color: "bg-emerald-50 text-emerald-600" },
  rejected: { label: "Từ chối", color: "bg-red-50 text-red-600" },
};

const statusMaps = {
  vendor: vendorStatusMap,
  contract: contractStatusMap,
  document: documentStatusMap,
};

interface StatusBadgeProps {
  status: string;
  type?: "vendor" | "contract" | "document";
  className?: string;
}

export default function StatusBadge({ status, type = "vendor", className = "" }: StatusBadgeProps) {
  const map = statusMaps[type];
  const config = map[status] || { label: status, color: "bg-gray-100 text-gray-600" };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${config.color} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.color.includes("emerald") ? "bg-emerald-500" : config.color.includes("amber") ? "bg-amber-500" : config.color.includes("red") ? "bg-red-500" : config.color.includes("067643") ? "bg-[#067643]" : config.color.includes("indigo") ? "bg-indigo-500" : config.color.includes("orange") ? "bg-orange-500" : "bg-gray-400"}`} />
      {config.label}
    </span>
  );
}
