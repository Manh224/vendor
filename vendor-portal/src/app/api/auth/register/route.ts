import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import prisma from "@/lib/db/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { companyName, taxCode, email, password, fullName, phone } = body;

    // Validation
    if (!companyName || !taxCode || !email || !password || !fullName) {
      return NextResponse.json(
        { success: false, error: "Vui lòng điền đầy đủ thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // Check duplicate email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "Email đã được sử dụng" },
        { status: 409 }
      );
    }

    // Check duplicate tax code
    const existingVendor = await prisma.vendor.findUnique({ where: { taxCode } });
    if (existingVendor) {
      return NextResponse.json(
        { success: false, error: "Mã số thuế đã tồn tại trong hệ thống" },
        { status: 409 }
      );
    }

    // Get vendor_admin role
    const vendorAdminRole = await prisma.role.findUnique({
      where: { name: "vendor_admin" },
    });
    if (!vendorAdminRole) {
      return NextResponse.json(
        { success: false, error: "Lỗi hệ thống: Không tìm thấy vai trò NCC" },
        { status: 500 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create vendor + user in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create vendor
      const vendor = await tx.vendor.create({
        data: {
          companyName,
          taxCode,
          email,
          phone,
          status: "pending_registration",
        },
      });

      // Create user (inactive by default, admin must activate)
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          fullName,
          phone,
          roleId: vendorAdminRole.id,
          vendorId: vendor.id,
          side: "vendor",
          isActive: false,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: user.id,
          action: "CREATE",
          module: "vendors",
          resource: "vendors",
          resourceId: vendor.id,
          description: `Vendor "${companyName}" registered with admin user ${email}`,
        },
      });

      return { vendor, user };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Đăng ký thành công! Tài khoản đang chờ admin kích hoạt. Bạn sẽ nhận thông báo khi tài khoản được duyệt.",
        data: {
          vendorId: result.vendor.id,
          userId: result.user.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { success: false, error: "Đã xảy ra lỗi. Vui lòng thử lại sau." },
      { status: 500 }
    );
  }
}
