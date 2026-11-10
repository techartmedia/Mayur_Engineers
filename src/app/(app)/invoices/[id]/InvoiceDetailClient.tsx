'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import PrintableInvoice from '@/components/printable/PrintableInvoice';
import { issueDraftInvoice, cancelInvoice } from '@/lib/actions/invoices';
import { recordPayment } from '@/lib/actions/payments';
import { formatINR, toPaise, toRupees } from '@/lib/calculations/money';
import { useNotification } from '@/components/ui/NotificationProvider';
import {
  ArrowLeft,
  Printer,
  CreditCard,
  XCircle,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';

interface InvoiceDetailClientProps {
  invoice: any;
}

export default function InvoiceDetailClient({ invoice }: InvoiceDetailClientProps) {
  const router = useRouter();
  const { toast, confirm } = useNotification();

  // Modals
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState(toRupees(invoice.outstandingAmountPaise).toString());
  const [payMethod, setPayMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER'>('BANK_TRANSFER');
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');

  // Cancel form state
  const [cancelReason, setCancelReason] = useState('');

  const handleIssueDraft = async () => {
    const confirmed = await confirm({
      title: 'Issue Tax Invoice',
      message: 'Are you sure you want to officially issue this invoice? An immutable invoice number will be assigned.',
      confirmText: 'Issue Invoice',
      variant: 'primary',
    });
    if (!confirmed) return;

    setLoading(true);
    try {
      const res = await issueDraftInvoice(invoice.id);
      if (res.success) {
        toast.success(`Invoice officially issued as ${res.invoiceNumber}`);
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to issue invoice');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('Minified React error') ? 'Failed to issue invoice due to server error.' : (msg || 'Failed to issue invoice'));
    } finally {
      setLoading(false);
    }
  };

  const handleRecordPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountPaise = toPaise(payAmount);
    if (amountPaise <= 0) {
      toast.warning('Please enter a valid payment amount');
      return;
    }

    setLoading(true);
    try {
      const res = await recordPayment({
        invoiceId: invoice.id,
        amountPaise,
        paymentMethod: payMethod,
        paymentDate: payDate,
        referenceNumber: payRef,
        notes: payNotes,
      });
      if (res.success) {
        setPayModalOpen(false);
        toast.success('Payment recorded successfully');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to record payment');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('Minified React error') ? 'Failed to record payment due to server error.' : (msg || 'Failed to record payment'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      toast.warning('Please state a reason for cancelling this invoice');
      return;
    }

    setLoading(true);
    try {
      const res = await cancelInvoice(invoice.id, cancelReason);
      if (res.success) {
        setCancelModalOpen(false);
        toast.success('Invoice cancelled successfully');
        router.refresh();
      } else {
        toast.error(res.error || 'Failed to cancel invoice');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('Minified React error') ? 'Failed to cancel invoice due to server error.' : (msg || 'Failed to cancel invoice'));
    } finally {
      setLoading(false);
    }
  };

  const isDraft = invoice.status === 'DRAFT';
  const isCancelled = invoice.status === 'CANCELLED';
  const hasOutstanding = invoice.outstandingAmountPaise > 0 && !isCancelled && !isDraft;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top action bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-slate-900 font-mono">
                {invoice.invoiceNumber || 'DRAFT INVOICE'}
              </h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                  invoice.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : invoice.status === 'PARTIALLY_PAID'
                    ? 'bg-blue-100 text-blue-800'
                    : invoice.status === 'ISSUED'
                    ? 'bg-amber-100 text-amber-800'
                    : invoice.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {invoice.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issue Date: {invoice.issueDate}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Issue Draft Button */}
          {isDraft && (
            <button
              onClick={handleIssueDraft}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <CheckCircle2 size={14} />
              <span>Issue Invoice</span>
            </button>
          )}

          {/* Record Payment Button */}
          {hasOutstanding && (
            <button
              onClick={() => {
                setPayAmount(toRupees(invoice.outstandingAmountPaise).toString());
                setPayModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition"
            >
              <CreditCard size={14} />
              <span>Record Payment</span>
            </button>
          )}

          {/* Print Button */}
          <Link
            href={`/invoices/${invoice.id}/print`}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Printer size={14} />
            <span>Print / PDF</span>
          </Link>

          {/* Cancel Invoice Button */}
          {!isCancelled && (
            <button
              onClick={() => setCancelModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-rose-300 hover:bg-rose-50 text-rose-700 text-xs font-semibold shadow-sm transition"
            >
              <XCircle size={14} />
              <span>Cancel</span>
            </button>
          )}
        </div>
      </div>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-start gap-3 text-xs text-rose-800">
          <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" />
          <div>
            <div className="font-bold">This invoice has been CANCELLED</div>
            <div className="mt-0.5">Cancelled at: {invoice.cancelledAt}</div>
            <div className="mt-0.5">Reason: {invoice.cancellationReason || 'No reason provided'}</div>
          </div>
        </div>
      )}

      {/* Embedded Pixel-Perfect A4 Printable Document */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 overflow-x-auto">
        <PrintableInvoice invoice={invoice} items={invoice.items || []} />
      </div>

      {/* Payment History Register */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Payment History & Allocations</h2>
          <div className="text-[11px] text-slate-500">
            Total Paid: <span className="font-mono font-bold text-emerald-700">{formatINR(invoice.paidAmountPaise)}</span> | Outstanding: <span className="font-mono font-bold text-amber-700">{formatINR(invoice.outstandingAmountPaise)}</span>
          </div>
        </div>

        {invoice.payments && invoice.payments.length > 0 ? (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-4 font-semibold">Payment Date</th>
                <th className="py-2 px-4 font-semibold">Method</th>
                <th className="py-2 px-4 font-semibold">Reference / UTR</th>
                <th className="py-2 px-4 font-semibold">Notes</th>
                <th className="py-2 px-4 font-semibold text-right">Amount Paid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoice.payments.map((p: any) => (
                <tr key={p.id}>
                  <td className="py-2.5 px-4 font-medium text-slate-900">{p.paymentDate}</td>
                  <td className="py-2.5 px-4 text-slate-700 font-semibold">{p.paymentMethod}</td>
                  <td className="py-2.5 px-4 font-mono text-slate-600">{p.referenceNumber || '—'}</td>
                  <td className="py-2.5 px-4 text-slate-500">{p.notes || '—'}</td>
                  <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">
                    {formatINR(p.amountPaise)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-6 text-center text-slate-400 text-xs">
            No payments recorded yet for this invoice.
          </div>
        )}
      </div>

      {/* Record Payment Modal */}
      {payModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-slate-900">Record Payment</h2>
            <p className="text-slate-500">
              Invoice <span className="font-mono font-bold">{invoice.invoiceNumber}</span>. Balance due: <span className="font-mono font-bold text-amber-700">{formatINR(invoice.outstandingAmountPaise)}</span>
            </p>

            <form onSubmit={handleRecordPaymentSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Amount Received (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono text-sm focus:border-teal-500 outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Method <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={payMethod}
                    onChange={(e) => setPayMethod(e.target.value as any)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  >
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI</option>
                    <option value="CASH">Cash</option>
                    <option value="OTHER">Other / Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Payment Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reference / Transaction ID / UTR
                </label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="e.g. UTR / Cheque / UPI Txn ID"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  rows={2}
                  value={payNotes}
                  onChange={(e) => setPayNotes(e.target.value)}
                  placeholder="Additional payment notes..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                >
                  {loading ? 'Recording...' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Invoice Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 text-xs">
            <h2 className="text-base font-bold text-rose-700">Cancel Invoice</h2>
            <p className="text-slate-600">
              Are you sure you want to cancel invoice <span className="font-mono font-bold text-slate-900">{invoice.invoiceNumber}</span>? 
              Under GST rules, its invoice number will remain permanently assigned and will print as <span className="font-bold text-rose-600">CANCELLED</span>.
            </p>

            <form onSubmit={handleCancelSubmit} className="space-y-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Cancellation <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Order cancelled by buyer prior to goods movement..."
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-rose-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setCancelModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Keep Invoice
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-medium"
                >
                  {loading ? 'Cancelling...' : 'Confirm Cancellation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
