import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "supermarket_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const tenantId = process.env.BC_TENANT_ID;
  const clientId = process.env.BC_CLIENT_ID;
  const clientSecret = process.env.BC_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    return NextResponse.json({
      success: false,
      error: "Thiếu cấu hình BC. Vui lòng cấu hình BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET trong .env.local",
    });
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "https://api.businesscentral.dynamics.com/.default",
      }),
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: "Kết nối thành công! Token OAuth2 đã được lấy từ Azure AD.",
      });
    } else {
      const error = await response.text();
      return NextResponse.json({
        success: false,
        error: `Xác thực thất bại (${response.status}): ${error.substring(0, 200)}`,
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: `Lỗi kết nối: ${err.message}`,
    });
  }
}
