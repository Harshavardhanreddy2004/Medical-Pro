import { create } from 'zustand';

interface AppState {
  globalSearch: string;
  setGlobalSearch: (search: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockAlertCount: number;
  setLowStockAlertCount: (count: number) => void;
  // Modal scan state to share between components
  scanMode: 'STOCK_IN' | 'STOCK_OUT' | null;
  setScanMode: (mode: 'STOCK_IN' | 'STOCK_OUT' | null) => void;
  selectedScanProductUuid: string | null;
  setSelectedScanProductUuid: (uuid: string | null) => void;
  // Shared add product modal trigger
  addProductModalOpen: boolean;
  setAddProductModalOpen: (open: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  globalSearch: '',
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
  activeTab: 'dashboard',
  setActiveTab: (activeTab) => set({ activeTab }),
  lowStockAlertCount: 0,
  setLowStockAlertCount: (lowStockAlertCount) => set({ lowStockAlertCount }),
  scanMode: null,
  setScanMode: (scanMode) => set({ scanMode }),
  selectedScanProductUuid: null,
  setSelectedScanProductUuid: (selectedScanProductUuid) => set({ selectedScanProductUuid }),
  addProductModalOpen: false,
  setAddProductModalOpen: (addProductModalOpen) => set({ addProductModalOpen }),
}));
