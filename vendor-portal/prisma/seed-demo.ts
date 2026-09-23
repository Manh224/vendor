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
  const adminUser = await prisma.user.findFirst({ where: { email: "admin@vendor-portal.com" } });
  if (!vendorAdminRole || !adminUser) {
    throw new Error("Cần chạy seed cơ bản trước: npx tsx prisma/seed.ts");
  }

  // ========== MODULE 1: VENDORS ==========
  console.log("📦 Module 1: Tạo Nhà cung cấp...");

  const vendorsData = [
    { companyName: "Công ty TNHH Thực phẩm Minh Phát", taxCode: "0312345678", city: "TP.HCM", phone: "028-3456-7890", email: "contact@minhphat.vn", status: "approved", currentRanking: "A", bankName: "Vietcombank", bankAccountNo: "1234567890", bankAccountName: "CTY TNHH THUC PHAM MINH PHAT" },
    { companyName: "Công ty CP Nông sản Đồng Nai", taxCode: "3601234567", city: "Đồng Nai", phone: "0251-234-5678", email: "sales@nongsandnai.vn", status: "approved", currentRanking: "B", bankName: "Techcombank", bankAccountNo: "9876543210", bankAccountName: "CTY CP NONG SAN DONG NAI" },
    { companyName: "Công ty TNHH SX-TM Hải Sản Biển Đông", taxCode: "0309876543", city: "TP.HCM", phone: "028-9876-5432", email: "info@biendong-seafood.com", status: "approved", currentRanking: "A", bankName: "BIDV", bankAccountNo: "5555666677", bankAccountName: "CTY TNHH SX-TM HAI SAN BIEN DONG" },
    { companyName: "Công ty TNHH Đồ uống Tân Hiệp Phát", taxCode: "0301122334", city: "Bình Dương", phone: "0274-123-4567", email: "order@tanhiepphat.com.vn", status: "approved", currentRanking: "B", bankName: "ACB", bankAccountNo: "1112223334", bankAccountName: "CTY TNHH DO UONG TAN HIEP PHAT" },
    { companyName: "Hợp tác xã Rau sạch Đà Lạt", taxCode: "5801122334", city: "Lâm Đồng", phone: "0263-555-6789", email: "htx@rausachdalat.vn", status: "pending_review", currentRanking: "N/A", bankName: "Agribank", bankAccountNo: "7778889990", bankAccountName: "HTX RAU SACH DA LAT" },
  ];

  const vendors = [];
  for (const v of vendorsData) {
    const vendor = await prisma.vendor.create({
      data: { ...v, address: `123 Đường ABC, ${v.city}`, createdBy: adminUser.id },
    });
    vendors.push(vendor);
  }
  console.log(`  ✅ ${vendors.length} nhà cung cấp`);

  // Create vendor users
  const hashedPw = await bcrypt.hash("Vendor@123", 12);
  const vendorUsers = [];
  for (let i = 0; i < 4; i++) {
    const vu = await prisma.user.create({
      data: {
        email: `vendor${i + 1}@demo.com`,
        passwordHash: hashedPw,
        fullName: `NV Kinh doanh - ${vendors[i].companyName.split(" ").slice(-2).join(" ")}`,
        roleId: vendorAdminRole.id,
        vendorId: vendors[i].id,
        side: "vendor",
        isActive: true,
      },
    });
    vendorUsers.push(vu);
  }
  console.log(`  ✅ ${vendorUsers.length} tài khoản vendor`);

  // Vendor contacts
  for (let i = 0; i < 4; i++) {
    await prisma.vendorContact.create({
      data: { vendorId: vendors[i].id, fullName: `Nguyễn Văn ${String.fromCharCode(65 + i)}`, position: "Giám đốc kinh doanh", email: vendorsData[i].email, phone: vendorsData[i].phone, isPrimary: true },
    });
  }
  console.log("  ✅ Liên hệ NCC");

  // Contracts
  for (let i = 0; i < 4; i++) {
    await prisma.contract.create({
      data: {
        vendorId: vendors[i].id, contractNumber: `HD-2026-${String(i + 1).padStart(3, "0")}`,
        contractType: "principal", title: `Hợp đồng cung cấp ${i < 2 ? "thực phẩm" : i === 2 ? "hải sản" : "đồ uống"} năm 2026`,
        startDate: new Date("2026-01-01"), endDate: new Date("2026-12-31"),
        paymentTermsDays: 30, discountRate: i === 0 ? 3 : 2, displayFee: 5000000 + i * 1000000,
        status: "active", signedByVendor: true, signedBySupermarket: true, signedAt: new Date("2026-01-01"),
        createdBy: adminUser.id,
      },
    });
  }
  console.log("  ✅ Hợp đồng");

  // ========== MODULE 2: PRODUCTS ==========
  console.log("\n📦 Module 2: Tạo Sản phẩm...");

  // Categories
  const catData = [
    { name: "Thực phẩm tươi sống", code: "FRESH" },
    { name: "Đồ uống", code: "BEVERAGE" },
    { name: "Rau củ quả", code: "VEGETABLE" },
    { name: "Hải sản", code: "SEAFOOD" },
    { name: "Đồ khô - Gia vị", code: "DRY_SPICE" },
  ];
  const categories = [];
  for (const c of catData) {
    const cat = await prisma.productCategory.create({ data: c });
    categories.push(cat);
  }

  const productsData = [
    // Vendor 0: Thực phẩm Minh Phát
    { vendorIdx: 0, catIdx: 0, sku: "MP-001", name: "Thịt heo ba rọi tươi (kg)", currentPrice: 125000, status: "approved" },
    { vendorIdx: 0, catIdx: 0, sku: "MP-002", name: "Thịt bò Úc nhập khẩu (kg)", currentPrice: 320000, status: "approved" },
    { vendorIdx: 0, catIdx: 0, sku: "MP-003", name: "Gà ta nguyên con (kg)", currentPrice: 85000, status: "approved" },
    { vendorIdx: 0, catIdx: 4, sku: "MP-004", name: "Nước mắm Phú Quốc 35° (chai 500ml)", currentPrice: 65000, status: "approved" },
    // Vendor 1: Nông sản Đồng Nai
    { vendorIdx: 1, catIdx: 2, sku: "DN-001", name: "Bắp cải xanh (kg)", currentPrice: 15000, status: "approved" },
    { vendorIdx: 1, catIdx: 2, sku: "DN-002", name: "Cà chua beef (kg)", currentPrice: 28000, status: "approved" },
    { vendorIdx: 1, catIdx: 2, sku: "DN-003", name: "Dưa leo baby (kg)", currentPrice: 22000, status: "approved" },
    { vendorIdx: 1, catIdx: 2, sku: "DN-004", name: "Xà lách Mỹ (bó)", currentPrice: 18000, status: "pending" },
    // Vendor 2: Hải Sản Biển Đông
    { vendorIdx: 2, catIdx: 3, sku: "BD-001", name: "Tôm sú loại 1 (kg)", currentPrice: 280000, status: "approved" },
    { vendorIdx: 2, catIdx: 3, sku: "BD-002", name: "Cá hồi Na Uy fillet (kg)", currentPrice: 450000, status: "approved" },
    { vendorIdx: 2, catIdx: 3, sku: "BD-003", name: "Mực ống tươi (kg)", currentPrice: 180000, status: "approved" },
    // Vendor 3: Đồ uống Tân Hiệp Phát
    { vendorIdx: 3, catIdx: 1, sku: "THP-001", name: "Trà xanh 0 Độ (thùng 24 lon)", currentPrice: 168000, status: "approved" },
    { vendorIdx: 3, catIdx: 1, sku: "THP-002", name: "Nước tăng lực Number 1 (thùng 24 lon)", currentPrice: 192000, status: "approved" },
    { vendorIdx: 3, catIdx: 1, sku: "THP-003", name: "Sữa đậu nành Dr.Thanh (thùng 24 hộp)", currentPrice: 145000, status: "draft" },
  ];

  const products: any[] = [];
  for (const p of productsData) {
    const prod = await prisma.product.create({
      data: {
        vendorId: vendors[p.vendorIdx].id, categoryId: categories[p.catIdx].id,
        sku: p.sku, name: p.name, currentPrice: p.currentPrice, status: p.status,
        unit: p.name.includes("kg") ? "kg" : p.name.includes("thùng") ? "thùng" : "cái",
        createdBy: vendorUsers[Math.min(p.vendorIdx, 3)].id,
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
      vendorId: vendors[0].id, productId: products[0].id,
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
      vendorId: vendors[3].id, title: "Mua 2 thùng Trà xanh 0 Độ tặng 1 thùng",
      promotionType: "buy_get", description: "Chương trình khuyến mãi mùa hè 2026",
      startDate: new Date("2026-08-01"), endDate: new Date("2026-08-31"),
      productIds: [products[11].id], estimatedQty: 500, committedStock: 200,
      status: "approved", reviewedBy: adminUser.id, reviewedAt: new Date(),
      createdBy: vendorUsers[3].id,
    },
  });
  console.log("  ✅ 1 chương trình khuyến mại");

  // ========== MODULE 3: ORDERS ==========
  console.log("\n📦 Module 3: Tạo Đơn hàng (PO/ASN/GRN)...");

  const posData = [
    { vendorIdx: 0, poNumber: "PO-2026-0001", status: "delivered", items: [{ prodIdx: 0, qty: 200, price: 125000 }, { prodIdx: 1, qty: 50, price: 320000 }] },
    { vendorIdx: 1, poNumber: "PO-2026-0002", status: "confirmed", items: [{ prodIdx: 4, qty: 500, price: 15000 }, { prodIdx: 5, qty: 300, price: 28000 }, { prodIdx: 6, qty: 200, price: 22000 }] },
    { vendorIdx: 2, poNumber: "PO-2026-0003", status: "new", items: [{ prodIdx: 8, qty: 100, price: 280000 }, { prodIdx: 9, qty: 30, price: 450000 }] },
    { vendorIdx: 3, poNumber: "PO-2026-0004", status: "delivered", items: [{ prodIdx: 11, qty: 100, price: 168000 }, { prodIdx: 12, qty: 80, price: 192000 }] },
    { vendorIdx: 0, poNumber: "PO-2026-0005", status: "partially_received", items: [{ prodIdx: 2, qty: 150, price: 85000 }, { prodIdx: 3, qty: 200, price: 65000 }] },
  ];

  const pos = [];
  for (const po of posData) {
    const totalAmount = po.items.reduce((s, i) => s + i.qty * i.price, 0);
    const order = await prisma.purchaseOrder.create({
      data: {
        vendorId: vendors[po.vendorIdx].id, poNumber: po.poNumber,
        orderDate: new Date("2026-07-15"), expectedDeliveryDate: new Date("2026-07-22"),
        deliveryLocation: "Kho trung tâm - 456 Nguyễn Văn Linh, Q.7, TP.HCM",
        totalAmount, status: po.status, createdBy: adminUser.id,
        vendorResponse: po.status !== "new" ? "accepted" : null,
        vendorResponseAt: po.status !== "new" ? new Date("2026-07-16") : null,
      },
    });

    for (const item of po.items) {
      await prisma.purchaseOrderItem.create({
        data: {
          purchaseOrderId: order.id, productId: products[item.prodIdx].id,
          orderedQty: item.qty, unitPrice: item.price, lineTotal: item.qty * item.price,
          actualReceivedQty: po.status === "delivered" ? item.qty : po.status === "partially_received" ? Math.floor(item.qty * 0.7) : 0,
        },
      });
    }
    pos.push(order);
  }
  console.log(`  ✅ ${pos.length} đơn hàng`);

  // ASN for delivered/partially orders
  for (let i = 0; i < pos.length; i++) {
    if (["delivered", "partially_received", "confirmed"].includes(posData[i].status)) {
      await prisma.advanceShippingNotice.create({
        data: {
          purchaseOrderId: pos[i].id, vendorId: vendors[posData[i].vendorIdx].id,
          asnNumber: `ASN-2026-${String(i + 1).padStart(4, "0")}`,
          items: posData[i].items.map(it => ({ productId: products[it.prodIdx].id, qty: it.qty })),
          carrierName: "Vận tải Hoàng Long", vehiclePlate: `51C-${12345 + i}`,
          driverName: `Trần Văn ${String.fromCharCode(65 + i)}`, driverPhone: `0901${234567 + i}`,
          scheduledDate: new Date("2026-07-21"), status: posData[i].status === "confirmed" ? "submitted" : "delivered",
          createdBy: vendorUsers[Math.min(posData[i].vendorIdx, 3)].id,
        },
      });
    }
  }
  console.log("  ✅ ASN (Thông báo giao hàng)");

  // GRN for delivered orders
  for (let i = 0; i < pos.length; i++) {
    if (posData[i].status === "delivered" || posData[i].status === "partially_received") {
      await prisma.goodsReceipt.create({
        data: {
          purchaseOrderId: pos[i].id, vendorId: vendors[posData[i].vendorIdx].id,
          grnNumber: `GRN-2026-${String(i + 1).padStart(4, "0")}`,
          receivedDate: new Date("2026-07-22"),
          receiptStatus: posData[i].status === "delivered" ? "full" : "partial",
          receivedBy: adminUser.id,
          notes: posData[i].status === "partially_received" ? "Thiếu 30% hàng, NCC hẹn giao bổ sung ngày 25/07" : "Hàng đủ, chất lượng đạt",
        },
      });
    }
  }
  console.log("  ✅ GRN (Phiếu nhận hàng)");

  // ========== MODULE 4: FINANCE ==========
  console.log("\n📦 Module 4: Tạo Hóa đơn & Debit Notes...");

  const invoicesData = [
    { vendorIdx: 0, number: "INV-2026-001", subtotal: 41000000, tax: 4100000, total: 45100000, status: "approved", payStatus: "paid" },
    { vendorIdx: 3, number: "INV-2026-002", subtotal: 32160000, tax: 3216000, total: 35376000, status: "approved", payStatus: "unpaid" },
    { vendorIdx: 0, number: "INV-2026-003", subtotal: 25750000, tax: 2575000, total: 28325000, status: "submitted", payStatus: "unpaid" },
    { vendorIdx: 1, number: "INV-2026-004", subtotal: 20300000, tax: 2030000, total: 22330000, status: "draft", payStatus: "unpaid" },
    { vendorIdx: 2, number: "INV-2026-005", subtotal: 41500000, tax: 4150000, total: 45650000, status: "submitted", payStatus: "unpaid" },
  ];

  const invoices = [];
  for (const inv of invoicesData) {
    const invoice = await prisma.invoice.create({
      data: {
        vendorId: vendors[inv.vendorIdx].id, invoiceNumber: inv.number,
        invoiceDate: new Date("2026-07-20"), subtotal: inv.subtotal,
        taxRate: 10, taxAmount: inv.tax, totalAmount: inv.total,
        status: inv.status, paymentStatus: inv.payStatus,
        paymentDueDate: new Date("2026-08-20"),
        paymentDate: inv.payStatus === "paid" ? new Date("2026-07-25") : null,
        paymentAmount: inv.payStatus === "paid" ? inv.total : null,
        paymentReference: inv.payStatus === "paid" ? "CK-VCB-20260725-001" : null,
        createdBy: vendorUsers[Math.min(inv.vendorIdx, 3)].id,
      },
    });
    invoices.push(invoice);
  }
  console.log(`  ✅ ${invoices.length} hóa đơn`);

  // Debit note
  await prisma.debitNote.create({
    data: {
      vendorId: vendors[0].id, debitNoteNumber: "DN-2026-001",
      debitType: "penalty", amount: 2500000,
      description: "Phạt giao hàng trễ 3 ngày - PO-2026-0005 (theo điều khoản hợp đồng HD-2026-001)",
      status: "pending", createdBy: adminUser.id,
    },
  });
  console.log("  ✅ 1 phiếu ghi nợ");

  // ========== MODULE 5: KPI ==========
  console.log("\n📦 Module 5: Tạo KPI Scores...");

  const kpiData = [
    { vendorIdx: 0, totalScore: 96.5, ranking: "A" },
    { vendorIdx: 1, totalScore: 88.0, ranking: "B" },
    { vendorIdx: 2, totalScore: 97.2, ranking: "A" },
    { vendorIdx: 3, totalScore: 82.5, ranking: "B" },
  ];

  for (const kpi of kpiData) {
    await prisma.kpiScore.create({
      data: {
        vendorId: vendors[kpi.vendorIdx].id,
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

  // Tickets
  const ticketsData = [
    { vendorIdx: 0, title: "Lỗi không thể tải lên hóa đơn XML", category: "technical", priority: "high", status: "in_progress" },
    { vendorIdx: 1, title: "Yêu cầu cập nhật thông tin ngân hàng", category: "general", priority: "medium", status: "new" },
    { vendorIdx: 2, title: "Chênh lệch số lượng nhận hàng GRN-2026-0001", category: "order", priority: "high", status: "resolved" },
  ];

  const tickets = [];
  for (let i = 0; i < ticketsData.length; i++) {
    const t = ticketsData[i];
    const ticket = await prisma.ticket.create({
      data: {
        vendorId: vendors[t.vendorIdx].id,
        ticketNumber: `TK-${String(i + 1).padStart(6, "0")}`,
        title: t.title, category: t.category, priority: t.priority,
        description: `Chi tiết: ${t.title}. Vui lòng xử lý sớm.`,
        status: t.status, createdBy: vendorUsers[Math.min(t.vendorIdx, 3)].id,
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
    data: { ticketId: tickets[2].id, senderId: vendorUsers[2].id, message: "Theo ASN chúng tôi giao đủ 100kg tôm sú, nhưng GRN chỉ ghi nhận 95kg." },
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
    { action: "CREATE", module: "orders", description: "Tạo PO-2026-0001 cho NCC Minh Phát — 41,000,000 VND" },
    { action: "STATUS_CHANGE", module: "orders", description: "PO-2026-0001 chuyển trạng thái: new → confirmed" },
    { action: "STATUS_CHANGE", module: "orders", description: "PO-2026-0001 chuyển trạng thái: confirmed → delivered" },
    { action: "CREATE", module: "finance", description: "NCC Minh Phát nộp hóa đơn INV-2026-001 — 45,100,000 VND" },
    { action: "APPROVE", module: "finance", description: "Duyệt hóa đơn INV-2026-001" },
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
  console.log("\n" + "=".repeat(50));
  console.log("🎉 DEMO DATA ĐÃ TẠO XONG!\n");
  console.log("📌 Tài khoản demo:");
  console.log("   Admin:   admin@vendor-portal.com / Admin@123");
  console.log("   Vendor1: vendor1@demo.com / Vendor@123 (Minh Phát)");
  console.log("   Vendor2: vendor2@demo.com / Vendor@123 (Nông sản ĐN)");
  console.log("   Vendor3: vendor3@demo.com / Vendor@123 (Biển Đông)");
  console.log("   Vendor4: vendor4@demo.com / Vendor@123 (Tân Hiệp Phát)");
  console.log("\n📌 Dữ liệu đã tạo:");
  console.log(`   • 5 Nhà cung cấp (4 approved, 1 pending)`);
  console.log(`   • ${products.length} Sản phẩm + 5 Danh mục`);
  console.log(`   • ${pos.length} Đơn hàng + ASN + GRN`);
  console.log(`   • ${invoices.length} Hóa đơn + 1 Phiếu ghi nợ`);
  console.log(`   • 4 KPI Scores + Rankings`);
  console.log(`   • ${tickets.length} Tickets + 2 Thông báo`);
  console.log(`   • ${auditData.length} Audit logs`);
  console.log("=".repeat(50));
}

main()
  .catch((e) => { console.error("❌ Lỗi:", e.message); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
