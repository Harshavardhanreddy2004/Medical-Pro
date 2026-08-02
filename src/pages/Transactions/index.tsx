import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useInventoryData';
import { useAppStore } from '../../store/useAppStore';
import { ArrowUpRight, ArrowDownRight, Search, Filter, History, ChevronLeft, ChevronRight, ChevronsUpDown } from 'lucide-react';
import dayjs from 'dayjs';

export const Transactions: React.FC = () => {
  const { globalSearch } = useAppStore();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Table pagination and sorting
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const { data: transactions, isLoading } = useTransactions();

  // Filter & Sort
  const processedTransactions = useMemo(() => {
    if (!transactions) return [];

    let list = [...transactions];

    // 1. Filter Type
    if (typeFilter !== 'ALL') {
      list = list.filter((t) => t.transaction_type === typeFilter);
    }

    // 2. Filter Search (Product name, operator, notes, SKU)
    const activeSearch = search || globalSearch;
    if (activeSearch) {
      const queryLower = activeSearch.toLowerCase();
      list = list.filter(
        (t) =>
          t.product?.name.toLowerCase().includes(queryLower) ||
          t.operator.toLowerCase().includes(queryLower) ||
          t.notes?.toLowerCase().includes(queryLower) ||
          t.product?.sku.toLowerCase().includes(queryLower)
      );
    }

    // 3. Sort by created_at
    list.sort((a, b) => {
      const dateA = dayjs(a.created_at);
      const dateB = dayjs(b.created_at);
      return sortOrder === 'asc'
        ? dateA.diff(dateB)
        : dateB.diff(dateA);
    });

    return list;
  }, [transactions, typeFilter, search, globalSearch, sortOrder]);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedTransactions.slice(start, start + itemsPerPage);
  }, [processedTransactions, currentPage]);

  const totalPages = Math.ceil(processedTransactions.length / itemsPerPage);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Audit Ledger & Transactions</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Immutable audit record of all physical inventory movements. Deletion is restricted.
        </p>
      </div>

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
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-3 text-xs w-full md:w-auto justify-end">
          {/* Movement Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-gray-400 font-medium flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Movement Type
            </span>
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50/50 text-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 font-medium"
            >
              <option value="ALL">All Movements</option>
              <option value="STOCK_IN">Stock In (+)</option>
              <option value="STOCK_OUT">Stock Out (-)</option>
            </select>
          </div>

          {/* Chronological sorting */}
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 hover:bg-gray-50 rounded-lg font-semibold text-gray-600"
          >
            <span>Date</span>
            <ChevronsUpDown className="w-3 h-3 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4">Transaction ID</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4 text-center">Movement</th>
                <th className="py-3 px-4 text-center">Quantity</th>
                <th className="py-3 px-4 text-center">Previous Stock</th>
                <th className="py-3 px-4 text-center">New Stock</th>
                <th className="py-3 px-4">Operator</th>
                <th className="py-3 px-4">Notes</th>
                <th className="py-3 px-4">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-28 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-36 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-gray-100 rounded-full mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-10 bg-gray-100 rounded mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                  </tr>
                ))
              ) : paginatedTransactions.length > 0 ? (
                paginatedTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50/50 transition-all-300">
                    <td className="py-3.5 px-4 font-mono text-gray-400">
                      {tx.id.substring(0, 8)}...
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {tx.product?.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-500">
                      {tx.product?.sku}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border inline-flex items-center gap-1 ${
                        tx.transaction_type === 'STOCK_IN'
                          ? 'bg-green-50 text-green-700 border-green-100'
                          : 'bg-red-50 text-red-700 border-red-100'
                      }`}>
                        {tx.transaction_type === 'STOCK_IN' ? (
                          <>
                            <ArrowUpRight className="w-3 h-3 text-green-600" />
                            Stock In
                          </>
                        ) : (
                          <>
                            <ArrowDownRight className="w-3 h-3 text-red-600" />
                            Stock Out
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-gray-700">
                      {tx.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-center font-medium text-gray-400 font-mono">
                      {tx.before_stock}
                    </td>
                    <td className="py-3.5 px-4 text-center font-semibold text-gray-700 font-mono">
                      {tx.after_stock}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-600">
                      {tx.operator}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 italic max-w-[180px] truncate" title={tx.notes || ''}>
                      {tx.notes ? `"${tx.notes}"` : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      {dayjs(tx.created_at).format('MMM DD, YYYY · hh:mm A')}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No transactions found matching filters.
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
              {Math.min(currentPage * itemsPerPage, processedTransactions.length)} of{' '}
              {processedTransactions.length} movements
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
