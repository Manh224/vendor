"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";

const productStatusMap: Record<string, { label: string; color: string }> = {
  draft: { label: "Nháp", color: "bg-gray-100 text-gray-600" },
  pending_review: { label: "Chờ duyệt", color: "bg-amber-50 text-amber-600" },
  approved: { label: "Đã duyệt", color: "bg-[#067643]/10 text-[#067643]" },
  active: { label: "Đang bán", color: "bg-emerald-50 text-emerald-600" },
  discontinued: { label: "Ngừng bán", color: "bg-red-50 text-red-600" },
};

interface ProductItem {
  id: string;
  name: string;
  sku: string | null;
  barcodes: string[];
  currentPrice: number | null;
  status: string;
  unit: string | null;
  vendor: { id: string; companyName: string };
  category: { id: string; name: string } | null;
  createdAt: string;
}

const statusTabs = [
  { key: "all", label: "Tất cả" },
  { key: "draft", label: "Nháp" },
  { key: "pending_review", label: "Chờ duyệt" },
  { key: "active", label: "Đang bán" },
];

export default function ProductsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user as any;
  const isVendor = user?.side === "vendor";

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");

  useEffect(() => {
    fetchProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, search]);

  const fetchProducts = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), pageSize: "20" });
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (search) params.set("search", search);

    const res = await fetch(`/api/products?${params}`);
    const json = await res.json();
    if (json.success) {
      setProducts(json.data.items);
      setTotalPages(json.data.totalPages);
      setTotal(json.data.total);
    }
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const formatPrice = (price: number | null) => {
    if (!price) return "—";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#00321B]">Sản phẩm</h1>
          <p className="text-[#6B6B6B] mt-1">
            {isVendor ? "Quản lý danh mục sản phẩm của bạn" : `Tổng cộng ${total} sản phẩm`}
          </p>
        </div>
        {isVendor && (
          <button onClick={() => router.push("/products/create")} className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#FF9811] to-[#E07B00] text-white text-sm font-semibold hover:from-[#ffab3d] hover:to-[#FF9811] transition-all shadow-lg shadow-orange-500/25">
            + Thêm sản phẩm
          </button>
        )}
      </div>

      <div className="flex gap-1 mb-6 border-b border-green-200">
        {statusTabs.map((tab) => (
          <button key={tab.key} onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${statusFilter === tab.key ? "border-[#067643] text-[#067643]" : "border-transparent text-[#6B6B6B] hover:text-[#00321B] hover:border-[#067643]/30"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSearch} className="mb-4">
        <div className="relative max-w-md">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Tìm theo tên SP hoặc SKU..." className="w-full px-4 py-2.5 pl-10 rounded-xl bg-white border border-green-200 text-[#00321B] text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#067643]/30 focus:border-[#067643]/50 shadow-sm" />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
      </form>

      <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-green-100 bg-[#f8ffef]">
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Sản phẩm</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">SKU</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Barcode</th>
                {!isVendor && <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">NCC</th>}
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Danh mục</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Giá</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase tracking-wider">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-green-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">Đang tải...</td></tr>
              ) : products.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-[#6B6B6B]">{search ? "Không tìm thấy sản phẩm" : "Chưa có sản phẩm nào"}</td></tr>
              ) : products.map((p) => (
                <tr key={p.id} onClick={() => router.push(`/products/${p.id}`)} className="hover:bg-[#f8ffef]/60 transition-colors cursor-pointer">
                  <td className="px-6 py-4">
                    <p className="text-[#00321B] text-sm font-medium">{p.name}</p>
                    {p.unit && <p className="text-gray-400 text-xs">ĐVT: {p.unit}</p>}
                  </td>
                  <td className="px-6 py-4 text-[#00321B] text-sm font-mono">{p.sku || "—"}</td>
                  <td className="px-6 py-4 text-[#6B6B6B] text-sm font-mono">
                    {Array.isArray(p.barcodes) && p.barcodes.length > 0 ? (
                      <span title={p.barcodes.join(", ")}>
                        {p.barcodes[0]}
                        {p.barcodes.length > 1 && <span className="text-xs text-gray-400 ml-1">+{p.barcodes.length - 1}</span>}
                      </span>
                    ) : "—"}
                  </td>
                  {!isVendor && <td className="px-6 py-4 text-[#6B6B6B] text-sm">{p.vendor.companyName}</td>}
                  <td className="px-6 py-4 text-[#6B6B6B] text-sm">{p.category?.name || "—"}</td>
                  <td className="px-6 py-4 text-[#00321B] text-sm text-right font-mono">{formatPrice(p.currentPrice)}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${productStatusMap[p.status]?.color || "bg-gray-100 text-gray-600"}`}>
                      {productStatusMap[p.status]?.label || p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  );
}
