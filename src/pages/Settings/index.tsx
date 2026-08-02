import React from 'react';
import { Settings as SettingsIcon, Sliders, Database, Shield, Cpu } from 'lucide-react';

export const Settings: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header section */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">Settings</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure systems settings, preferences, and data connections.
        </p>
      </div>

      {/* Grid of settings panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Connection status */}
        <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Database Connection</h3>
              <p className="text-xs text-gray-400">Supabase Connection status</p>
            </div>
          </div>
          <div className="space-y-3.5 mt-2">
            <div className="flex justify-between text-xs py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Status</span>
              <span className="text-green-600 font-semibold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Connected (Healthy)
              </span>
            </div>
            <div className="flex justify-between text-xs py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Project Ref</span>
              <span className="text-gray-700 font-mono">hpdgjyndwrxubsokiley</span>
            </div>
            <div className="flex justify-between text-xs py-2">
              <span className="text-gray-500 font-medium">Region</span>
              <span className="text-gray-700">Asia Pacific (Mumbai)</span>
            </div>
          </div>
        </div>

        {/* General preferences */}
        <div className="border border-gray-100 rounded-xl p-6 bg-white shadow-sm hover:shadow-md transition-all-300">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-800">Warehouse Preferences</h3>
              <p className="text-xs text-gray-400">Thresholds and settings</p>
            </div>
          </div>
          <div className="space-y-3.5 mt-2">
            <div className="flex justify-between text-xs py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Default Min Stock Level</span>
              <span className="text-gray-700 font-semibold">10 units</span>
            </div>
            <div className="flex justify-between text-xs py-2 border-b border-gray-50">
              <span className="text-gray-500 font-medium">Expiry Warn Period</span>
              <span className="text-gray-700 font-semibold">90 Days</span>
            </div>
            <div className="flex justify-between text-xs py-2">
              <span className="text-gray-500 font-medium">Measurement Units</span>
              <span className="text-gray-700">Vial, Box, Strip, Bottle, Pack</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
