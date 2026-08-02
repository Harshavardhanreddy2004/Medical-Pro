import React, { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAppStore } from '../../store/useAppStore';
import {
  useProducts,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useBulkDeleteProducts,
} from '../../hooks/useInventoryData';
import { Product, ProductStatus } from '../../types';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Download,
  Edit2,
  X,
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  ChevronsUpDown,
} from 'lucide-react';
import dayjs from 'dayjs';

// Product Form Zod validation schema
const productFormSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  category: z.string().min(1, 'Category is required'),
  brand: z.string().min(1, 'Brand is required'),
  batch_number: z.string().min(1, 'Batch number is required'),
  manufacturing_date: z.string().refine((val) => !val || dayjs(val).isValid(), 'Invalid date'),
  expiry_date: z.string().refine((val) => !val || dayjs(val).isValid(), 'Invalid date'),
  unit: z.string().min(1, 'Unit (e.g. Vial, Box) is required'),
  purchase_price: z.number().min(0, 'Must be positive'),
  selling_price: z.number().min(0, 'Must be positive'),
  gst: z.number().min(0, 'Must be positive'),
  description: z.string().optional(),
  storage_location: z.string().min(1, 'Storage location is required'),
  minimum_stock: z.number().min(0, 'Minimum stock must be >= 0'),
  status: z.enum(['ACTIVE', 'INACTIVE'] as const),
}).refine((data) => {
  if (data.manufacturing_date && data.expiry_date) {
    return dayjs(data.expiry_date).isAfter(dayjs(data.manufacturing_date));
  }
  return true;
}, {
  message: 'Expiry date must be after manufacturing date',
  path: ['expiry_date'],
});

type ProductFormData = z.infer<typeof productFormSchema>;

export const Products: React.FC = () => {
  const { globalSearch, addProductModalOpen, setAddProductModalOpen } = useAppStore();
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Table state
  const [sortField, setSortField] = useState<keyof Product>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Trigger modal open from global store (Quick Actions)
  React.useEffect(() => {
    if (addProductModalOpen) {
      openModal();
      setAddProductModalOpen(false);
    }
  }, [addProductModalOpen]);

  // Queries & Mutations
  const { data: products, isLoading } = useProducts({
    search: search || globalSearch,
    category: categoryFilter,
    status: statusFilter,
  });

  const createProductMutation = useCreateProduct();
  const updateProductMutation = useUpdateProduct();
  const deleteProductMutation = useDeleteProduct();
  const bulkDeleteMutation = useBulkDeleteProducts();

  // Form Setup
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      status: 'ACTIVE',
      minimum_stock: 10,
      purchase_price: 0,
      selling_price: 0,
      gst: 18,
    },
  });

  // Unique categories list for filters
  const categories = useMemo(() => {
    if (!products) return [];
    const set = new Set(products.map((p) => p.category).filter(Boolean));
    return Array.from(set) as string[];
  }, [products]);

  // Handle Sort
  const handleSort = (field: keyof Product) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Sort & filter products locally
  const processedProducts = useMemo(() => {
    if (!products) return [];
    let list = [...products];

    // Sorting
    list.sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortOrder === 'asc' ? valA - valB : valB - valA;
      }
      return 0;
    });

    return list;
  }, [products, sortField, sortOrder]);

  // Pagination calculations
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedProducts.slice(start, start + itemsPerPage);
  }, [processedProducts, currentPage]);

  const totalPages = Math.ceil(processedProducts.length / itemsPerPage);

  // Form Submission
  const onSubmit = (data: ProductFormData) => {
    const payload = {
      ...data,
      description: data.description || null,
    };

    if (editingProduct) {
      updateProductMutation.mutate(
        { id: editingProduct.id, updates: payload },
        {
          onSuccess: () => {
            closeModal();
          },
        }
      );
    } else {
      createProductMutation.mutate(payload, {
        onSuccess: () => {
          closeModal();
        },
      });
    }
  };

  // Open/Close modal helpers
  const openModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      reset({
        name: product.name,
        category: product.category || '',
        brand: product.brand || '',
        batch_number: product.batch_number || '',
        manufacturing_date: product.manufacturing_date || '',
        expiry_date: product.expiry_date || '',
        unit: product.unit || '',
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        gst: product.gst,
        description: product.description || '',
        storage_location: product.storage_location || '',
        minimum_stock: product.minimum_stock,
        status: product.status,
      });
    } else {
      setEditingProduct(null);
      reset({
        name: '',
        category: '',
        brand: '',
        batch_number: '',
        manufacturing_date: '',
        expiry_date: '',
        unit: '',
        purchase_price: 0,
        selling_price: 0,
        gst: 18,
        description: '',
        storage_location: '',
        minimum_stock: 10,
        status: 'ACTIVE',
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  // Checkbox handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedProducts.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product? (Soft delete)')) {
      deleteProductMutation.mutate(id);
    }
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} selected products?`)) {
      bulkDeleteMutation.mutate(selectedIds, {
        onSuccess: () => {
          setSelectedIds([]);
        },
      });
    }
  };

  // CSV/Excel Export helper
  const handleExport = (format: 'CSV' | 'EXCEL') => {
    const listToExport = processedProducts;
    if (listToExport.length === 0) return;

    // Headers
    const headers = [
      'SKU',
      'Name',
      'Category',
      'Brand',
      'Batch Number',
      'Mfg Date',
      'Expiry Date',
      'Unit',
      'Purchase Price',
      'Selling Price',
      'GST (%)',
      'Location',
      'Min Stock',
      'Status',
    ];

    const rows = listToExport.map((p) => [
      p.sku,
      `"${p.name.replace(/"/g, '""')}"`,
      p.category || '',
      p.brand || '',
      p.batch_number || '',
      p.manufacturing_date || '',
      p.expiry_date || '',
      p.unit || '',
      p.purchase_price,
      p.selling_price,
      p.gst,
      p.storage_location || '',
      p.minimum_stock,
      p.status,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `medistock_products_${dayjs().format('YYYYMMDD')}.${
      format === 'CSV' ? 'csv' : 'csv'
    }`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Product Catalog</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Add and manage medical items, prices, storage locations, and parameters.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleExport('CSV')}
            disabled={processedProducts.length === 0}
            className="flex items-center gap-1.8 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold shadow-sm transition-all-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-1.8 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all-300"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search catalog..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Category Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">Category</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-gray-400 font-medium">Status</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Bulk actions */}
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-100 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100/50 transition-all-300 ml-auto md:ml-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedIds.length})
            </button>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedProducts.length > 0 &&
                      paginatedProducts.every((p) => selectedIds.includes(p.id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort('sku')}>
                  <div className="flex items-center gap-1">
                    SKU <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort('name')}>
                  <div className="flex items-center gap-1">
                    Product Name <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort('category')}>
                  <div className="flex items-center gap-1">
                    Category <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Brand</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4 text-right">Prices (Buy / Sell)</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-4 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-12 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-gray-100 rounded ml-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-12 bg-gray-100 rounded-full mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-gray-100 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : paginatedProducts.length > 0 ? (
                paginatedProducts.map((p) => {
                  const isExpired = p.expiry_date && dayjs(p.expiry_date).isBefore(dayjs());
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/50 transition-all-300">
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(p.id)}
                          onChange={(e) => handleSelectOne(p.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-500">
                        {p.sku}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {p.name}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {p.brand}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">
                        {p.batch_number}
                      </td>
                      <td className="py-3.5 px-4 text-right text-gray-600 font-medium">
                        ${Number(p.purchase_price).toFixed(2)} / ${Number(p.selling_price).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-gray-500">
                        {p.storage_location}
                      </td>
                      <td className="py-3.5 px-4">
                        {p.expiry_date ? (
                          <span className={isExpired ? 'text-red-600 font-bold' : 'text-gray-600'}>
                            {dayjs(p.expiry_date).format('MMM DD, YYYY')}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status === 'ACTIVE'
                            ? 'bg-blue-50 text-blue-600 border border-blue-100/55'
                            : 'bg-gray-100 text-gray-500 border border-gray-200/55'
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openModal(p)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-500 hover:text-blue-600 transition-all-300"
                            title="Edit Product"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600 transition-all-300"
                            title="Delete Product"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    No products found matching filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/20 text-xs">
            <span className="text-gray-400 font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, processedProducts.length)} of{' '}
              {processedProducts.length} entries
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((c) => Math.max(1, c - 1))}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all-300"
              >
                <ChevronLeft className="w-4 h-4 text-gray-500" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg font-semibold transition-all-300 ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((c) => Math.min(totalPages, c + 1))}
                className="p-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all-300"
              >
                <ChevronRight className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* CREATE / EDIT DYNAMIC MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-gray-100 w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl animate-scale-up">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-gray-100">
              <h3 className="text-sm font-bold text-gray-900">
                {editingProduct ? 'Modify Product Specifications' : 'Catalog New Product'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg transition-all-300"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal form */}
            <form onSubmit={handleSubmit(onSubmit)} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {/* Product Name */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-gray-700">Product Name *</label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Paracetamol IV 100ml Infusion"
                  className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                {errors.name && (
                  <span className="text-[10px] text-red-600 font-semibold">{errors.name.message}</span>
                )}
              </div>

              {/* Grid 1: Category, Brand, Unit */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Category *</label>
                  <input
                    type="text"
                    {...register('category')}
                    placeholder="e.g. Analgesics"
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.category && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.category.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Brand *</label>
                  <input
                    type="text"
                    {...register('brand')}
                    placeholder="e.g. Pfizer"
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.brand && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.brand.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Unit *</label>
                  <input
                    type="text"
                    {...register('unit')}
                    placeholder="e.g. Vial, Box, Strip"
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.unit && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.unit.message}</span>
                  )}
                </div>
              </div>

              {/* Grid 2: Batch, Storage Location, Min Stock */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Batch Number *</label>
                  <input
                    type="text"
                    {...register('batch_number')}
                    placeholder="e.g. BT-90812"
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.batch_number && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.batch_number.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Storage Location *</label>
                  <input
                    type="text"
                    {...register('storage_location')}
                    placeholder="e.g. Shelf A-4, ColdRoom B"
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.storage_location && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.storage_location.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Minimum Stock *</label>
                  <input
                    type="number"
                    {...register('minimum_stock', { valueAsNumber: true })}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.minimum_stock && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.minimum_stock.message}</span>
                  )}
                </div>
              </div>

              {/* Grid 3: Prices & GST */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Purchase Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('purchase_price', { valueAsNumber: true })}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.purchase_price && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.purchase_price.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Selling Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('selling_price', { valueAsNumber: true })}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.selling_price && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.selling_price.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">GST (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    {...register('gst', { valueAsNumber: true })}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.gst && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.gst.message}</span>
                  )}
                </div>
              </div>

              {/* Grid 4: Dates */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Mfg Date</label>
                  <input
                    type="date"
                    {...register('manufacturing_date')}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.manufacturing_date && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.manufacturing_date.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Expiry Date</label>
                  <input
                    type="date"
                    {...register('expiry_date')}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {errors.expiry_date && (
                    <span className="text-[10px] text-red-600 font-semibold">{errors.expiry_date.message}</span>
                  )}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Status</label>
                  <select
                    {...register('status')}
                    className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 bg-white"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <label className="font-semibold text-gray-700">Product Description</label>
                <textarea
                  rows={2}
                  {...register('description')}
                  placeholder="Additional product details, formulation, or usage guidelines..."
                  className="px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg font-semibold transition-all-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createProductMutation.isPending || updateProductMutation.isPending}
                  className="px-4.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-all-300 disabled:opacity-50"
                >
                  {editingProduct ? 'Save Specifications' : 'Catalog Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
