import React from 'react';
import { Wind } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  headerRight?: React.ReactNode;
}

export function Layout({ children, headerRight }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="w-6 h-6 text-brand-500" strokeWidth={2.5} />
            <span className="text-xl font-extrabold tracking-tight text-gray-900">
              Tarifa<span className="text-brand-500">Forever</span>
            </span>
          </div>
          {headerRight && <div>{headerRight}</div>}
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-8">
        {children}
      </main>
    </div>
  );
}
