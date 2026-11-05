'use client';

import React from 'react';
import { formatINR, numberToWordsIndian } from '@/lib/calculations/money';

interface PrintableInvoiceProps {
  invoice: any;
  items: any[];
  documentTitle?: string;
}

export default function PrintableInvoice({
  invoice,
  items,
  documentTitle,
}: PrintableInvoiceProps) {
  let seller: any = {};
  let buyer: any = {};

  try {
    seller = typeof invoice.sellerSnapshot === 'string' ? JSON.parse(invoice.sellerSnapshot) : invoice.sellerSnapshot || {};
  } catch (e) {
    seller = {};
  }

  try {
    buyer = typeof invoice.customerSnapshot === 'string' ? JSON.parse(invoice.customerSnapshot) : invoice.customerSnapshot || {};
  } catch (e) {
    buyer = {};
  }

  const isCancelled = invoice.status === 'CANCELLED';
  const isInterState = Boolean(invoice.isInterState);
  const title = documentTitle || (invoice.documentType === 'BILL_OF_SUPPLY' ? 'BILL OF SUPPLY' : 'TAX INVOICE');

  return (
    <div className="relative bg-white text-black p-8 max-w-[210mm] mx-auto border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0 font-sans text-xs">
      {/* Cancelled watermark banner */}
      {isCancelled && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 opacity-20">
          <span className="text-8xl font-black text-rose-600 uppercase transform -rotate-45 border-8 border-rose-600 px-10 py-4">
            CANCELLED
          </span>
        </div>
      )}

      {/* Main outer border */}
      <div className="border-2 border-black">
        {/* Document Header Title */}
        <div className="text-center border-b-2 border-black py-1.5 bg-slate-100 print:bg-transparent">
          <div className="font-bold text-sm tracking-wider uppercase">{title}</div>
          {invoice.documentType === 'BILL_OF_SUPPLY' && (
            <div className="text-[10px] text-slate-600 font-medium">Composition taxable person, not eligible to collect tax on supplies</div>
          )}
        </div>

        {/* Company & Invoice Top Info Block */}
        <div className="grid grid-cols-12 border-b border-black">
          {/* Left: Mayur Engineers particulars */}
          <div className="col-span-7 p-3 border-r border-black space-y-1">
            <div className="flex items-center gap-3">
              <img
                src={seller.logoUrl || '/logo.png'}
                alt="Mayur Engineers Logo"
                className="h-12 w-auto object-contain max-w-[120px]"
              />
              <div>
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-900 leading-none">
                  {seller.legalName || 'MAYUR ENGINEERS'}
                </h1>
                {seller.tradeName && seller.tradeName !== seller.legalName && (
                  <div className="text-[11px] font-semibold text-slate-700">{seller.tradeName}</div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-700 pt-1 leading-snug">
              <div>{seller.address || 'Industrial Estate, Pune'}</div>
              <div>State: <span className="font-semibold">{seller.state || 'Maharashtra'}</span> (Code: <span className="font-mono font-bold">{seller.stateCode || '27'}</span>)</div>
              {seller.gstin && <div>GSTIN: <span className="font-mono font-bold">{seller.gstin}</span></div>}
              {seller.pan && <div>PAN: <span className="font-mono font-bold">{seller.pan}</span></div>}
              {(seller.phone || seller.email) && (
                <div>Phone: {seller.phone || '—'} | Email: {seller.email || '—'}</div>
              )}
            </div>
          </div>

          {/* Right: Invoice Reference Details */}
          <div className="col-span-5 p-3 space-y-1 text-[11px]">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Invoice No:</span>
              <span className="font-mono font-bold text-slate-900 text-xs">{invoice.invoiceNumber || 'DRAFT'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Dated:</span>
              <span className="font-medium text-slate-900">{invoice.issueDate}</span>
            </div>
            {invoice.dueDate && (
              <div className="flex justify-between border-b border-slate-200 pb-1">
                <span className="font-semibold text-slate-600">Due Date:</span>
                <span className="font-medium text-slate-900">{invoice.dueDate}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span className="font-semibold text-slate-600">Place of Supply:</span>
              <span className="font-medium text-slate-900">{buyer.state || seller.state} ({buyer.stateCode || seller.stateCode})</span>
            </div>
            <div className="flex justify-between">
              <span className="font-semibold text-slate-600">Reverse Charge:</span>
              <span className="font-bold text-slate-900">{invoice.isReverseCharge ? 'Yes' : 'No'}</span>
            </div>
          </div>
        </div>

        {/* Customer / Billed To Section */}
        <div className="grid grid-cols-12 border-b border-black">
          <div className="col-span-6 p-3 border-r border-black space-y-1">
            <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Details of Receiver (Billed To):</div>
            <div className="font-bold text-sm text-slate-900">{buyer.name || 'Walk-in Customer'}</div>
            {buyer.tradeName && <div className="text-[11px] font-semibold text-slate-700">{buyer.tradeName}</div>}
            <div className="text-[11px] text-slate-700 leading-snug">{buyer.billingAddress}</div>
            <div className="text-[11px] text-slate-700">
              State: <span className="font-semibold">{buyer.state || '—'}</span> (Code: <span className="font-mono font-bold">{buyer.stateCode || '—'}</span>)
            </div>
            <div className="text-[11px] text-slate-700">
              GSTIN: <span className="font-mono font-bold">{buyer.gstin || 'Unregistered'}</span>
            </div>
          </div>

          <div className="col-span-6 p-3 space-y-1">
            <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Details of Consignee (Shipped To):</div>
            <div className="font-bold text-sm text-slate-900">{buyer.name || 'Walk-in Customer'}</div>
            <div className="text-[11px] text-slate-700 leading-snug">{buyer.shippingAddress || buyer.billingAddress}</div>
            <div className="text-[11px] text-slate-700">
              State: <span className="font-semibold">{buyer.state || '—'}</span> (Code: <span className="font-mono font-bold">{buyer.stateCode || '—'}</span>)
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table className="w-full text-left border-collapse text-[10.5px]">
          <thead>
            <tr className="border-b border-black bg-slate-100 print:bg-transparent font-bold">
              <th className="py-1.5 px-2 border-r border-black text-center w-8">#</th>
              <th className="py-1.5 px-2 border-r border-black">Description of Goods / Services</th>
              <th className="py-1.5 px-2 border-r border-black text-center w-16">HSN/SAC</th>
              <th className="py-1.5 px-2 border-r border-black text-center w-12">Qty</th>
              <th className="py-1.5 px-2 border-r border-black text-center w-12">Unit</th>
              <th className="py-1.5 px-2 border-r border-black text-right w-20">Rate (₹)</th>
              <th className="py-1.5 px-2 border-r border-black text-right w-16">Disc (₹)</th>
              <th className="py-1.5 px-2 border-r border-black text-right w-20">Taxable (₹)</th>
              {!isInterState ? (
                <>
                  <th className="py-1.5 px-2 border-r border-black text-right w-16">CGST</th>
                  <th className="py-1.5 px-2 border-r border-black text-right w-16">SGST</th>
                </>
              ) : (
                <th className="py-1.5 px-2 border-r border-black text-right w-20">IGST</th>
              )}
              <th className="py-1.5 px-2 text-right w-24">Total (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/40">
            {items.map((item, idx) => (
              <tr key={item.id || idx}>
                <td className="py-2 px-2 border-r border-black text-center align-top">{idx + 1}</td>
                <td className="py-2 px-2 border-r border-black align-top font-medium">
                  <div>{item.description}</div>
                </td>
                <td className="py-2 px-2 border-r border-black text-center align-top font-mono">
                  {item.hsnSacCode || '—'}
                </td>
                <td className="py-2 px-2 border-r border-black text-center align-top font-semibold">
                  {item.quantity}
                </td>
                <td className="py-2 px-2 border-r border-black text-center align-top">
                  {item.unit || 'NOS'}
                </td>
                <td className="py-2 px-2 border-r border-black text-right align-top font-mono">
                  {formatINR(item.unitPricePaise, { showSymbol: false })}
                </td>
                <td className="py-2 px-2 border-r border-black text-right align-top font-mono">
                  {item.discountPaise > 0 ? formatINR(item.discountPaise, { showSymbol: false }) : '—'}
                </td>
                <td className="py-2 px-2 border-r border-black text-right align-top font-mono font-medium">
                  {formatINR(item.taxableValuePaise, { showSymbol: false })}
                </td>
                {!isInterState ? (
                  <>
                    <td className="py-2 px-2 border-r border-black text-right align-top font-mono">
                      <div>{formatINR(item.cgstAmountPaise, { showSymbol: false })}</div>
                      <div className="text-[9px] text-slate-500">({item.cgstRate || item.gstRate / 2}%)</div>
                    </td>
                    <td className="py-2 px-2 border-r border-black text-right align-top font-mono">
                      <div>{formatINR(item.sgstAmountPaise, { showSymbol: false })}</div>
                      <div className="text-[9px] text-slate-500">({item.sgstRate || item.gstRate / 2}%)</div>
                    </td>
                  </>
                ) : (
                  <td className="py-2 px-2 border-r border-black text-right align-top font-mono">
                    <div>{formatINR(item.igstAmountPaise, { showSymbol: false })}</div>
                    <div className="text-[9px] text-slate-500">({item.igstRate || item.gstRate}%)</div>
                  </td>
                )}
                <td className="py-2 px-2 text-right align-top font-mono font-bold">
                  {formatINR(item.totalLineAmountPaise, { showSymbol: false })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals & Tax Summary Breakdown */}
        <div className="grid grid-cols-12 border-t-2 border-black">
          {/* Left: Amount in Words & Bank Details */}
          <div className="col-span-7 p-3 border-r border-black space-y-3">
            <div>
              <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500">Invoice Amount in Words:</div>
              <div className="font-bold text-slate-900 text-xs italic mt-0.5">
                {numberToWordsIndian(invoice.netTotalPaise)}
              </div>
            </div>

            {/* Bank Particulars */}
            <div className="border border-slate-300 p-2 rounded bg-slate-50/50 print:bg-transparent text-[11px] space-y-0.5">
              <div className="font-bold text-[10px] uppercase text-slate-700 tracking-wider">Bank Details for Direct Payment:</div>
              <div>Bank Name: <span className="font-semibold">{seller.bankName || 'State Bank of India'}</span></div>
              <div>A/c No: <span className="font-mono font-bold">{seller.bankAccountNo || '12345678901'}</span></div>
              <div>IFSC Code: <span className="font-mono font-bold">{seller.bankIfsc || 'SBIN0001234'}</span></div>
              {seller.bankBranch && <div>Branch: {seller.bankBranch}</div>}
              {seller.upiId && <div>UPI ID: <span className="font-mono font-bold">{seller.upiId}</span></div>}
            </div>

            {/* Terms and conditions */}
            <div className="text-[10px] text-slate-600 leading-tight">
              <div className="font-bold uppercase text-slate-700">Terms & Conditions:</div>
              <p className="mt-0.5 whitespace-pre-line">{invoice.terms || seller.defaultTerms || '1. Goods once sold will not be taken back.\n2. Interest @ 18% p.a. will be charged for delayed payment.'}</p>
            </div>
          </div>

          {/* Right: Numerical Totals Column */}
          <div className="col-span-5 divide-y divide-slate-200 text-xs">
            <div className="flex justify-between py-1.5 px-3">
              <span className="font-medium text-slate-600">Taxable Value:</span>
              <span className="font-mono font-semibold">{formatINR(invoice.taxableAmountPaise)}</span>
            </div>

            {!isInterState ? (
              <>
                <div className="flex justify-between py-1.5 px-3">
                  <span className="font-medium text-slate-600">Total CGST:</span>
                  <span className="font-mono font-semibold">{formatINR(invoice.cgstAmountPaise)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3">
                  <span className="font-medium text-slate-600">Total SGST:</span>
                  <span className="font-mono font-semibold">{formatINR(invoice.sgstAmountPaise)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between py-1.5 px-3">
                <span className="font-medium text-slate-600">Total IGST:</span>
                <span className="font-mono font-semibold">{formatINR(invoice.igstAmountPaise)}</span>
              </div>
            )}

            {invoice.roundOffPaise !== 0 && (
              <div className="flex justify-between py-1.5 px-3 text-slate-600">
                <span>Round Off:</span>
                <span className="font-mono">{formatINR(invoice.roundOffPaise)}</span>
              </div>
            )}

            <div className="flex justify-between py-2.5 px-3 bg-slate-100 print:bg-transparent font-black text-sm border-t-2 border-black">
              <span>Invoice Total:</span>
              <span className="font-mono text-teal-900">{formatINR(invoice.netTotalPaise)}</span>
            </div>

            {invoice.paidAmountPaise > 0 && (
              <>
                <div className="flex justify-between py-1.5 px-3 text-emerald-700 font-semibold">
                  <span>Paid Amount:</span>
                  <span className="font-mono">{formatINR(invoice.paidAmountPaise)}</span>
                </div>
                <div className="flex justify-between py-1.5 px-3 text-amber-800 font-bold bg-amber-50 print:bg-transparent">
                  <span>Balance Due:</span>
                  <span className="font-mono">{formatINR(invoice.outstandingAmountPaise)}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer Signature Block */}
        <div className="grid grid-cols-12 border-t border-black p-3 text-[11px]">
          <div className="col-span-7 text-[10px] text-slate-500 flex items-end">
            <div>
              Certified that the particulars given above are true and correct.
            </div>
          </div>
          <div className="col-span-5 text-right space-y-8">
            <div className="font-bold text-slate-900">
              For {seller.legalName || 'MAYUR ENGINEERS'}
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              Authorized Signatory
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
