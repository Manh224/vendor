import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const page = parseInt(sp.get("page") || "1");
  const pageSize = parseInt(sp.get("pageSize") || "20");

  const now = new Date();
  const where: any = {
    status: "published",
    publishAt: { lte: now },
    OR: [
      { expireAt: null },
      { expireAt: { gt: now } },
    ],
  };

  const [items, total] = await Promise.all([
    prisma.announcement.findMany({
      where,
      include: { creator: { select: { fullName: true } } },
      orderBy: [{ isImportant: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.announcement.count({ where }),
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
  const { title, content, targetType, isImportant, publishAt, expireAt } = body;

  if (!title || !content) {
    return NextResponse.json({ error: "Tiêu đề và nội dung là bắt buộc" }, { status: 400 });
  }

  const announcement = await prisma.announcement.create({
    data: {
      title, content,
      targetType: targetType || "all",
      isImportant: isImportant || false,
      publishAt: publishAt ? new Date(publishAt) : new Date(),
      expireAt: expireAt ? new Date(expireAt) : null,
      status: "published",
      createdBy: user.id,
    },
  });

  return NextResponse.json({ success: true, data: announcement }, { status: 201 });
}
