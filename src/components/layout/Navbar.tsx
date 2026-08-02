import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useDashboardMetrics } from '../../hooks/useInventoryData';
import { Search, Bell, Calendar, User } from 'lucide-react';
import dayjs from 'dayjs';

export const Navbar: React.FC = () => {
  const { globalSearch, setGlobalSearch } = useAppStore();
  const { data: metrics } = useDashboardMetrics();
  const [localSearch, setLocalSearch] = useState(globalSearch);

  // Debounce search query changes
  useEffect(() => {
    const handler = setTimeout(() => {
      setGlobalSearch(localSearch);
    }, 300); // 300ms debounce
    return () => clearTimeout(handler);
  }, [localSearch, setGlobalSearch]);

  const currentDate = dayjs().format('dddd, MMMM D, YYYY');

  return (
    <header className="h-16 border-b border-gray-100 bg-white flex items-center justify-between px-8 sticky top-0 z-10 w-full">
      {/* Search Input bar */}
      <div className="relative w-96">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </span>
        <input
          type="text"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search SKU, name, brand, category, batch..."
          className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50/30 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all-300"
        />
      </div>

      {/* Right Navbar elements */}
      <div className="flex items-center gap-6">
        {/* Date display */}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-400 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{currentDate}</span>
        </div>

        {/* Notifications Icon with Badge */}
        <div className="relative cursor-pointer hover:text-gray-900 text-gray-400">
          <Bell className="w-4.5 h-4.5" />
          {metrics?.lowStockCount && metrics.lowStockCount > 0 ? (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white animate-pulse" />
          ) : null}
        </div>

        {/* Profile Avatar Placeholder */}
        <div className="flex items-center gap-3.5 pl-6 border-l border-gray-100">
          <div className="flex flex-col items-end">
            <span className="text-sm font-semibold text-gray-800 leading-none">
              Harsh Vardhan
            </span>
            <span className="text-[10px] text-gray-400 mt-1 font-medium">
              Warehouse Ops
            </span>
          </div>
          <div className="w-8.5 h-8.5 rounded-full bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-sm">
            HV
          </div>
        </div>
      </div>
    </header>
  );
};
