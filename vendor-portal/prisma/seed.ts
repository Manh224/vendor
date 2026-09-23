import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // ============================================================================
  // 1. Roles
  // ============================================================================
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { name: "supermarket_admin" },
      update: {},
      create: {
        name: "supermarket_admin",
        displayName: "Quản trị viên siêu thị",
        side: "supermarket",
        description: "Toàn quyền quản lý hệ thống",
      },
    }),
    prisma.role.upsert({
      where: { name: "buyer" },
      update: {},
      create: {
        name: "buyer",
        displayName: "Nhân viên mua hàng",
        side: "supermarket",
        description: "Quản lý NCC, sản phẩm, đơn hàng",
      },
    }),
    prisma.role.upsert({
      where: { name: "accountant" },
      update: {},
      create: {
        name: "accountant",
        displayName: "Kế toán",
        side: "supermarket",
        description: "Quản lý công nợ, thanh toán",
      },
    }),
    prisma.role.upsert({
      where: { name: "warehouse" },
      update: {},
      create: {
        name: "warehouse",
        displayName: "Nhân viên kho",
        side: "supermarket",
        description: "Quản lý nhập kho, giao hàng",
      },
    }),
    prisma.role.upsert({
      where: { name: "vendor_admin" },
      update: {},
      create: {
        name: "vendor_admin",
        displayName: "Quản trị viên NCC",
        side: "vendor",
        description: "Toàn quyền quản lý nội bộ NCC",
      },
    }),
    prisma.role.upsert({
      where: { name: "vendor_sales" },
      update: {},
      create: {
        name: "vendor_sales",
        displayName: "Nhân viên kinh doanh NCC",
        side: "vendor",
        description: "Quản lý sản phẩm, đơn hàng",
      },
    }),
    prisma.role.upsert({
      where: { name: "vendor_accountant" },
      update: {},
      create: {
        name: "vendor_accountant",
        displayName: "Kế toán NCC",
        side: "vendor",
        description: "Quản lý hóa đơn, công nợ",
      },
    }),
  ]);

  console.log(`✅ Created ${roles.length} roles`);

  // ============================================================================
  // 2. Admin User
  // ============================================================================
  const adminRole = roles.find((r) => r.name === "supermarket_admin")!;
  const hashedPassword = await bcrypt.hash("Admin@123", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@vendor-portal.com" },
    update: {},
    create: {
      email: "admin@vendor-portal.com",
      passwordHash: hashedPassword,
      fullName: "System Admin",
      roleId: adminRole.id,
      side: "supermarket",
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.email}`);

  // ============================================================================
  // 3. Document Types
  // ============================================================================
  const documentTypes = await Promise.all([
    prisma.vendorDocumentType.upsert({
      where: { code: "GPKD" },
      update: {},
      create: { name: "Giấy phép đăng ký kinh doanh", code: "GPKD", isRequired: true, hasExpiry: false },
    }),
    prisma.vendorDocumentType.upsert({
      where: { code: "VSATTP" },
      update: {},
      create: { name: "Giấy chứng nhận vệ sinh an toàn thực phẩm", code: "VSATTP", isRequired: true, hasExpiry: true },
    }),
    prisma.vendorDocumentType.upsert({
      where: { code: "VIETGAP" },
      update: {},
      create: { name: "Chứng nhận VietGAP", code: "VIETGAP", isRequired: false, hasExpiry: true },
    }),
    prisma.vendorDocumentType.upsert({
      where: { code: "GLOBALGAP" },
      update: {},
      create: { name: "Chứng nhận GlobalGAP", code: "GLOBALGAP", isRequired: false, hasExpiry: true },
    }),
    prisma.vendorDocumentType.upsert({
      where: { code: "ISO22000" },
      update: {},
      create: { name: "Chứng nhận ISO 22000", code: "ISO22000", isRequired: false, hasExpiry: true },
    }),
    prisma.vendorDocumentType.upsert({
      where: { code: "HACCP" },
      update: {},
      create: { name: "Chứng nhận HACCP", code: "HACCP", isRequired: false, hasExpiry: true },
    }),
    prisma.vendorDocumentType.upsert({
      where: { code: "ORGANIC" },
      update: {},
      create: { name: "Chứng nhận Hữu cơ", code: "ORGANIC", isRequired: false, hasExpiry: true },
    }),
  ]);

  console.log(`✅ Created ${documentTypes.length} document types`);

  // ============================================================================
  // 4. KPI Ranking Thresholds
  // ============================================================================
  const thresholds = await Promise.all([
    prisma.kpiRankingThreshold.upsert({
      where: { ranking: "A" },
      update: {},
      create: { ranking: "A", minScore: 95.01, maxScore: 100.0, description: "Xuất sắc" },
    }),
    prisma.kpiRankingThreshold.upsert({
      where: { ranking: "B" },
      update: {},
      create: { ranking: "B", minScore: 85.01, maxScore: 95.0, description: "Tốt" },
    }),
    prisma.kpiRankingThreshold.upsert({
      where: { ranking: "C" },
      update: {},
      create: { ranking: "C", minScore: 70.01, maxScore: 85.0, description: "Trung bình" },
    }),
    prisma.kpiRankingThreshold.upsert({
      where: { ranking: "D" },
      update: {},
      create: { ranking: "D", minScore: 0.0, maxScore: 70.0, description: "Yếu" },
    }),
  ]);

  console.log(`✅ Created ${thresholds.length} KPI ranking thresholds`);

  // ============================================================================
  // 5. SLA Configs
  // ============================================================================
  const slaData = [
    { ticketCategory: "system_error", priority: "high", resolutionHours: 4, escalationHours: 2, description: "Lỗi hệ thống nghiêm trọng" },
    { ticketCategory: "system_error", priority: "medium", resolutionHours: 8, escalationHours: 4, description: "Lỗi hệ thống trung bình" },
    { ticketCategory: "system_error", priority: "low", resolutionHours: 24, escalationHours: 12, description: "Lỗi hệ thống nhẹ" },
    { ticketCategory: "finance", priority: "high", resolutionHours: 8, escalationHours: 4, description: "Vấn đề công nợ khẩn cấp" },
    { ticketCategory: "finance", priority: "medium", resolutionHours: 48, escalationHours: 24, description: "Vấn đề công nợ thông thường" },
    { ticketCategory: "finance", priority: "low", resolutionHours: 72, escalationHours: 48, description: "Thắc mắc tài chính" },
    { ticketCategory: "order", priority: "high", resolutionHours: 4, escalationHours: 2, description: "Đơn hàng khẩn cấp" },
    { ticketCategory: "order", priority: "medium", resolutionHours: 24, escalationHours: 12, description: "Đơn hàng thông thường" },
    { ticketCategory: "order", priority: "low", resolutionHours: 48, escalationHours: 24, description: "Thắc mắc đơn hàng" },
    { ticketCategory: "quality", priority: "high", resolutionHours: 8, escalationHours: 4, description: "Vấn đề chất lượng nghiêm trọng" },
    { ticketCategory: "quality", priority: "medium", resolutionHours: 48, escalationHours: 24, description: "Vấn đề chất lượng thông thường" },
    { ticketCategory: "quality", priority: "low", resolutionHours: 72, escalationHours: 48, description: "Thắc mắc chất lượng" },
  ];

  for (const sla of slaData) {
    await prisma.slaConfig.upsert({
      where: {
        ticketCategory_priority: {
          ticketCategory: sla.ticketCategory,
          priority: sla.priority,
        },
      },
      update: {},
      create: sla,
    });
  }

  console.log(`✅ Created ${slaData.length} SLA configs`);

  // ============================================================================
  // 6. Permissions
  // ============================================================================
  const modules = ["vendors", "products", "orders", "finance", "performance", "support", "admin"];
  const actions = ["view", "create", "edit", "delete", "approve"];
  let permCount = 0;

  for (const mod of modules) {
    for (const act of actions) {
      await prisma.permission.upsert({
        where: { module_action_resource: { module: mod, action: act, resource: mod } },
        update: {},
        create: { module: mod, action: act, resource: mod, description: `${act} ${mod}` },
      });
      permCount++;
    }
  }

  console.log(`✅ Created ${permCount} permissions`);
  console.log("\n🎉 Seeding completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
