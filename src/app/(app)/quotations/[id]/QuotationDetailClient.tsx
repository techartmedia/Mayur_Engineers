'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PrintableInvoice from '@/components/printable/PrintableInvoice';
import { convertQuotationToInvoice } from '@/lib/actions/quotations';
import { ArrowLeft, Printer, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function QuotationDetailClient({ quotation }: { quotation: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleConvert = async () => {
    if (!confirm(`Convert Quotation ${quotation.quotationNumber} into an official Invoice? All line items and customer details will be copied.`)) return;
    setLoading(true);
    try {
      const res = await convertQuotationToInvoice(quotation.id);
      if (res.success && res.invoiceId) {
        alert(`Successfully converted! Invoice issued as ${res.invoiceNumber}`);
        router.push(`/invoices/${res.invoiceId}`);
      } else {
        alert(res.error || 'Failed to convert quotation');
        setLoading(false);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      alert(msg.includes('Minified React error') ? 'Failed to convert quotation due to server error.' : (msg || 'Failed to convert quotation'));
      setLoading(false);
    }
  };

  const isConverted = quotation.status === 'CONVERTED';

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {quotation.quotationNumber}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                  isConverted
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {quotation.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Quotation Date: {quotation.date}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!isConverted ? (
            <button
              onClick={handleConvert}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <ArrowRight size={14} />
              <span>{loading ? 'Converting...' : 'Convert to Invoice'}</span>
            </button>
          ) : (
            <Link
              href={`/invoices/${quotation.convertedInvoiceId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-purple-100 text-purple-800 font-semibold text-xs border border-purple-200 hover:bg-purple-200"
            >
              <span>View Converted Invoice</span>
              <ArrowRight size={13} />
            </Link>
          )}

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Printer size={14} />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Embedded Printable View */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 overflow-x-auto">
        <PrintableInvoice
          invoice={quotation}
          items={quotation.items || []}
          documentTitle="QUOTATION"
        />
      </div>
    </div>
  );
}
