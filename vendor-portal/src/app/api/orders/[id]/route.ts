import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/orders/:id
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;

  const po = await prisma.purchaseOrder.findUnique({
    where: { id },
    include: {
      vendor: { select: { id: true, companyName: true } },
      creator: { select: { fullName: true } },
      items: {
        include: { product: { select: { id: true, name: true, sku: true, unit: true } } },
      },
      asns: {
        include: { creator: { select: { fullName: true } }, approver: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
      goodsReceipts: {
        include: { receiver: { select: { fullName: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (user.side === "vendor" && po.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({ success: true, data: po });
}

// PATCH /api/orders/:id — Update PO status / vendor response
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const user = session.user as any;
  const body = await request.json();

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Vendor response (confirm/reject/propose modification)
  if (body.vendorResponse && user.side === "vendor") {
    const data: any = {
      vendorResponse: body.vendorResponse,
      vendorResponseAt: new Date(),
      vendorResponseNotes: body.vendorResponseNotes || null,
      status: body.vendorResponse === "confirmed" ? "confirmed" : body.vendorResponse === "rejected" ? "rejected" : "modification_requested",
    };
    if (body.vendorProposedQty) data.vendorProposedQty = body.vendorProposedQty;
    if (body.vendorProposedDate) data.vendorProposedDate = new Date(body.vendorProposedDate);

    const updated = await prisma.purchaseOrder.update({ where: { id }, data });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "VENDOR_RESPONSE", module: "orders", resource: "purchase_orders", resourceId: id, description: `Vendor ${body.vendorResponse} PO ${po.poNumber}` },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  // Supermarket status change
  if (body.status && user.side === "supermarket") {
    const updated = await prisma.purchaseOrder.update({ where: { id }, data: { status: body.status } });
    await prisma.auditLog.create({
      data: { userId: user.id, action: "STATUS_CHANGE", module: "orders", resource: "purchase_orders", resourceId: id, oldValue: { status: po.status }, newValue: { status: body.status }, description: `Changed PO ${po.poNumber} status to ${body.status}` },
    });
    return NextResponse.json({ success: true, data: updated });
  }

  return NextResponse.json({ error: "No valid action" }, { status: 400 });
}
