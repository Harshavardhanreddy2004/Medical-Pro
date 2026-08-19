import React, { useState, useMemo } from 'react';
import { useQRCodes, useUpdateBulkQRPrintStatus } from '../../hooks/useInventoryData';
import { useAppStore } from '../../store/useAppStore';
import { Product } from '../../types';
import { Search, Download, Printer, FileText, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import QRCode from 'qrcode';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { LabelSheetPDF } from '../../lib/pdfHelper';
import dayjs from 'dayjs';
import { toast } from 'sonner';

export const QRGenerator: React.FC = () => {
  const { globalSearch } = useAppStore();
  const [search, setSearch] = useState('');
  
  // Selection & paging
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Query and mutation
  const { data: qrcodes, isLoading } = useQRCodes();
  const updatePrintStatusMutation = useUpdateBulkQRPrintStatus();

  // Process and filter data
  const filteredQRCodes = useMemo(() => {
    if (!qrcodes) return [];
    
    let list = [...qrcodes];

    const activeSearch = search || globalSearch;
    if (activeSearch) {
      const queryLower = activeSearch.toLowerCase();
      list = list.filter(
        (q) =>
          q.product?.name.toLowerCase().includes(queryLower) ||
          q.product?.sku.toLowerCase().includes(queryLower) ||
          q.product?.batch_number?.toLowerCase().includes(queryLower)
      );
    }

    return list;
  }, [qrcodes, search, globalSearch]);

  const paginatedQRCodes = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredQRCodes.slice(start, start + itemsPerPage);
  }, [filteredQRCodes, currentPage]);

  const totalPages = Math.ceil(filteredQRCodes.length / itemsPerPage);

  // Generate QR payload string for a product (keep it simple to maximize scan/decode reliability)
  const getQRPayload = (product: Product) => {
    return product.qr_uuid;
  };

  // Helper: Download a single QR Code as PNG
  const handleDownloadPNG = async (product: Product) => {
    try {
      const payload = getQRPayload(product);
      const url = await QRCode.toDataURL(payload, {
        width: 300,
        margin: 4,
        color: {
          dark: '#000000',
          light: '#ffffff',
        },
      });

      const link = document.createElement('a');
      link.href = url;
      link.download = `QR_${product.sku}_${product.batch_number}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Update print status in background
      const qrRecord = qrcodes?.find(q => q.product_id === product.id);
      if (qrRecord) {
        updatePrintStatusMutation.mutate([qrRecord.id]);
      }
      
      toast.success(`Downloaded QR Code PNG for ${product.sku}`);
    } catch (err: any) {
      toast.error(`Failed to download QR: ${err.message}`);
    }
  };

  // State to hold async generated stickers for PDF printing
  const [pdfStickers, setPdfStickers] = useState<{ qrDataUrl: string; name: string; sku: string; batchNumber: string }[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Compile sticker data (generating QR DataURLs) for PDF link
  const compileStickerData = async (productsToCompile: Product[]) => {
    setIsGeneratingPDF(true);
    try {
      const compiled = await Promise.all(
        productsToCompile.map(async (p) => {
          const payload = getQRPayload(p);
          const qrDataUrl = await QRCode.toDataURL(payload, {
            width: 150,
            margin: 4,
            color: {
              dark: '#000000',
              light: '#ffffff',
            },
          });
          return {
            qrDataUrl,
            name: p.name,
            sku: p.sku,
            batchNumber: p.batch_number || '',
          };
        })
      );
      setPdfStickers(compiled);
      
      // Mark as printed
      const qrIdsToUpdate = qrcodes
        ?.filter(q => productsToCompile.some(p => p.id === q.product_id))
        .map(q => q.id) || [];
      
      if (qrIdsToUpdate.length > 0) {
        updatePrintStatusMutation.mutate(qrIdsToUpdate);
      }
    } catch (err: any) {
      toast.error(`Error building PDF sheet: ${err.message}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(paginatedQRCodes.map((q) => q.product_id));
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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">QR Generator & Printing</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Generate, download, and print QR tracking code labels on A4 sticker sheets.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Action to compile for selected */}
          {selectedIds.length > 0 && (
            <button
              onClick={() => {
                const selectedProducts = qrcodes
                  ?.filter((q) => selectedIds.includes(q.product_id))
                  .map((q) => q.product)
                  .filter(Boolean) as Product[];
                compileStickerData(selectedProducts);
              }}
              className="flex items-center gap-1.8 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold shadow-sm transition-all-300"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              Compile Selected ({selectedIds.length})
            </button>
          )}

          {/* Action to compile all */}
          <button
            onClick={() => {
              if (qrcodes) {
                const allProducts = qrcodes.map((q) => q.product).filter(Boolean) as Product[];
                compileStickerData(allProducts);
              }
            }}
            disabled={!qrcodes || qrcodes.length === 0}
            className="flex items-center gap-1.8 px-3 py-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg text-xs font-semibold shadow-sm transition-all-300 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            Compile All ({qrcodes?.length ?? 0})
          </button>

          {/* Link to actually download PDF document */}
          {pdfStickers.length > 0 && (
            <PDFDownloadLink
              document={<LabelSheetPDF stickers={pdfStickers} />}
              fileName={`MediStock_Stickers_${dayjs().format('YYYYMMDD')}.pdf`}
              className="flex items-center gap-1.8 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all-300"
            >
              {({ loading }) => (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>{loading ? 'Formatting PDF...' : 'Download PDF Sheet'}</span>
                </>
              )}
            </PDFDownloadLink>
          )}
        </div>
      </div>

      {/* Info notice about printed labels */}
      {pdfStickers.length > 0 && (
        <div className="flex items-center gap-3 p-3.5 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <p>
            Sticker sheet built successfully for <strong>{pdfStickers.length} products</strong>. Ready to download using the button above.
          </p>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex bg-white border border-gray-100 p-4 rounded-xl shadow-sm">
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
            placeholder="Search SKU or name..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      {/* QR Codes Grid / Table */}
      <div className="border border-gray-100 rounded-xl overflow-hidden bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-gray-50/60 border-b border-gray-100 text-gray-400 uppercase font-bold tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={
                      paginatedQRCodes.length > 0 &&
                      paginatedQRCodes.every((q) => selectedIds.includes(q.product_id))
                    }
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">QR Tracking UUID</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Last Printed</th>
                <th className="py-3 px-4 text-center w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-4"><div className="h-4 w-4 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-40 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-16 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-20 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-32 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-16 bg-gray-100 rounded-full mx-auto"></div></td>
                    <td className="py-4 px-4"><div className="h-4 w-24 bg-gray-100 rounded"></div></td>
                    <td className="py-4 px-4"><div className="h-6 w-28 bg-gray-100 rounded mx-auto"></div></td>
                  </tr>
                ))
              ) : paginatedQRCodes.length > 0 ? (
                paginatedQRCodes.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-all-300">
                    <td className="py-3.5 px-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(item.product_id)}
                        onChange={(e) => handleSelectOne(item.product_id, e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer"
                      />
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-gray-800">
                      {item.product?.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-500">
                      {item.product?.sku}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-600">
                      {item.product?.batch_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-gray-400">
                      {item.qr_uuid}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        item.pdf_generated
                          ? 'bg-blue-50 text-blue-700 border border-blue-100'
                          : 'bg-amber-50 text-amber-700 border border-amber-100'
                      }`}>
                        {item.pdf_generated ? 'Generated' : 'Pending'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {item.last_printed ? (
                        dayjs(item.last_printed).format('MMM DD, YYYY · hh:mm A')
                      ) : (
                        <span className="text-gray-400 italic">Never printed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => handleDownloadPNG(item.product)}
                          className="flex items-center gap-1 px-2.5 py-1.2 bg-white border border-gray-200 hover:border-gray-300 text-gray-600 rounded text-[10px] font-bold transition-all-300 shadow-xs"
                        >
                          <Download className="w-3 h-3" />
                          PNG
                        </button>
                        <button
                          onClick={() => compileStickerData([item.product])}
                          className="flex items-center gap-1 px-2.5 py-1.2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded text-[10px] font-bold transition-all-300 border border-blue-100"
                        >
                          <Printer className="w-3 h-3" />
                          Compile PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    No items ready for QR generation found.
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
              {Math.min(currentPage * itemsPerPage, filteredQRCodes.length)} of{' '}
              {filteredQRCodes.length} items
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
