import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Orders this month
  const ordersThisMonth = await prisma.purchaseOrder.count({
    where: {
      orderDate: { gte: startOfMonth },
      ...(user.side === "vendor" ? { vendorId: user.vendorId } : {}),
    },
  });

  // Invoices pending review (submitted + under_review)
  const invoicesPending = await prisma.invoice.count({
    where: {
      status: { in: ["submitted", "under_review"] },
      ...(user.side === "vendor" ? { vendorId: user.vendorId } : {}),
    },
  });

  // Tickets in progress
  const ticketsInProgress = await prisma.ticket.count({
    where: {
      status: { in: ["new", "in_progress"] },
      ...(user.side === "vendor" ? { vendorId: user.vendorId } : {}),
    },
  });

  const result: any = {
    ordersThisMonth,
    invoicesPending,
    ticketsInProgress,
  };

  // Active vendors — only for supermarket side
  if (user.side === "supermarket") {
    result.activeVendors = await prisma.vendor.count({
      where: { status: "active" },
    });
  }

  return NextResponse.json({ success: true, data: result });
}
