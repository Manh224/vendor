"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    companyName: "",
    taxCode: "",
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Mật khẩu xác nhận không khớp");
      return;
    }

    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Đã xảy ra lỗi");
        return;
      }

      router.push("/login?registered=true");
    } catch {
      setError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF9811]/60 focus:border-[#FF9811]/60 transition-all text-sm";

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#FF9811] to-[#E07B00] mb-4 shadow-lg shadow-orange-500/25">
          <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white">Đăng ký NCC</h1>
        <p className="text-white/60 mt-1 text-sm">Tạo tài khoản Nhà cung cấp mới</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company info */}
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Tên công ty <span className="text-[#FF9811]">*</span>
            </label>
            <input
              id="company-name"
              type="text"
              value={form.companyName}
              onChange={(e) => updateField("companyName", e.target.value)}
              required
              placeholder="Công ty TNHH ABC"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Mã số thuế <span className="text-[#FF9811]">*</span>
            </label>
            <input
              id="tax-code"
              type="text"
              value={form.taxCode}
              onChange={(e) => updateField("taxCode", e.target.value)}
              required
              placeholder="0123456789"
              className={inputClass}
            />
          </div>
        </div>

        {/* Contact */}
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">
            Họ và tên người liên hệ <span className="text-[#FF9811]">*</span>
          </label>
          <input
            id="full-name"
            type="text"
            value={form.fullName}
            onChange={(e) => updateField("fullName", e.target.value)}
            required
            placeholder="Nguyễn Văn A"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Email <span className="text-[#FF9811]">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
              required
              placeholder="email@company.com"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Số điện thoại
            </label>
            <input
              id="phone"
              type="tel"
              value={form.phone}
              onChange={(e) => updateField("phone", e.target.value)}
              placeholder="0901234567"
              className={inputClass}
            />
          </div>
        </div>

        {/* Password */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Mật khẩu <span className="text-[#FF9811]">*</span>
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              required
              placeholder="Tối thiểu 8 ký tự"
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Xác nhận <span className="text-[#FF9811]">*</span>
            </label>
            <input
              id="confirm-password"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => updateField("confirmPassword", e.target.value)}
              required
              placeholder="Nhập lại mật khẩu"
              className={inputClass}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF9811] to-[#E07B00] text-white font-semibold hover:from-[#ffab3d] hover:to-[#FF9811] focus:outline-none focus:ring-2 focus:ring-[#FF9811]/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/30 mt-2"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang xử lý...
            </span>
          ) : (
            "Đăng ký"
          )}
        </button>
      </form>

      <div className="mt-5 text-center">
        <p className="text-white/60 text-sm">
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-[#FF9811] hover:text-[#ffab3d] font-medium transition-colors">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}
