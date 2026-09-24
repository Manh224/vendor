"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Pre-validate to get specific error codes
      const validateRes = await fetch("/api/auth/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!validateRes.ok) {
        const data = await validateRes.json();
        if (data.error === "ACCOUNT_SUSPENDED") {
          setError("Tài khoản của bạn đang bị vô hiệu. Vui lòng liên hệ Pavelmart để được hỗ trợ");
        } else {
          setError("Tài khoản/ mật khẩu không đúng");
        }
        setLoading(false);
        return;
      }

      // Credentials valid — proceed with NextAuth signIn
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Tài khoản/ mật khẩu không đúng");
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Đã xảy ra lỗi. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
      {/* Header */}
      <div className="text-center mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://raw.githubusercontent.com/Manh224/vendor/refs/heads/main/vendor-portal/public/logo-pavelmart.png"
          alt="Pavel Mart"
          className="h-12 mx-auto mb-4"
        />
        <p className="text-white/60 mt-1">Đăng nhập Vendor Portal</p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/15 border border-red-400/30 text-red-200 text-sm text-center">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="name@company.com"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF9811]/60 focus:border-[#FF9811]/60 transition-all"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-2">
            Mật khẩu
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#FF9811]/60 focus:border-[#FF9811]/60 transition-all"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#FF9811] to-[#E07B00] text-white font-semibold hover:from-[#ffab3d] hover:to-[#FF9811] focus:outline-none focus:ring-2 focus:ring-[#FF9811]/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/30"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Đang đăng nhập...
            </span>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>

      {/* Register link */}
      <div className="mt-6 text-center">
        <p className="text-white/60 text-sm">
          Chưa có tài khoản?{" "}
          <Link href="/register" className="text-[#FF9811] hover:text-[#ffab3d] font-medium transition-colors">
            Đăng ký NCC
          </Link>
        </p>
      </div>
    </div>
  );
}
