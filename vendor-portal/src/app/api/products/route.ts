import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/products — List products
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status");
  const search = sp.get("search");
  const vendorId = sp.get("vendorId");
  const categoryId = sp.get("categoryId");

  const where: any = { deletedAt: null };

  if (user.side === "vendor") {
    where.vendorId = user.vendorId;
  } else if (vendorId) {
    where.vendorId = vendorId;
  }

  if (status) where.status = status;
  if (categoryId) where.categoryId = categoryId;

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true } },
        category: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items: products, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

// POST /api/products — Create product (vendor side)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  if (user.side !== "vendor") {
    return NextResponse.json({ error: "Only vendors can create products" }, { status: 403 });
  }

  const body = await request.json();
  const { name, sku, description, categoryId, unit, packSize, weight, shelfLifeDays, currentPrice, barcodes, images } = body;

  if (!name) {
    return NextResponse.json({ error: "Tên sản phẩm là bắt buộc" }, { status: 400 });
  }

  if (sku) {
    const existing = await prisma.product.findUnique({ where: { sku } });
    if (existing) {
      return NextResponse.json({ error: "Mã SKU đã tồn tại" }, { status: 409 });
    }
  }

  const product = await prisma.product.create({
    data: {
      vendorId: user.vendorId,
      name,
      sku,
      description,
      categoryId: categoryId || null,
      unit,
      packSize,
      weight,
      shelfLifeDays,
      currentPrice,
      barcodes: barcodes || [],
      images: images || [],
      status: "draft",
      createdBy: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      module: "products",
      resource: "products",
      resourceId: product.id,
      description: `Created product "${name}"`,
    },
  });

  return NextResponse.json({ success: true, data: product }, { status: 201 });
}
