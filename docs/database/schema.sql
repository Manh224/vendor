-- ============================================================================
-- VENDOR PORTAL — DATABASE SCHEMA
-- Database: Vendor_portal
-- Generated: 2026-07-24
-- Tech: PostgreSQL 15+
-- ============================================================================

-- Create Database
-- CREATE DATABASE "Vendor_portal";

-- ============================================================================
-- MODULE 7: SYSTEM ADMIN (Authentication, Roles, Permissions, Audit)
-- Triển khai đầu tiên vì các module khác phụ thuộc vào user/auth
-- ============================================================================

CREATE TABLE roles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(100) NOT NULL UNIQUE,        -- 'supermarket_admin', 'buyer', 'accountant', 'warehouse', 'vendor_admin', 'vendor_sales', 'vendor_accountant'
    display_name    VARCHAR(200) NOT NULL,                -- 'Quản trị viên siêu thị', 'Nhân viên mua hàng'...
    side            VARCHAR(20) NOT NULL CHECK (side IN ('supermarket', 'vendor')),  -- Phía siêu thị hay NCC
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module          VARCHAR(50) NOT NULL,                 -- 'vendors', 'products', 'orders', 'finance', 'performance', 'support', 'admin'
    action          VARCHAR(50) NOT NULL,                 -- 'view', 'create', 'edit', 'delete', 'approve'
    resource        VARCHAR(100) NOT NULL,                -- 'purchase_orders', 'invoices', 'vendors'...
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(module, action, resource)
);

CREATE TABLE role_permissions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id         UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id   UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    full_name       VARCHAR(200) NOT NULL,
    phone           VARCHAR(20),
    avatar_url      TEXT,

    -- Role & Access
    role_id         UUID NOT NULL REFERENCES roles(id),
    vendor_id       UUID,                                 -- NULL nếu là nhân viên siêu thị, FK đến vendors.id
    side            VARCHAR(20) NOT NULL CHECK (side IN ('supermarket', 'vendor')),

    -- Security
    is_active       BOOLEAN DEFAULT TRUE,
    is_2fa_enabled  BOOLEAN DEFAULT FALSE,
    two_fa_secret   VARCHAR(255),                         -- TOTP secret for Google Authenticator
    password_changed_at TIMESTAMPTZ,
    last_login_at   TIMESTAMPTZ,
    last_login_ip   VARCHAR(45),
    failed_login_count INT DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    inactive_since  TIMESTAMPTZ,                          -- Auto-lock sau X ngày không hoạt động

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ                           -- Soft delete
);

CREATE TABLE audit_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,                  -- 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT'
    module          VARCHAR(50),                           -- 'vendors', 'products', 'orders'...
    resource        VARCHAR(100),                          -- 'purchase_orders', 'invoices'...
    resource_id     UUID,                                  -- ID của record bị thay đổi
    old_value       JSONB,                                 -- Giá trị cũ
    new_value       JSONB,                                 -- Giá trị mới
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Index cho audit_logs (query thường xuyên)
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_module ON audit_logs(module);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource, resource_id);

-- ============================================================================
-- MODULE 1: VENDOR MANAGEMENT (Hồ sơ, Giấy tờ, Hợp đồng)
-- ============================================================================

CREATE TABLE vendors (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Thông tin chung
    company_name    VARCHAR(300) NOT NULL,
    tax_code        VARCHAR(20) NOT NULL UNIQUE,           -- Mã số thuế
    address         TEXT,
    city            VARCHAR(100),
    district        VARCHAR(100),
    ward            VARCHAR(100),
    phone           VARCHAR(20),
    email           VARCHAR(255),
    website         VARCHAR(500),

    -- Tài khoản ngân hàng
    bank_name       VARCHAR(200),
    bank_branch     VARCHAR(200),
    bank_account_no VARCHAR(50),
    bank_account_name VARCHAR(200),

    -- Trạng thái NCC
    status          VARCHAR(30) NOT NULL DEFAULT 'pending_registration'
                    CHECK (status IN (
                        'pending_registration',             -- Đang đăng ký
                        'pending_review',                   -- Chờ siêu thị duyệt hồ sơ
                        'requires_supplement',              -- Yêu cầu bổ sung
                        'approved',                         -- Đã duyệt hồ sơ
                        'contract_signing',                 -- Đang ký hợp đồng
                        'active',                           -- Đang hợp tác
                        'suspended',                        -- Tạm ngưng
                        'terminated'                        -- Chấm dứt
                    )),
    status_changed_at   TIMESTAMPTZ,
    status_changed_by   UUID REFERENCES users(id),
    status_notes        TEXT,                               -- Ghi chú khi đổi trạng thái

    -- Đánh giá & Xếp hạng (từ Module 5)
    current_ranking VARCHAR(5) DEFAULT 'N/A',              -- 'A', 'B', 'C', 'D', 'N/A'

    -- Tích hợp ERP
    erp_vendor_id   VARCHAR(50),                           -- Mã NCC trên D365 BC
    erp_sync_status VARCHAR(20) DEFAULT 'not_synced' CHECK (erp_sync_status IN ('not_synced', 'synced', 'error')),
    erp_last_synced_at TIMESTAMPTZ,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

-- Thêm FK từ users.vendor_id → vendors.id (sau khi cả 2 bảng đã tạo)
ALTER TABLE users ADD CONSTRAINT fk_users_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id);

CREATE TABLE vendor_contacts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    full_name       VARCHAR(200) NOT NULL,
    position        VARCHAR(100),                          -- Chức vụ
    email           VARCHAR(255),
    phone           VARCHAR(20),
    is_primary      BOOLEAN DEFAULT FALSE,                 -- Người liên hệ chính
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_document_types (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,                 -- 'Giấy phép kinh doanh', 'VSATTP', 'VietGAP'...
    code            VARCHAR(50) NOT NULL UNIQUE,           -- 'GPKD', 'VSATTP', 'VIETGAP', 'ISO'...
    is_required     BOOLEAN DEFAULT FALSE,                 -- Bắt buộc phải có?
    has_expiry      BOOLEAN DEFAULT TRUE,                  -- Có thời hạn không?
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_documents (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    document_type_id UUID NOT NULL REFERENCES vendor_document_types(id),
    
    -- Thông tin giấy tờ
    document_number VARCHAR(100),                          -- Số giấy tờ
    file_url        TEXT NOT NULL,                          -- Link file scan
    file_name       VARCHAR(500),
    
    -- Thời hạn
    issued_date     DATE,                                  -- Ngày cấp
    expiry_date     DATE,                                  -- Ngày hết hạn
    
    -- Cảnh báo hết hạn (tích hợp từ bảng document_alerts)
    alert_days      INT[] DEFAULT '{60,30,15}',            -- Cảnh báo trước 60, 30, 15 ngày
    last_alert_sent_at TIMESTAMPTZ,
    is_expired      BOOLEAN DEFAULT FALSE,

    -- Trạng thái duyệt
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'approved', 'rejected', 'expired')),
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT,

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contracts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
    
    -- Thông tin hợp đồng
    contract_number VARCHAR(100) NOT NULL,
    contract_type   VARCHAR(30) NOT NULL CHECK (contract_type IN ('principal', 'appendix')),  -- Hợp đồng nguyên tắc / Phụ lục
    parent_contract_id UUID REFERENCES contracts(id),       -- FK đến HĐ nguyên tắc (nếu là phụ lục)
    title           VARCHAR(500),
    file_url        TEXT,
    
    -- Thời hạn
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    
    -- Cảnh báo hết hạn (tích hợp từ document_alerts)
    alert_days      INT[] DEFAULT '{90,60,30}',            -- Cảnh báo trước 90, 60, 30 ngày
    last_alert_sent_at TIMESTAMPTZ,
    
    -- Điều khoản thương mại (tích hợp từ contract_terms)
    payment_terms_days INT DEFAULT 30,                     -- Thời hạn thanh toán (ngày)
    discount_rate   DECIMAL(5,2) DEFAULT 0,                -- Chiết khấu thương mại (%)
    sales_bonus_target DECIMAL(18,2),                      -- Mức doanh số mục tiêu để thưởng
    sales_bonus_rate DECIMAL(5,2),                         -- Tỷ lệ thưởng doanh số (%)
    display_fee     DECIMAL(18,2) DEFAULT 0,               -- Phí trưng bày
    marketing_support_fee DECIMAL(18,2) DEFAULT 0,         -- Phí hỗ trợ tiếp thị
    penalty_terms   TEXT,                                   -- Điều khoản phạt vi phạm
    other_terms     JSONB,                                  -- Các điều khoản khác (linh hoạt)

    -- Trạng thái (tích hợp lịch sử trạng thái)
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'pending_signature', 'active', 'expired', 'terminated')),
    status_changed_at   TIMESTAMPTZ,
    status_changed_by   UUID REFERENCES users(id),
    status_notes        TEXT,

    -- Digital signature
    signed_by_vendor    BOOLEAN DEFAULT FALSE,
    signed_by_supermarket BOOLEAN DEFAULT FALSE,
    signed_at       TIMESTAMPTZ,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE INDEX idx_contracts_vendor_id ON contracts(vendor_id);
CREATE INDEX idx_contracts_end_date ON contracts(end_date);
CREATE INDEX idx_vendor_documents_expiry ON vendor_documents(expiry_date);

-- ============================================================================
-- MODULE 2: PRODUCT & PRICING (Sản phẩm, Báo giá, Khuyến mại)
-- ============================================================================

CREATE TABLE product_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(200) NOT NULL,
    code            VARCHAR(50) NOT NULL UNIQUE,
    parent_id       UUID REFERENCES product_categories(id),  -- Danh mục con
    level           INT DEFAULT 1,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    category_id     UUID REFERENCES product_categories(id),
    
    -- Thông tin sản phẩm
    sku             VARCHAR(50) UNIQUE,                     -- Mã SKU (tạo sau khi duyệt)
    name            VARCHAR(500) NOT NULL,
    description     TEXT,
    
    -- Barcodes (gộp từ bảng product_barcodes — 1 SP có thể nhiều barcode)
    barcodes        JSONB DEFAULT '[]',                     -- ["8936000123456", "8936000123457"]
    
    -- Quy cách & Đóng gói
    unit            VARCHAR(50),                            -- Đơn vị tính: 'Chai', 'Hộp', 'Kg'...
    pack_size       VARCHAR(100),                           -- Quy cách đóng gói: '24 chai/thùng'
    weight          DECIMAL(10,3),                          -- Khối lượng (kg)
    dimensions      VARCHAR(100),                           -- Kích thước (DxRxC)
    
    -- Hạn sử dụng
    shelf_life_days INT,                                    -- Hạn sử dụng (số ngày)
    min_remaining_shelf_life INT,                           -- Hạn tối thiểu còn lại khi nhập kho (ngày)
    
    -- Hình ảnh (gộp từ bảng product_images)
    images          JSONB DEFAULT '[]',                     -- [{"url": "...", "is_primary": true, "alt": "..."}]
    
    -- Giá
    current_price   DECIMAL(18,2),                          -- Giá bán hiện tại cho siêu thị
    currency        VARCHAR(3) DEFAULT 'VND',
    
    -- Tồn kho tối thiểu (Module 2 - Min-stock)
    min_stock_level INT,                                    -- Tồn kho tối thiểu
    
    -- Chứng nhận chất lượng
    certifications  JSONB DEFAULT '[]',                     -- ["VietGAP", "ISO 22000", "HACCP"]
    
    -- Trạng thái
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'pending_review', 'approved', 'active', 'discontinued')),
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,

    -- Tích hợp ERP
    erp_item_id     VARCHAR(50),                            -- Mã SP trên D365 BC
    erp_sync_status VARCHAR(20) DEFAULT 'not_synced',

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);

CREATE TABLE price_change_requests (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    
    -- Giá
    current_price   DECIMAL(18,2) NOT NULL,
    proposed_price  DECIMAL(18,2) NOT NULL,
    price_change_pct DECIMAL(5,2),                          -- % thay đổi (tự tính)
    
    -- Chi tiết
    reason          TEXT NOT NULL,                           -- Lý do thay đổi giá
    effective_date  DATE NOT NULL,                           -- Ngày bắt đầu áp dụng
    
    -- Phụ lục HĐ (nếu thay đổi giá lớn)
    appendix_file_url TEXT,
    
    -- Trạng thái
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected')),
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT,
    final_price     DECIMAL(18,2),                          -- Giá cuối cùng sau đàm phán

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE promotions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Thông tin chương trình
    title           VARCHAR(500) NOT NULL,
    promotion_type  VARCHAR(30) NOT NULL CHECK (promotion_type IN (
                        'percentage_discount',              -- Giảm giá %
                        'fixed_discount',                   -- Giảm giá số tiền cố định
                        'buy_x_get_y',                      -- Mua X tặng Y
                        'flash_sale',                       -- Giá sốc
                        'gift',                             -- Quà tặng kèm
                        'other'
                    )),
    description     TEXT,
    
    -- Thời gian
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    
    -- Sản phẩm áp dụng
    product_ids     UUID[],                                 -- Danh sách SP áp dụng
    
    -- Chi tiết khuyến mại
    discount_value  DECIMAL(18,2),                          -- Giá trị giảm (% hoặc VND tùy type)
    promo_price     DECIMAL(18,2),                          -- Giá khuyến mại
    estimated_qty   INT,                                    -- Số lượng dự kiến bán
    committed_stock INT,                                    -- Tồn kho cam kết hỗ trợ
    gift_description TEXT,                                  -- Mô tả quà tặng (nếu có)
    
    -- Trạng thái
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'negotiating', 'approved', 'rejected', 'active', 'completed', 'cancelled')),
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    review_notes    TEXT,

    -- Tích hợp POS/ERP
    erp_promo_id    VARCHAR(50),
    erp_sync_status VARCHAR(20) DEFAULT 'not_synced',

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_vendor_id ON products(vendor_id);
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_promotions_dates ON promotions(start_date, end_date);

-- ============================================================================
-- MODULE 3: PURCHASE ORDERS (Đơn hàng, ASN, Nhập kho, Trả hàng)
-- ============================================================================

CREATE TABLE purchase_orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Mã PO
    po_number       VARCHAR(50) NOT NULL UNIQUE,
    
    -- Loại đơn (nhập hàng / trả hàng — gộp return_requests)
    is_return_order BOOLEAN DEFAULT FALSE,                  -- TRUE = đơn trả hàng (RMA), FALSE = đơn nhập hàng thông thường
    return_reason   TEXT,                                   -- Lý do trả hàng (khi is_return_order = TRUE)
    
    -- Thông tin đơn hàng
    order_date      DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_location VARCHAR(500),                         -- Kho nhận hàng
    
    -- Tổng tiền
    total_amount    DECIMAL(18,2) DEFAULT 0,
    currency        VARCHAR(3) DEFAULT 'VND',
    
    -- Trạng thái
    status          VARCHAR(30) NOT NULL DEFAULT 'new'
                    CHECK (status IN (
                        'new',                              -- Mới tạo
                        'sent_to_vendor',                   -- Đã gửi cho NCC
                        'confirmed',                        -- NCC xác nhận
                        'rejected',                         -- NCC từ chối
                        'modification_requested',           -- NCC đề nghị điều chỉnh
                        'modification_approved',            -- Siêu thị đồng ý điều chỉnh
                        'preparing',                        -- Đang chuẩn bị hàng
                        'shipped',                          -- Đang giao
                        'received',                         -- Đã nhập kho
                        'partially_received',               -- Nhập một phần
                        'completed',                        -- Hoàn tất
                        'cancelled',                        -- Đã hủy
                        -- Trạng thái riêng cho đơn trả hàng
                        'return_pending',                   -- Chờ NCC xác nhận trả
                        'return_confirmed',                 -- NCC đồng ý nhận trả
                        'return_disputed',                  -- NCC khiếu nại
                        'return_completed'                  -- Đã hoàn tất trả hàng
                    )),
    
    -- NCC phản hồi
    vendor_response VARCHAR(20) CHECK (vendor_response IN ('confirmed', 'rejected', 'modified')),
    vendor_response_at TIMESTAMPTZ,
    vendor_response_notes TEXT,
    vendor_proposed_qty JSONB,                              -- Số lượng đề xuất lại (nếu modified)
    vendor_proposed_date DATE,                              -- Ngày giao đề xuất lại
    
    -- Thời hạn phản hồi
    response_deadline TIMESTAMPTZ,                          -- NCC phải phản hồi trước thời điểm này
    
    -- Tích hợp ERP
    erp_po_id       VARCHAR(50),                            -- Mã PO trên D365 BC
    erp_sync_status VARCHAR(20) DEFAULT 'not_synced',
    erp_last_synced_at TIMESTAMPTZ,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE purchase_order_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    product_id      UUID NOT NULL REFERENCES products(id),
    
    -- Số lượng & Giá
    ordered_qty     INT NOT NULL,                           -- Số lượng đặt
    unit_price      DECIMAL(18,2) NOT NULL,                 -- Đơn giá
    line_total      DECIMAL(18,2) NOT NULL,                 -- Thành tiền (ordered_qty * unit_price)
    
    -- Số lượng thực nhận (gộp từ goods_receipt_items)
    actual_received_qty INT DEFAULT 0,                      -- Số lượng thực nhận khi nhập kho
    damaged_qty     INT DEFAULT 0,                          -- Số lượng hư hỏng
    shortage_qty    INT DEFAULT 0,                          -- Số lượng thiếu
    
    -- Ghi chú
    notes           TEXT,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE advance_shipping_notices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Mã ASN
    asn_number      VARCHAR(50) NOT NULL UNIQUE,
    asn_barcode     VARCHAR(100),                           -- Mã vạch/QR in trên phiếu ASN
    
    -- Chi tiết hàng hóa (gộp từ asn_items)
    items           JSONB NOT NULL,                         -- [{"product_id": "...", "qty": 100, "batch_no": "..."}]
    
    -- Thông tin vận chuyển
    carrier_name    VARCHAR(200),                           -- Đơn vị vận tải
    vehicle_plate   VARCHAR(20),                            -- Biển số xe
    driver_name     VARCHAR(200),                           -- Tên tài xế
    driver_phone    VARCHAR(20),                            -- SĐT tài xế
    
    -- Lịch giao hàng
    scheduled_date  DATE NOT NULL,
    scheduled_time_slot VARCHAR(50),                        -- Khung giờ: '08:00-10:00'
    
    -- Trạng thái
    status          VARCHAR(30) NOT NULL DEFAULT 'draft'
                    CHECK (status IN (
                        'draft',                            -- Nháp
                        'submitted',                        -- Đã gửi — chờ duyệt lịch
                        'schedule_approved',                -- Kho đã duyệt lịch
                        'schedule_rejected',                -- Kho từ chối — chọn lại giờ
                        'in_transit',                       -- Đang vận chuyển
                        'arrived',                          -- Đã đến kho
                        'unloading',                        -- Đang bốc dỡ
                        'completed'                         -- Hoàn tất giao hàng
                    )),
    
    -- Kho duyệt lịch
    approved_by     UUID REFERENCES users(id),
    approved_at     TIMESTAMPTZ,
    rejection_reason TEXT,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE goods_receipts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id),
    asn_id          UUID REFERENCES advance_shipping_notices(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Mã GRN
    grn_number      VARCHAR(50) NOT NULL UNIQUE,
    
    -- Thông tin nhập kho
    received_date   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    received_by     UUID REFERENCES users(id),              -- Nhân viên kho nhận hàng
    
    -- Kết quả kiểm hàng tổng quan
    receipt_status  VARCHAR(20) NOT NULL DEFAULT 'full'
                    CHECK (receipt_status IN ('full', 'partial', 'rejected')),
    
    -- Biên bản
    notes           TEXT,
    evidence_photos JSONB DEFAULT '[]',                     -- Ảnh bằng chứng (hàng hư hỏng...)
    signed_by_vendor BOOLEAN DEFAULT FALSE,
    signed_by_warehouse BOOLEAN DEFAULT FALSE,
    
    -- Tích hợp ERP
    erp_grn_id      VARCHAR(50),
    erp_sync_status VARCHAR(20) DEFAULT 'not_synced',

    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_po_vendor_id ON purchase_orders(vendor_id);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_po_is_return ON purchase_orders(is_return_order);
CREATE INDEX idx_asn_po_id ON advance_shipping_notices(purchase_order_id);
CREATE INDEX idx_grn_po_id ON goods_receipts(purchase_order_id);

-- ============================================================================
-- MODULE 4: FINANCE & ACCOUNTING (Hóa đơn, Đối chiếu, Thanh toán, Cấn trừ)
-- ============================================================================

CREATE TABLE invoices (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Thông tin hóa đơn điện tử
    invoice_number  VARCHAR(50) NOT NULL,
    invoice_symbol  VARCHAR(20),                            -- Ký hiệu hóa đơn
    invoice_date    DATE NOT NULL,
    
    -- File hóa đơn
    xml_file_url    TEXT,                                   -- File XML hóa đơn điện tử
    pdf_file_url    TEXT,                                   -- File PDF hóa đơn
    
    -- Số tiền
    subtotal        DECIMAL(18,2) NOT NULL,                 -- Tổng tiền trước thuế
    tax_rate        DECIMAL(5,2) DEFAULT 0,                 -- Thuế suất (%)
    tax_amount      DECIMAL(18,2) DEFAULT 0,                -- Tiền thuế
    total_amount    DECIMAL(18,2) NOT NULL,                 -- Tổng tiền sau thuế
    currency        VARCHAR(3) DEFAULT 'VND',
    
    -- GRN liên quan
    grn_ids         UUID[],                                 -- Danh sách GRN gom vào hóa đơn này
    
    -- Đối chiếu 3 chiều
    reconciliation_status VARCHAR(20) DEFAULT 'pending'
                    CHECK (reconciliation_status IN ('pending', 'matched', 'discrepancy', 'resolved')),
    
    -- Thanh toán (gộp từ bảng payments)
    payment_status  VARCHAR(20) DEFAULT 'unpaid'
                    CHECK (payment_status IN (
                        'unpaid',                           -- Chưa thanh toán
                        'pending_approval',                 -- Đang chờ duyệt
                        'approved',                         -- Đã duyệt
                        'payment_initiated',                -- Đã gửi lệnh chi
                        'paid',                             -- Đã thanh toán
                        'partially_paid'                    -- Thanh toán một phần
                    )),
    payment_due_date DATE,                                  -- Ngày đến hạn thanh toán
    payment_date    TIMESTAMPTZ,                            -- Ngày thực hiện thanh toán
    payment_amount  DECIMAL(18,2),                          -- Số tiền đã thanh toán
    payment_reference VARCHAR(100),                         -- Mã giao dịch FT ngân hàng
    payment_proof_url TEXT,                                 -- File ủy nhiệm chi (PDF)
    payment_method  VARCHAR(30) CHECK (payment_method IN ('bank_transfer', 'cash', 'other')),
    payment_notes   TEXT,
    
    -- Trạng thái tổng
    status          VARCHAR(20) NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'submitted', 'validated', 'rejected', 'processing', 'completed')),
    
    -- Validation tự động
    validation_errors JSONB,                                -- Lỗi khi validate (MST sai, số tiền không khớp...)
    
    -- Tích hợp ERP
    erp_invoice_id  VARCHAR(50),
    erp_sync_status VARCHAR(20) DEFAULT 'not_synced',

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE invoice_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id      UUID REFERENCES products(id),
    po_item_id      UUID REFERENCES purchase_order_items(id),
    
    -- Chi tiết
    description     VARCHAR(500),
    quantity        INT NOT NULL,
    unit_price      DECIMAL(18,2) NOT NULL,
    tax_rate        DECIMAL(5,2) DEFAULT 0,
    line_total      DECIMAL(18,2) NOT NULL,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reconciliations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id      UUID NOT NULL REFERENCES invoices(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Kết quả đối chiếu 3 chiều
    period          VARCHAR(20),                            -- Kỳ đối chiếu: '2026-07'
    
    -- So sánh
    po_total        DECIMAL(18,2),                          -- Tổng tiền theo PO
    grn_total       DECIMAL(18,2),                          -- Tổng tiền theo GRN (thực nhận)
    invoice_total   DECIMAL(18,2),                          -- Tổng tiền theo Hóa đơn
    
    -- Kết quả
    match_status    VARCHAR(20) NOT NULL CHECK (match_status IN ('matched', 'discrepancy')),
    discrepancy_amount DECIMAL(18,2) DEFAULT 0,             -- Số tiền chênh lệch
    discrepancy_details JSONB,                              -- Chi tiết từng dòng hàng bị sai lệch
    
    -- Xử lý sai lệch
    resolution_notes TEXT,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE debit_notes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Mã phiếu
    debit_note_number VARCHAR(50) NOT NULL UNIQUE,
    
    -- Loại cấn trừ
    debit_type      VARCHAR(30) NOT NULL CHECK (debit_type IN (
                        'return',                           -- Hàng trả lại
                        'display_fee',                      -- Phí trưng bày
                        'marketing_fee',                    -- Phí hỗ trợ tiếp thị
                        'penalty',                          -- Phạt vi phạm hợp đồng
                        'sales_bonus',                      -- Thưởng doanh số
                        'other'
                    )),
    
    -- Tham chiếu
    reference_po_id UUID REFERENCES purchase_orders(id),    -- PO liên quan (nếu là return)
    reference_contract_id UUID REFERENCES contracts(id),    -- HĐ liên quan (nếu là penalty/bonus)
    
    -- Số tiền
    amount          DECIMAL(18,2) NOT NULL,
    description     TEXT,
    
    -- Trạng thái
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'vendor_confirmed', 'vendor_disputed', 'applied', 'cancelled')),
    vendor_confirmed_at TIMESTAMPTZ,
    vendor_dispute_notes TEXT,
    
    -- Áp dụng cấn trừ
    applied_to_invoice_id UUID REFERENCES invoices(id),     -- Hóa đơn bị cấn trừ
    applied_at      TIMESTAMPTZ,

    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Hàng ký gửi (Phase sau — chỉ tạo bảng trước)
CREATE TABLE consignment_sales (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    product_id      UUID NOT NULL REFERENCES products(id),
    
    -- Kỳ báo cáo
    period          VARCHAR(20) NOT NULL,                   -- '2026-07', '2026-W30'
    
    -- Số liệu
    opening_stock   INT DEFAULT 0,                          -- Tồn đầu kỳ
    received_qty    INT DEFAULT 0,                          -- Nhập trong kỳ
    sold_qty        INT DEFAULT 0,                          -- Bán trong kỳ (từ POS)
    closing_stock   INT DEFAULT 0,                          -- Tồn cuối kỳ
    unit_price      DECIMAL(18,2),
    total_sales_amount DECIMAL(18,2),                       -- Doanh số = sold_qty * unit_price
    
    -- Xác nhận
    vendor_confirmed BOOLEAN DEFAULT FALSE,
    vendor_confirmed_at TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_vendor_id ON invoices(vendor_id);
CREATE INDEX idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX idx_invoices_payment_due_date ON invoices(payment_due_date);
CREATE INDEX idx_debit_notes_vendor_id ON debit_notes(vendor_id);

-- ============================================================================
-- MODULE 5: VENDOR KPI & PERFORMANCE (Đánh giá hiệu suất NCC)
-- ============================================================================

CREATE TABLE kpi_definitions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Thông tin KPI
    name            VARCHAR(200) NOT NULL,                  -- 'OTIF', 'Rejection Rate', 'Compliance Rate', 'Fill Rate'
    code            VARCHAR(50) NOT NULL UNIQUE,            -- 'otif', 'rejection_rate', 'compliance_rate', 'fill_rate'
    description     TEXT,
    
    -- Công thức & Nguồn dữ liệu
    formula         TEXT,                                   -- Mô tả công thức tính
    data_source     VARCHAR(100),                           -- Module/bảng nguồn dữ liệu
    
    -- Trọng số & Thang điểm
    weight          DECIMAL(5,2) NOT NULL DEFAULT 1.0,      -- Trọng số trong tổng điểm
    max_score       DECIMAL(5,2) DEFAULT 100,
    unit            VARCHAR(20) DEFAULT '%',                -- '%', 'days', 'score'
    
    -- Cấu hình
    calculation_frequency VARCHAR(20) DEFAULT 'monthly' CHECK (calculation_frequency IN ('daily', 'weekly', 'monthly', 'quarterly')),
    is_active       BOOLEAN DEFAULT TRUE,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kpi_scores (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Kỳ đánh giá
    period          VARCHAR(20) NOT NULL,                   -- '2026-07', '2026-Q3'
    period_type     VARCHAR(20) NOT NULL CHECK (period_type IN ('monthly', 'quarterly', 'yearly')),
    
    -- Điểm tổng
    total_score     DECIMAL(5,2),                           -- Điểm tổng hợp (0-100)
    ranking         VARCHAR(5),                             -- 'A', 'B', 'C', 'D'
    
    -- Trạng thái
    is_published    BOOLEAN DEFAULT FALSE,                  -- Đã công bố cho NCC?
    published_at    TIMESTAMPTZ,
    
    -- Ghi chú từ siêu thị
    reviewer_notes  TEXT,
    reviewed_by     UUID REFERENCES users(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vendor_id, period, period_type)
);

CREATE TABLE kpi_score_details (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_score_id    UUID NOT NULL REFERENCES kpi_scores(id) ON DELETE CASCADE,
    kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id),
    
    -- Điểm từng chỉ số
    raw_value       DECIMAL(10,2),                          -- Giá trị thô (ví dụ: 95.5%)
    weighted_score  DECIMAL(5,2),                           -- Điểm sau trọng số
    
    -- Dữ liệu chi tiết (drill-down)
    detail_data     JSONB,                                  -- {"total_orders": 100, "on_time": 95, "late_orders": ["PO-001", "PO-005"]}
    
    -- Điều chỉnh thủ công (nếu có)
    manual_adjustment DECIMAL(5,2),
    adjustment_reason TEXT,
    adjusted_by     UUID REFERENCES users(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE kpi_disputes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kpi_score_id    UUID NOT NULL REFERENCES kpi_scores(id),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Đơn khiếu nại liên quan đến giao dịch cụ thể
    disputed_resource VARCHAR(100),                         -- 'purchase_orders', 'goods_receipts'
    disputed_resource_id UUID,                              -- ID của PO/GRN bị tính sai
    
    -- Nội dung
    reason          TEXT NOT NULL,
    evidence_files  JSONB DEFAULT '[]',                     -- File bằng chứng
    
    -- Xử lý
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'reviewing', 'accepted', 'rejected')),
    resolution_notes TEXT,
    resolved_by     UUID REFERENCES users(id),
    resolved_at     TIMESTAMPTZ,
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vendor_rankings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Xếp hạng
    period          VARCHAR(20) NOT NULL,                   -- '2026-Q3', '2026'
    ranking         VARCHAR(5) NOT NULL,                    -- 'A', 'B', 'C', 'D'
    total_score     DECIMAL(5,2),
    
    -- Hành động áp dụng
    action_taken    VARCHAR(30) CHECK (action_taken IN (
                        'priority_payment',                 -- Ưu tiên thanh toán sớm
                        'priority_review',                  -- Ưu tiên xét duyệt SP mới
                        'warning',                          -- Cảnh báo
                        'penalty',                          -- Phạt
                        'order_suspension',                 -- Tạm ngưng đơn hàng
                        'contract_termination',             -- Chấm dứt HĐ
                        'none'
                    )),
    action_notes    TEXT,
    
    -- Biên bản họp
    meeting_notes   TEXT,
    meeting_date    DATE,
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Cấu hình ngưỡng xếp hạng
CREATE TABLE kpi_ranking_thresholds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ranking         VARCHAR(5) NOT NULL UNIQUE,             -- 'A', 'B', 'C', 'D'
    min_score       DECIMAL(5,2) NOT NULL,                  -- Điểm tối thiểu
    max_score       DECIMAL(5,2) NOT NULL,                  -- Điểm tối đa
    description     VARCHAR(200),                           -- 'Xuất sắc', 'Tốt', 'Trung bình', 'Yếu'
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed data cho thresholds
INSERT INTO kpi_ranking_thresholds (ranking, min_score, max_score, description) VALUES
    ('A', 95.01, 100.00, 'Xuất sắc'),
    ('B', 85.01, 95.00, 'Tốt'),
    ('C', 70.01, 85.00, 'Trung bình'),
    ('D', 0.00, 70.00, 'Yếu');

CREATE INDEX idx_kpi_scores_vendor_id ON kpi_scores(vendor_id);
CREATE INDEX idx_kpi_scores_period ON kpi_scores(period);

-- ============================================================================
-- MODULE 6: COMMUNICATION & TICKETING (Thông báo, Ticket hỗ trợ, SLA)
-- ============================================================================

CREATE TABLE announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Nội dung
    title           VARCHAR(500) NOT NULL,
    content         TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]',                     -- File đính kèm
    
    -- Đối tượng nhận
    target_type     VARCHAR(20) NOT NULL CHECK (target_type IN ('all_vendors', 'vendor_group', 'specific_vendor')),
    target_category_ids UUID[],                             -- Nhóm ngành hàng (nếu vendor_group)
    target_vendor_ids UUID[],                               -- NCC cụ thể (nếu specific_vendor)
    
    -- Thời gian hiển thị
    publish_at      TIMESTAMPTZ DEFAULT NOW(),
    expire_at       TIMESTAMPTZ,
    is_important    BOOLEAN DEFAULT FALSE,                  -- Đánh dấu quan trọng (cần xác nhận "Đã đọc")
    
    -- Trạng thái
    status          VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE announcement_recipients (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Xác nhận đã đọc
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    is_acknowledged BOOLEAN DEFAULT FALSE,                  -- "Đã đọc và hiểu" (cho thông báo quan trọng)
    acknowledged_at TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(announcement_id, vendor_id)
);

-- Cấu hình SLA
CREATE TABLE sla_configs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_category VARCHAR(50) NOT NULL,                   -- 'system_error', 'finance', 'order', 'quality'
    priority        VARCHAR(20) NOT NULL,                   -- 'low', 'medium', 'high'
    resolution_hours INT NOT NULL,                          -- Thời gian xử lý tối đa (giờ)
    escalation_hours INT,                                   -- Thời gian leo thang (giờ)
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ticket_category, priority)
);

CREATE TABLE tickets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id       UUID NOT NULL REFERENCES vendors(id),
    
    -- Mã ticket
    ticket_number   VARCHAR(50) NOT NULL UNIQUE,
    
    -- Phân loại
    category        VARCHAR(50) NOT NULL,                   -- 'system_error', 'finance', 'order', 'quality', 'account'
    priority        VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    
    -- Nội dung
    title           VARCHAR(500) NOT NULL,
    description     TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]',
    
    -- Tham chiếu (đơn hàng, hóa đơn liên quan)
    reference_type  VARCHAR(50),                            -- 'purchase_orders', 'invoices'...
    reference_id    UUID,
    
    -- Trạng thái
    status          VARCHAR(20) NOT NULL DEFAULT 'new'
                    CHECK (status IN ('new', 'assigned', 'in_progress', 'waiting_vendor', 'resolved', 'closed', 'reopened')),
    
    -- Phân công
    assigned_to     UUID REFERENCES users(id),              -- Nhân viên siêu thị được phân công
    assigned_department VARCHAR(100),                       -- Phòng ban xử lý
    assigned_at     TIMESTAMPTZ,
    
    -- SLA
    sla_config_id   UUID REFERENCES sla_configs(id),
    sla_deadline    TIMESTAMPTZ,                            -- Thời hạn phải xử lý xong
    sla_status      VARCHAR(20) DEFAULT 'on_track'
                    CHECK (sla_status IN ('on_track', 'warning', 'breached')),
    sla_paused_at   TIMESTAMPTZ,                            -- Tạm dừng SLA khi chờ NCC phản hồi
    
    -- Giải quyết
    resolved_at     TIMESTAMPTZ,
    resolution_notes TEXT,
    
    -- Tự đóng
    auto_close_at   TIMESTAMPTZ,                            -- Sau X ngày không phản hồi → tự đóng
    
    created_by      UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    
    -- Tin nhắn
    sender_id       UUID NOT NULL REFERENCES users(id),
    message         TEXT NOT NULL,
    attachments     JSONB DEFAULT '[]',
    
    -- Loại tin nhắn
    message_type    VARCHAR(20) DEFAULT 'reply' CHECK (message_type IN ('reply', 'internal_note', 'system')),
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE ticket_ratings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id       UUID NOT NULL REFERENCES tickets(id) UNIQUE,
    
    -- Đánh giá
    rating          INT NOT NULL CHECK (rating BETWEEN 1 AND 5),  -- 1-5 sao
    feedback        TEXT,                                   -- Nhận xét bổ sung
    
    -- Chi tiết đánh giá
    attitude_rating INT CHECK (attitude_rating BETWEEN 1 AND 5),     -- Thái độ hỗ trợ
    speed_rating    INT CHECK (speed_rating BETWEEN 1 AND 5),        -- Tốc độ xử lý
    quality_rating  INT CHECK (quality_rating BETWEEN 1 AND 5),      -- Chất lượng giải pháp
    
    rated_by        UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tickets_vendor_id ON tickets(vendor_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_sla_deadline ON tickets(sla_deadline);
CREATE INDEX idx_tickets_assigned_to ON tickets(assigned_to);

-- ============================================================================
-- SHARED TABLES (Dùng chung cho tất cả Module)
-- ============================================================================

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id),
    
    -- Nội dung
    title           VARCHAR(500) NOT NULL,
    message         TEXT,
    type            VARCHAR(30),                            -- 'info', 'warning', 'error', 'success'
    
    -- Tham chiếu
    module          VARCHAR(50),                            -- Module liên quan
    reference_type  VARCHAR(100),                           -- 'purchase_orders', 'invoices'...
    reference_id    UUID,
    action_url      TEXT,                                   -- Link dẫn đến trang liên quan
    
    -- Trạng thái
    is_read         BOOLEAN DEFAULT FALSE,
    read_at         TIMESTAMPTZ,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_logs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Người nhận
    to_email        VARCHAR(255) NOT NULL,
    to_name         VARCHAR(200),
    cc_emails       TEXT[],
    
    -- Nội dung
    subject         VARCHAR(500) NOT NULL,
    body            TEXT,
    template_name   VARCHAR(100),                           -- Tên template email
    
    -- Trạng thái gửi
    status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'bounced')),
    sent_at         TIMESTAMPTZ,
    error_message   TEXT,
    
    -- Tham chiếu
    module          VARCHAR(50),
    reference_type  VARCHAR(100),
    reference_id    UUID,
    
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE file_attachments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- File info
    file_name       VARCHAR(500) NOT NULL,
    file_url        TEXT NOT NULL,
    file_size       BIGINT,                                 -- Bytes
    mime_type       VARCHAR(100),
    
    -- Tham chiếu
    module          VARCHAR(50),
    reference_type  VARCHAR(100),                           -- 'vendor_documents', 'tickets'...
    reference_id    UUID,
    
    uploaded_by     UUID REFERENCES users(id),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_email_logs_status ON email_logs(status);

-- ============================================================================
-- SEED DATA: SLA Configs mặc định
-- ============================================================================

INSERT INTO sla_configs (ticket_category, priority, resolution_hours, escalation_hours, description) VALUES
    ('system_error', 'high', 4, 2, 'Lỗi hệ thống nghiêm trọng'),
    ('system_error', 'medium', 8, 4, 'Lỗi hệ thống trung bình'),
    ('system_error', 'low', 24, 12, 'Lỗi hệ thống nhẹ'),
    ('finance', 'high', 8, 4, 'Vấn đề công nợ khẩn cấp'),
    ('finance', 'medium', 48, 24, 'Vấn đề công nợ thông thường'),
    ('finance', 'low', 72, 48, 'Thắc mắc tài chính'),
    ('order', 'high', 4, 2, 'Đơn hàng khẩn cấp'),
    ('order', 'medium', 24, 12, 'Đơn hàng thông thường'),
    ('order', 'low', 48, 24, 'Thắc mắc đơn hàng'),
    ('quality', 'high', 8, 4, 'Vấn đề chất lượng nghiêm trọng'),
    ('quality', 'medium', 48, 24, 'Vấn đề chất lượng thông thường'),
    ('quality', 'low', 72, 48, 'Thắc mắc chất lượng');
