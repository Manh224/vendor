import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/orders — List purchase orders
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status");
  const search = sp.get("search");
  const isReturn = sp.get("isReturn");

  const where: any = {};
  if (user.side === "vendor") where.vendorId = user.vendorId;
  if (status) where.status = status;
  if (isReturn !== null && isReturn !== undefined) where.isReturnOrder = isReturn === "true";
  if (search) {
    where.OR = [
      { poNumber: { contains: search, mode: "insensitive" } },
      { vendor: { companyName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true } },
        invoices: { select: { id: true, invoiceNumber: true } },
        _count: { select: { items: true, asns: true, goodsReceipts: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.purchaseOrder.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/orders — Create PO (supermarket)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "supermarket") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { vendorId, poNumber, expectedDeliveryDate, deliveryLocation, items, isReturnOrder, returnReason } = body;

  if (!vendorId || !poNumber || !items?.length) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const totalAmount = items.reduce((sum: number, item: any) => sum + item.orderedQty * item.unitPrice, 0);

  const po = await prisma.purchaseOrder.create({
    data: {
      vendorId,
      poNumber,
      isReturnOrder: isReturnOrder || false,
      returnReason,
      expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
      deliveryLocation,
      totalAmount,
      status: "new",
      createdBy: user.id,
      items: {
        create: items.map((item: any) => ({
          productId: item.productId,
          orderedQty: item.orderedQty,
          unitPrice: item.unitPrice,
          lineTotal: item.orderedQty * item.unitPrice,
        })),
      },
    },
  });

  await prisma.auditLog.create({
    data: { userId: user.id, action: "CREATE", module: "orders", resource: "purchase_orders", resourceId: po.id, description: `Created PO ${poNumber}` },
  });

  return NextResponse.json({ success: true, data: po }, { status: 201 });
}
