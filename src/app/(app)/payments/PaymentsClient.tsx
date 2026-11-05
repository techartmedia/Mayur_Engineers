'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/calculations/money';
import { CreditCard, Search, ArrowUpRight, Download } from 'lucide-react';

interface PaymentRecord {
  id: string;
  invoiceId: string;
  invoiceNumber: string | null;
  paymentDate: string;
  amountPaise: number;
  paymentMethod: string;
  referenceNumber: string | null;
  notes: string | null;
  createdAt: string;
}

export default function PaymentsClient({ initialPayments }: { initialPayments: PaymentRecord[] }) {
  const [payments] = useState<PaymentRecord[]>(initialPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('ALL');

  const filtered = payments.filter((p) => {
    const matchesMethod = methodFilter === 'ALL' || p.paymentMethod === methodFilter;
    const matchesSearch =
      (p.invoiceNumber && p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.referenceNumber && p.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      p.paymentDate.includes(searchTerm);

    return matchesMethod && matchesSearch;
  });

  const totalCollected = payments.reduce((acc, curr) => acc + curr.amountPaise, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Payment Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manual Cash, UPI, and Bank Transfer receipts recorded against issued invoices.
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Received</div>
          <div className="text-2xl font-bold text-emerald-600 font-mono">{formatINR(totalCollected)}</div>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 text-xs">
          {['ALL', 'BANK_TRANSFER', 'UPI', 'CASH', 'OTHER'].map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                methodFilter === m
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {m === 'ALL' ? 'All Methods' : m.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs shadow-sm max-w-xs w-full">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search invoice no, UTR, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 outline-none text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchTerm || methodFilter !== 'ALL'
                ? 'No payment transactions match your search.'
                : 'No payments recorded yet. Payments can be recorded from any issued invoice page.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Payment Date</th>
                  <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-4 font-semibold">Method</th>
                  <th className="py-2.5 px-4 font-semibold">UTR / Reference No</th>
                  <th className="py-2.5 px-4 font-semibold">Notes</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Amount Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 text-slate-900 font-medium">
                      {p.paymentDate}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      <Link
                        href={`/invoices/${p.invoiceId}`}
                        className="hover:text-teal-600 hover:underline flex items-center gap-1"
                      >
                        <span>{p.invoiceNumber || 'INVOICE'}</span>
                        <ArrowUpRight size={11} className="text-slate-400" />
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {p.referenceNumber || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                      {p.notes || <span className="text-slate-300 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                      {formatINR(p.amountPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
