/**
 * Reset dữ liệu demo — Xóa tất cả dữ liệu demo rồi seed lại
 * Chạy: npx tsx prisma/reset-demo.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  Xóa dữ liệu demo...\n");

  // Delete in reverse dependency order
  await prisma.auditLog.deleteMany({});
  console.log("  ✅ Audit logs");
  await prisma.notification.deleteMany({});
  console.log("  ✅ Notifications");
  await prisma.announcement.deleteMany({});
  console.log("  ✅ Announcements");
  await prisma.ticketMessage.deleteMany({});
  await prisma.ticket.deleteMany({});
  console.log("  ✅ Tickets");
  await prisma.kpiScore.deleteMany({});
  console.log("  ✅ KPI Scores");
  await prisma.reconciliation.deleteMany({});
  console.log("  ✅ Reconciliations");
  await prisma.debitNote.deleteMany({});
  console.log("  ✅ Debit notes");
  await prisma.invoiceItem.deleteMany({});
  await prisma.invoice.deleteMany({});
  console.log("  ✅ Invoices");
  await prisma.goodsReceipt.deleteMany({});
  console.log("  ✅ Goods receipts");
  await prisma.advanceShippingNotice.deleteMany({});
  console.log("  ✅ ASNs");
  await prisma.purchaseOrderItem.deleteMany({});
  await prisma.purchaseOrder.deleteMany({});
  console.log("  ✅ Purchase orders");
  await prisma.consignmentSale.deleteMany({});
  console.log("  ✅ Consignment sales");
  await prisma.promotion.deleteMany({});
  console.log("  ✅ Promotions");
  await prisma.priceChangeRequest.deleteMany({});
  console.log("  ✅ Price change requests");
  await prisma.product.deleteMany({});
  await prisma.productCategory.deleteMany({});
  console.log("  ✅ Products & Categories");
  await prisma.contract.deleteMany({});
  console.log("  ✅ Contracts");
  await prisma.vendorContact.deleteMany({});
  console.log("  ✅ Vendor contacts");
  // Delete demo vendor users (vendor1-8@demo.com, buyer, accountant)
  await prisma.user.deleteMany({ where: { email: { in: [
    "buyer@vendor-portal.com", "accountant@vendor-portal.com",
    ...Array.from({ length: 20 }, (_, i) => `vendor${i + 1}@demo.com`),
  ] } } });
  console.log("  ✅ Demo users");
  await prisma.vendor.deleteMany({});
  console.log("  ✅ Vendors");

  console.log("\n✅ Dữ liệu demo đã xóa sạch!");
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
