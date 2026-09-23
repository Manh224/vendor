import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// POST /api/orders/:id/asn — Create ASN (vendor)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "vendor") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { asnNumber, items, carrierName, vehiclePlate, driverName, driverPhone, scheduledDate, scheduledTimeSlot } = body;

  if (!asnNumber || !scheduledDate) {
    return NextResponse.json({ error: "Số ASN và ngày giao là bắt buộc" }, { status: 400 });
  }

  const po = await prisma.purchaseOrder.findUnique({ where: { id } });
  if (!po || po.vendorId !== user.vendorId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const asn = await prisma.advanceShippingNotice.create({
    data: {
      purchaseOrderId: id,
      vendorId: user.vendorId,
      asnNumber,
      items: items || [],
      carrierName,
      vehiclePlate,
      driverName,
      driverPhone,
      scheduledDate: new Date(scheduledDate),
      scheduledTimeSlot,
      status: "submitted",
      createdBy: user.id,
    },
  });

  await prisma.purchaseOrder.update({ where: { id }, data: { status: "preparing" } });

  return NextResponse.json({ success: true, data: asn }, { status: 201 });
}
