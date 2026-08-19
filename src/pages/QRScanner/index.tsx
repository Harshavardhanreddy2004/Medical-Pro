import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useProducts, useInventory, useCreateTransaction } from '../../hooks/useInventoryData';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Scan,
  ToggleLeft,
  ToggleRight,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  X,
  Play,
  Square,
  AlertOctagon,
  Upload,
  Camera,
} from 'lucide-react';
import { toast } from 'sonner';

export const QRScanner: React.FC = () => {
  const { scanMode, setScanMode } = useAppStore();
  const { data: products } = useProducts();
  const { data: inventory } = useInventory();
  const createTxMutation = useCreateTransaction();

  // Local state
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const [scannedStock, setScannedStock] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [operator, setOperator] = useState<string>('Harsh Vardhan');
  const [scanMethod, setScanMethod] = useState<'CAMERA' | 'FILE'>('CAMERA');

  // Scanner reference
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = 'qr-reader';

  // Handle scanned file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const html5Qrcode = new Html5Qrcode(readerId);
      const decodedText = await html5Qrcode.scanFile(file, false);
      handleScanSuccess(decodedText);
    } catch (err: any) {
      toast.error('Failed to decode QR code from image. Please ensure the QR is clear and visible.');
      console.error(err);
    }
  };

  // Toggle scan mode (STOCK_IN vs STOCK_OUT) if not set by quick action
  const currentMode = scanMode || 'STOCK_IN';

  // Check camera permissions and start scanner
  const startScanner = async () => {
    setIsScanning(true);
    setScannedProduct(null);
    
    // Clear any previous scanner
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (err) {
        console.error(err);
      }
    }

    try {
      const html5Qrcode = new Html5Qrcode(readerId);
      scannerRef.current = html5Qrcode;

      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        // Select the camera: prefer rear/back camera, otherwise fallback to first webcam
        let cameraId = devices[0].id;
        const backCamera = devices.find(d => 
          d.label.toLowerCase().includes('back') || 
          d.label.toLowerCase().includes('environment') ||
          d.label.toLowerCase().includes('rear')
        );
        
        if (backCamera) {
          cameraId = backCamera.id;
        }

        await html5Qrcode.start(
          cameraId,
          {
            fps: 10,
            qrbox: { width: 200, height: 200 },
          },
          (decodedText) => {
            handleScanSuccess(decodedText);
          },
          (errorMessage) => {
            // Silent failure
          }
        );
      } else {
        toast.error('No camera devices detected on this system.');
        setIsScanning(false);
      }
    } catch (err: any) {
      toast.error(`Camera initialization failed: ${err.message}`);
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        setIsScanning(false);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  // Handle scanned text
  const handleScanSuccess = async (decodedText: string) => {
    // Show raw scanned content for immediate user feedback
    toast.info(`Scanned Code: "${decodedText.substring(0, 50)}${decodedText.length > 50 ? '...' : ''}"`);

    // Stop scanner immediately on code detection to allow processing
    await stopScanner();

    let qrUuid = '';
    let productSku = '';

    try {
      // 1. Try parsing JSON format
      const payload = JSON.parse(decodedText);
      qrUuid = payload.uuid;
      productSku = payload.sku;
    } catch (e) {
      // 2. Try parsing raw scanned text (e.g. barcode / raw UUID or SKU)
      qrUuid = decodedText;
      productSku = decodedText;
    }

    // Match scanned key against products catalog
    const product = products?.find(
      (p) => p.qr_uuid === qrUuid || p.sku === productSku || p.id === qrUuid
    );

    if (!product) {
      toast.error('Scanned QR code does not match any registered product.');
      // Restart scanner after short delay
      setTimeout(() => startScanner(), 1500);
      return;
    }

    // Match inventory stock
    const invItem = inventory?.find((i) => i.product_id === product.id);
    const stockVal = invItem ? invItem.current_stock : 0;

    setScannedProduct(product);
    setScannedStock(stockVal);
    setQuantity(1);
    setNotes('');
    toast.success(`Scanned: ${product.name}`);
  };

  // Save Transaction
  const handleSave = () => {
    if (!scannedProduct) return;
    if (quantity <= 0) {
      toast.error('Quantity must be greater than zero');
      return;
    }

    // Prevent negative stock on STOCK_OUT
    if (currentMode === 'STOCK_OUT' && quantity > scannedStock) {
      toast.error('Insufficient Stock available');
      return;
    }

    createTxMutation.mutate(
      {
        product_id: scannedProduct.id,
        transaction_type: currentMode,
        quantity: quantity,
        notes: notes || undefined,
        operator: operator,
      },
      {
        onSuccess: () => {
          setScannedProduct(null);
          // Restart scanner automatically for subsequent scans
          startScanner();
        },
      }
    );
  };

  const isInsufficientStock = currentMode === 'STOCK_OUT' && quantity > scannedStock;

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">QR Scanner Station</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Use your system camera or mobile webcam to scan medical barcodes and post movements.
          </p>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex items-center bg-gray-50 border border-gray-200 p-1 rounded-xl">
          <button
            onClick={() => setScanMode('STOCK_IN')}
            className={`flex items-center gap-1.5 px-4 py-1.8 rounded-lg text-xs font-bold transition-all-300 ${
              currentMode === 'STOCK_IN'
                ? 'bg-green-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            Stock In Mode
          </button>
          <button
            onClick={() => setScanMode('STOCK_OUT')}
            className={`flex items-center gap-1.5 px-4 py-1.8 rounded-lg text-xs font-bold transition-all-300 ${
              currentMode === 'STOCK_OUT'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <ArrowDownRight className="w-3.5 h-3.5" />
            Stock Out Mode
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Scanner Feed Panel */}
        <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm flex flex-col items-center justify-between min-h-[440px] relative">
          {/* Method selector tabs */}
          <div className="flex border-b border-gray-100 w-full pb-3 mb-4 gap-4 text-xs font-semibold text-gray-500">
            <button
              onClick={() => setScanMethod('CAMERA')}
              className={`pb-1.5 border-b-2 transition-all-300 flex items-center gap-1.5 ${
                scanMethod === 'CAMERA'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent hover:text-gray-800'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Scan with Camera
            </button>
            <button
              onClick={() => {
                stopScanner();
                setScanMethod('FILE');
              }}
              className={`pb-1.5 border-b-2 transition-all-300 flex items-center gap-1.5 ${
                scanMethod === 'FILE'
                  ? 'border-blue-600 text-blue-600 font-bold'
                  : 'border-transparent hover:text-gray-800'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              Upload QR Image
            </button>
          </div>

          {/* Tab Content */}
          {scanMethod === 'CAMERA' ? (
            <>
              {/* Main scanner display wrapper */}
              <div className="w-full max-w-sm aspect-square bg-gray-50 rounded-xl overflow-hidden border border-dashed border-gray-200 relative flex items-center justify-center">
                {/* The actual element used by html5-qrcode (needs to be empty of React children) */}
                <div id={readerId} className="absolute inset-0 w-full h-full" />

                {/* Offline placeholder */}
                {!isScanning && !scannedProduct && (
                  <div className="flex flex-col items-center justify-center text-gray-400 gap-3 z-10 pointer-events-none">
                    <Scan className="w-12 h-12 text-gray-300 animate-pulse" />
                    <p className="text-xs font-medium">Scanner Offline</p>
                  </div>
                )}
                
                {/* Visual target reticle when scanning */}
                {isScanning && (
                  <div className="absolute inset-0 border-[35px] border-black/35 pointer-events-none z-10 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-500 rounded relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1" />
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1" />
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1" />
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1" />
                      {/* Laser line animation */}
                      <div className="w-full h-0.5 bg-blue-500 absolute top-1/2 left-0 animate-bounce" />
                    </div>
                  </div>
                )}
              </div>

              {/* Scanner Buttons */}
              <div className="mt-6 flex items-center gap-3">
                {!isScanning ? (
                  <button
                    onClick={startScanner}
                    disabled={!!scannedProduct}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all-300 disabled:opacity-50"
                  >
                    <Play className="w-4 h-4" />
                    Start Camera Scan
                  </button>
                ) : (
                  <button
                    onClick={stopScanner}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all-300"
                  >
                    <Square className="w-4 h-4" />
                    Stop Camera Scan
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* File Uploader Container */}
              <div className="w-full max-w-sm aspect-square bg-gray-50 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-6 relative hover:bg-gray-100/50 transition-all-300">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center justify-center text-gray-400 gap-3 text-center pointer-events-none">
                  <Upload className="w-12 h-12 text-gray-300" />
                  <div>
                    <p className="text-xs font-bold text-gray-700">Upload QR Image file</p>
                    <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">
                      Drag & drop your PNG/JPG image here, or click to browse local files.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Hidden target container for html5-qrcode scanFile requirements */}
              <div id={readerId} className="hidden" />
              
              <div className="h-10 mt-6" />
            </>
          )}
        </div>

        {/* Modal-like Transaction Confirmation Panel */}
        <div className="border border-gray-100 rounded-2xl p-6 bg-white shadow-sm flex flex-col justify-between text-xs">
          {scannedProduct ? (
            <div className="space-y-5 animate-scale-up">
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-gray-50">
                <div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                    currentMode === 'STOCK_IN' 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {currentMode === 'STOCK_IN' ? 'Confirm Stock In' : 'Confirm Stock Out'}
                  </span>
                  <h3 className="text-sm font-bold text-gray-900 mt-2">{scannedProduct.name}</h3>
                </div>
                <button
                  onClick={() => {
                    setScannedProduct(null);
                    startScanner();
                  }}
                  className="p-1.5 hover:bg-gray-50 text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Product Specifications */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-4 rounded-xl border border-gray-100/50">
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">SKU</p>
                  <p className="font-mono font-bold text-gray-700 mt-0.5">{scannedProduct.sku}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Stock</p>
                  <p className="font-bold text-gray-900 mt-0.5">{scannedStock} {scannedProduct.unit || 'units'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Batch Number</p>
                  <p className="font-mono text-gray-700 mt-0.5">{scannedProduct.batch_number}</p>
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Storage Location</p>
                  <p className="font-semibold text-gray-700 mt-0.5">{scannedProduct.storage_location}</p>
                </div>
              </div>

              {/* Form Inputs */}
              <div className="space-y-4 pt-2">
                {/* Quantity Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Enter Quantity *</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="px-3.5 py-2.2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm font-semibold"
                  />
                  
                  {/* Warning message if Insufficient Stock */}
                  {isInsufficientStock && (
                    <div className="flex items-center gap-1.5 text-[10px] text-red-600 font-bold mt-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Insufficient Stock (requested {quantity}, available {scannedStock})</span>
                    </div>
                  )}
                </div>

                {/* Operator Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Operator Name *</label>
                  <input
                    type="text"
                    value={operator}
                    onChange={(e) => setOperator(e.target.value)}
                    className="px-3.5 py-2.2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Note / Memo */}
                <div className="flex flex-col gap-1.5">
                  <label className="font-semibold text-gray-700">Transaction Notes</label>
                  <input
                    type="text"
                    value={notes}
                    placeholder="e.g. Monthly restock order #90812, Client release code..."
                    onChange={(e) => setNotes(e.target.value)}
                    className="px-3.5 py-2.2 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-4 border-t border-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setScannedProduct(null);
                    startScanner();
                  }}
                  className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl font-semibold transition-all-300"
                >
                  Discard Scan
                </button>
                <button
                  onClick={handleSave}
                  disabled={isInsufficientStock || createTxMutation.isPending}
                  className={`flex-1 py-2.5 text-white rounded-xl font-bold transition-all-300 disabled:opacity-50 ${
                    currentMode === 'STOCK_IN' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Save Transaction
                </button>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 py-16">
              <AlertOctagon className="w-10 h-10 text-gray-300" />
              <div className="text-center">
                <h4 className="font-bold text-gray-700">Waiting for Barcode scan</h4>
                <p className="text-[10px] text-gray-400 mt-1 max-w-[240px]">
                  Align a valid MediStock QR code inside the target window to log inventory.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
