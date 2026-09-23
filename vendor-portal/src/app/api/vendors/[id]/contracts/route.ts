import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// GET /api/vendors/:id/contracts — List contracts
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const user = session.user as any;

  if (user.side === "vendor" && user.vendorId !== id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contracts = await prisma.contract.findMany({
    where: { vendorId: id, deletedAt: null },
    include: {
      creator: { select: { fullName: true } },
      statusChanger: { select: { fullName: true } },
      parentContract: { select: { id: true, contractNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: contracts });
}

// POST /api/vendors/:id/contracts — Create contract
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = session.user as any;

  // Only supermarket side can create contracts
  if (user.side !== "supermarket") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const {
    contractNumber, contractType, parentContractId, title, fileUrl,
    startDate, endDate,
    paymentTermsDays, discountRate, salesBonusTarget, salesBonusRate,
    displayFee, marketingSupportFee, penaltyTerms,
  } = body;

  if (!contractNumber || !contractType || !startDate || !endDate) {
    return NextResponse.json(
      { error: "Số hợp đồng, loại, ngày bắt đầu và kết thúc là bắt buộc" },
      { status: 400 }
    );
  }

  const contract = await prisma.contract.create({
    data: {
      vendorId: id,
      contractNumber,
      contractType,
      parentContractId: parentContractId || null,
      title,
      fileUrl: fileUrl || null,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      paymentTermsDays: paymentTermsDays || 30,
      discountRate: discountRate || 0,
      salesBonusTarget: salesBonusTarget || null,
      salesBonusRate: salesBonusRate || null,
      displayFee: displayFee || 0,
      marketingSupportFee: marketingSupportFee || 0,
      penaltyTerms: penaltyTerms || null,
      status: "draft",
      createdBy: user.id,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "CREATE",
      module: "vendors",
      resource: "contracts",
      resourceId: contract.id,
      description: `Created contract "${contractNumber}" for vendor`,
    },
  });

  return NextResponse.json({ success: true, data: contract }, { status: 201 });
}
