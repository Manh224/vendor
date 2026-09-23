import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = session.user as any;
  if (user.role !== "supermarket_admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Check BC config
  const bcConfig = {
    tenantId: process.env.BC_TENANT_ID ? "configured" : "missing",
    clientId: process.env.BC_CLIENT_ID ? "configured" : "missing",
    clientSecret: process.env.BC_CLIENT_SECRET ? "configured" : "missing",
    environment: process.env.BC_ENVIRONMENT || "not set",
    companyId: process.env.BC_COMPANY_ID ? "configured" : "missing",
    apiBaseUrl: process.env.BC_API_BASE_URL || "https://api.businesscentral.dynamics.com/v2.0",
  };

  const allConfigured = bcConfig.tenantId === "configured"
    && bcConfig.clientId === "configured"
    && bcConfig.clientSecret === "configured"
    && bcConfig.companyId === "configured";

  // Get sync stats from DB
  const [
    vendorSyncCount,
    productSyncCount,
    poSyncCount,
    invoiceSyncCount,
  ] = await Promise.all([
    prisma.vendor.count({ where: { erpSyncStatus: "synced" } }),
    prisma.product.count({ where: { erpSyncStatus: "synced" } }),
    prisma.purchaseOrder.count({ where: { erpSyncStatus: "synced" } }),
    prisma.invoice.count({ where: { erpSyncStatus: "synced" } }),
  ]);

  const [
    vendorTotal,
    productTotal,
    poTotal,
    invoiceTotal,
  ] = await Promise.all([
    prisma.vendor.count(),
    prisma.product.count(),
    prisma.purchaseOrder.count(),
    prisma.invoice.count(),
  ]);

  // Recent sync logs from audit logs
  const recentSyncLogs = await prisma.auditLog.findMany({
    where: { module: "integration" },
    include: { user: { select: { fullName: true } } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    success: true,
    data: {
      connectionStatus: allConfigured ? "ready" : "not_configured",
      bcConfig,
      syncStats: {
        vendors: { synced: vendorSyncCount, total: vendorTotal },
        products: { synced: productSyncCount, total: productTotal },
        purchaseOrders: { synced: poSyncCount, total: poTotal },
        invoices: { synced: invoiceSyncCount, total: invoiceTotal },
      },
      recentSyncLogs,
    },
  });
}
