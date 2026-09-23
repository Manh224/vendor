"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const rankingColors: Record<string, { bg: string; text: string; border: string }> = {
  A: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-200" },
  B: { bg: "bg-[#067643]/10", text: "text-[#067643]", border: "border-[#067643]/20" },
  C: { bg: "bg-amber-50", text: "text-amber-600", border: "border-amber-200" },
  D: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200" },
};

export default function PerformancePage() {
  const { data: session } = useSession();
  const user = session?.user as any;
  const isVendor = user?.side === "vendor";

  const [scores, setScores] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchScores(); }, []); // eslint-disable-line

  const fetchScores = async () => {
    setLoading(true);
    const res = await fetch("/api/performance");
    const json = await res.json();
    if (json.success) setScores(json.data);
    setLoading(false);
  };

  // Group by vendor for ranking view
  const latestByVendor = scores.reduce((acc: Record<string, any>, s: any) => {
    if (!acc[s.vendorId] || s.period > acc[s.vendorId].period) acc[s.vendorId] = s;
    return acc;
  }, {});
  const ranked = Object.values(latestByVendor).sort((a: any, b: any) => Number(b.totalScore || 0) - Number(a.totalScore || 0));

  const myScores = isVendor ? scores.sort((a: any, b: any) => b.period.localeCompare(a.period)) : [];

  const renderScoreBar = (score: number | null, max: number = 100) => {
    const pct = score ? (score / max) * 100 : 0;
    return (
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-green-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-[#067643]" : pct >= 60 ? "bg-[#FF9811]" : "bg-red-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <span className="text-sm font-mono text-[#00321B] w-10 text-right">{score != null ? Number(score).toFixed(0) : "—"}</span>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center py-20 text-[#6B6B6B]">Đang tải...</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#00321B]">Hiệu suất & KPI</h1>
        <p className="text-[#6B6B6B] mt-1">{isVendor ? "Chỉ số hiệu suất của bạn" : "Bảng xếp hạng và đánh giá NCC"}</p>
      </div>

      {isVendor ? (
        <div className="space-y-6">
          {myScores.length === 0 ? (
            <div className="bg-white border border-green-100 rounded-2xl p-12 text-center text-[#6B6B6B] shadow-sm">Chưa có dữ liệu KPI</div>
          ) : myScores.map((s: any) => {
            const rc = rankingColors[s.ranking] || rankingColors.C;
            return (
              <div key={s.id} className="bg-white border border-green-100 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[#00321B] font-semibold">Kỳ: {s.period}</h3>
                  <div className="flex items-center gap-3">
                    <span className="text-[#6B6B6B] text-sm">Tổng điểm:</span>
                    <span className="text-2xl font-bold text-[#00321B]">{s.totalScore ? Number(s.totalScore).toFixed(1) : "—"}</span>
                    <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-lg font-bold ${rc.bg} ${rc.text} border ${rc.border}`}>{s.ranking || "—"}</span>
                  </div>
                </div>
                {s.details && s.details.length > 0 && (
                  <div className="space-y-4">
                    {s.details.map((d: any) => (
                      <div key={d.id}>
                        <div className="flex justify-between mb-1"><span className="text-[#6B6B6B] text-sm">{d.kpiDefinition?.name || "KPI"}</span></div>
                        {renderScoreBar(d.weightedScore ? Number(d.weightedScore) : null)}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-green-100 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full">
            <thead><tr className="border-b border-green-100 bg-[#f8ffef]">
              <th className="text-center px-6 py-4 text-xs font-semibold text-[#067643] uppercase w-16">#</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">NCC</th>
              <th className="text-center px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Xếp hạng</th>
              <th className="text-right px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Tổng điểm</th>
              <th className="text-left px-6 py-4 text-xs font-semibold text-[#067643] uppercase">Kỳ</th>
            </tr></thead>
            <tbody className="divide-y divide-green-50">
              {ranked.length === 0 ? <tr><td colSpan={5} className="px-6 py-12 text-center text-[#6B6B6B]">Chưa có dữ liệu KPI</td></tr>
              : ranked.map((s: any, i: number) => {
                const rc = rankingColors[s.ranking] || rankingColors.C;
                return (
                  <tr key={s.id} className="hover:bg-[#f8ffef]/60 transition-colors">
                    <td className="px-6 py-4 text-center"><span className={`text-sm font-bold ${i < 3 ? "text-[#FF9811]" : "text-gray-400"}`}>{i + 1}</span></td>
                    <td className="px-6 py-4 text-[#00321B] text-sm font-medium">{s.vendor.companyName}</td>
                    <td className="px-6 py-4 text-center"><span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold ${rc.bg} ${rc.text}`}>{s.ranking || "—"}</span></td>
                    <td className="px-6 py-4 text-[#00321B] text-sm text-right font-bold">{s.totalScore ? Number(s.totalScore).toFixed(1) : "—"}</td>
                    <td className="px-6 py-4 text-[#6B6B6B] text-sm">{s.period}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
