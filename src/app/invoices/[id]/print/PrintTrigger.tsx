'use client';

import React, { useEffect } from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrintTrigger() {
  useEffect(() => {
    // Automatically trigger browser print on page load
    const timer = setTimeout(() => {
      window.print();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="no-print mb-6 max-w-[210mm] mx-auto flex items-center justify-between border-b border-slate-200 pb-3">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft size={14} />
        <span>Back to Invoices</span>
      </Link>
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
      >
        <Printer size={14} />
        <span>Print Now / Save as PDF</span>
      </button>
    </div>
  );
}
