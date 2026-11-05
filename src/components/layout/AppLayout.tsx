'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  Users,
  Package,
  CreditCard,
  BarChart3,
  Settings,
  PlusCircle,
  Menu,
  X,
  LogOut,
  UserCheck,
} from 'lucide-react';
import { logout } from '@/lib/actions/auth';

interface AppLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Invoices', href: '/invoices', icon: FileText },
  { label: 'Quotations', href: '/quotations', icon: FileSpreadsheet },
  { label: 'Customers', href: '/customers', icon: Users },
  { label: 'Products', href: '/products', icon: Package },
  { label: 'Payments', href: '/payments', icon: CreditCard },
  { label: 'Reports', href: '/reports', icon: BarChart3 },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export default function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900">
      {/* Mobile Topbar */}
      <header className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-white p-1 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Mayur Engineers Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight">Mayur Engineers</div>
            <div className="text-[10px] text-slate-400">GST Billing Lite</div>
          </div>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-1.5 rounded text-slate-300 hover:text-white hover:bg-slate-800"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-white shrink-0 border-r border-slate-800">
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 shadow-sm">
              <img
                src="/logo.png"
                alt="Mayur Engineers Logo"
                className="max-h-full max-w-full object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-base leading-tight">Mayur Engineers</div>
              <div className="text-xs text-slate-400 mt-0.5">Billing & Invoicing</div>
            </div>
          </div>
        </div>

        {/* Quick Create Button */}
        <div className="px-4 py-3">
          <Link
            href="/invoices/new"
            className="flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-medium text-xs transition shadow-sm"
          >
            <PlusCircle size={15} />
            <span>Create Invoice</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-2 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition ${
                  isActive
                    ? 'bg-slate-800 text-teal-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-teal-400' : 'text-slate-400'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-teal-600/30 text-teal-400 flex items-center justify-center font-bold text-[10px]">
                <UserCheck size={12} />
              </div>
              <div className="text-[11px] leading-tight">
                <div className="font-semibold text-slate-200">Owner / Admin</div>
                <div className="text-[10px] text-slate-400 truncate max-w-[130px]">admin@mayur</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
            >
              <LogOut size={14} />
            </button>
          </div>
          <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
            Mayur Engineers &copy; {new Date().getFullYear()}
          </div>
        </div>
      </aside>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-slate-900 text-white border-b border-slate-800 px-4 py-3 space-y-1">
          <Link
            href="/invoices/new"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-2 px-3 mb-2 rounded bg-teal-600 text-white font-medium text-xs"
          >
            <PlusCircle size={15} />
            <span>Create Invoice</span>
          </Link>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2 rounded text-xs font-medium ${
                  isActive
                    ? 'bg-slate-800 text-teal-400 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              logout();
            }}
            className="flex items-center gap-3 w-full px-3 py-2 rounded text-xs font-medium text-rose-400 hover:bg-slate-800 transition"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
