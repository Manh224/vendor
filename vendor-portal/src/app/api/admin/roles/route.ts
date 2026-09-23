import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "supermarket_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const roles = await prisma.role.findMany({
    include: {
      rolePermissions: {
        include: { permission: true },
      },
      _count: { select: { users: true } },
    },
    orderBy: { name: "asc" },
  });

  // Also return all available permissions for the edit UI
  const permissions = await prisma.permission.findMany({
    orderBy: [{ module: "asc" }, { action: "asc" }],
  });

  return NextResponse.json({ success: true, data: { roles, permissions } });
}

// PUT /api/admin/roles — Update permissions for a role
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "supermarket_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { roleId, permissionIds } = body;

  if (!roleId || !Array.isArray(permissionIds)) {
    return NextResponse.json({ error: "Thiếu thông tin" }, { status: 400 });
  }

  // Only allow editing vendor_admin role permissions
  const targetRole = await prisma.role.findUnique({ where: { id: roleId } });
  if (!targetRole) {
    return NextResponse.json({ error: "Vai trò không tồn tại" }, { status: 404 });
  }
  if (targetRole.name === "supermarket_admin") {
    return NextResponse.json({ error: "Không thể chỉnh sửa quyền hạn của vai trò Quản trị viên" }, { status: 403 });
  }

  // Delete existing permissions and recreate
  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (permissionIds.length > 0) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permissionId: string) => ({
        roleId,
        permissionId,
      })),
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: session.user?.id,
      action: "UPDATE",
      module: "admin",
      resource: "roles",
      resourceId: roleId,
      description: `Admin cập nhật ${permissionIds.length} quyền hạn cho vai trò ${targetRole.displayName}`,
    },
  });

  // Return updated role
  const updatedRole = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { users: true } },
    },
  });

  return NextResponse.json({ success: true, data: updatedRole });
}
