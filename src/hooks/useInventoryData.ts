import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Product, Inventory, InventoryTransaction, QRCode, TransactionType } from '../types';
import { toast } from 'sonner';

// Helper to generate SKU (e.g., MED-XXXXXX)
export const generateSKU = async (): Promise<string> => {
  const randNum = Math.floor(100000 + Math.random() * 900000);
  const sku = `MED-${randNum}`;
  
  // Verify uniqueness
  const { data } = await supabase
    .from('products')
    .select('sku')
    .eq('sku', sku)
    .maybeSingle();

  if (data) {
    return generateSKU(); // retry if duplicate
  }
  return sku;
};

// -------------------------------------------------------------
// 1. PRODUCTS HOOKS
// -------------------------------------------------------------

export const useProducts = (filters?: {
  search?: string;
  category?: string;
  status?: string;
}) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (filters?.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      
      if (filters?.category && filters.category !== 'ALL') {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      let result = data as Product[];

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.sku.toLowerCase().includes(searchLower) ||
            p.brand?.toLowerCase().includes(searchLower) ||
            p.batch_number?.toLowerCase().includes(searchLower) ||
            p.category?.toLowerCase().includes(searchLower)
        );
      }

      return result;
    },
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newProduct: Omit<Product, 'id' | 'sku' | 'qr_uuid' | 'created_at' | 'updated_at' | 'deleted_at'>) => {
      const sku = await generateSKU();
      const qr_uuid = crypto.randomUUID();

      const { data, error } = await supabase
        .from('products')
        .insert([{ ...newProduct, sku, qr_uuid }])
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      toast.success('Product created successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to create product: ${err.message}`);
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Product> }) => {
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      toast.success('Product updated successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to update product: ${err.message}`);
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString(), status: 'INACTIVE' })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      toast.success('Product deleted successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to delete product: ${err.message}`);
    },
  });
};

export const useBulkDeleteProducts = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('products')
        .update({ deleted_at: new Date().toISOString(), status: 'INACTIVE' })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      toast.success('Selected products deleted successfully');
    },
    onError: (err: any) => {
      toast.error(`Failed to delete products: ${err.message}`);
    },
  });
};

// -------------------------------------------------------------
// 2. INVENTORY HOOKS
// -------------------------------------------------------------

export const useInventory = () => {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      // Get inventory along with product info
      const { data, error } = await supabase
        .from('inventory')
        .select('*, product:products(*)')
        .is('product.deleted_at', null);

      if (error) throw error;
      return data as (Inventory & { product: Product })[];
    },
  });
};

// -------------------------------------------------------------
// 3. TRANSACTIONS HOOKS
// -------------------------------------------------------------

export const useTransactions = () => {
  return useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select('*, product:products(*)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as (InventoryTransaction & { product: Product })[];
    },
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (newTx: {
      product_id: string;
      transaction_type: TransactionType;
      quantity: number;
      notes?: string;
      operator?: string;
    }) => {
      // Create transaction - DB trigger processes calculations and updates inventory.
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert([newTx])
        .select()
        .single();

      if (error) throw error;
      return data as InventoryTransaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_metrics'] });
      toast.success('Inventory updated successfully');
    },
    onError: (err: any) => {
      toast.error(`Transaction failed: ${err.message}`);
    },
  });
};

// -------------------------------------------------------------
// 4. QR CODES HOOKS
// -------------------------------------------------------------

export const useQRCodes = () => {
  return useQuery({
    queryKey: ['qr_codes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('qr_codes')
        .select('*, product:products(*)')
        .is('product.deleted_at', null);

      if (error) throw error;
      return data as (QRCode & { product: Product })[];
    },
  });
};

export const useUpdateQRCodePrintStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('qr_codes')
        .update({
          pdf_generated: true,
          last_printed: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
    },
  });
};

// Bulk print status updates
export const useUpdateBulkQRPrintStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('qr_codes')
        .update({
          pdf_generated: true,
          last_printed: new Date().toISOString(),
        })
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qr_codes'] });
    },
  });
};

// -------------------------------------------------------------
// 5. DASHBOARD METRICS HOOKS
// -------------------------------------------------------------

export const useDashboardMetrics = () => {
  return useQuery({
    queryKey: ['dashboard_metrics'],
    queryFn: async () => {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

      // Parallel queries for fast dashboard load
      const [
        productsRes,
        inventoryRes,
        todayTxRes,
        qrCodesRes,
      ] = await Promise.all([
        supabase.from('products').select('id, minimum_stock').is('deleted_at', null),
        supabase.from('inventory').select('current_stock, product_id, product:products(minimum_stock)').is('product.deleted_at', null),
        supabase.from('inventory_transactions').select('transaction_type, quantity').gte('created_at', startOfDay),
        supabase.from('qr_codes').select('id'),
      ]);

      if (productsRes.error) throw productsRes.error;
      if (inventoryRes.error) throw inventoryRes.error;
      if (todayTxRes.error) throw todayTxRes.error;
      if (qrCodesRes.error) throw qrCodesRes.error;

      const totalProducts = productsRes.data.length;
      
      const currentInventory = inventoryRes.data.reduce(
        (sum, item) => sum + item.current_stock,
        0
      );

      // Low stock count (current_stock < minimum_stock)
      const lowStockCount = inventoryRes.data.filter((item: any) => {
        const minStock = item.product?.minimum_stock ?? 10;
        return item.current_stock < minStock;
      }).length;

      // Stock movements for today
      let todayStockIn = 0;
      let todayStockOut = 0;
      todayTxRes.data.forEach((tx) => {
        if (tx.transaction_type === 'STOCK_IN') {
          todayStockIn += tx.quantity;
        } else if (tx.transaction_type === 'STOCK_OUT') {
          todayStockOut += tx.quantity;
        }
      });

      const qrGeneratedCount = qrCodesRes.data.length;

      return {
        totalProducts,
        currentInventory,
        todayStockIn,
        todayStockOut,
        lowStockCount,
        qrGeneratedCount,
      };
    },
  });
};
