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
