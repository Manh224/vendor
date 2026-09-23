// Vendor Portal — Shared TypeScript Types
// These types mirror the Prisma models but are used for API responses and UI

// ============================================================================
// Enums (matching DB check constraints)
// ============================================================================

export type UserSide = "supermarket" | "vendor";

export type VendorStatus =
  | "pending_registration"
  | "pending_review"
  | "requires_supplement"
  | "approved"
  | "contract_signing"
  | "active"
  | "suspended"
  | "terminated";

export type ContractType = "principal" | "appendix";

export type ContractStatus =
  | "draft"
  | "pending_review"
  | "pending_signature"
  | "active"
  | "expired"
  | "terminated";

export type ProductStatus =
  | "draft"
  | "pending_review"
  | "approved"
  | "active"
  | "discontinued";

export type POStatus =
  | "new"
  | "sent_to_vendor"
  | "confirmed"
  | "rejected"
  | "modification_requested"
  | "modification_approved"
  | "preparing"
  | "shipped"
  | "received"
  | "partially_received"
  | "completed"
  | "cancelled"
  | "return_pending"
  | "return_confirmed"
  | "return_disputed"
  | "return_completed";

export type PaymentStatus =
  | "unpaid"
  | "pending_approval"
  | "approved"
  | "payment_initiated"
  | "paid"
  | "partially_paid";

export type TicketStatus =
  | "new"
  | "assigned"
  | "in_progress"
  | "waiting_vendor"
  | "resolved"
  | "closed"
  | "reopened";

export type TicketPriority = "low" | "medium" | "high";

export type TicketCategory =
  | "system_error"
  | "finance"
  | "order"
  | "quality"
  | "account";

export type VendorRankingGrade = "A" | "B" | "C" | "D" | "N/A";

export type PromotionType =
  | "percentage_discount"
  | "fixed_discount"
  | "buy_x_get_y"
  | "flash_sale"
  | "gift"
  | "other";

export type ERPSyncStatus = "not_synced" | "synced" | "error";

// ============================================================================
// API Response types
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}
