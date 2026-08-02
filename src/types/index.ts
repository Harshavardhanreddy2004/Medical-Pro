export type ProductStatus = 'ACTIVE' | 'INACTIVE';

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: string | null;
  brand: string | null;
  batch_number: string | null;
  manufacturing_date: string | null; // ISO Date YYYY-MM-DD
  expiry_date: string | null; // ISO Date YYYY-MM-DD
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  gst: number;
  description: string | null;
  storage_location: string | null;
  minimum_stock: number;
  qr_uuid: string;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface Inventory {
  id: string;
  product_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  updated_at: string;
  product?: Product; // optional relation
}

export type TransactionType = 'STOCK_IN' | 'STOCK_OUT';

export interface InventoryTransaction {
  id: string;
  product_id: string;
  transaction_type: TransactionType;
  quantity: number;
  before_stock: number;
  after_stock: number;
  notes: string | null;
  operator: string;
  created_at: string;
  product?: Product; // optional relation
}

export interface QRCode {
  id: string;
  product_id: string;
  qr_uuid: string;
  pdf_generated: boolean;
  last_printed: string | null;
  created_at: string;
  product?: Product;
}

export interface DashboardMetrics {
  totalProducts: number;
  currentInventory: number;
  todayStockIn: number;
  todayStockOut: number;
  lowStockCount: number;
  qrGeneratedCount: number;
}
