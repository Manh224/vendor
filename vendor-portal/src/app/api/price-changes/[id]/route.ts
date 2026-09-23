import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

// PATCH /api/price-changes/:id — Review price change (supermarket)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.side !== "supermarket") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status, reviewNotes, finalPrice } = body;

  if (!status || !["approved", "rejected"].includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const pcr = await prisma.priceChangeRequest.findUnique({ where: { id } });
  if (!pcr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.priceChangeRequest.update({
    where: { id },
    data: {
      status,
      reviewedBy: user.id,
      reviewedAt: new Date(),
      reviewNotes,
      finalPrice: finalPrice || (status === "approved" ? pcr.proposedPrice : null),
    },
  });

  // If approved, update product price
  if (status === "approved") {
    const newPrice = finalPrice || Number(pcr.proposedPrice);
    await prisma.product.update({
      where: { id: pcr.productId },
      data: { currentPrice: newPrice },
    });
  }

  return NextResponse.json({ success: true, data: updated });
}
