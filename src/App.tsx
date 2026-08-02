import React from 'react';
import { AppLayout } from './components/layout/AppLayout';
import { Toaster } from 'sonner';

function App() {
  return (
    <>
      {/* Prime layout and dynamic page router */}
      <AppLayout />

      {/* Sonner toast messages system */}
      <Toaster 
        position="top-right" 
        expand={false} 
        richColors 
        theme="light"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '12px',
            borderRadius: '10px',
            border: '1px solid #f3f4f6',
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)',
            background: '#ffffff',
          },
        }}
      />
    </>
  );
}

export default App;
