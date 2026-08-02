import React, { useState, useMemo } from 'react';
import { useInventory } from '../../hooks/useInventoryData';
import { useAppStore } from '../../store/useAppStore';
import { Inventory as InventoryType } from '../../types';
import { Search, Info, AlertTriangle, AlertOctagon, Sparkles, Filter, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import dayjs from 'dayjs';

export const Inventory: React.FC = () => {
  const { globalSearch } = useAppStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // Table sorting & pagination
  const [sortField, setSortField] = useState<keyof InventoryType | 'product.name'>('product.name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: inventory, isLoading } = useInventory();

  // Helper to determine inventory status
  const getInventoryStatus = (item: InventoryType & { product: any }) => {
    const minStock = item.product?.minimum_stock ?? 10;
    const isExpired = item.product?.expiry_date && dayjs(item.product.expiry_date).isBefore(dayjs());
    const isExpiringSoon = item.product?.expiry_date && 
      dayjs(item.product.expiry_date).isAfter(dayjs()) && 
      dayjs(item.product.expiry_date).diff(dayjs(), 'day') <= 90;

    if (isExpired) return 'EXPIRED';
    if (item.current_stock === 0) return 'OUT OF STOCK';
    if (item.current_stock < minStock) return 'LOW STOCK';
    if (isExpiringSoon) return 'EXPIRING SOON';
    return 'NORMAL';
  };

  // Sort & filter local data
  const processedInventory = useMemo(() => {
    if (!inventory) return [];
    
    // 1. Filter
    let list = inventory.map(item => ({
      ...item,
      status: getInventoryStatus(item)
    }));

    // Status Filter
    if (statusFilter !== 'ALL') {
      list = list.filter((item) => item.status === statusFilter);
    }

    // Text Search (SKU, Name, Category, Location, Batch)
    const activeSearch = search || globalSearch;
    if (activeSearch) {
      const queryLower = activeSearch.toLowerCase();
      list = list.filter(
        (item) =>
          item.product?.name.toLowerCase().includes(queryLower) ||
          item.product?.sku.toLowerCase().includes(queryLower) ||
          item.product?.category?.toLowerCase().includes(queryLower) ||
          item.product?.storage_location?.toLowerCase().includes(queryLower) ||
          item.product?.batch_number?.toLowerCase().includes(queryLower)
      );
    }

    // 2. Sort
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortField === 'product.name') {
        valA = a.product?.name ?? '';
        valB = b.product?.name ?? '';
      } else {
        valA = a[sortField as keyof InventoryType];
        valB = b[sortField as keyof InventoryType];
      }

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
  }, [inventory, sortField, sortOrder, statusFilter, search, globalSearch]);

  // Paginated data
  const paginatedInventory = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedInventory.slice(start, start + itemsPerPage);
  }, [processedInventory, currentPage]);

  const totalPages = Math.ceil(processedInventory.length / itemsPerPage);

  const handleSort = (field: keyof InventoryType | 'product.name') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Badge CSS Class mapping
  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'EXPIRED':
        return 'bg-red-50 text-red-700 border-red-100/60 font-bold';
      case 'OUT OF STOCK':
        return 'bg-gray-100 text-gray-700 border-gray-200/60 font-bold';
      case 'LOW STOCK':
        return 'bg-red-50/50 text-red-600 border-red-100/30 font-semibold';
      case 'EXPIRING SOON':
        return 'bg-amber-50 text-amber-700 border-amber-100/60 font-semibold';
      case 'NORMAL':
        return 'bg-green-50 text-green-700 border-green-100/60 font-semibold';
      default:
        return 'bg-gray-50 text-gray-500 border-gray-100';
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Stock Inventory</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time physical stock counts, expiry statuses, reserved, and available levels.
        </p>
      </div>

      {/* Stats header for inventory page */}
      {!isLoading && inventory && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Out of Stock</p>
              <h4 className="text-lg font-bold text-gray-800">
                {inventory.filter(i => i.current_stock === 0).length}
              </h4>
            </div>
          </div>
          <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-50/40 flex items-center justify-center text-red-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Low Stock items</p>
              <h4 className="text-lg font-bold text-gray-800">
                {inventory.filter(i => i.current_stock < (i.product?.minimum_stock ?? 10) && i.current_stock > 0).length}
              </h4>
            </div>
          </div>
          <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Expiring in 90d</p>
              <h4 className="text-lg font-bold text-gray-800">
                {inventory.filter(i => i.product?.expiry_date && dayjs(i.product.expiry_date).isAfter(dayjs()) && dayjs(i.product.expiry_date).diff(dayjs(), 'day') <= 90).length}
              </h4>
            </div>
          </div>
          <div className="border border-gray-100 bg-white rounded-xl p-5 shadow-sm flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Healthy Stock</p>
              <h4 className="text-lg font-bold text-gray-800">
                {inventory.filter(i => i.current_stock >= (i.product?.minimum_stock ?? 10) && (!i.product?.expiry_date || dayjs(i.product.expiry_date).isAfter(dayjs()))).length}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
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
            placeholder="Search SKU, name, location..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          <span className="text-gray-400 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Inventory Status
          </span>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
          >
            <option value="ALL">All Statuses</option>
            <option value="NORMAL">Normal / Healthy</option>
            <option value="LOW STOCK">Low Stock</option>
            <option value="OUT OF STOCK">Out of Stock</option>
            <option value="EXPIRING SOON">Expiring Soon</option>
            <option value="EXPIRED">Expired</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4 cursor-pointer hover:text-gray-700" onClick={() => handleSort('product.name')}>
                  <div className="flex items-center gap-1">
                    Product <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Batch</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4 text-center cursor-pointer hover:text-gray-700" onClick={() => handleSort('current_stock')}>
                  <div className="flex items-center justify-center gap-1">
                    Current Stock <ChevronsUpDown className="w-3 h-3 text-gray-400" />
                  </div>
                </th>
                <th className="py-3 px-4 text-center">Available</th>
                <th className="py-3 px-4 text-center">Reserved</th>
                <th className="py-3 px-4 text-center">Min Target</th>
                <th className="py-3 px-4">Expiry Date</th>
                <th className="py-3 px-4 text-center">Stock Warning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-36 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-12 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-gray-100 rounded-full mx-auto"></div></td>
                  </tr>
                ))
              ) : paginatedInventory.length > 0 ? (
                paginatedInventory.map((item) => {
                  const minStock = item.product?.minimum_stock ?? 10;
                  const isRedHighlight = item.current_stock < minStock;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50/50 transition-all-300 ${
                        isRedHighlight ? 'bg-red-50/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-4 font-semibold text-gray-800">
                        {item.product?.name}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-gray-400">
                        {item.product?.sku}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600">
                        {item.product?.category}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-gray-500">
                        {item.product?.batch_number}
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 font-semibold">
                        {item.product?.storage_location}
                      </td>
                      <td className={`py-3.5 px-4 text-center font-bold ${
                        isRedHighlight ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        {item.current_stock}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-gray-600">
                        {item.available_stock}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-gray-400">
                        {item.reserved_stock}
                      </td>
                      <td className="py-3.5 px-4 text-center font-semibold text-gray-500">
                        {minStock}
                      </td>
                      <td className="py-3.5 px-4 text-gray-500">
                        {item.product?.expiry_date ? (
                          dayjs(item.product.expiry_date).format('MMM DD, YYYY')
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border inline-block ${getBadgeClass(item.status)}`}>
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-gray-400">
                    No inventory entries matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-6 py-4 bg-gray-50/20 text-xs">
            <span className="text-gray-400 font-medium">
              Showing {(currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, processedInventory.length)} of{' '}
              {processedInventory.length} items
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
    </div>
  );
};
