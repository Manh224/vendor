import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const sp = request.nextUrl.searchParams;
  const vendorId = sp.get("vendorId");
  const period = sp.get("period");
  const search = sp.get("search");
  const ranking = sp.get("ranking");

  const where: any = {};
  if (user.side === "vendor") where.vendorId = user.vendorId;
  else if (vendorId) where.vendorId = vendorId;
  if (period) where.period = period;
  if (ranking) where.ranking = ranking;
  if (search) {
    where.vendor = { companyName: { contains: search, mode: "insensitive" } };
  }

  const scores = await prisma.kpiScore.findMany({
    where,
    include: {
      vendor: { select: { id: true, companyName: true, currentRanking: true } },
      details: {
        include: { kpiDefinition: { select: { name: true, code: true, weight: true } } },
      },
    },
    orderBy: [{ period: "desc" }, { totalScore: "desc" }],
    take: 100,
  });

  return NextResponse.json({ success: true, data: scores });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "supermarket") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { vendorId, period, periodType, totalScore, ranking, details } = body;

  if (!vendorId || !period) {
    return NextResponse.json({ error: "Thiếu thông tin bắt buộc" }, { status: 400 });
  }

  // Upsert KPI score
  const existing = await prisma.kpiScore.findFirst({ where: { vendorId, period, periodType: periodType || "monthly" } });
  const score = existing
    ? await prisma.kpiScore.update({
        where: { id: existing.id },
        data: { totalScore, ranking, reviewedBy: user.id },
      })
    : await prisma.kpiScore.create({
        data: {
          vendorId, period, periodType: periodType || "monthly",
          totalScore, ranking, reviewedBy: user.id,
        },
      });

  // Update vendor ranking
  if (ranking) {
    await prisma.vendor.update({ where: { id: vendorId }, data: { currentRanking: ranking } });
  }

  return NextResponse.json({ success: true, data: score }, { status: existing ? 200 : 201 });
}
