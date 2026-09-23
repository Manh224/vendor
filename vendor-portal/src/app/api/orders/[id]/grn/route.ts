import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// POST /api/orders/:id/grn — Create GRN (warehouse/supermarket)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "supermarket") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { grnNumber, asnId, receiptStatus, notes, items } = body;

  if (!grnNumber) {
    return NextResponse.json({ error: "Số GRN là bắt buộc" }, { status: 400 });
  }

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: { items: true },
  });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const grn = await prisma.goodsReceipt.create({
    data: {
      purchaseOrderId: id,
      vendorId: po.vendorId,
      asnId: asnId || null,
      grnNumber,
      receiptStatus: receiptStatus || "full",
      notes,
      receivedBy: user.id,
    },
  });

  // Update PO item quantities if provided
  if (items?.length) {
    for (const item of items) {
      await prisma.purchaseOrderItem.update({
        where: { id: item.poItemId },
        data: {
          actualReceivedQty: { increment: item.receivedQty || 0 },
          damagedQty: { increment: item.damagedQty || 0 },
          shortageQty: { increment: item.shortageQty || 0 },
        },
      });
    }
  }

  // Update PO status
  await prisma.purchaseOrder.update({
    where: { id },
    data: { status: receiptStatus === "partial" ? "partially_received" : "received" },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "CREATE", module: "orders", resource: "goods_receipts", resourceId: grn.id, description: `Created GRN ${grnNumber} for PO ${po.poNumber}` },
  });

  return NextResponse.json({ success: true, data: grn }, { status: 201 });
}
