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

  const where: any = {};
  if (user.side === "vendor") where.vendorId = user.vendorId;
  if (status) where.status = status;

  const [items, total] = await Promise.all([
    prisma.debitNote.findMany({
      where,
      include: {
        vendor: { select: { id: true, companyName: true } },
        appliedToInvoice: { select: { id: true, invoiceNumber: true } },
        creator: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.debitNote.count({ where }),
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
  if (user.side !== "supermarket") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { vendorId, appliedToInvoiceId, debitNoteNumber, amount, debitType, description } = body;

  if (!vendorId || !amount || !debitNoteNumber) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  const dn = await prisma.debitNote.create({
    data: {
      vendorId, appliedToInvoiceId: appliedToInvoiceId || null, debitNoteNumber,
      amount, debitType: debitType || "penalty", description,
      status: "pending", createdBy: user.id,
    },
  });

  return NextResponse.json({ success: true, data: dn }, { status: 201 });
}
