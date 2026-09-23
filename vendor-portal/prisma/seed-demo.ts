/**
 * Demo Data Seeder — Tạo dữ liệu demo cho tất cả 7 modules
 * Chạy: npx tsx prisma/seed-demo.ts
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🏪 Tạo dữ liệu demo...\n");

  // ========== Get existing roles ==========
  const vendorAdminRole = await prisma.role.findFirst({ where: { name: "vendor_admin" } });
  const buyerRole = await prisma.role.findFirst({ where: { name: "buyer" } });
  const accountantRole = await prisma.role.findFirst({ where: { name: "accountant" } });
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@vendor-portal.com" } });
  if (!vendorAdminRole || !buyerRole || !accountantRole || !adminUser) {
    throw new Error("Cần chạy seed cơ bản trước: npx tsx prisma/seed.ts");
  }

  // ========== MODULE 1: VENDORS ==========
  // 8 statuses: pending_registration, pending_review, requires_supplement,
  //   approved, contract_signing, active, suspended, terminated
  // Target: 2-5 per status
  console.log("📦 Module 1: Tạo Nhà cung cấp...");

  const vendorsData = [
    // pending_registration (3)
    { companyName: "Công ty TNHH Thực phẩm Sài Gòn Xanh", taxCode: "0315001001", city: "TP.HCM", phone: "028-1111-0001", email: "info@saigonxanh.vn", status: "pending_registration", currentRanking: "N/A", bankName: "Vietcombank", bankAccountNo: "1100110011", bankAccountName: "CTY TNHH TP SAI GON XANH" },
    { companyName: "Hộ kinh doanh Trái cây Cái Bè", taxCode: "0815001002", city: "Tiền Giang", phone: "0273-222-3333", email: "traicay@caibe.vn", status: "pending_registration", currentRanking: "N/A", bankName: "Agribank", bankAccountNo: "2200220022", bankAccountName: "HKD TRAI CAY CAI BE" },
    { companyName: "Công ty CP Sữa Mộc Châu Organic", taxCode: "2615001003", city: "Sơn La", phone: "0212-333-4444", email: "order@mocchauorganic.vn", status: "pending_registration", currentRanking: "N/A", bankName: "BIDV", bankAccountNo: "3300330033", bankAccountName: "CTY CP SUA MOC CHAU ORGANIC" },
    // pending_review (3)
    { companyName: "Hợp tác xã Rau sạch Đà Lạt", taxCode: "5801122334", city: "Lâm Đồng", phone: "0263-555-6789", email: "htx@rausachdalat.vn", status: "pending_review", currentRanking: "N/A", bankName: "Agribank", bankAccountNo: "7778889990", bankAccountName: "HTX RAU SACH DA LAT" },
    { companyName: "Công ty TNHH Gia vị Phú Quốc", taxCode: "9215001005", city: "Kiên Giang", phone: "0297-444-5555", email: "export@giavipq.com", status: "pending_review", currentRanking: "N/A", bankName: "Sacombank", bankAccountNo: "5500550055", bankAccountName: "CTY TNHH GIA VI PHU QUOC" },
    { companyName: "Công ty CP Chế biến Thủy sản Cà Mau", taxCode: "9615001006", city: "Cà Mau", phone: "0290-555-6666", email: "sales@thuysancamau.vn", status: "pending_review", currentRanking: "N/A", bankName: "Vietinbank", bankAccountNo: "6600660066", bankAccountName: "CTY CP CB THUY SAN CA MAU" },
    // requires_supplement (2)
    { companyName: "Công ty TNHH Bánh kẹo Hải Hà", taxCode: "0115001007", city: "Hà Nội", phone: "024-666-7777", email: "contact@banhkeohaihha.vn", status: "requires_supplement", currentRanking: "N/A", bankName: "Techcombank", bankAccountNo: "7700770077", bankAccountName: "CTY TNHH BANH KEO HAI HA" },
    { companyName: "Hộ kinh doanh Mật ong Tây Nguyên", taxCode: "6415001008", city: "Gia Lai", phone: "0269-777-8888", email: "matong@taynguyen.vn", status: "requires_supplement", currentRanking: "N/A", bankName: "Agribank", bankAccountNo: "8800880088", bankAccountName: "HKD MAT ONG TAY NGUYEN" },
    // approved (3)
    { companyName: "Công ty TNHH Thực phẩm Minh Phát", taxCode: "0312345678", city: "TP.HCM", phone: "028-3456-7890", email: "contact@minhphat.vn", status: "approved", currentRanking: "A", bankName: "Vietcombank", bankAccountNo: "1234567890", bankAccountName: "CTY TNHH THUC PHAM MINH PHAT" },
    { companyName: "Công ty CP Nông sản Đồng Nai", taxCode: "3601234567", city: "Đồng Nai", phone: "0251-234-5678", email: "sales@nongsandnai.vn", status: "approved", currentRanking: "B", bankName: "Techcombank", bankAccountNo: "9876543210", bankAccountName: "CTY CP NONG SAN DONG NAI" },
    { companyName: "Công ty TNHH Dầu ăn Tường An", taxCode: "0315001011", city: "TP.HCM", phone: "028-888-1111", email: "order@dautuongan.vn", status: "approved", currentRanking: "B", bankName: "ACB", bankAccountNo: "9911991199", bankAccountName: "CTY TNHH DAU AN TUONG AN" },
    // contract_signing (2)
    { companyName: "Công ty CP Thực phẩm Vissan", taxCode: "0315001012", city: "TP.HCM", phone: "028-999-2222", email: "sales@vissan.com.vn", status: "contract_signing", currentRanking: "N/A", bankName: "BIDV", bankAccountNo: "1012101210", bankAccountName: "CTY CP THUC PHAM VISSAN" },
    { companyName: "Công ty TNHH Nước giải khát Suntory PepsiCo", taxCode: "0315001013", city: "TP.HCM", phone: "028-111-3333", email: "b2b@sfrv.com", status: "contract_signing", currentRanking: "N/A", bankName: "HSBC", bankAccountNo: "1013101310", bankAccountName: "CTY TNHH NGK SUNTORY PEPSICO" },
    // active (5)
    { companyName: "Công ty TNHH SX-TM Hải Sản Biển Đông", taxCode: "0309876543", city: "TP.HCM", phone: "028-9876-5432", email: "info@biendong-seafood.com", status: "active", currentRanking: "A", bankName: "BIDV", bankAccountNo: "5555666677", bankAccountName: "CTY TNHH SX-TM HAI SAN BIEN DONG" },
    { companyName: "Công ty TNHH Đồ uống Tân Hiệp Phát", taxCode: "0301122334", city: "Bình Dương", phone: "0274-123-4567", email: "order@tanhiepphat.com.vn", status: "active", currentRanking: "B", bankName: "ACB", bankAccountNo: "1112223334", bankAccountName: "CTY TNHH DO UONG TAN HIEP PHAT" },
    { companyName: "Công ty CP Vinamilk", taxCode: "0300588569", city: "TP.HCM", phone: "028-9876-0000", email: "sales@vinamilk.com.vn", status: "active", currentRanking: "A", bankName: "Vietcombank", bankAccountNo: "1416141614", bankAccountName: "CTY CP VINAMILK" },
    { companyName: "Công ty TNHH Masan Consumer", taxCode: "0315001017", city: "TP.HCM", phone: "028-5555-7777", email: "trade@masanconsumer.com", status: "active", currentRanking: "A", bankName: "Techcombank", bankAccountNo: "1517151715", bankAccountName: "CTY TNHH MASAN CONSUMER" },
    { companyName: "Công ty CP Acecook Việt Nam", taxCode: "0315001018", city: "TP.HCM", phone: "028-6666-8888", email: "order@acecook.com.vn", status: "active", currentRanking: "B", bankName: "BIDV", bankAccountNo: "1618161816", bankAccountName: "CTY CP ACECOOK VIET NAM" },
    // suspended (2)
    { companyName: "Công ty TNHH TP Hoàng Gia", taxCode: "0315001019", city: "TP.HCM", phone: "028-7777-9999", email: "info@tphoanggia.vn", status: "suspended", currentRanking: "D", bankName: "Vietinbank", bankAccountNo: "1719171917", bankAccountName: "CTY TNHH TP HOANG GIA" },
    { companyName: "Công ty CP Nông sản Bình Phước", taxCode: "7015001020", city: "Bình Phước", phone: "0271-888-0000", email: "ns@binhphuoc.vn", status: "suspended", currentRanking: "D", bankName: "Agribank", bankAccountNo: "1820182018", bankAccountName: "CTY CP NONG SAN BINH PHUOC" },
    // terminated (2)
    { companyName: "Công ty TNHH XNK Thực phẩm An Phát", taxCode: "0315001021", city: "TP.HCM", phone: "028-9999-1111", email: "xnk@anphat.vn", status: "terminated", currentRanking: "D", bankName: "Sacombank", bankAccountNo: "1921192119", bankAccountName: "CTY TNHH XNK TP AN PHAT" },
    { companyName: "Hộ kinh doanh Đặc sản Miền Tây", taxCode: "8315001022", city: "Cần Thơ", phone: "0292-111-2222", email: "dacsanmt@gmail.com", status: "terminated", currentRanking: "N/A", bankName: "Agribank", bankAccountNo: "2022202220", bankAccountName: "HKD DAC SAN MIEN TAY" },
  ];

  const vendors = [];
  for (const v of vendorsData) {
    const vendor = await prisma.vendor.create({
      data: {
        ...v,
        address: `123 Đường ABC, ${v.city}`,
        createdBy: adminUser.id,
        statusChangedAt: v.status !== "pending_registration" ? new Date("2026-06-15") : undefined,
        statusChangedBy: v.status !== "pending_registration" ? adminUser.id : undefined,
        statusNotes: v.status === "requires_supplement" ? "Thiếu giấy chứng nhận VSATTP, cần bổ sung trước 30/09/2026" :
          v.status === "suspended" ? "Vi phạm chất lượng hàng hóa, tạm ngưng hợp tác" :
          v.status === "terminated" ? "Chấm dứt hợp tác do vi phạm hợp đồng nghiêm trọng" : undefined,
      },
    });
    vendors.push(vendor);
  }
  console.log(`  ✅ ${vendors.length} nhà cung cấp (8 trạng thái)`);

  // Vendor index helpers by status
  const vendorsByStatus = (status: string) => vendors.filter((_, i) => vendorsData[i].status === status);
  const activeVendors = [...vendorsByStatus("approved"), ...vendorsByStatus("active")];

  // Create vendor users for approved + active vendors
  const hashedPw = await bcrypt.hash("Vendor@123", 12);
  const vendorUsers = [];
  for (let i = 0; i < activeVendors.length; i++) {
    const vu = await prisma.user.create({
      data: {
        email: `vendor${i + 1}@demo.com`,
        passwordHash: hashedPw,
        fullName: `NV Kinh doanh - ${activeVendors[i].companyName.split(" ").slice(-2).join(" ")}`,
        roleId: vendorAdminRole.id,
        vendorId: activeVendors[i].id,
        side: "vendor",
        isActive: true,
      },
    });
    vendorUsers.push(vu);
  }
  console.log(`  ✅ ${vendorUsers.length} tài khoản vendor`);

  // Create supermarket staff users (buyer + accountant)
  const buyerUser = await prisma.user.create({
    data: {
      email: "buyer@vendor-portal.com",
      passwordHash: hashedPw,
      fullName: "Trần Thị Thu Mua",
      roleId: buyerRole.id,
      side: "supermarket",
      isActive: true,
    },
  });
  const accountantUser = await prisma.user.create({
    data: {
      email: "accountant@vendor-portal.com",
      passwordHash: hashedPw,
      fullName: "Lê Văn Kế Toán",
      roleId: accountantRole.id,
      side: "supermarket",
      isActive: true,
    },
  });
  console.log("  ✅ 2 tài khoản siêu thị (Thu mua + Kế toán)");

  // Vendor contacts for active vendors
  for (let i = 0; i < activeVendors.length; i++) {
    const vendorData = vendorsData.find(v => v.taxCode === (vendorsData[vendors.indexOf(activeVendors[i])]?.taxCode));
    await prisma.vendorContact.create({
      data: {
        vendorId: activeVendors[i].id,
        fullName: `Nguyễn Văn ${String.fromCharCode(65 + i)}`,
        position: "Giám đốc kinh doanh",
        email: vendorData?.email || `vendor${i + 1}@demo.com`,
        phone: vendorData?.phone || "0901000000",
        isPrimary: true,
      },
    });
  }
  console.log("  ✅ Liên hệ NCC");

  // Contracts for active vendors
  for (let i = 0; i < activeVendors.length; i++) {
    await prisma.contract.create({
      data: {
        vendorId: activeVendors[i].id,
        contractNumber: `HD-2026-${String(i + 1).padStart(3, "0")}`,
        contractType: "principal",
        title: `Hợp đồng cung cấp hàng hóa năm 2026 - ${activeVendors[i].companyName}`,
        startDate: new Date("2026-01-01"),
        endDate: new Date("2026-12-31"),
        paymentTermsDays: 30,
        discountRate: i === 0 ? 3 : 2,
        displayFee: 5000000 + i * 1000000,
        status: "active",
        signedByVendor: true,
        signedBySupermarket: true,
        signedAt: new Date("2026-01-01"),
        createdBy: adminUser.id,
      },
    });
  }
  console.log("  ✅ Hợp đồng");

  // ========== MODULE 2: PRODUCTS ==========
  console.log("\n📦 Module 2: Tạo Sản phẩm...");

  const catData = [
    { name: "Thực phẩm tươi sống", code: "FRESH" },
    { name: "Đồ uống", code: "BEVERAGE" },
    { name: "Rau củ quả", code: "VEGETABLE" },
    { name: "Hải sản", code: "SEAFOOD" },
    { name: "Đồ khô - Gia vị", code: "DRY_SPICE" },
    { name: "Sữa & Sản phẩm từ sữa", code: "DAIRY" },
    { name: "Mì - Cháo ăn liền", code: "INSTANT_NOODLE" },
  ];
  const categories = [];
  for (const c of catData) {
    const cat = await prisma.productCategory.create({ data: c });
    categories.push(cat);
  }

  // Map active vendor indices for product creation
  const productsData = [
    // approved vendors[0] = Minh Phát (idx 8 in vendorsData)
    { vendorId: activeVendors[0].id, catIdx: 0, sku: "MP-001", name: "Thịt heo ba rọi tươi (kg)", currentPrice: 125000, status: "approved" },
    { vendorId: activeVendors[0].id, catIdx: 0, sku: "MP-002", name: "Thịt bò Úc nhập khẩu (kg)", currentPrice: 320000, status: "approved" },
    { vendorId: activeVendors[0].id, catIdx: 0, sku: "MP-003", name: "Gà ta nguyên con (kg)", currentPrice: 85000, status: "approved" },
    { vendorId: activeVendors[0].id, catIdx: 4, sku: "MP-004", name: "Nước mắm Phú Quốc 35° (chai 500ml)", currentPrice: 65000, status: "approved" },
    // approved vendors[1] = Nông sản Đồng Nai
    { vendorId: activeVendors[1].id, catIdx: 2, sku: "DN-001", name: "Bắp cải xanh (kg)", currentPrice: 15000, status: "approved" },
    { vendorId: activeVendors[1].id, catIdx: 2, sku: "DN-002", name: "Cà chua beef (kg)", currentPrice: 28000, status: "approved" },
    { vendorId: activeVendors[1].id, catIdx: 2, sku: "DN-003", name: "Dưa leo baby (kg)", currentPrice: 22000, status: "approved" },
    { vendorId: activeVendors[1].id, catIdx: 2, sku: "DN-004", name: "Xà lách Mỹ (bó)", currentPrice: 18000, status: "pending_review" },
    // approved vendors[2] = Dầu ăn Tường An
    { vendorId: activeVendors[2].id, catIdx: 4, sku: "TA-001", name: "Dầu ăn Tường An (chai 1L)", currentPrice: 42000, status: "approved" },
    // active vendors[3] = Hải Sản Biển Đông
    { vendorId: activeVendors[3].id, catIdx: 3, sku: "BD-001", name: "Tôm sú loại 1 (kg)", currentPrice: 280000, status: "approved" },
    { vendorId: activeVendors[3].id, catIdx: 3, sku: "BD-002", name: "Cá hồi Na Uy fillet (kg)", currentPrice: 450000, status: "approved" },
    { vendorId: activeVendors[3].id, catIdx: 3, sku: "BD-003", name: "Mực ống tươi (kg)", currentPrice: 180000, status: "approved" },
    // active vendors[4] = Tân Hiệp Phát
    { vendorId: activeVendors[4].id, catIdx: 1, sku: "THP-001", name: "Trà xanh 0 Độ (thùng 24 lon)", currentPrice: 168000, status: "approved" },
    { vendorId: activeVendors[4].id, catIdx: 1, sku: "THP-002", name: "Nước tăng lực Number 1 (thùng 24 lon)", currentPrice: 192000, status: "approved" },
    { vendorId: activeVendors[4].id, catIdx: 1, sku: "THP-003", name: "Sữa đậu nành Dr.Thanh (thùng 24 hộp)", currentPrice: 145000, status: "draft" },
    // active vendors[5] = Vinamilk
    { vendorId: activeVendors[5].id, catIdx: 5, sku: "VM-001", name: "Sữa tươi Vinamilk 100% có đường (thùng 48 hộp)", currentPrice: 310000, status: "approved" },
    { vendorId: activeVendors[5].id, catIdx: 5, sku: "VM-002", name: "Sữa chua Vinamilk không đường (thùng 48 hộp)", currentPrice: 285000, status: "approved" },
    // active vendors[6] = Masan
    { vendorId: activeVendors[6].id, catIdx: 4, sku: "MS-001", name: "Nước mắm Nam Ngư (chai 500ml)", currentPrice: 32000, status: "approved" },
    { vendorId: activeVendors[6].id, catIdx: 4, sku: "MS-002", name: "Hạt nêm Knorr (gói 900g)", currentPrice: 55000, status: "approved" },
    // active vendors[7] = Acecook
    { vendorId: activeVendors[7].id, catIdx: 6, sku: "AC-001", name: "Mì Hảo Hảo tôm chua cay (thùng 30 gói)", currentPrice: 95000, status: "approved" },
    { vendorId: activeVendors[7].id, catIdx: 6, sku: "AC-002", name: "Phở Vifon (thùng 30 gói)", currentPrice: 120000, status: "approved" },
  ];

  const products: any[] = [];
  for (let pi = 0; pi < productsData.length; pi++) {
    const p = productsData[pi];
    const vuIdx = activeVendors.findIndex(v => v.id === p.vendorId);
    // Generate realistic EAN-13 barcodes
    const barcode1 = `893${String(pi + 1).padStart(4, "0")}${String(100000 + pi * 7).slice(0, 5)}0`;
    const barcodes = pi % 3 === 0 ? [barcode1, `893${String(pi + 50).padStart(4, "0")}${String(200000 + pi * 3).slice(0, 5)}0`] : [barcode1];
    const prod = await prisma.product.create({
      data: {
        vendorId: p.vendorId,
        categoryId: categories[p.catIdx].id,
        sku: p.sku,
        name: p.name,
        currentPrice: p.currentPrice,
        barcodes: barcodes,
        status: p.status,
        unit: p.name.includes("kg") ? "kg" : p.name.includes("thùng") ? "thùng" : p.name.includes("chai") ? "chai" : p.name.includes("bó") ? "bó" : p.name.includes("gói") ? "gói" : "cái",
        createdBy: vendorUsers[vuIdx]?.id || vendorUsers[0].id,
        approvedBy: p.status === "approved" ? adminUser.id : null,
        approvedAt: p.status === "approved" ? new Date("2026-07-01") : null,
      },
    });
    products.push(prod);
  }
  console.log(`  ✅ ${products.length} sản phẩm`);

  // Price change request
  await prisma.priceChangeRequest.create({
    data: {
      vendorId: activeVendors[0].id, productId: products[0].id,
      currentPrice: 125000, proposedPrice: 135000, priceChangePct: 8.0,
      reason: "Chi phí chăn nuôi tăng 15% do giá thức ăn chăn nuôi biến động",
      effectiveDate: new Date("2026-08-01"), status: "pending",
      createdBy: vendorUsers[0].id,
    },
  });
  console.log("  ✅ 1 yêu cầu thay đổi giá");

  // Promotion
  await prisma.promotion.create({
    data: {
      vendorId: activeVendors[4].id, title: "Mua 2 thùng Trà xanh 0 Độ tặng 1 thùng",
      promotionType: "buy_get", description: "Chương trình khuyến mãi mùa hè 2026",
      startDate: new Date("2026-08-01"), endDate: new Date("2026-08-31"),
      productIds: [products[12].id], estimatedQty: 500, committedStock: 200,
      status: "approved", reviewedBy: adminUser.id, reviewedAt: new Date(),
      createdBy: vendorUsers[4].id,
    },
  });
  console.log("  ✅ 1 chương trình khuyến mại");

  // ========== MODULE 3: ORDERS ==========
  // 11 statuses: new, sent_to_vendor, confirmed, rejected, modification_requested,
  //   preparing, shipped, received, partially_received, completed, cancelled
  // Target: 2-5 per status
  console.log("\n📦 Module 3: Tạo Đơn hàng (PO/ASN/GRN)...");

  // Helper to get vendorUser by vendor
  const getVendorUser = (vendor: any) => {
    const idx = activeVendors.findIndex(v => v.id === vendor.id);
    return vendorUsers[idx] || vendorUsers[0];
  };

  const posData = [
    // new (3)
    { vendor: activeVendors[3], poNumber: "PO-2026-0001", status: "new", orderDate: "2026-09-20", expectedDate: "2026-09-27",
      items: [{ prodIdx: 9, qty: 100, price: 280000 }, { prodIdx: 10, qty: 30, price: 450000 }] },
    { vendor: activeVendors[1], poNumber: "PO-2026-0002", status: "new", orderDate: "2026-09-21", expectedDate: "2026-09-28",
      items: [{ prodIdx: 4, qty: 300, price: 15000 }, { prodIdx: 5, qty: 200, price: 28000 }] },
    { vendor: activeVendors[5], poNumber: "PO-2026-0003", status: "new", orderDate: "2026-09-22", expectedDate: "2026-09-29",
      items: [{ prodIdx: 15, qty: 50, price: 310000 }] },

    // sent_to_vendor (2)
    { vendor: activeVendors[0], poNumber: "PO-2026-0004", status: "sent_to_vendor", orderDate: "2026-09-18", expectedDate: "2026-09-25",
      items: [{ prodIdx: 0, qty: 150, price: 125000 }, { prodIdx: 1, qty: 40, price: 320000 }] },
    { vendor: activeVendors[6], poNumber: "PO-2026-0005", status: "sent_to_vendor", orderDate: "2026-09-19", expectedDate: "2026-09-26",
      items: [{ prodIdx: 17, qty: 200, price: 32000 }, { prodIdx: 18, qty: 100, price: 55000 }] },

    // confirmed (3)
    { vendor: activeVendors[1], poNumber: "PO-2026-0006", status: "confirmed", orderDate: "2026-09-15", expectedDate: "2026-09-22",
      items: [{ prodIdx: 4, qty: 500, price: 15000 }, { prodIdx: 5, qty: 300, price: 28000 }, { prodIdx: 6, qty: 200, price: 22000 }] },
    { vendor: activeVendors[4], poNumber: "PO-2026-0007", status: "confirmed", orderDate: "2026-09-16", expectedDate: "2026-09-23",
      items: [{ prodIdx: 12, qty: 100, price: 168000 }, { prodIdx: 13, qty: 80, price: 192000 }] },
    { vendor: activeVendors[7], poNumber: "PO-2026-0008", status: "confirmed", orderDate: "2026-09-17", expectedDate: "2026-09-24",
      items: [{ prodIdx: 19, qty: 200, price: 95000 }, { prodIdx: 20, qty: 150, price: 120000 }] },

    // rejected (2)
    { vendor: activeVendors[3], poNumber: "PO-2026-0009", status: "rejected", orderDate: "2026-09-10", expectedDate: "2026-09-17",
      items: [{ prodIdx: 11, qty: 500, price: 180000 }] },
    { vendor: activeVendors[0], poNumber: "PO-2026-0010", status: "rejected", orderDate: "2026-09-11", expectedDate: "2026-09-18",
      items: [{ prodIdx: 2, qty: 1000, price: 85000 }] },

    // modification_requested (2)
    { vendor: activeVendors[4], poNumber: "PO-2026-0011", status: "modification_requested", orderDate: "2026-09-12", expectedDate: "2026-09-19",
      items: [{ prodIdx: 12, qty: 300, price: 168000 }] },
    { vendor: activeVendors[5], poNumber: "PO-2026-0012", status: "modification_requested", orderDate: "2026-09-13", expectedDate: "2026-09-20",
      items: [{ prodIdx: 15, qty: 200, price: 310000 }, { prodIdx: 16, qty: 150, price: 285000 }] },

    // preparing (3)
    { vendor: activeVendors[0], poNumber: "PO-2026-0013", status: "preparing", orderDate: "2026-09-08", expectedDate: "2026-09-15",
      items: [{ prodIdx: 0, qty: 200, price: 125000 }, { prodIdx: 3, qty: 300, price: 65000 }] },
    { vendor: activeVendors[6], poNumber: "PO-2026-0014", status: "preparing", orderDate: "2026-09-09", expectedDate: "2026-09-16",
      items: [{ prodIdx: 17, qty: 400, price: 32000 }] },
    { vendor: activeVendors[7], poNumber: "PO-2026-0015", status: "preparing", orderDate: "2026-09-10", expectedDate: "2026-09-17",
      items: [{ prodIdx: 19, qty: 500, price: 95000 }, { prodIdx: 20, qty: 300, price: 120000 }] },

    // shipped (3)
    { vendor: activeVendors[3], poNumber: "PO-2026-0016", status: "shipped", orderDate: "2026-09-05", expectedDate: "2026-09-12",
      items: [{ prodIdx: 9, qty: 80, price: 280000 }, { prodIdx: 10, qty: 20, price: 450000 }] },
    { vendor: activeVendors[4], poNumber: "PO-2026-0017", status: "shipped", orderDate: "2026-09-06", expectedDate: "2026-09-13",
      items: [{ prodIdx: 12, qty: 150, price: 168000 }, { prodIdx: 13, qty: 100, price: 192000 }] },
    { vendor: activeVendors[5], poNumber: "PO-2026-0018", status: "shipped", orderDate: "2026-09-07", expectedDate: "2026-09-14",
      items: [{ prodIdx: 15, qty: 100, price: 310000 }] },

    // received (3)
    { vendor: activeVendors[0], poNumber: "PO-2026-0019", status: "received", orderDate: "2026-08-20", expectedDate: "2026-08-27",
      items: [{ prodIdx: 0, qty: 200, price: 125000 }, { prodIdx: 1, qty: 50, price: 320000 }] },
    { vendor: activeVendors[1], poNumber: "PO-2026-0020", status: "received", orderDate: "2026-08-22", expectedDate: "2026-08-29",
      items: [{ prodIdx: 4, qty: 400, price: 15000 }, { prodIdx: 6, qty: 250, price: 22000 }] },
    { vendor: activeVendors[3], poNumber: "PO-2026-0021", status: "received", orderDate: "2026-08-25", expectedDate: "2026-09-01",
      items: [{ prodIdx: 9, qty: 120, price: 280000 }] },

    // partially_received (3)
    { vendor: activeVendors[0], poNumber: "PO-2026-0022", status: "partially_received", orderDate: "2026-08-15", expectedDate: "2026-08-22",
      items: [{ prodIdx: 2, qty: 150, price: 85000 }, { prodIdx: 3, qty: 200, price: 65000 }] },
    { vendor: activeVendors[6], poNumber: "PO-2026-0023", status: "partially_received", orderDate: "2026-08-18", expectedDate: "2026-08-25",
      items: [{ prodIdx: 17, qty: 300, price: 32000 }, { prodIdx: 18, qty: 200, price: 55000 }] },
    { vendor: activeVendors[7], poNumber: "PO-2026-0024", status: "partially_received", orderDate: "2026-08-19", expectedDate: "2026-08-26",
      items: [{ prodIdx: 19, qty: 400, price: 95000 }] },

    // completed (5)
    { vendor: activeVendors[0], poNumber: "PO-2026-0025", status: "completed", orderDate: "2026-07-01", expectedDate: "2026-07-08",
      items: [{ prodIdx: 0, qty: 300, price: 125000 }, { prodIdx: 1, qty: 80, price: 320000 }] },
    { vendor: activeVendors[1], poNumber: "PO-2026-0026", status: "completed", orderDate: "2026-07-05", expectedDate: "2026-07-12",
      items: [{ prodIdx: 4, qty: 600, price: 15000 }, { prodIdx: 5, qty: 400, price: 28000 }] },
    { vendor: activeVendors[3], poNumber: "PO-2026-0027", status: "completed", orderDate: "2026-07-10", expectedDate: "2026-07-17",
      items: [{ prodIdx: 9, qty: 150, price: 280000 }, { prodIdx: 10, qty: 40, price: 450000 }] },
    { vendor: activeVendors[4], poNumber: "PO-2026-0028", status: "completed", orderDate: "2026-07-15", expectedDate: "2026-07-22",
      items: [{ prodIdx: 12, qty: 100, price: 168000 }, { prodIdx: 13, qty: 80, price: 192000 }] },
    { vendor: activeVendors[5], poNumber: "PO-2026-0029", status: "completed", orderDate: "2026-07-20", expectedDate: "2026-07-27",
      items: [{ prodIdx: 15, qty: 80, price: 310000 }, { prodIdx: 16, qty: 60, price: 285000 }] },

    // cancelled (3)
    { vendor: activeVendors[0], poNumber: "PO-2026-0030", status: "cancelled", orderDate: "2026-08-01", expectedDate: "2026-08-08",
      items: [{ prodIdx: 0, qty: 100, price: 125000 }] },
    { vendor: activeVendors[3], poNumber: "PO-2026-0031", status: "cancelled", orderDate: "2026-08-05", expectedDate: "2026-08-12",
      items: [{ prodIdx: 11, qty: 200, price: 180000 }] },
    { vendor: activeVendors[7], poNumber: "PO-2026-0032", status: "cancelled", orderDate: "2026-08-10", expectedDate: "2026-08-17",
      items: [{ prodIdx: 19, qty: 300, price: 95000 }] },

    // === Thêm PO cho hóa đơn (mỗi HĐ 1 PO riêng) ===
    // completed — cho INV-009 (approved)
    { vendor: activeVendors[0], poNumber: "PO-2026-0033", status: "completed", orderDate: "2026-06-20", expectedDate: "2026-06-27",
      items: [{ prodIdx: 2, qty: 150, price: 85000 }, { prodIdx: 3, qty: 200, price: 65000 }] },
    // completed — cho INV-010 (rejected)
    { vendor: activeVendors[1], poNumber: "PO-2026-0034", status: "completed", orderDate: "2026-06-18", expectedDate: "2026-06-25",
      items: [{ prodIdx: 4, qty: 600, price: 15000 }, { prodIdx: 5, qty: 400, price: 28000 }] },
    // completed — cho INV-011 (rejected)
    { vendor: activeVendors[4], poNumber: "PO-2026-0035", status: "completed", orderDate: "2026-06-15", expectedDate: "2026-06-22",
      items: [{ prodIdx: 12, qty: 100, price: 168000 }, { prodIdx: 13, qty: 80, price: 192000 }] },
    // completed — cho INV-012 (scheduled)
    { vendor: activeVendors[0], poNumber: "PO-2026-0036", status: "completed", orderDate: "2026-06-10", expectedDate: "2026-06-17",
      items: [{ prodIdx: 0, qty: 300, price: 125000 }, { prodIdx: 1, qty: 80, price: 320000 }] },
    // completed — cho INV-013 (scheduled)
    { vendor: activeVendors[3], poNumber: "PO-2026-0037", status: "completed", orderDate: "2026-06-08", expectedDate: "2026-06-15",
      items: [{ prodIdx: 9, qty: 150, price: 280000 }, { prodIdx: 10, qty: 40, price: 450000 }] },
    // completed — cho INV-014 (scheduled)
    { vendor: activeVendors[5], poNumber: "PO-2026-0038", status: "completed", orderDate: "2026-06-05", expectedDate: "2026-06-12",
      items: [{ prodIdx: 15, qty: 80, price: 310000 }, { prodIdx: 16, qty: 60, price: 285000 }] },
    // completed — cho INV-015 (paid)
    { vendor: activeVendors[0], poNumber: "PO-2026-0039", status: "completed", orderDate: "2026-05-25", expectedDate: "2026-06-01",
      items: [{ prodIdx: 0, qty: 300, price: 125000 }, { prodIdx: 1, qty: 80, price: 320000 }] },
    // completed — cho INV-016 (paid)
    { vendor: activeVendors[1], poNumber: "PO-2026-0040", status: "completed", orderDate: "2026-05-20", expectedDate: "2026-05-27",
      items: [{ prodIdx: 4, qty: 600, price: 15000 }, { prodIdx: 5, qty: 400, price: 28000 }] },
    // completed — cho INV-017 (paid)
    { vendor: activeVendors[3], poNumber: "PO-2026-0041", status: "completed", orderDate: "2026-05-15", expectedDate: "2026-05-22",
      items: [{ prodIdx: 9, qty: 150, price: 280000 }, { prodIdx: 10, qty: 40, price: 450000 }] },
    // completed — cho INV-018 (paid)
    { vendor: activeVendors[4], poNumber: "PO-2026-0042", status: "completed", orderDate: "2026-05-10", expectedDate: "2026-05-17",
      items: [{ prodIdx: 12, qty: 100, price: 168000 }, { prodIdx: 13, qty: 80, price: 192000 }] },
    // completed — cho INV-019 (paid)
    { vendor: activeVendors[5], poNumber: "PO-2026-0043", status: "completed", orderDate: "2026-05-05", expectedDate: "2026-05-12",
      items: [{ prodIdx: 15, qty: 80, price: 310000 }, { prodIdx: 16, qty: 60, price: 285000 }] },
    // partially_received — cho INV-020 (partially_paid)
    { vendor: activeVendors[0], poNumber: "PO-2026-0044", status: "partially_received", orderDate: "2026-06-25", expectedDate: "2026-07-02",
      items: [{ prodIdx: 2, qty: 150, price: 85000 }, { prodIdx: 3, qty: 200, price: 65000 }] },
    // partially_received — cho INV-021 (partially_paid)
    { vendor: activeVendors[6], poNumber: "PO-2026-0045", status: "partially_received", orderDate: "2026-06-22", expectedDate: "2026-06-29",
      items: [{ prodIdx: 17, qty: 300, price: 32000 }, { prodIdx: 18, qty: 200, price: 55000 }] },
    // partially_received — cho INV-022 (partially_paid)
    { vendor: activeVendors[7], poNumber: "PO-2026-0046", status: "partially_received", orderDate: "2026-06-20", expectedDate: "2026-06-27",
      items: [{ prodIdx: 19, qty: 400, price: 95000 }] },
  ];

  const pos = [];
  for (const po of posData) {
    const totalAmount = po.items.reduce((s, i) => s + i.qty * i.price, 0);
    const hasVendorResponse = !["new", "sent_to_vendor", "cancelled"].includes(po.status);
    const vendorResponse = po.status === "rejected" ? "rejected" : po.status === "modification_requested" ? "counter_proposed" : hasVendorResponse ? "accepted" : null;

    const order = await prisma.purchaseOrder.create({
      data: {
        vendorId: po.vendor.id,
        poNumber: po.poNumber,
        orderDate: new Date(po.orderDate),
        expectedDeliveryDate: new Date(po.expectedDate),
        deliveryLocation: "Kho trung tâm - 456 Nguyễn Văn Linh, Q.7, TP.HCM",
        totalAmount,
        status: po.status,
        createdBy: adminUser.id,
        vendorResponse: vendorResponse,
        vendorResponseAt: hasVendorResponse ? new Date(po.orderDate) : null,
        vendorResponseNotes: po.status === "rejected" ? "Không đủ hàng trong kho, xin hẹn lại đợt sau" :
          po.status === "modification_requested" ? "Đề nghị giảm số lượng 20% do hạn chế nguồn cung" : null,
      },
    });

    for (const item of po.items) {
      const isReceived = ["received", "completed"].includes(po.status);
      const isPartial = po.status === "partially_received";
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: order.id,
          productId: products[item.prodIdx].id,
          orderedQty: item.qty,
          unitPrice: item.price,
          lineTotal: item.qty * item.price,
          actualReceivedQty: isReceived ? item.qty : isPartial ? Math.floor(item.qty * 0.7) : 0,
          damagedQty: isPartial ? Math.floor(item.qty * 0.02) : 0,
          shortageQty: isPartial ? Math.floor(item.qty * 0.28) : 0,
        },
      });
    }
    pos.push(order);
  }
  console.log(`  ✅ ${pos.length} đơn hàng (11 trạng thái)`);

  // ASN for orders that have progressed past confirmed
  const asnStatuses = ["confirmed", "preparing", "shipped", "received", "partially_received", "completed"];
  let asnCount = 0;
  for (let i = 0; i < pos.length; i++) {
    if (asnStatuses.includes(posData[i].status)) {
      const asnStatus = ["confirmed"].includes(posData[i].status) ? "submitted" :
        ["preparing"].includes(posData[i].status) ? "approved" :
        ["shipped"].includes(posData[i].status) ? "in_transit" :
        "delivered";

      await prisma.advanceShippingNotice.create({
        data: {
          purchaseOrderId: pos[i].id,
          vendorId: posData[i].vendor.id,
          asnNumber: `ASN-2026-${String(i + 1).padStart(4, "0")}`,
          items: posData[i].items.map(it => ({ productId: products[it.prodIdx].id, qty: it.qty })),
          carrierName: "Vận tải Hoàng Long",
          vehiclePlate: `51C-${12345 + i}`,
          driverName: `Trần Văn ${String.fromCharCode(65 + (asnCount % 26))}`,
          driverPhone: `0901${String(234567 + asnCount).padStart(6, "0")}`,
          scheduledDate: new Date(posData[i].expectedDate),
          status: asnStatus,
          createdBy: getVendorUser(posData[i].vendor).id,
        },
      });
      asnCount++;
    }
  }
  console.log(`  ✅ ${asnCount} ASN (Thông báo giao hàng)`);

  // GRN for received/partially_received/completed orders
  const grnStatuses = ["received", "partially_received", "completed"];
  let grnCount = 0;
  for (let i = 0; i < pos.length; i++) {
    if (grnStatuses.includes(posData[i].status)) {
      await prisma.goodsReceipt.create({
        data: {
          purchaseOrderId: pos[i].id,
          vendorId: posData[i].vendor.id,
          grnNumber: `GRN-2026-${String(grnCount + 1).padStart(4, "0")}`,
          receivedDate: new Date(posData[i].expectedDate),
          receiptStatus: posData[i].status === "partially_received" ? "partial" : "full",
          receivedBy: adminUser.id,
          notes: posData[i].status === "partially_received" ? "Thiếu hàng, NCC hẹn giao bổ sung" : "Hàng đủ, chất lượng đạt",
        },
      });
      grnCount++;
    }
  }
  console.log(`  ✅ ${grnCount} GRN (Phiếu nhận hàng)`);

  // ========== MODULE 4: FINANCE ==========
  // Invoice statuses (7): submitted, under_review, approved, rejected, scheduled, paid, partially_paid
  // DebitNote statuses (4): issued, acknowledged, disputed, resolved
  // Target: 2-5 per status
  console.log("\n📦 Module 4: Tạo Hóa đơn & Debit Notes...");

  const invoicesData = [
    // submitted (3) — each linked to unique partially_received PO
    { vendor: activeVendors[0], number: "INV-2026-001", subtotal: 25750000, tax: 2575000, total: 28325000,
      status: "submitted", payStatus: "unpaid", invoiceDate: "2026-09-15", poIdx: 21 }, // PO-0022
    { vendor: activeVendors[6], number: "INV-2026-002", subtotal: 20600000, tax: 2060000, total: 22660000,
      status: "submitted", payStatus: "unpaid", invoiceDate: "2026-09-18", poIdx: 22 }, // PO-0023
    { vendor: activeVendors[7], number: "INV-2026-003", subtotal: 38000000, tax: 3800000, total: 41800000,
      status: "submitted", payStatus: "unpaid", invoiceDate: "2026-09-20", poIdx: 23 }, // PO-0024

    // under_review (3) — each linked to unique completed PO
    { vendor: activeVendors[0], number: "INV-2026-004", subtotal: 63100000, tax: 6310000, total: 69410000,
      status: "under_review", payStatus: "unpaid", invoiceDate: "2026-09-10", poIdx: 24 }, // PO-0025
    { vendor: activeVendors[1], number: "INV-2026-005", subtotal: 20200000, tax: 2020000, total: 22220000,
      status: "under_review", payStatus: "unpaid", invoiceDate: "2026-09-12", poIdx: 25 }, // PO-0026
    { vendor: activeVendors[4], number: "INV-2026-006", subtotal: 32160000, tax: 3216000, total: 35376000,
      status: "under_review", payStatus: "unpaid", invoiceDate: "2026-09-14", poIdx: 27 }, // PO-0028

    // approved (3) — each linked to unique completed PO
    { vendor: activeVendors[3], number: "INV-2026-007", subtotal: 60000000, tax: 6000000, total: 66000000,
      status: "approved", payStatus: "unpaid", invoiceDate: "2026-08-20", poIdx: 26 }, // PO-0027
    { vendor: activeVendors[5], number: "INV-2026-008", subtotal: 41900000, tax: 4190000, total: 46090000,
      status: "approved", payStatus: "unpaid", invoiceDate: "2026-08-22", poIdx: 28 }, // PO-0029
    { vendor: activeVendors[0], number: "INV-2026-009", subtotal: 25750000, tax: 2575000, total: 28325000,
      status: "approved", payStatus: "unpaid", invoiceDate: "2026-08-25", poIdx: 32 }, // PO-0033

    // rejected (2) — each linked to unique completed PO
    { vendor: activeVendors[1], number: "INV-2026-010", subtotal: 20200000, tax: 2020000, total: 22220000,
      status: "rejected", payStatus: "unpaid", invoiceDate: "2026-09-05", poIdx: 33 }, // PO-0034
    { vendor: activeVendors[4], number: "INV-2026-011", subtotal: 32160000, tax: 3216000, total: 35376000,
      status: "rejected", payStatus: "unpaid", invoiceDate: "2026-09-08", poIdx: 34 }, // PO-0035

    // scheduled (3) — each linked to unique completed PO
    { vendor: activeVendors[0], number: "INV-2026-012", subtotal: 63100000, tax: 6310000, total: 69410000,
      status: "scheduled", payStatus: "unpaid", invoiceDate: "2026-08-01", poIdx: 35 }, // PO-0036
    { vendor: activeVendors[3], number: "INV-2026-013", subtotal: 60000000, tax: 6000000, total: 66000000,
      status: "scheduled", payStatus: "unpaid", invoiceDate: "2026-08-05", poIdx: 36 }, // PO-0037
    { vendor: activeVendors[5], number: "INV-2026-014", subtotal: 41900000, tax: 4190000, total: 46090000,
      status: "scheduled", payStatus: "unpaid", invoiceDate: "2026-08-10", poIdx: 37 }, // PO-0038

    // paid (5) — each linked to unique completed PO
    { vendor: activeVendors[0], number: "INV-2026-015", subtotal: 63100000, tax: 6310000, total: 69410000,
      status: "paid", payStatus: "paid", invoiceDate: "2026-07-01", poIdx: 38 }, // PO-0039
    { vendor: activeVendors[1], number: "INV-2026-016", subtotal: 20200000, tax: 2020000, total: 22220000,
      status: "paid", payStatus: "paid", invoiceDate: "2026-07-05", poIdx: 39 }, // PO-0040
    { vendor: activeVendors[3], number: "INV-2026-017", subtotal: 60000000, tax: 6000000, total: 66000000,
      status: "paid", payStatus: "paid", invoiceDate: "2026-07-10", poIdx: 40 }, // PO-0041
    { vendor: activeVendors[4], number: "INV-2026-018", subtotal: 32160000, tax: 3216000, total: 35376000,
      status: "paid", payStatus: "paid", invoiceDate: "2026-07-15", poIdx: 41 }, // PO-0042
    { vendor: activeVendors[5], number: "INV-2026-019", subtotal: 41900000, tax: 4190000, total: 46090000,
      status: "paid", payStatus: "paid", invoiceDate: "2026-07-20", poIdx: 42 }, // PO-0043

    // partially_paid (3) — each linked to unique partially_received PO
    { vendor: activeVendors[0], number: "INV-2026-020", subtotal: 25750000, tax: 2575000, total: 28325000,
      status: "partially_paid", payStatus: "partially_paid", invoiceDate: "2026-07-25", poIdx: 43 }, // PO-0044
    { vendor: activeVendors[6], number: "INV-2026-021", subtotal: 20600000, tax: 2060000, total: 22660000,
      status: "partially_paid", payStatus: "partially_paid", invoiceDate: "2026-08-01", poIdx: 44 }, // PO-0045
    { vendor: activeVendors[7], number: "INV-2026-022", subtotal: 38000000, tax: 3800000, total: 41800000,
      status: "partially_paid", payStatus: "partially_paid", invoiceDate: "2026-08-05", poIdx: 45 }, // PO-0046
  ];

  const invoices = [];
  for (const inv of invoicesData) {
    const isPaid = inv.payStatus === "paid";
    const isPartialPaid = inv.payStatus === "partially_paid";
    const vuIdx = activeVendors.findIndex(v => v.id === inv.vendor.id);

    const invoice = await prisma.invoice.create({
      data: {
        vendorId: inv.vendor.id,
        purchaseOrderId: inv.poIdx !== undefined ? pos[inv.poIdx].id : null,
        invoiceNumber: inv.number,
        invoiceDate: new Date(inv.invoiceDate),
        subtotal: inv.subtotal,
        taxRate: 10,
        taxAmount: inv.tax,
        totalAmount: inv.total,
        status: inv.status,
        paymentStatus: inv.payStatus,
        paymentDueDate: new Date(new Date(inv.invoiceDate).getTime() + 30 * 24 * 60 * 60 * 1000),
        paymentDate: isPaid ? new Date(new Date(inv.invoiceDate).getTime() + 20 * 24 * 60 * 60 * 1000) : null,
        paymentAmount: isPaid ? inv.total : isPartialPaid ? Math.floor(inv.total * 0.5) : null,
        paymentReference: isPaid ? `CK-VCB-${inv.invoiceDate.replace(/-/g, "")}-001` : isPartialPaid ? `CK-PARTIAL-${inv.invoiceDate.replace(/-/g, "")}-001` : null,
        paymentMethod: isPaid || isPartialPaid ? "bank_transfer" : null,
        paymentNotes: isPartialPaid ? "Thanh toán đợt 1 (50%), đợt 2 sẽ thanh toán vào cuối tháng" : null,
        createdBy: vendorUsers[vuIdx]?.id || vendorUsers[0].id,
      },
    });
    invoices.push(invoice);
  }
  console.log(`  ✅ ${invoices.length} hóa đơn (7 trạng thái)`);

  // Debit Notes — 4 statuses: issued, acknowledged, disputed, resolved
  const debitNotesData = [
    // issued (3)
    { vendor: activeVendors[0], number: "DN-2026-001", debitType: "penalty", amount: 2500000,
      description: "Phạt giao hàng trễ 3 ngày - PO-2026-0022", status: "issued" },
    { vendor: activeVendors[3], number: "DN-2026-002", debitType: "quality_deduction", amount: 5600000,
      description: "Khấu trừ do hải sản không đạt chuẩn nhiệt độ khi giao", status: "issued" },
    { vendor: activeVendors[7], number: "DN-2026-003", debitType: "shortage", amount: 3800000,
      description: "Thiếu hàng PO-2026-0024 (30% chưa giao)", status: "issued" },

    // acknowledged (3)
    { vendor: activeVendors[1], number: "DN-2026-004", debitType: "penalty", amount: 1200000,
      description: "Phạt giao rau không đúng specification", status: "acknowledged" },
    { vendor: activeVendors[4], number: "DN-2026-005", debitType: "marketing_fee", amount: 8000000,
      description: "Phí trưng bày sản phẩm Q3/2026", status: "acknowledged" },
    { vendor: activeVendors[6], number: "DN-2026-006", debitType: "discount", amount: 4500000,
      description: "Chiết khấu thương mại theo hợp đồng Q3/2026", status: "acknowledged" },

    // disputed (2)
    { vendor: activeVendors[0], number: "DN-2026-007", debitType: "penalty", amount: 6000000,
      description: "Phạt giao hàng trễ 5 ngày - PO-2026-0013", status: "disputed" },
    { vendor: activeVendors[3], number: "DN-2026-008", debitType: "quality_deduction", amount: 12000000,
      description: "Khấu trừ do lô tôm sú bị dính kháng sinh", status: "disputed" },

    // resolved (4)
    { vendor: activeVendors[0], number: "DN-2026-009", debitType: "penalty", amount: 1500000,
      description: "Phạt giao hàng trễ 1 ngày - PO cũ tháng 6", status: "resolved" },
    { vendor: activeVendors[1], number: "DN-2026-010", debitType: "shortage", amount: 900000,
      description: "Thiếu hàng rau củ đơn tháng 6", status: "resolved" },
    { vendor: activeVendors[4], number: "DN-2026-011", debitType: "marketing_fee", amount: 8000000,
      description: "Phí trưng bày sản phẩm Q2/2026", status: "resolved" },
    { vendor: activeVendors[5], number: "DN-2026-012", debitType: "discount", amount: 6500000,
      description: "Chiết khấu thương mại Vinamilk Q2/2026", status: "resolved" },
  ];

  for (const dn of debitNotesData) {
    await prisma.debitNote.create({
      data: {
        vendorId: dn.vendor.id,
        debitNoteNumber: dn.number,
        debitType: dn.debitType,
        amount: dn.amount,
        description: dn.description,
        status: dn.status,
        vendorConfirmedAt: dn.status === "acknowledged" || dn.status === "resolved" ? new Date("2026-08-15") : null,
        vendorDisputeNotes: dn.status === "disputed" ? "NCC không đồng ý với mức phạt, yêu cầu xem xét lại" : null,
        createdBy: adminUser.id,
      },
    });
  }
  console.log(`  ✅ ${debitNotesData.length} phiếu ghi nợ (4 trạng thái)`);

  // ========== MODULE 5: KPI ==========
  console.log("\n📦 Module 5: Tạo KPI Scores...");

  const kpiData = [
    { vendor: activeVendors[0], totalScore: 96.5, ranking: "A" },
    { vendor: activeVendors[1], totalScore: 88.0, ranking: "B" },
    { vendor: activeVendors[3], totalScore: 97.2, ranking: "A" },
    { vendor: activeVendors[4], totalScore: 82.5, ranking: "B" },
    { vendor: activeVendors[5], totalScore: 98.0, ranking: "A" },
    { vendor: activeVendors[6], totalScore: 91.5, ranking: "B" },
    { vendor: activeVendors[7], totalScore: 78.0, ranking: "C" },
  ];

  for (const kpi of kpiData) {
    await prisma.kpiScore.create({
      data: {
        vendorId: kpi.vendor.id,
        period: "2026-Q2", periodType: "quarterly",
        totalScore: kpi.totalScore, ranking: kpi.ranking,
        isPublished: true, publishedAt: new Date("2026-07-01"),
        reviewedBy: adminUser.id,
      },
    });
  }
  console.log("  ✅ KPI Scores Q2-2026");

  // ========== MODULE 6: SUPPORT ==========
  console.log("\n📦 Module 6: Tạo Tickets & Thông báo...");

  const ticketsData = [
    { vendor: activeVendors[0], title: "Lỗi không thể tải lên hóa đơn XML", category: "technical", priority: "high", status: "in_progress" },
    { vendor: activeVendors[1], title: "Yêu cầu cập nhật thông tin ngân hàng", category: "general", priority: "medium", status: "new" },
    { vendor: activeVendors[3], title: "Chênh lệch số lượng nhận hàng GRN-2026-0001", category: "order", priority: "high", status: "resolved" },
  ];

  const tickets = [];
  for (let i = 0; i < ticketsData.length; i++) {
    const t = ticketsData[i];
    const vuIdx = activeVendors.findIndex(v => v.id === t.vendor.id);
    const ticket = await prisma.ticket.create({
      data: {
        vendorId: t.vendor.id,
        ticketNumber: `TK-${String(i + 1).padStart(6, "0")}`,
        title: t.title, category: t.category, priority: t.priority as any,
        description: `Chi tiết: ${t.title}. Vui lòng xử lý sớm.`,
        status: t.status,
        createdBy: vendorUsers[vuIdx]?.id || vendorUsers[0].id,
        resolvedAt: t.status === "resolved" ? new Date() : null,
      },
    });
    tickets.push(ticket);
  }

  // Ticket messages
  await prisma.ticketMessage.create({
    data: { ticketId: tickets[0].id, senderId: vendorUsers[0].id, message: "Khi tôi upload file XML hóa đơn, hệ thống báo lỗi 'Invalid format'. File này đã validate qua cổng thuế rồi." },
  });
  await prisma.ticketMessage.create({
    data: { ticketId: tickets[0].id, senderId: adminUser.id, message: "Chào anh/chị, chúng tôi đang kiểm tra. Vui lòng gửi file XML mẫu để team kỹ thuật xem xét." },
  });
  await prisma.ticketMessage.create({
    data: { ticketId: tickets[2].id, senderId: vendorUsers[3].id, message: "Theo ASN chúng tôi giao đủ 100kg tôm sú, nhưng GRN chỉ ghi nhận 95kg." },
  });
  await prisma.ticketMessage.create({
    data: { ticketId: tickets[2].id, senderId: adminUser.id, message: "Đã kiểm tra lại với kho. Xác nhận nhận đủ 100kg. GRN đã được điều chỉnh. Xin lỗi vì sự bất tiện." },
  });
  console.log(`  ✅ ${tickets.length} tickets + tin nhắn`);

  // Announcements
  await prisma.announcement.create({
    data: {
      title: "Thông báo lịch nghỉ lễ Quốc khánh 2/9",
      content: "Kính gửi Quý NCC,\n\nSiêu thị sẽ nghỉ lễ Quốc khánh từ 01/09 - 03/09/2026. Các đơn hàng giao trong khoảng thời gian này sẽ được dời sang ngày 04/09.\n\nVui lòng lưu ý điều chỉnh kế hoạch giao hàng.\n\nTrân trọng.",
      targetType: "all", isImportant: true, status: "published",
      publishAt: new Date("2026-07-25"), createdBy: adminUser.id,
    },
  });
  await prisma.announcement.create({
    data: {
      title: "Cập nhật quy trình nộp hóa đơn điện tử từ 01/08/2026",
      content: "Từ ngày 01/08/2026, tất cả NCC cần nộp hóa đơn điện tử qua hệ thống Vendor Portal (mục Tài chính > Nộp hóa đơn). Hệ thống sẽ tự động đối chiếu với GRN.\n\nHướng dẫn chi tiết: xem tại mục Hỗ trợ.",
      targetType: "all", isImportant: false, status: "published",
      publishAt: new Date("2026-07-20"), createdBy: adminUser.id,
    },
  });
  console.log("  ✅ 2 thông báo");

  // ========== MODULE 7: AUDIT LOGS ==========
  console.log("\n📦 Module 7: Tạo Audit Logs...");

  const auditData = [
    { action: "CREATE", module: "vendors", description: "Tạo NCC mới: Công ty TNHH Thực phẩm Minh Phát" },
    { action: "APPROVE", module: "vendors", description: "Duyệt hồ sơ NCC: Công ty TNHH Thực phẩm Minh Phát" },
    { action: "CREATE", module: "products", description: "Thêm sản phẩm: Thịt heo ba rọi tươi (MP-001)" },
    { action: "APPROVE", module: "products", description: "Duyệt sản phẩm: Thịt heo ba rọi tươi (MP-001)" },
    { action: "CREATE", module: "orders", description: "Tạo PO-2026-0025 cho NCC Minh Phát — 63,100,000 VND" },
    { action: "STATUS_CHANGE", module: "orders", description: "PO-2026-0025 chuyển trạng thái: new → confirmed" },
    { action: "STATUS_CHANGE", module: "orders", description: "PO-2026-0025 chuyển trạng thái: confirmed → completed" },
    { action: "CREATE", module: "finance", description: "NCC Minh Phát nộp hóa đơn INV-2026-016 — 45,100,000 VND" },
    { action: "APPROVE", module: "finance", description: "Duyệt hóa đơn INV-2026-016" },
    { action: "PAYMENT", module: "finance", description: "Thanh toán INV-2026-016 — 45,100,000 VND qua CK ngân hàng" },
    { action: "CREATE", module: "finance", description: "Tạo phiếu ghi nợ DN-2026-001 cho NCC Minh Phát — 2,500,000 VND" },
    { action: "CREATE", module: "support", description: "Ticket TK-000001: Lỗi không thể tải lên hóa đơn XML" },
    { action: "LOGIN", module: "admin", description: "admin@vendor-portal.com đăng nhập hệ thống" },
    { action: "LOGIN", module: "admin", description: "vendor1@demo.com đăng nhập hệ thống" },
  ];

  for (const log of auditData) {
    await prisma.auditLog.create({
      data: { userId: adminUser.id, action: log.action, module: log.module, description: log.description },
    });
  }
  console.log(`  ✅ ${auditData.length} audit logs`);

  // ========== SUMMARY ==========
  const vendorStatusCounts: Record<string, number> = {};
  for (const v of vendorsData) {
    vendorStatusCounts[v.status] = (vendorStatusCounts[v.status] || 0) + 1;
  }
  const poStatusCounts: Record<string, number> = {};
  for (const p of posData) {
    poStatusCounts[p.status] = (poStatusCounts[p.status] || 0) + 1;
  }
  const invStatusCounts: Record<string, number> = {};
  for (const inv of invoicesData) {
    invStatusCounts[inv.status] = (invStatusCounts[inv.status] || 0) + 1;
  }
  const dnStatusCounts: Record<string, number> = {};
  for (const dn of debitNotesData) {
    dnStatusCounts[dn.status] = (dnStatusCounts[dn.status] || 0) + 1;
  }

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEMO DATA ĐÃ TẠO XONG!\n");
  console.log("📌 Tài khoản demo:");
  console.log("   Admin:      admin@vendor-portal.com / Vendor@123");
  console.log("   Thu mua:    buyer@vendor-portal.com / Vendor@123");
  console.log("   Kế toán:    accountant@vendor-portal.com / Vendor@123");
  for (let i = 0; i < Math.min(vendorUsers.length, 5); i++) {
    console.log(`   Vendor${i + 1}:    vendor${i + 1}@demo.com / Vendor@123 (${activeVendors[i].companyName})`);
  }

  console.log("\n📌 Dữ liệu đã tạo:");
  console.log(`   • ${vendors.length} Nhà cung cấp:`);
  for (const [status, count] of Object.entries(vendorStatusCounts)) {
    console.log(`     - ${status}: ${count}`);
  }
  console.log(`   • ${products.length} Sản phẩm + ${categories.length} Danh mục`);
  console.log(`   • ${pos.length} Đơn hàng:`);
  for (const [status, count] of Object.entries(poStatusCounts)) {
    console.log(`     - ${status}: ${count}`);
  }
  console.log(`   • ${invoices.length} Hóa đơn:`);
  for (const [status, count] of Object.entries(invStatusCounts)) {
    console.log(`     - ${status}: ${count}`);
  }
  console.log(`   • ${debitNotesData.length} Phiếu ghi nợ:`);
  for (const [status, count] of Object.entries(dnStatusCounts)) {
    console.log(`     - ${status}: ${count}`);
  }
  console.log(`   • ${kpiData.length} KPI Scores + Rankings`);
  console.log(`   • ${tickets.length} Tickets + 2 Thông báo`);
  console.log(`   • ${auditData.length} Audit logs`);
  console.log("=".repeat(60));
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
