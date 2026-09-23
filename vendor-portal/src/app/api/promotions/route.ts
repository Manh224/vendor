import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/promotions
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
    prisma.promotion.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true } },
        reviewer: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.promotion.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/promotions
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "vendor") {
    return NextResponse.json({ error: "Only vendors can create promotions" }, { status: 403 });
  }

  const body = await request.json();
  const { title, promotionType, description, startDate, endDate, productIds, discountValue, promoPrice, estimatedQty, committedStock, giftDescription } = body;

  if (!title || !promotionType || !startDate || !endDate) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const promo = await prisma.promotion.create({
    data: {
      vendorId: user.vendorId,
      title,
      promotionType,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      productIds: productIds || [],
      discountValue,
      promoPrice,
      estimatedQty,
      committedStock,
      giftDescription,
      status: "pending",
      createdBy: user.id,
    },
  });

  return NextResponse.json({ success: true, data: promo }, { status: 201 });
}
