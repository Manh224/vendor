import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;
  const body = await request.json();
  const { status, paymentStatus, paymentDate, paymentAmount, paymentReference } = body;

  const data: any = {};
  if (status) data.status = status;
  if (paymentStatus) {
    data.paymentStatus = paymentStatus;
    if (paymentDate) data.paymentDate = new Date(paymentDate);
    if (paymentAmount) data.paymentAmount = paymentAmount;
    if (paymentReference) data.paymentReference = paymentReference;
  }

  const updated = await prisma.invoice.update({ where: { id }, data });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "STATUS_CHANGE", module: "finance", resource: "invoices", resourceId: id, description: `Invoice status changed to ${status || paymentStatus}` },
  });

  return NextResponse.json({ success: true, data: updated });
}
