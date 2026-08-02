import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import {
  useDashboardMetrics,
  useTransactions,
  useInventory,
} from '../../hooks/useInventoryData';
import {
  Package,
  Boxes,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  QrCode,
  Plus,
  Scan,
  History,
  TrendingUp,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';

export const Dashboard: React.FC = () => {
  const { setActiveTab, setScanMode, setAddProductModalOpen } = useAppStore();
  const { data: metrics, isLoading: isMetricsLoading } = useDashboardMetrics();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();
  const { data: inventory } = useInventory();

  // Quick action helper functions
  const handleQuickStockAction = (mode: 'STOCK_IN' | 'STOCK_OUT') => {
    setScanMode(mode);
    setActiveTab('qr-scanner');
  };

  // 1. Process data for Inventory Trend (Area Chart of stock level over last 7 days)
  const getTrendData = () => {
    if (!transactions) return [];
    
    // Create last 7 days array
    const days = Array.from({ length: 7 }).map((_, i) => {
      return dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
    });

    let currentStock = metrics?.currentInventory ?? 0;
    
    // Sort transactions descending to walk backwards
    const sortedTx = [...transactions].sort((a, b) => dayjs(b.created_at).diff(dayjs(a.created_at)));
    
    const dayBalances = days.map((day) => {
      // Find net change for days after this day
      const txAfterDay = sortedTx.filter(t => dayjs(t.created_at).isAfter(dayjs(day).endOf('day')));
      const netChangeAfter = txAfterDay.reduce((sum, tx) => {
        if (tx.transaction_type === 'STOCK_IN') {
          return sum + tx.quantity;
        } else {
          return sum - tx.quantity;
        }
      }, 0);

      return {
        date: dayjs(day).format('MMM DD'),
        Stock: Math.max(0, currentStock - netChangeAfter),
      };
    });

    return dayBalances;
  };

  // 2. Process data for Stock Movements (Bar Chart of IN vs OUT per day last 7 days)
  const getMovementData = () => {
    if (!transactions) return [];

    const days = Array.from({ length: 7 }).map((_, i) => {
      return dayjs().subtract(6 - i, 'day').format('YYYY-MM-DD');
    });

    return days.map((day) => {
      const dayTx = transactions.filter(
        (t) => dayjs(t.created_at).format('YYYY-MM-DD') === day
      );
      
      const stockIn = dayTx
        .filter((t) => t.transaction_type === 'STOCK_IN')
        .reduce((sum, t) => sum + t.quantity, 0);

      const stockOut = dayTx
        .filter((t) => t.transaction_type === 'STOCK_OUT')
        .reduce((sum, t) => sum + t.quantity, 0);

      return {
        name: dayjs(day).format('ddd'),
        'Stock In': stockIn,
        'Stock Out': stockOut,
      };
    });
  };

  // 3. Process top products data (Pie/Bar Chart)
  const getTopProductsData = () => {
    if (!inventory) return [];
    
    // Sort by stock level descending
    const sorted = [...inventory]
      .sort((a, b) => b.current_stock - a.current_stock)
      .slice(0, 5);

    return sorted.map((item) => ({
      name: item.product.name.substring(0, 15) + (item.product.name.length > 15 ? '...' : ''),
      value: item.current_stock,
    }));
  };

  const trendData = getTrendData();
  const movementData = getMovementData();
  const topProductsData = getTopProductsData();
  const COLORS = ['#2563eb', '#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe'];

  // Loading Skeleton
  if (isMetricsLoading || isTxLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 w-48 bg-gray-100 rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 bg-gray-50 border border-gray-100 rounded-xl"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-50 border border-gray-100 rounded-xl"></div>
          <div className="h-96 bg-gray-50 border border-gray-100 rounded-xl"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-7">
      {/* Dashboard header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Overview Dashboard</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time analytics and inventory status for MediStock Pro.
          </p>
        </div>

        {/* Quick Actions Panel */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setAddProductModalOpen(true);
              setActiveTab('products');
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold shadow-sm transition-all-300"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Product
          </button>
          <button
            onClick={() => setActiveTab('qr-generator')}
            className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold shadow-sm transition-all-300"
          >
            <QrCode className="w-3.5 h-3.5" />
            Generate QR
          </button>
          <button
            onClick={() => handleQuickStockAction('STOCK_IN')}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all-300"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Stock In
          </button>
          <button
            onClick={() => handleQuickStockAction('STOCK_OUT')}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all-300"
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Stock Out
          </button>
        </div>
      </div>

      {/* Metrics Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
        {/* Card 1: Total Products */}
        <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Total Products
            </span>
            <div className="p-1.5 rounded-lg bg-gray-50 text-gray-500">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-bold text-gray-900">{metrics?.totalProducts}</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Catalog items active</p>
          </div>
        </div>

        {/* Card 2: Current Inventory */}
        <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Current Stock
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-bold text-gray-900">{metrics?.currentInventory}</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Aggregate physical units</p>
          </div>
        </div>

        {/* Card 3: Today's Stock In */}
        <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Stock In (Today)
            </span>
            <div className="p-1.5 rounded-lg bg-green-50 text-green-600">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-bold text-gray-900">{metrics?.todayStockIn}</h3>
            <p className="text-[10px] text-green-600 font-medium mt-1 flex items-center gap-0.5">
              <span>+{(metrics?.todayStockIn ?? 0)} units today</span>
            </p>
          </div>
        </div>

        {/* Card 4: Today's Stock Out */}
        <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Stock Out (Today)
            </span>
            <div className="p-1.5 rounded-lg bg-red-50/50 text-red-600">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-bold text-gray-900">{metrics?.todayStockOut}</h3>
            <p className="text-[10px] text-red-600 font-medium mt-1 flex items-center gap-0.5">
              <span>-{(metrics?.todayStockOut ?? 0)} units today</span>
            </p>
          </div>
        </div>

        {/* Card 5: Low Stock Products */}
        <div className={`border rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all-300 ${
          metrics?.lowStockCount && metrics.lowStockCount > 0
            ? 'border-red-100/60 bg-red-50/10'
            : 'border-gray-100'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <div className={`p-1.5 rounded-lg ${
              metrics?.lowStockCount && metrics.lowStockCount > 0 ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className={`text-2xl font-bold ${
              metrics?.lowStockCount && metrics.lowStockCount > 0 ? 'text-red-600' : 'text-gray-900'
            }`}>
              {metrics?.lowStockCount}
            </h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Below target stock level</p>
          </div>
        </div>

        {/* Card 6: QR Codes Generated */}
        <div className="border border-gray-100 rounded-xl p-5 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              QR UUIDs Active
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-500">
              <QrCode className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3.5">
            <h3 className="text-2xl font-bold text-gray-900">{metrics?.qrGeneratedCount}</h3>
            <p className="text-[10px] text-gray-400 font-medium mt-1">Unique tracking codes</p>
          </div>
        </div>
      </div>

      {/* Main dashboard visualization area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Charts */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Inventory Trend Chart */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <div className="flex justify-between items-center mb-5">
              <div>
                <h3 className="text-sm font-bold text-gray-900">Aggregate Inventory Trend</h3>
                <p className="text-xs text-gray-400">Total physical stock balance over last 7 days</p>
              </div>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorStock" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: '8px', fontSize: '12px' }}
                    labelClassName="font-semibold text-gray-800"
                  />
                  <Area type="monotone" dataKey="Stock" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorStock)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stock In / Out Movements Chart */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Stock Movements</h3>
              <p className="text-xs text-gray-400 mb-5">Daily inventory velocity (Stock In vs Stock Out)</p>
            </div>
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                  <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} tickLine={false} />
                  <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #f3f4f6', borderRadius: '8px', fontSize: '12px' }}
                  />
                  <Bar dataKey="Stock In" fill="#22c55e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Stock Out" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Side: Top Products & Recent Activity */}
        <div className="space-y-6">
          
          {/* Top Products stock distribution */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Top 5 Products by Stock</h3>
            <div className="h-56 w-full flex items-center justify-center relative">
              {topProductsData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={topProductsData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {topProductsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-xs text-gray-400 font-semibold uppercase">Total</span>
                    <span className="text-lg font-bold text-gray-800">
                      {topProductsData.reduce((sum, item) => sum + item.value, 0)}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-gray-400">No product inventory available</p>
              )}
            </div>
            <div className="space-y-2.5 mt-2">
              {topProductsData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                    <span className="text-gray-600 font-medium">{item.name}</span>
                  </div>
                  <span className="text-gray-800 font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-gray-900">Recent Movements</h3>
              <button onClick={() => setActiveTab('transactions')} className="text-xs text-blue-600 hover:text-blue-700 font-semibold">
                View Ledger
              </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {transactions && transactions.length > 0 ? (
                transactions.slice(0, 7).map((tx) => (
                  <div key={tx.id} className="flex justify-between items-start text-xs border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                    <div className="space-y-1 max-w-[70%]">
                      <p className="text-gray-800 font-semibold truncate leading-tight">
                        {tx.product?.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {dayjs(tx.created_at).format('MMM DD, YYYY · hh:mm A')}
                      </p>
                      {tx.notes && (
                        <p className="text-[10px] text-gray-400 font-medium italic truncate">
                          "{tx.notes}"
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                        tx.transaction_type === 'STOCK_IN'
                          ? 'bg-green-50 text-green-700 border border-green-100'
                          : 'bg-red-50 text-red-700 border border-red-100'
                      }`}>
                        {tx.transaction_type === 'STOCK_IN' ? '+' : '-'}{tx.quantity}
                      </span>
                      <p className="text-[9px] text-gray-400 mt-1 font-mono">
                        {tx.before_stock} → {tx.after_stock}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
                  <History className="w-8 h-8 text-gray-300" />
                  <p className="text-[11px]">No inventory movements logged yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
