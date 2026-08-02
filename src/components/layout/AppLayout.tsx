import React from 'react';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useAppStore } from '../../store/useAppStore';

// Lazy loading pages or importing directly for immediate rendering
import { Dashboard } from '../../pages/Dashboard';
import { Products } from '../../pages/Products';
import { Inventory } from '../../pages/Inventory';
import { QRGenerator } from '../../pages/QRGenerator';
import { QRScanner } from '../../pages/QRScanner';
import { Transactions } from '../../pages/Transactions';
import { Reports } from '../../pages/Reports';
import { Settings } from '../../pages/Settings';

export const AppLayout: React.FC = () => {
  const { activeTab } = useAppStore();

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <Products />;
      case 'inventory':
        return <Inventory />;
      case 'qr-generator':
        return <QRGenerator />;
      case 'qr-scanner':
        return <QRScanner />;
      case 'transactions':
        return <Transactions />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main Panel */}
      <div className="pl-64 flex flex-col min-h-screen">
        {/* Top Navbar */}
        <Navbar />

        {/* Dynamic Page Container */}
        <main className="flex-1 p-8 bg-white overflow-y-auto">
          <div className="max-w-[1400px] mx-auto animate-fade-in">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};
