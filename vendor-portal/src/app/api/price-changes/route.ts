import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/price-changes
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status");

  const where: any = {};
  if (user.side === "vendor") where.vendorId = user.vendorId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.priceChangeRequest.findMany({
      where,
      include: {
        product: { select: { id: true, name: true, sku: true } },
        vendor: { select: { id: true, companyName: true } },
        reviewer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.priceChangeRequest.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/price-changes — Create price change request (vendor)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "vendor") {
    return NextResponse.json({ error: "Only vendors can request price changes" }, { status: 403 });
  }

  const body = await request.json();
  const { productId, proposedPrice, reason, effectiveDate } = body;

  if (!productId || !proposedPrice || !reason || !effectiveDate) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId, vendorId: user.vendorId, deletedAt: null } });
  if (!product) {
    return NextResponse.json({ error: "Sản phẩm không tồn tại" }, { status: 404 });
  }

  const currentPrice = product.currentPrice ? Number(product.currentPrice) : 0;
  const changePct = currentPrice > 0 ? ((proposedPrice - currentPrice) / currentPrice * 100) : null;

  const pcr = await prisma.priceChangeRequest.create({
    data: {
      vendorId: user.vendorId,
      productId,
      currentPrice,
      proposedPrice,
      priceChangePct: changePct,
      reason,
      effectiveDate: new Date(effectiveDate),
      status: "pending",
      createdBy: user.id,
    },
  });

  return NextResponse.json({ success: true, data: pcr }, { status: 201 });
}
