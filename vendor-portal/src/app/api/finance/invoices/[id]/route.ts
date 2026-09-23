import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, companyName: true, taxCode: true, email: true, phone: true } },
      purchaseOrder: {
        select: {
          id: true,
          poNumber: true,
          status: true,
          totalAmount: true,
          orderDate: true,
          expectedDeliveryDate: true,
          vendor: { select: { companyName: true } },
          _count: { select: { items: true } },
        },
      },
      items: {
        include: {
          product: { select: { id: true, name: true, sku: true, barcodes: true } },
          poItem: {
            select: {
              id: true,
              orderedQty: true,
              actualReceivedQty: true,
              purchaseOrder: { select: { poNumber: true } },
            },
          },
        },
      },
      creator: { select: { fullName: true, email: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: "Không tìm thấy hóa đơn" }, { status: 404 });
  }

  // Vendor users can only see their own invoices
  if (user.side === "vendor" && invoice.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Also fetch related POs through invoice items (indirect relationship)
  const poItemIds = invoice.items
    .filter((item) => item.poItemId)
    .map((item) => item.poItemId as string);

  let relatedOrders: any[] = [];
  if (poItemIds.length > 0) {
    relatedOrders = await prisma.purchaseOrder.findMany({
      where: {
        items: { some: { id: { in: poItemIds } } },
      },
      select: {
        id: true,
        poNumber: true,
        status: true,
        totalAmount: true,
        orderDate: true,
        expectedDeliveryDate: true,
        _count: { select: { items: true } },
      },
      distinct: ["id"],
    });
  }

  // Include direct purchaseOrder if exists and not already in relatedOrders
  if (invoice.purchaseOrder) {
    const exists = relatedOrders.some((po) => po.id === invoice.purchaseOrder!.id);
    if (!exists) {
      relatedOrders.unshift(invoice.purchaseOrder);
    }
  }

  return NextResponse.json({
    success: true,
    data: { ...invoice, relatedOrders },
  });
}
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
