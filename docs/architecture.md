# Vendor Portal — Architecture & Integration Guide

## 1. Tech Stack

| Layer | Công nghệ | Vai trò |
|---|---|---|
| **Frontend** | Next.js 14+ (App Router), TypeScript, React | UI, SSR/SSG, API routes |
| **Styling** | Tailwind CSS hoặc Vanilla CSS | Design system |
| **ORM** | Prisma | Database access, migration, type-safe queries |
| **Database** | PostgreSQL 15+ | Primary data store |
| **Auth** | NextAuth.js + TOTP (2FA) | Authentication & session management |
| **Email** | Nodemailer / Resend | Transactional emails |
| **File Storage** | Azure Blob Storage (hoặc S3) | Upload hóa đơn, giấy tờ, hình ảnh |
| **ERP Integration** | Dynamics 365 Business Central REST API | Đồng bộ PO, SP, Công nợ |
| **Deployment** | Vercel / Azure App Service | Hosting |

---

## 2. Tích hợp Dynamics 365 Business Central

### 2.1. Hướng dẫn thiết lập BC API Sandbox

Để Portal kết nối với D365 BC, bạn cần thực hiện các bước sau:

#### Bước 1: Bật Sandbox Environment trên BC

1. Đăng nhập vào [Dynamics 365 Business Central Admin Center](https://businesscentral.dynamics.com)
2. Vào **Settings** → **Environments** → **New** → chọn **Sandbox**
3. Đặt tên: `VendorPortal-Sandbox`
4. Chờ environment được tạo (khoảng 5-10 phút)

#### Bước 2: Đăng ký App trên Azure AD (Microsoft Entra ID)

Portal cần một **Azure AD App Registration** để xác thực qua OAuth 2.0:

1. Truy cập [Azure Portal](https://portal.azure.com) → **Azure Active Directory** → **App registrations** → **New registration**
2. Điền:
   - Name: `Vendor Portal`
   - Supported account types: **Single tenant**
   - Redirect URI: `http://localhost:3000/api/auth/callback/azure-ad` (dev) và URL production
3. Sau khi tạo, lưu lại:
   - **Application (client) ID**
   - **Directory (tenant) ID**
4. Vào **Certificates & secrets** → **New client secret** → lưu lại **Secret value**
5. Vào **API permissions** → **Add a permission** → chọn **Dynamics 365 Business Central** → chọn:
   - `Financials.ReadWrite.All`
   - `app_access` (Application permissions)
6. Nhấn **Grant admin consent**

#### Bước 3: Cấu hình BC cho phép API access

1. Trong BC, vào **Web Services** (tìm kiếm trên thanh search)
2. Publish các page sau dưới dạng API:
   - **Vendors** (Page 26)
   - **Items** (Page 31)
   - **Purchase Orders** (Page 50)
   - **Posted Purchase Invoices** (Page 138)
3. Hoặc sử dụng **Standard BC APIs** (khuyến nghị):
   - Base URL: `https://api.businesscentral.dynamics.com/v2.0/{tenantId}/{environmentName}/api/v2.0`

#### Bước 4: Cấu hình biến môi trường cho Portal

```env
# .env.local
# Dynamics 365 Business Central
BC_TENANT_ID=your-tenant-id
BC_CLIENT_ID=your-client-id
BC_CLIENT_SECRET=your-client-secret
BC_ENVIRONMENT=VendorPortal-Sandbox
BC_API_BASE_URL=https://api.businesscentral.dynamics.com/v2.0
BC_COMPANY_ID=your-company-id
```

#### Bước 5: Test kết nối

Sau khi cấu hình xong, bạn có thể test API bằng Postman hoặc curl:

```bash
# 1. Lấy Access Token
curl -X POST "https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token" \
  -d "grant_type=client_credentials" \
  -d "client_id={client_id}" \
  -d "client_secret={client_secret}" \
  -d "scope=https://api.businesscentral.dynamics.com/.default"

# 2. Gọi API lấy danh sách Vendors
curl -H "Authorization: Bearer {access_token}" \
  "https://api.businesscentral.dynamics.com/v2.0/{tenant_id}/{environment}/api/v2.0/companies({company_id})/vendors"
```

### 2.2. Luồng đồng bộ dữ liệu

```
┌──────────────┐          ┌──────────────────┐          ┌──────────────┐
│   Vendor     │  ──API── │  Vendor Portal   │  ──API── │  D365 BC     │
│   (NCC)      │          │  (Next.js)       │          │  (ERP)       │
└──────────────┘          └──────────────────┘          └──────────────┘

Luồng chính:
BC → Portal:  PO (tạo đơn hàng), Item master (sản phẩm), Payment status
Portal → BC:  ASN, GRN confirm, Invoice submit, Vendor info update
```

| Dữ liệu | Hướng | Tần suất |
|---|---|---|
| Purchase Orders | BC → Portal | Real-time (webhook/polling mỗi 5 phút) |
| Products/Items | BC ↔ Portal | Khi có thay đổi |
| Goods Receipt (GRN) | Portal → BC | Real-time sau khi nhập kho |
| Invoices | Portal → BC | Real-time sau khi NCC submit |
| Payment Status | BC → Portal | Polling hàng ngày |
| Vendor Master | Portal → BC | Khi NCC mới được duyệt |
| Debit Notes | Portal → BC | Khi cấn trừ được xác nhận |

### 2.3. BC Standard API Endpoints thường dùng

| Resource | Endpoint | Method |
|---|---|---|
| Vendors | `/vendors` | GET, POST, PATCH |
| Items | `/items` | GET, POST, PATCH |
| Purchase Orders | `/purchaseOrders` | GET, POST, PATCH |
| Purchase Order Lines | `/purchaseOrders({id})/purchaseOrderLines` | GET, POST |
| Posted Purchase Invoices | `/purchaseInvoices` | GET |
| Companies | `/companies` | GET |

---

## 3. Sơ đồ triển khai theo Phase

```
Phase 0: Khởi tạo project, Database Schema, Prisma setup
    ↓
Phase 1: Module 7 — Auth, RBAC, Audit Log
    ↓
Phase 2: Module 1 — Vendor Onboarding, Hồ sơ, Hợp đồng
    ↓
Phase 3: Module 2 — Sản phẩm, Giá, Khuyến mại
    ↓
Phase 4: Module 3 — PO, ASN, GRN (+ tích hợp BC API)
    ↓
Phase 5: Module 4 — Hóa đơn, Đối chiếu 3 chiều, Thanh toán
    ↓
Phase 6: Module 5 — KPI, Dashboard, Xếp hạng
    ↓
Phase 7: Module 6 — Thông báo, Ticketing, SLA
    ↓
Phase 8: Consignment (Ký gửi) — Giai đoạn sau
```

---

## 4. Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
|---|---|---|
| Bảng DB | snake_case, số nhiều | `purchase_orders`, `vendor_documents` |
| Cột DB | snake_case | `created_at`, `vendor_id` |
| API Routes | kebab-case | `/api/purchase-orders`, `/api/vendors` |
| Components | PascalCase | `VendorList`, `OrderDetail` |
| Functions | camelCase | `getVendorById`, `createPurchaseOrder` |
| Types/Interfaces | PascalCase, prefix I cho interface | `Vendor`, `IPurchaseOrder` |
| Env vars | UPPER_SNAKE_CASE | `BC_CLIENT_ID`, `DATABASE_URL` |
