import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/vendors — List vendors
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;
  const searchParams = request.nextUrl.searchParams;

  // Simple mode: return just id + companyName for dropdowns
  const simple = searchParams.get("simple");
  if (simple === "true") {
    const vendors = await prisma.vendor.findMany({
      where: { deletedAt: null },
      select: { id: true, companyName: true },
      orderBy: { companyName: "asc" },
    });
    return NextResponse.json({ success: true, data: vendors });
  }

  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  // Build where clause
  const where: any = { deletedAt: null };

  // Vendor side: only see their own vendor
  if (user.side === "vendor") {
    where.id = user.vendorId;
  }

  if (status) {
    where.status = status;
  }

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: "insensitive" } },
      { taxCode: { contains: search, mode: "insensitive" } },
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      select: {
        id: true,
        companyName: true,
        taxCode: true,
        email: true,
        phone: true,
        status: true,
        currentRanking: true,
        city: true,
        createdAt: true,
        _count: { select: { users: true, contracts: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.vendor.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      items: vendors,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
