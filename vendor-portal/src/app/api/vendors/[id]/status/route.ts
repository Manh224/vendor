import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// Valid status transitions
const validTransitions: Record<string, string[]> = {
  pending_registration: ["pending_review"],
  pending_review: ["approved", "requires_supplement", "terminated"],
  requires_supplement: ["pending_review"],
  approved: ["contract_signing"],
  contract_signing: ["active"],
  active: ["suspended"],
  suspended: ["active", "terminated"],
};

// PATCH /api/vendors/:id/status — Change vendor status
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  // Only supermarket side can change vendor status
  if (user.side !== "supermarket") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status: newStatus, notes } = body;

  if (!newStatus) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 });
  }

  const vendor = await prisma.vendor.findUnique({ where: { id, deletedAt: null } });
  if (!vendor) {
    return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
  }

  // Validate transition
  const allowed = validTransitions[vendor.status];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Không thể chuyển từ "${vendor.status}" sang "${newStatus}"` },
      { status: 400 }
    );
  }

  const updated = await prisma.vendor.update({
    where: { id },
    data: {
      status: newStatus,
      statusChangedAt: new Date(),
      statusChangedBy: user.id,
      statusNotes: notes || null,
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "STATUS_CHANGE",
      module: "vendors",
      resource: "vendors",
      resourceId: id,
      oldValue: { status: vendor.status },
      newValue: { status: newStatus },
      description: `Changed vendor "${vendor.companyName}" status: ${vendor.status} → ${newStatus}${notes ? ` (${notes})` : ""}`,
    },
  });

  return NextResponse.json({ success: true, data: updated });
}
