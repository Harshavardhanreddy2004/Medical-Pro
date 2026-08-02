import React from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useDashboardMetrics } from '../../hooks/useInventoryData';
import {
  LayoutDashboard,
  Package,
  Boxes,
  QrCode,
  ScanLine,
  History,
  BarChart3,
  Settings,
  AlertTriangle,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab } = useAppStore();
  const { data: metrics } = useDashboardMetrics();

  const navItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'products', name: 'Products', icon: Package },
    { 
      id: 'inventory', 
      name: 'Inventory', 
      icon: Boxes, 
      badge: metrics?.lowStockCount && metrics.lowStockCount > 0 ? metrics.lowStockCount : undefined 
    },
    { id: 'qr-generator', name: 'QR Generator', icon: QrCode },
    { id: 'qr-scanner', name: 'QR Scanner', icon: ScanLine },
    { id: 'transactions', name: 'Transactions', icon: History },
    { id: 'reports', name: 'Reports', icon: BarChart3 },
    { id: 'settings', name: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-gray-100 bg-white h-screen flex flex-col fixed left-0 top-0 z-20">
      {/* Brand logo */}
      <div className="h-16 flex items-center px-6 border-b border-gray-50 gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          M
        </div>
        <div>
          <h1 className="font-semibold text-gray-900 text-[15px] tracking-tight leading-none">
            MediStock Pro
          </h1>
          <span className="text-[10px] text-gray-400 font-medium tracking-wider uppercase">
            B2B DISTRIBUTION
          </span>
        </div>
      </div>

      {/* Navigation links */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all-300 ${
                isActive
                  ? 'bg-blue-50/70 text-blue-600'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                <span>{item.name}</span>
              </div>
              {item.badge !== undefined && (
                <span className={`px-2 py-0.5 text-[11px] font-bold rounded-full ${
                  isActive ? 'bg-blue-100 text-blue-700' : 'bg-red-50 text-red-600 border border-red-100'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* System Status info */}
      <div className="p-4 border-t border-gray-50 bg-gray-50/30">
        {metrics?.lowStockCount && metrics.lowStockCount > 0 ? (
          <div className="flex items-start gap-2.5 p-3 bg-red-50/50 border border-red-100/50 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-[11px] font-semibold text-red-800">
                Low Stock Alert
              </p>
              <p className="text-[10px] text-red-600 mt-0.5 leading-snug">
                {metrics.lowStockCount} items require restock attention.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50/30 border border-green-100/30 rounded-lg text-[11px] font-semibold text-green-700">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            All inventory levels normal
          </div>
        )}
      </div>
    </aside>
  );
};
