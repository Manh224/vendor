import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import bcrypt from "bcryptjs";

// GET /api/admin/users — List all users
export async function GET() {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "supermarket_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { deletedAt: null },
    include: { role: true, vendor: { select: { id: true, companyName: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: users.map((u: any) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      side: u.side,
      role: u.role?.displayName || u.role,
      roleName: u.role?.name || u.roleName,
      vendorName: u.vendor?.companyName || null,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
  });
}

// POST /api/admin/users — Create a new user
export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "supermarket_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { email, fullName, phone, roleName, vendorId, password } = body;

    if (!email || !fullName || !roleName || !password) {
      return NextResponse.json(
        { error: "Vui lòng điền đầy đủ thông tin" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email đã tồn tại" }, { status: 409 });
    }

    const role = await prisma.role.findUnique({ where: { name: roleName } });
    if (!role) {
      return NextResponse.json({ error: "Vai trò không hợp lệ" }, { status: 400 });
    }

    // Vendor side users must have a vendorId
    if (role.side === "vendor" && !vendorId) {
      return NextResponse.json({ error: "Vui lòng chọn Nhà cung cấp" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        fullName,
        phone,
        passwordHash,
        roleId: role.id,
        side: role.side,
        vendorId: role.side === "vendor" ? vendorId : null,
        isActive: true,
      },
    });

    // Audit log (non-blocking)
    try {
      const adminUser = await prisma.user.findUnique({ where: { id: session.user?.id as string } });
      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            userId: adminUser.id,
            action: "CREATE",
            module: "admin",
            resource: "users",
            resourceId: user.id,
            description: `Admin created user ${email} with role ${roleName}`,
          },
        });
      }
    } catch (auditErr) {
      console.warn("Audit log failed (non-blocking):", auditErr);
    }

    return NextResponse.json({ success: true, data: { id: user.id } }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/admin/users error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// DELETE /api/admin/users — Soft-delete a user
export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "supermarket_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "Thiếu userId" }, { status: 400 });
    }

    // Prevent admin from deleting themselves
    if (userId === session.user?.id) {
      return NextResponse.json({ error: "Không thể xóa chính mình" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
    if (!targetUser || targetUser.deletedAt) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    // Prevent deleting other supermarket_admin accounts
    if ((targetUser.role as any)?.name === "supermarket_admin") {
      return NextResponse.json({ error: "Không thể xóa tài khoản Quản trị viên siêu thị" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), isActive: false },
    });

    // Audit log (non-blocking)
    try {
      const adminUser = await prisma.user.findUnique({ where: { id: session.user?.id as string } });
      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            userId: adminUser.id,
            action: "DELETE",
            module: "admin",
            resource: "users",
            resourceId: userId,
            description: `Admin xóa tài khoản ${targetUser.email}`,
          },
        });
      }
    } catch (auditErr) {
      console.warn("Audit log failed (non-blocking):", auditErr);
    }

    return NextResponse.json({ success: true, data: { id: userId } });
  } catch (error: any) {
    console.error("DELETE /api/admin/users error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

// PATCH /api/admin/users — Toggle user active status (suspend/reactivate)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "supermarket_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, isActive } = body;

    if (!userId || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
    }

    // Prevent admin from suspending themselves
    if (userId === session.user?.id) {
      return NextResponse.json({ error: "Không thể tạm dừng chính mình" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.deletedAt) {
      return NextResponse.json({ error: "Tài khoản không tồn tại" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: userId },
      data: { isActive },
    });

    // Audit log — wrapped separately so it doesn't block the main operation
    try {
      // Verify the admin user still exists in DB (JWT may have stale ID after re-seed)
      const adminUser = await prisma.user.findUnique({ where: { id: session.user?.id as string } });
      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            userId: adminUser.id,
            action: isActive ? "REACTIVATE" : "SUSPEND",
            module: "admin",
            resource: "users",
            resourceId: userId,
            description: `Admin ${isActive ? "kích hoạt lại" : "tạm dừng"} tài khoản ${targetUser.email}`,
          },
        });
      }
    } catch (auditErr) {
      console.warn("Audit log failed (non-blocking):", auditErr);
    }

    return NextResponse.json({ success: true, data: { id: userId, isActive } });
  } catch (error: any) {
    console.error("PATCH /api/admin/users error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
