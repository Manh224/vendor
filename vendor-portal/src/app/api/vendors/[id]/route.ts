import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/vendors/:id — Vendor detail
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  // Vendor side: can only view their own vendor
  if (user.side === "vendor" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({
    where: { id, deletedAt: null },
    include: {
      contacts: { orderBy: { isPrimary: "desc" } },
      documents: {
        include: { documentType: true, reviewer: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
      contracts: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
      },
      users: {
        where: { deletedAt: null },
        select: { id: true, fullName: true, email: true, phone: true, isActive: true },
      },
      createdByUser: { select: { fullName: true } },
      statusChangedByUser: { select: { fullName: true } },
    },
  });

  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: vendor });
}

// PATCH /api/vendors/:id — Update vendor info
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  // Vendor side: can only edit their own vendor
  if (user.side === "vendor" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Vendor side: only allow editing in certain statuses
  const vendorEditableStatuses = ["pending_registration", "requires_supplement", "active"];
  if (user.side === "vendor" && !vendorEditableStatuses.includes(vendor.status)) {
    return NextResponse.json(
      { error: "Không thể chỉnh sửa hồ sơ ở trạng thái hiện tại" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const allowedFields = [
    "companyName", "address", "city", "district", "ward",
    "phone", "email", "website",
    "bankName", "bankBranch", "bankAccountNo", "bankAccountName",
  ];

  const data: any = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      data[field] = body[field];
    }
  }

  const updated = await prisma.vendor.update({ where: { id }, data });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "UPDATE",
      module: "vendors",
      resource: "vendors",
      resourceId: id,
      description: `Updated vendor info for "${updated.companyName}"`,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}

// DELETE /api/vendors/:id — Soft-delete a vendor (supermarket_admin only, pending statuses only)
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session || (session.user as any)?.role !== "supermarket_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
    if (!vendor) {
      return NextResponse.json({ error: "Nhà cung cấp không tồn tại" }, { status: 404 });
    }

    const deletableStatuses = ["pending_registration", "pending_review"];
    if (!deletableStatuses.includes(vendor.status)) {
      return NextResponse.json(
        { error: "Chỉ có thể xóa NCC ở trạng thái Chờ đăng ký hoặc Chờ duyệt" },
        { status: 400 }
      );
    }

    await prisma.vendor.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Audit log (non-blocking)
    try {
      const adminUser = await prisma.user.findUnique({
        where: { id: session.user?.id as string },
      });
      if (adminUser) {
        await prisma.auditLog.create({
          data: {
            userId: adminUser.id,
            action: "DELETE",
            module: "vendors",
            resource: "vendors",
            resourceId: id,
            description: `Admin xóa nhà cung cấp "${vendor.companyName}" (${vendor.taxCode})`,
          },
        });
      }
    } catch (auditErr) {
      console.warn("Audit log failed (non-blocking):", auditErr);
    }

    return NextResponse.json({ success: true, data: { id } });
  } catch (error: any) {
    console.error("DELETE /api/vendors/:id error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
