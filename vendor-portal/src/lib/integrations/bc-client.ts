/**
 * Dynamics 365 Business Central API Client
 * Handles authentication (OAuth2 Client Credentials) and API calls
 */

interface BCTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

let cachedToken: string | null = null;
let tokenExpiresAt: number = 0;

/**
 * Get OAuth2 access token for BC API
 * Caches token until it expires
 */
async function getAccessToken(): Promise<string> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedToken;
  }

  const tenantId = process.env.BC_TENANT_ID;
  const clientId = process.env.BC_CLIENT_ID;
  const clientSecret = process.env.BC_CLIENT_SECRET;

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error("Missing BC environment variables (BC_TENANT_ID, BC_CLIENT_ID, BC_CLIENT_SECRET)");
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://api.businesscentral.dynamics.com/.default",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get BC access token: ${error}`);
  }

  const data: BCTokenResponse = await response.json();
  cachedToken = data.access_token;
  tokenExpiresAt = Date.now() + data.expires_in * 1000;

  return cachedToken;
}

/**
 * Build the base URL for BC API calls
 */
function getBaseUrl(): string {
  const baseUrl = process.env.BC_API_BASE_URL || "https://api.businesscentral.dynamics.com/v2.0";
  const tenantId = process.env.BC_TENANT_ID;
  const environment = process.env.BC_ENVIRONMENT || "Sandbox";
  const companyId = process.env.BC_COMPANY_ID;

  return `${baseUrl}/${tenantId}/${environment}/api/v2.0/companies(${companyId})`;
}

/**
 * Generic BC API request handler
 */
async function bcRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const url = `${getBaseUrl()}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BC API error (${response.status}): ${error}`);
  }

  return response.json();
}

// ============================================================================
// BC API Methods
// ============================================================================

export const bcClient = {
  // Vendors
  vendors: {
    list: () => bcRequest<{ value: BCVendor[] }>("/vendors"),
    get: (id: string) => bcRequest<BCVendor>(`/vendors(${id})`),
    create: (data: Partial<BCVendor>) =>
      bcRequest<BCVendor>("/vendors", { method: "POST", body: JSON.stringify(data) }),
    update: (id: string, data: Partial<BCVendor>) =>
      bcRequest<BCVendor>(`/vendors(${id})`, { method: "PATCH", body: JSON.stringify(data) }),
  },

  // Items (Products)
  items: {
    list: () => bcRequest<{ value: BCItem[] }>("/items"),
    get: (id: string) => bcRequest<BCItem>(`/items(${id})`),
    create: (data: Partial<BCItem>) =>
      bcRequest<BCItem>("/items", { method: "POST", body: JSON.stringify(data) }),
  },

  // Purchase Orders
  purchaseOrders: {
    list: () => bcRequest<{ value: BCPurchaseOrder[] }>("/purchaseOrders"),
    get: (id: string) => bcRequest<BCPurchaseOrder>(`/purchaseOrders(${id})`),
    getLines: (poId: string) =>
      bcRequest<{ value: BCPurchaseOrderLine[] }>(`/purchaseOrders(${poId})/purchaseOrderLines`),
  },

  // Purchase Invoices
  purchaseInvoices: {
    list: () => bcRequest<{ value: BCPurchaseInvoice[] }>("/purchaseInvoices"),
    get: (id: string) => bcRequest<BCPurchaseInvoice>(`/purchaseInvoices(${id})`),
  },
};

// ============================================================================
// BC API Types
// ============================================================================

export interface BCVendor {
  id: string;
  number: string;
  displayName: string;
  addressLine1: string;
  city: string;
  country: string;
  phoneNumber: string;
  email: string;
  taxRegistrationNumber: string;
}

export interface BCItem {
  id: string;
  number: string;
  displayName: string;
  type: string;
  unitPrice: number;
  unitCost: number;
  baseUnitOfMeasureCode: string;
  gtin: string;
}

export interface BCPurchaseOrder {
  id: string;
  number: string;
  vendorNumber: string;
  vendorName: string;
  orderDate: string;
  status: string;
  totalAmountIncludingTax: number;
  currencyCode: string;
}

export interface BCPurchaseOrderLine {
  id: string;
  lineType: string;
  lineObjectNumber: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
}

export interface BCPurchaseInvoice {
  id: string;
  number: string;
  vendorNumber: string;
  invoiceDate: string;
  totalAmountIncludingTax: number;
  status: string;
}

export default bcClient;
