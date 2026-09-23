import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "vietnamese"],
});

export const metadata: Metadata = {
  title: "Pavel Mart — Vendor Portal",
  description: "Hệ thống quản lý nhà cung cấp cho siêu thị Pavel Mart. Quản lý hồ sơ, sản phẩm, đơn hàng, tài chính và hiệu suất.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#f0f7e6] text-[#00321B]">{children}</body>
    </html>
  );
}
