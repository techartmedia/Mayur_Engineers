'use client';

import React from 'react';
import { formatINR } from '@/lib/calculations/money';
import { BarChart3, Download } from 'lucide-react';

interface ReportInvoice {
  id: string;
  invoiceNumber: string | null;
  issueDate: string;
  taxableAmountPaise: number;
  cgstAmountPaise: number;
  sgstAmountPaise: number;
  igstAmountPaise: number;
  roundOffPaise: number;
  netTotalPaise: number;
  paidAmountPaise: number;
  outstandingAmountPaise: number;
  status: string;
  customerSnapshot: string;
}

export default function ReportsClient({ invoices }: { invoices: ReportInvoice[] }) {
  // Aggregate GST statistics
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalNet = 0;

  for (const inv of invoices) {
    if (inv.status === 'CANCELLED' || inv.status === 'DRAFT') continue;
    totalTaxable += inv.taxableAmountPaise;
    totalCgst += inv.cgstAmountPaise;
    totalSgst += inv.sgstAmountPaise;
    totalIgst += inv.igstAmountPaise;
    totalNet += inv.netTotalPaise;
  }

  const exportCSV = () => {
    const headers = [
      'Invoice No',
      'Date',
      'Customer',
      'GSTIN',
      'Taxable Value (INR)',
      'CGST (INR)',
      'SGST (INR)',
      'IGST (INR)',
      'Total Amount (INR)',
      'Status',
    ];

    const rows = invoices.map((inv) => {
      let name = '';
      let gstin = '';
      try {
        const snap = JSON.parse(inv.customerSnapshot);
        name = snap.name || '';
        gstin = snap.gstin || '';
      } catch (e) {}

      return [
        `"${inv.invoiceNumber || 'DRAFT'}"`,
        `"${inv.issueDate}"`,
        `"${name.replace(/"/g, '""')}"`,
        `"${gstin}"`,
        (inv.taxableAmountPaise / 100).toFixed(2),
        (inv.cgstAmountPaise / 100).toFixed(2),
        (inv.sgstAmountPaise / 100).toFixed(2),
        (inv.igstAmountPaise / 100).toFixed(2),
        (inv.netTotalPaise / 100).toFixed(2),
        `"${inv.status}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Mayur_Engineers_Sales_Register_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Internal Reports & Sales Register
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Internal sales summary and GST collections register for management review.
          </p>
        </div>

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
        >
          <Download size={15} />
          <span>Export Sales Register (CSV)</span>
        </button>
      </div>


      {/* Basic GST Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Taxable Turnover</div>
          <div className="text-lg font-bold text-slate-900 mt-1.5 font-mono">{formatINR(totalTaxable)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Central Tax (CGST)</div>
          <div className="text-lg font-bold text-slate-900 mt-1.5 font-mono">{formatINR(totalCgst)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">State Tax (SGST)</div>
          <div className="text-lg font-bold text-slate-900 mt-1.5 font-mono">{formatINR(totalSgst)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Integrated Tax (IGST)</div>
          <div className="text-lg font-bold text-slate-900 mt-1.5 font-mono">{formatINR(totalIgst)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm bg-teal-50/40">
          <div className="text-[11px] font-semibold text-teal-800 uppercase tracking-wider">Total Sales (Gross)</div>
          <div className="text-lg font-black text-teal-900 mt-1.5 font-mono">{formatINR(totalNet)}</div>
        </div>
      </div>

      {/* Invoice Register Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 font-semibold text-slate-900">
          Issued Invoices Ledger
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                <th className="py-2.5 px-4 font-semibold">Date</th>
                <th className="py-2.5 px-4 font-semibold">Customer</th>
                <th className="py-2.5 px-4 font-semibold text-right">Taxable (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-right">CGST (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-right">SGST (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-right">IGST (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-right">Net Total (₹)</th>
                <th className="py-2.5 px-4 font-semibold text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                let name = '—';
                try {
                  const snap = JSON.parse(inv.customerSnapshot);
                  name = snap.name || '—';
                } catch (e) {}

                return (
                  <tr key={inv.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{inv.invoiceNumber || 'DRAFT'}</td>
                    <td className="py-2.5 px-4 text-slate-600">{inv.issueDate}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-900">{name}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(inv.taxableAmountPaise, { showSymbol: false })}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(inv.cgstAmountPaise, { showSymbol: false })}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(inv.sgstAmountPaise, { showSymbol: false })}</td>
                    <td className="py-2.5 px-4 text-right font-mono">{formatINR(inv.igstAmountPaise, { showSymbol: false })}</td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{formatINR(inv.netTotalPaise)}</td>
                    <td className="py-2.5 px-4 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800">
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
