'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatINR } from '@/lib/calculations/money';
import { convertQuotationToInvoice } from '@/lib/actions/quotations';
import { useRouter } from 'next/navigation';
import { Plus, Search, Eye, ArrowRight, Printer, CheckCircle } from 'lucide-react';

interface Quotation {
  id: string;
  quotationNumber: string;
  financialYear: string;
  status: string;
  date: string;
  netTotalPaise: number;
  convertedInvoiceId: string | null;
  customerSnapshot: string;
}

export default function QuotationsClient({ initialQuotations }: { initialQuotations: Quotation[] }) {
  const router = useRouter();
  const [quotations, setQuotations] = useState<Quotation[]>(initialQuotations);
  const [searchTerm, setSearchTerm] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const filtered = quotations.filter((q) => {
    let customerName = '';
    try {
      const snap = JSON.parse(q.customerSnapshot);
      customerName = snap.name || '';
    } catch (e) {}

    return (
      q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.date.includes(searchTerm)
    );
  });

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((q) => q.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleConvert = async (id: string, qNumber: string) => {
    if (!confirm(`Convert Quotation ${qNumber} into an official Invoice? All line items and customer details will be copied.`)) return;
    setConvertingId(id);
    try {
      const res = await convertQuotationToInvoice(id);
      if (res.success && res.invoiceId) {
        alert(`Successfully converted! Invoice issued as ${res.invoiceNumber}`);
        router.push(`/invoices/${res.invoiceId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to convert quotation');
    } finally {
      setConvertingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Quotations
            </h1>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-200 font-semibold">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Create, manage, and convert accepted customer quotations into official invoices.
          </p>
        </div>
        <Link
          href="/quotations/new"
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus size={15} />
          <span>New Quotation</span>
        </Link>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-slate-200 rounded-md px-3 py-2 text-xs shadow-sm">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by quote number, customer, date..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchTerm ? 'No quotations match your search.' : 'No quotations created yet. Click "New Quotation" to create one.'}
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
                  <th className="py-2.5 px-4 font-semibold">Quote No</th>
                  <th className="py-2.5 px-4 font-semibold">Date</th>
                  <th className="py-2.5 px-4 font-semibold">Customer (Quoted To)</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Quote Amount</th>
                  <th className="py-2.5 px-4 font-semibold text-center">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((q) => {
                  let buyerName = '—';
                  try {
                    const snap = JSON.parse(q.customerSnapshot);
                    buyerName = snap.name || '—';
                  } catch (e) {}

                  const isConverted = q.status === 'CONVERTED';

                  return (
                    <tr key={q.id} className={`hover:bg-slate-50/50 ${selectedIds.includes(q.id) ? 'bg-teal-50/30' : ''}`}>
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(q.id)}
                          onChange={() => toggleSelectOne(q.id)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {q.quotationNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                        {q.date}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {buyerName}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatINR(q.netTotalPaise)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            isConverted
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {q.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          {!isConverted ? (
                            <button
                              onClick={() => handleConvert(q.id, q.quotationNumber)}
                              disabled={convertingId === q.id}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold text-[11px] border border-teal-200 transition"
                            >
                              <ArrowRight size={12} />
                              <span>{convertingId === q.id ? 'Converting...' : 'Convert to Invoice'}</span>
                            </button>
                          ) : (
                            <Link
                              href={`/invoices/${q.convertedInvoiceId}`}
                              className="text-[11px] text-purple-700 font-medium hover:underline flex items-center gap-1"
                            >
                              <span>View Invoice</span>
                              <ArrowRight size={11} />
                            </Link>
                          )}
                          <Link
                            href={`/quotations/${q.id}`}
                            className="p-1 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                            title="View Quotation"
                          >
                            <Eye size={14} />
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
