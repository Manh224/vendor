"use client";

import { useEffect, useState } from "react";

const syncModules = [
  { key: "vendors", label: "Nhà cung cấp", icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" },
  { key: "products", label: "Sản phẩm", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
  { key: "purchaseOrders", label: "Đơn hàng", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
  { key: "invoices", label: "Hóa đơn", icon: "M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" },
];

const configFields = [
  { key: "tenantId", label: "Azure Tenant ID", envVar: "BC_TENANT_ID" },
  { key: "clientId", label: "Azure Client ID", envVar: "BC_CLIENT_ID" },
  { key: "clientSecret", label: "Azure Client Secret", envVar: "BC_CLIENT_SECRET" },
  { key: "environment", label: "BC Environment", envVar: "BC_ENVIRONMENT" },
  { key: "companyId", label: "BC Company ID", envVar: "BC_COMPANY_ID" },
  { key: "apiBaseUrl", label: "API Base URL", envVar: "BC_API_BASE_URL" },
];

const actionColors: Record<string, string> = {
  SYNC_START: "text-blue-400", SYNC_SUCCESS: "text-emerald-600",
  SYNC_ERROR: "text-red-600", SYNC_SKIP: "text-slate-400",
};

export default function IntegrationsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch("/api/admin/integrations");
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  };

  const testConnection = async () => {
    setTesting(true); setTestResult(null);
    try {
      const res = await fetch("/api/admin/integrations/test", { method: "POST" });
      const json = await res.json();
      setTestResult({ ok: json.success, message: json.message || json.error });
    } catch {
      setTestResult({ ok: false, message: "Lỗi kết nối" });
    }
    setTesting(false);
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;
  if (!data) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Không thể tải dữ liệu</div>;

  const isConfigured = data.connectionStatus === "ready";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00321B]">Tích hợp API</h1>
        <p className="text-[#6B6B6B] mt-1">Quản lý kết nối với Dynamics 365 Business Central</p>
      </div>

      {/* Connection Status */}
      <div className={`border rounded-2xl p-6 mb-6 ${isConfigured ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isConfigured ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
              <div className={`w-3 h-3 rounded-full ${isConfigured ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
            </div>
            <div>
              <h3 className="text-[#00321B] font-semibold">Dynamics 365 Business Central</h3>
              <p className={`text-sm ${isConfigured ? "text-emerald-600" : "text-amber-600"}`}>
                {isConfigured ? "Đã cấu hình — sẵn sàng kết nối" : "Chưa cấu hình đầy đủ"}
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={testConnection} disabled={testing || !isConfigured}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[#00321B] text-sm font-medium hover:bg-white/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {testing ? "Đang kiểm tra..." : "🔗 Kiểm tra kết nối"}
            </button>
          </div>
        </div>

        {testResult && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm ${testResult.ok ? "bg-emerald-50 text-emerald-600 border border-emerald-500/20" : "bg-red-50 text-red-600 border border-red-500/20"}`}>
            {testResult.ok ? "✅ " : "❌ "}{testResult.message}
          </div>
        )}
      </div>

      {/* Config Table */}
      <div className="bg-white border border-green-100 shadow-sm rounded-2xl p-6 mb-6">
        <h3 className="text-[#00321B] font-semibold mb-4">Cấu hình kết nối</h3>
        <p className="text-gray-400 text-xs mb-4">Các giá trị được cấu hình qua biến môi trường trong file <code className="text-slate-400">.env.local</code></p>

        <div className="space-y-3">
          {configFields.map((f) => {
            const value = data.bcConfig[f.key];
            const isSet = value === "configured" || (value && value !== "not set" && value !== "missing");
            return (
              <div key={f.key} className="flex items-center justify-between py-2 border-b border-green-100/50 last:border-0">
                <div>
                  <p className="text-[#00321B] text-sm font-medium">{f.label}</p>
                  <p className="text-gray-400 text-xs font-mono">{f.envVar}</p>
                </div>
                <div className="flex items-center gap-2">
                  {f.key === "apiBaseUrl" || f.key === "environment" ? (
                    <span className="text-[#00321B] text-sm font-mono">{value}</span>
                  ) : (
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${isSet ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                      {isSet ? "✓ Đã cấu hình" : "✗ Chưa cấu hình"}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sync Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {syncModules.map((mod) => {
          const stats = data.syncStats[mod.key] || { synced: 0, total: 0 };
          const pct = stats.total > 0 ? Math.round((stats.synced / stats.total) * 100) : 0;
          return (
            <div key={mod.key} className="bg-white border border-green-100 shadow-sm rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={mod.icon} />
                </svg>
                <span className="text-[#00321B] text-sm font-semibold">{mod.label}</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-2xl font-bold text-[#00321B]">{stats.synced}</span>
                <span className="text-gray-400 text-xs">/ {stats.total} bản ghi</span>
              </div>
              <div className="h-1.5 bg-green-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : pct > 0 ? "bg-blue-500" : "bg-slate-700"}`} style={{ width: `${pct}%` }} />
              </div>
              <p className="text-gray-400 text-xs mt-1.5">{pct}% đồng bộ</p>
            </div>
          );
        })}
      </div>

      {/* Sync Logs */}
      <div className="bg-white border border-green-100 shadow-sm rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-green-100">
          <h3 className="text-[#00321B] font-semibold">Nhật ký đồng bộ gần đây</h3>
        </div>
        {data.recentSyncLogs.length === 0 ? (
          <div className="px-6 py-12 text-center text-[#6B6B6B]">
            Chưa có lịch sử đồng bộ nào. Hãy cấu hình kết nối BC để bắt đầu đồng bộ dữ liệu.
          </div>
        ) : (
          <div className="divide-y divide-green-50">
            {data.recentSyncLogs.map((log: any) => (
              <div key={log.id} className="px-6 py-3 flex items-center justify-between hover:bg-[#f8ffef]/60 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-bold uppercase ${actionColors[log.action] || "text-slate-400"}`}>{log.action}</span>
                  <span className="text-[#00321B] text-sm">{log.description}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-400 text-xs">{log.user?.fullName || "System"}</span>
                  <span className="text-gray-400 text-xs">{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
