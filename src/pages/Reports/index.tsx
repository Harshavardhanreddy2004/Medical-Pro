import React, { useState, useMemo } from 'react';
import { useProducts, useInventory, useTransactions } from '../../hooks/useInventoryData';
import { useAppStore } from '../../store/useAppStore';
import {
  FileText,
  Download,
  Printer,
  Boxes,
  History,
  AlertTriangle,
  Calendar,
  Sparkles,
} from 'lucide-react';
import dayjs from 'dayjs';
import { toast } from 'sonner';

type ReportType = 'INVENTORY' | 'MOVEMENT' | 'LOW_STOCK' | 'EXPIRING';

export const Reports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('INVENTORY');
  
  // Queries
  const { data: products } = useProducts();
  const { data: inventory, isLoading: isInvLoading } = useInventory();
  const { data: transactions, isLoading: isTxLoading } = useTransactions();

  // 1. Compile report data depending on the selected type
  const reportData = useMemo(() => {
    if (!products || !inventory || !transactions) return [];

    switch (reportType) {
      case 'INVENTORY':
        // Inventory Report: Product Name, SKU, Batch, Location, Available, Reserved, Current Stock, Purchase Value, Sales Value
        return inventory.map((item) => {
          const buyVal = item.current_stock * (item.product?.purchase_price ?? 0);
          const sellVal = item.current_stock * (item.product?.selling_price ?? 0);
          return {
            sku: item.product?.sku,
            name: item.product?.name,
            batch: item.product?.batch_number,
            location: item.product?.storage_location,
            currentStock: item.current_stock,
            available: item.available_stock,
            reserved: item.reserved_stock,
            buyPrice: item.product?.purchase_price,
            sellPrice: item.product?.selling_price,
            totalBuyVal: buyVal,
            totalSellVal: sellVal,
          };
        });

      case 'MOVEMENT':
        // Movement Report: Transaction ID, SKU, Product Name, Type, Quantity, Before, After, Operator, Date
        return transactions.map((t) => ({
          txId: t.id.substring(0, 8),
          sku: t.product?.sku,
          name: t.product?.name,
          type: t.transaction_type === 'STOCK_IN' ? 'Stock In' : 'Stock Out',
          quantity: t.quantity,
          before: t.before_stock,
          after: t.after_stock,
          operator: t.operator,
          date: dayjs(t.created_at).format('YYYY-MM-DD HH:mm'),
        }));

      case 'LOW_STOCK':
        // Low Stock Report: SKU, Product Name, Location, Current Stock, Min Target, Stock Deficit, Reorder Level
        return inventory
          .filter((item) => {
            const min = item.product?.minimum_stock ?? 10;
            return item.current_stock < min;
          })
          .map((item) => {
            const min = item.product?.minimum_stock ?? 10;
            return {
              sku: item.product?.sku,
              name: item.product?.name,
              location: item.product?.storage_location,
              currentStock: item.current_stock,
              minTarget: min,
              deficit: min - item.current_stock,
              status: item.current_stock === 0 ? 'OUT OF STOCK' : 'LOW STOCK',
            };
          });

      case 'EXPIRING':
        // Expiring Report: SKU, Product Name, Batch, Expiry Date, Location, Current Stock, Days Remaining, Expiry Status
        return inventory
          .filter((item) => item.product?.expiry_date !== null)
          .map((item) => {
            const expDate = dayjs(item.product.expiry_date);
            const diffDays = expDate.diff(dayjs(), 'day');
            
            let status = 'HEALTHY';
            if (diffDays < 0) status = 'EXPIRED';
            else if (diffDays <= 90) status = 'EXPIRING SOON';

            return {
              sku: item.product?.sku,
              name: item.product?.name,
              batch: item.product?.batch_number,
              expiry: item.product?.expiry_date,
              location: item.product?.storage_location,
              currentStock: item.current_stock,
              daysLeft: diffDays,
              status: status,
            };
          })
          .filter((item) => item.status !== 'HEALTHY') // Only show warning products
          .sort((a, b) => a.daysLeft - b.daysLeft);

      default:
        return [];
    }
  }, [reportType, products, inventory, transactions]);

  // Export report to CSV / Excel
  const handleExport = (format: 'CSV' | 'EXCEL') => {
    if (reportData.length === 0) return;

    let headers: string[] = [];
    let rows: any[][] = [];

    if (reportType === 'INVENTORY') {
      headers = ['SKU', 'Product Name', 'Batch', 'Storage Location', 'Current Stock', 'Available', 'Reserved', 'Purchase Price', 'Selling Price', 'Valuation (Purchase)', 'Valuation (Sale)'];
      rows = reportData.map((r: any) => [
        r.sku,
        `"${r.name.replace(/"/g, '""')}"`,
        r.batch,
        r.location,
        r.currentStock,
        r.available,
        r.reserved,
        r.buyPrice,
        r.sellPrice,
        r.totalBuyVal,
        r.totalSellVal,
      ]);
    } else if (reportType === 'MOVEMENT') {
      headers = ['Tx ID', 'SKU', 'Product Name', 'Type', 'Quantity', 'Stock Before', 'Stock After', 'Operator', 'Date'];
      rows = reportData.map((r: any) => [
        r.txId,
        r.sku,
        `"${r.name.replace(/"/g, '""')}"`,
        r.type,
        r.quantity,
        r.before,
        r.after,
        `"${r.operator.replace(/"/g, '""')}"`,
        r.date,
      ]);
    } else if (reportType === 'LOW_STOCK') {
      headers = ['SKU', 'Product Name', 'Storage Location', 'Current Stock', 'Minimum Target', 'Stock Deficit', 'Alert Status'];
      rows = reportData.map((r: any) => [
        r.sku,
        `"${r.name.replace(/"/g, '""')}"`,
        r.location,
        r.currentStock,
        r.minTarget,
        r.deficit,
        r.status,
      ]);
    } else if (reportType === 'EXPIRING') {
      headers = ['SKU', 'Product Name', 'Batch', 'Expiry Date', 'Location', 'Current Stock', 'Days Left', 'Status'];
      rows = reportData.map((r: any) => [
        r.sku,
        `"${r.name.replace(/"/g, '""')}"`,
        r.batch,
        r.expiry,
        r.location,
        r.currentStock,
        r.daysLeft,
        r.status,
      ]);
    }

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const filename = `medistock_${reportType.toLowerCase()}_report_${dayjs().format('YYYYMMDD')}.csv`;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${reportType} report successfully`);
  };

  const handlePrint = () => {
    window.print();
  };

  // Metrics overview
  const totalValuePurchase = useMemo(() => {
    if (reportType !== 'INVENTORY') return 0;
    return reportData.reduce((sum, item: any) => sum + item.totalBuyVal, 0);
  }, [reportData, reportType]);

  const totalValueSale = useMemo(() => {
    if (reportType !== 'INVENTORY') return 0;
    return reportData.reduce((sum, item: any) => sum + item.totalSellVal, 0);
  }, [reportData, reportType]);

  return (
    <div className="space-y-6 print:p-0 print:space-y-4">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">Intelligence Reports</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Compile valuation, stock movement history, deficits, and expiries.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            disabled={reportData.length === 0}
            className="flex items-center gap-1.8 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold shadow-sm transition-all-300 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            Print / Save PDF
          </button>
          <button
            onClick={() => handleExport('CSV')}
            disabled={reportData.length === 0}
            className="flex items-center gap-1.8 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all-300 disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Report Selection Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
        {/* Tab 1: Inventory Valuation */}
        <button
          onClick={() => setReportType('INVENTORY')}
          className={`flex flex-col items-start p-4 border rounded-xl shadow-xs transition-all-300 text-left ${
            reportType === 'INVENTORY'
              ? 'border-blue-200 bg-blue-50/20'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <Boxes className={`w-5 h-5 mb-2.5 ${reportType === 'INVENTORY' ? 'text-blue-600' : 'text-gray-400'}`} />
          <h4 className="text-xs font-bold text-gray-900">Inventory valuation</h4>
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">Current asset valuation, locations, and unit counts.</p>
        </button>

        {/* Tab 2: Stock Movements */}
        <button
          onClick={() => setReportType('MOVEMENT')}
          className={`flex flex-col items-start p-4 border rounded-xl shadow-xs transition-all-300 text-left ${
            reportType === 'MOVEMENT'
              ? 'border-blue-200 bg-blue-50/20'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <History className={`w-5 h-5 mb-2.5 ${reportType === 'MOVEMENT' ? 'text-blue-600' : 'text-gray-400'}`} />
          <h4 className="text-xs font-bold text-gray-900">Stock movements</h4>
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">Velocity of stock inflows and outflows with audit details.</p>
        </button>

        {/* Tab 3: Low Stock deficit */}
        <button
          onClick={() => setReportType('LOW_STOCK')}
          className={`flex flex-col items-start p-4 border rounded-xl shadow-xs transition-all-300 text-left ${
            reportType === 'LOW_STOCK'
              ? 'border-blue-200 bg-blue-50/20'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <AlertTriangle className={`w-5 h-5 mb-2.5 ${reportType === 'LOW_STOCK' ? 'text-blue-600' : 'text-gray-400'}`} />
          <h4 className="text-xs font-bold text-gray-900">Deficits & Low Stock</h4>
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">Catalog items below target levels requiring procurement.</p>
        </button>

        {/* Tab 4: Expiring Products */}
        <button
          onClick={() => setReportType('EXPIRING')}
          className={`flex flex-col items-start p-4 border rounded-xl shadow-xs transition-all-300 text-left ${
            reportType === 'EXPIRING'
              ? 'border-blue-200 bg-blue-50/20'
              : 'border-gray-100 bg-white hover:border-gray-200'
          }`}
        >
          <Calendar className={`w-5 h-5 mb-2.5 ${reportType === 'EXPIRING' ? 'text-blue-600' : 'text-gray-400'}`} />
          <h4 className="text-xs font-bold text-gray-900">Expiring Items</h4>
          <p className="text-[10px] text-gray-400 mt-1 leading-snug">Expiries within 90 days and past-due items list.</p>
        </button>
      </div>

      {/* Printable Report Header */}
      <div className="hidden print:flex flex-col items-center justify-center border-b border-gray-200 pb-5 mb-5">
        <h1 className="text-lg font-bold text-gray-900 uppercase">MediStock Pro - B2B MEDICAL INVENTORY</h1>
        <h2 className="text-sm font-semibold text-gray-600 mt-1 uppercase">
          {reportType.replace('_', ' ')} REPORT
        </h2>
        <p className="text-[10px] text-gray-400 mt-1.5">
          Generated on {dayjs().format('MMMM DD, YYYY · hh:mm A')} by Harsh Vardhan
        </p>
      </div>

      {/* Summary Valuation Info Box (Only for Inventory Valuation Report) */}
      {reportType === 'INVENTORY' && reportData.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50/50 p-4 border border-gray-100 rounded-xl text-xs">
          <div className="flex justify-between items-center py-1">
            <span className="text-gray-500 font-semibold uppercase text-[10px]">Total Purchase Valuation</span>
            <span className="text-sm font-bold text-gray-800">${totalValuePurchase.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between items-center py-1 md:border-l md:pl-6 border-gray-200">
            <span className="text-gray-500 font-semibold uppercase text-[10px]">Total Selling Value</span>
            <span className="text-sm font-bold text-blue-600">${totalValueSale.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}

      {/* Report Data Preview Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm print:border-none print:shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 uppercase font-bold tracking-wider print:bg-transparent">
                {reportType === 'INVENTORY' && (
                  <>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-right">Purchase Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">Purchase Value</th>
                    <th className="py-3 px-4 text-right">Selling Value</th>
                  </>
                )}
                {reportType === 'MOVEMENT' && (
                  <>
                    <th className="py-3 px-4">Tx ID</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4 text-center">Quantity</th>
                    <th className="py-3 px-4 text-center">Before</th>
                    <th className="py-3 px-4 text-center">After</th>
                    <th className="py-3 px-4">Operator</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </>
                )}
                {reportType === 'LOW_STOCK' && (
                  <>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Target Level</th>
                    <th className="py-3 px-4 text-center">Deficit Units</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </>
                )}
                {reportType === 'EXPIRING' && (
                  <>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">Batch</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4 text-center">Current Stock</th>
                    <th className="py-3 px-4 text-center">Days Remaining</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isInvLoading || isTxLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={10} className="py-4 px-4">
                      <div className="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                  </tr>
                ))
              ) : reportData.length > 0 ? (
                reportData.map((row: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-all-300 print:hover:bg-transparent">
                    {reportType === 'INVENTORY' && (
                      <>
                        <td className="py-3 px-4 font-mono font-bold text-gray-500">{row.sku}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{row.name}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{row.batch}</td>
                        <td className="py-3 px-4 text-gray-600 font-semibold">{row.location}</td>
                        <td className="py-3 px-4 text-center font-bold text-gray-900">{row.currentStock}</td>
                        <td className="py-3 px-4 text-right text-gray-500">${row.buyPrice?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right text-gray-500">${row.sellPrice?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-medium text-gray-700">${row.totalBuyVal?.toFixed(2)}</td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600">${row.totalSellVal?.toFixed(2)}</td>
                      </>
                    )}
                    {reportType === 'MOVEMENT' && (
                      <>
                        <td className="py-3 px-4 font-mono text-gray-400">{row.txId}</td>
                        <td className="py-3 px-4 font-mono font-semibold text-gray-500">{row.sku}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{row.name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            row.type === 'Stock In' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-gray-700">{row.quantity}</td>
                        <td className="py-3 px-4 text-center font-mono text-gray-400">{row.before}</td>
                        <td className="py-3 px-4 text-center font-mono text-gray-700">{row.after}</td>
                        <td className="py-3 px-4 font-semibold text-gray-600">{row.operator}</td>
                        <td className="py-3 px-4 text-gray-500">{row.date}</td>
                      </>
                    )}
                    {reportType === 'LOW_STOCK' && (
                      <>
                        <td className="py-3 px-4 font-mono font-bold text-gray-500">{row.sku}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{row.name}</td>
                        <td className="py-3 px-4 text-gray-600 font-semibold">{row.location}</td>
                        <td className="py-3 px-4 text-center font-bold text-red-600">{row.currentStock}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-500">{row.minTarget}</td>
                        <td className="py-3 px-4 text-center font-bold text-red-800">{row.deficit}</td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            row.status === 'OUT OF STOCK' ? 'bg-gray-100 text-gray-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}
                    {reportType === 'EXPIRING' && (
                      <>
                        <td className="py-3 px-4 font-mono font-bold text-gray-500">{row.sku}</td>
                        <td className="py-3 px-4 font-semibold text-gray-800">{row.name}</td>
                        <td className="py-3 px-4 font-mono text-gray-600">{row.batch}</td>
                        <td className="py-3 px-4 font-bold text-red-600">{dayjs(row.expiry).format('MMM DD, YYYY')}</td>
                        <td className="py-3 px-4 text-gray-600 font-semibold">{row.location}</td>
                        <td className="py-3 px-4 text-center font-semibold text-gray-900">{row.currentStock}</td>
                        <td className="py-3 px-4 text-center font-bold text-red-700">
                          {row.daysLeft < 0 ? `Expired (${Math.abs(row.daysLeft)}d ago)` : `${row.daysLeft} days`}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                            row.status === 'EXPIRED' ? 'bg-red-100 text-red-800 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-100'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    No matching report entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
