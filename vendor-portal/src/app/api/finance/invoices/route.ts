import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");
  const status = sp.get("status");
  const search = sp.get("search");

  const where: any = {};
  if (user.side === "vendor") where.vendorId = user.vendorId;
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { invoiceNumber: { contains: search, mode: "insensitive" } },
      { vendor: { companyName: { contains: search, mode: "insensitive" } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
  });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { invoiceNumber, invoiceDate, subtotal, taxAmount, totalAmount, xmlFileUrl, pdfFileUrl } = body;

  if (!invoiceNumber || !totalAmount) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const invoice = await prisma.invoice.create({
    data: {
      vendorId: user.vendorId,
      invoiceNumber,
      invoiceDate: invoiceDate ? new Date(invoiceDate) : new Date(),
      subtotal: subtotal || totalAmount,
      taxAmount: taxAmount || 0,
      totalAmount,
      xmlFileUrl,
      pdfFileUrl,
      status: "draft",
      createdBy: user.id,
    },
  });

  return NextResponse.json({ success: true, data: invoice }, { status: 201 });
}
