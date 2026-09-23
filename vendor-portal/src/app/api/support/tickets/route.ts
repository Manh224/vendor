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
  const priority = sp.get("priority");

  const where: any = {};
  if (user.side === "vendor") where.createdBy = user.id;
  if (status) where.status = status;
  if (priority) where.priority = priority;

  const [items, total] = await Promise.all([
    prisma.ticket.findMany({
      where,
      include: {
        creator: { select: { fullName: true } },
        assignee: { select: { fullName: true } },
        vendor: { select: { id: true, companyName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ticket.count({ where }),
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
  const body = await request.json();
  const { title, category, priority, description } = body;

  if (!title || !category || !description) {
    return NextResponse.json({ error: "Tiêu đề, danh mục và mô tả là bắt buộc" }, { status: 400 });
  }

  const count = await prisma.ticket.count();
  const ticketNumber = `TK-${String(count + 1).padStart(6, "0")}`;

  const ticket = await prisma.ticket.create({
    data: {
      ticketNumber,
      vendorId: user.vendorId,
      title,
      category,
      priority: priority || "medium",
      description,
      status: "new",
      createdBy: user.id,
    },
  });

  return NextResponse.json({ success: true, data: ticket }, { status: 201 });
}
