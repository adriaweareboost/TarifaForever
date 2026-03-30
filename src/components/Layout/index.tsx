import React from 'react';
import { Wind, Bell, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
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

          <div className="flex items-center gap-3">
            <button className="p-2 rounded-full hover:bg-gray-100 transition-colors relative">
              <Bell className="w-5 h-5 text-gray-500" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-kite-danger rounded-full" />
            </button>
            <button className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-8">
        {children}
      </main>
    </div>
  );
}
