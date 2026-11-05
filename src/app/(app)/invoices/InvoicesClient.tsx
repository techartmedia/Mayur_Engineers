'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/calculations/money';
import { Plus, Search, Eye, Printer, CreditCard, XCircle, ArrowUpRight } from 'lucide-react';

interface InvoiceSummary {
  id: string;
  documentType: string;
  invoiceNumber: string | null;
  financialYear: string;
  series: string;
  status: string;
  issueDate: string;
  netTotalPaise: number;
  paidAmountPaise: number;
  outstandingAmountPaise: number;
  customerSnapshot: string;
}

export default function InvoicesClient({ initialInvoices }: { initialInvoices: InvoiceSummary[] }) {
  const [invoices, setInvoices] = useState<InvoiceSummary[]>(initialInvoices);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = invoices.filter((inv) => {
    let matchesStatus = true;
    if (statusFilter === 'PAID') matchesStatus = inv.status === 'PAID';
    else if (statusFilter === 'PENDING') matchesStatus = inv.status === 'ISSUED' || inv.status === 'PARTIALLY_PAID';
    else if (statusFilter === 'DRAFT') matchesStatus = inv.status === 'DRAFT';
    else if (statusFilter === 'CANCELLED') matchesStatus = inv.status === 'CANCELLED';

    let customerName = '';
    try {
      const snap = JSON.parse(inv.customerSnapshot);
      customerName = snap.name || '';
    } catch (e) {}

    const matchesSearch =
      (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.issueDate.includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((i) => i.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Invoice Register
            </h1>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-200 font-semibold">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Official GST tax invoices and bills of supply issued for Mayur Engineers.
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus size={15} />
          <span>Create Invoice</span>
        </Link>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-md p-1 text-xs">
          {[
            { id: 'ALL', label: 'All Invoices' },
            { id: 'PENDING', label: 'Unpaid / Pending' },
            { id: 'PAID', label: 'Paid' },
            { id: 'DRAFT', label: 'Drafts' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition ${
                statusFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-md px-3 py-1.5 text-xs shadow-sm max-w-xs w-full">
          <Search size={14} className="text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search invoice number, customer, date..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 outline-none text-slate-800 placeholder-slate-400"
          />
        </div>
      </div>

      {/* Invoices Register Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchTerm || statusFilter !== 'ALL'
                ? 'No invoices match the selected criteria.'
                : 'No invoices issued yet. Click "Create Invoice" to issue your first invoice.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3 w-8 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                  </th>
                  <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold">Customer (Billed To)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Net Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Paid</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Balance Due</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((inv) => {
                  let buyerName = '—';
                  let buyerState = '';
                  try {
                    const snap = JSON.parse(inv.customerSnapshot);
                    buyerName = snap.name || '—';
                    buyerState = snap.state || '';
                  } catch (e) {}

                  return (
                    <tr key={inv.id} className={`hover:bg-slate-50/50 ${selectedIds.includes(inv.id) ? 'bg-teal-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(inv.id)}
                          onChange={() => toggleSelectOne(inv.id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {inv.invoiceNumber || <span className="text-slate-400 italic font-normal">DRAFT</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {inv.issueDate}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">{buyerName}</div>
                        {buyerState && <div className="text-[11px] text-slate-500">{buyerState}</div>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(inv.netTotalPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-700">
                        {formatINR(inv.paidAmountPaise)}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-amber-700">
                        {formatINR(inv.outstandingAmountPaise)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.status === 'ISSUED'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800 line-through'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="p-1 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                            title="View Invoice"
                          >
                            <Eye size={14} />
                          </Link>
                          <Link
                            href={`/invoices/${inv.id}/print`}
                            target="_blank"
                            className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Print / PDF"
                          >
                            <Printer size={14} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
