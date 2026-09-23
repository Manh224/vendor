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
    data: users.map((u) => ({
      id: u.id,
      email: u.email,
      fullName: u.fullName,
      phone: u.phone,
      side: u.side,
      role: u.role.displayName,
      roleName: u.role.name,
      vendorName: u.vendor?.companyName || null,
      isActive: u.isActive,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
  });
}

// POST /api/admin/users — Create a new user (supermarket side)
export async function POST(request: Request) {
  const session = await auth();
  if (!session || (session.user as any)?.role !== "supermarket_admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const body = await request.json();
  const { email, fullName, phone, roleName, password } = body;

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

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      email,
      fullName,
      phone,
      passwordHash,
      roleId: role.id,
      side: role.side,
      isActive: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user?.id,
      action: "CREATE",
      module: "admin",
      resource: "users",
      resourceId: user.id,
      description: `Admin created user ${email} with role ${roleName}`,
    },
  });

  return NextResponse.json({ success: true, data: { id: user.id } }, { status: 201 });
}
