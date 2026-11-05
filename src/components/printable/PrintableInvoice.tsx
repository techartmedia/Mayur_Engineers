'use client';

import React from 'react';
import { formatINRWords } from '@/lib/calculations/money';

interface PrintableInvoiceProps {
  invoice: any;
  items: any[];
  documentTitle?: string;
}

function inr(paise: number): string {
  const rupees = (Number(paise) || 0) / 100;
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

function fmtDate(d?: string | null): string {
  if (!d) return '';
  try {
    const dateObj = new Date(d.includes('T') ? d : `${d}T00:00:00`);
    if (isNaN(dateObj.getTime())) return d;
    return dateObj.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

export default function PrintableInvoice({
  invoice,
  items,
  documentTitle,
}: PrintableInvoiceProps) {
  let seller: any = {};
  let buyer: any = {};

  try {
    seller =
      typeof invoice.sellerSnapshot === 'string'
        ? JSON.parse(invoice.sellerSnapshot)
        : invoice.sellerSnapshot || {};
  } catch {
    seller = {};
  }

  try {
    buyer =
      typeof invoice.customerSnapshot === 'string'
        ? JSON.parse(invoice.customerSnapshot)
        : invoice.customerSnapshot || {};
  } catch {
    buyer = {};
  }

  const isCancelled = invoice.status === 'CANCELLED';
  const isInterState = Boolean(invoice.isInterState);

  // Calculate tax presence
  const cgst = Number(invoice.cgstAmountPaise || 0);
  const sgst = Number(invoice.sgstAmountPaise || 0);
  const igst = Number(invoice.igstAmountPaise || 0);
  const totalTax = cgst + sgst + igst;
  const isNonGst = invoice.documentType === 'BILL_OF_SUPPLY' || totalTax === 0;
  const tax = !isNonGst && totalTax > 0;

  // Title: Quotation, Bill, or Tax Invoice
  let docTitle = 'Tax Invoice';
  let numberLabel = 'Invoice No.';
  if (documentTitle) {
    docTitle = documentTitle;
    numberLabel = documentTitle.includes('Quotation') ? 'Quotation No.' : 'Number';
  } else if (isNonGst) {
    docTitle = 'Bill';
    numberLabel = 'Bill No.';
  }

  const docNumber =
    invoice.invoiceNumber || invoice.quotationNumber || 'DRAFT';
  const financialYear = invoice.financialYear || '26-27';

  // Compute units
  const totalQty = items.reduce((acc, it) => acc + Number(it.quantity || 0), 0);
  const uniqueUnits = Array.from(new Set(items.map((it) => it.unit || 'NOS')));
  const mainUnit = uniqueUnits.length === 1 ? uniqueUnits[0] : '';
  const QH =
    !items.length || mainUnit === 'KG'
      ? 'Qty/Kg'
      : mainUnit === 'Sq.ft'
      ? 'Qty/Sq.ft'
      : 'Qty';

  // Rates
  const firstTaxed = items.find((it) => Number(it.gstRate || 0) > 0);
  const effectiveGstRate = firstTaxed ? Number(firstTaxed.gstRate) : 18;
  const halfRate = effectiveGstRate / 2;

  const pair = (a: [string, string], b?: [string, string], isLast = false) => {
    const one = b ? '' : ' one';
    return (
      <>
        <div className={`rw${one}`}>
          <div><i>{a[0]}</i></div>
          {b && <div><i>{b[0]}</i></div>}
        </div>
        <div className={`rw${one}${isLast ? ' last' : ''}`}>
          <div><b>{a[1]}</b></div>
          {b && <div><b>{b[1]}</b></div>}
        </div>
      </>
    );
  };

  return (
    <div className="sheet">
      <style jsx global>{`
        .sheet {
          width: 794px;
          background: #fff;
          margin: 0 auto;
          padding: 18px;
          font: 11px/1.35 Arial, Helvetica, sans-serif;
          color: #000;
          box-shadow: 0 1px 10px rgba(18, 38, 58, 0.18);
        }
        .sh {
          border: 2.5px solid #000;
          position: relative;
        }
        .tt {
          text-align: center;
          font-weight: 700;
          font-size: 14px;
          padding: 2px;
          border-bottom: 1px solid #000;
        }
        .sp {
          height: 14px;
          border-bottom: 1px solid #000;
        }
        .hd {
          display: flex;
          border-bottom: 1px solid #000;
        }
        .L {
          width: 44%;
          border-right: 1px solid #000;
        }
        .R {
          width: 56%;
          display: flex;
          flex-direction: column;
        }
        .cb,
        .bb {
          padding: 3px 4px;
        }
        .bb {
          border-top: 1px solid #000;
        }
        .cn {
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 6px;
        }
        .cn img {
          max-height: 62px;
          max-width: 110px;
          display: block;
        }
        .cn b {
          font-size: 25px;
          line-height: 1.1;
          text-transform: uppercase;
          text-align: center;
        }
        .ad {
          white-space: pre-wrap;
          min-height: 14px;
        }
        .kv span:first-child {
          display: inline-block;
          width: 38%;
        }
        .em {
          color: #00e;
        }
        .bl {
          padding-left: 14px;
        }
        .rw {
          display: grid;
          grid-template-columns: 48% 52%;
          flex: 1;
          min-height: 16px;
        }
        .rw.one {
          grid-template-columns: 1fr;
        }
        .rw > div {
          border-bottom: 1px solid #000;
          padding: 1px 3px;
        }
        .rw > div + div {
          border-left: 1px solid #000;
        }
        .rw.last > div {
          border-bottom: 0;
        }
        .rw i {
          font-style: normal;
          font-size: 10.5px;
        }
        .it {
          width: 100%;
          border-collapse: collapse;
        }
        .it th {
          border-bottom: 1px solid #000;
          padding: 5px 3px;
          text-align: center;
        }
        .it td {
          padding: 1px 3px;
          border-left: 1px solid #000;
          vertical-align: top;
        }
        .it th {
          border-left: 1px solid #000;
        }
        .it th:first-child,
        .it td:first-child {
          border-left: 0;
        }
        .it .r {
          text-align: right;
        }
        .it .ct {
          text-align: center;
        }
        .it .lab {
          font-weight: 700;
          font-style: italic;
        }
        .tv {
          font-size: 13px;
          font-weight: 700;
          text-decoration: underline;
        }
        .b {
          border-top: 1px solid #000;
        }
        .ow {
          display: flex;
          justify-content: space-between;
          padding: 1px 3px;
        }
        .wd {
          padding: 1px 3px;
          font-weight: 700;
          border-top: 1px solid #000;
        }
        .g {
          display: grid;
          grid-template-columns: 47.6% 52.4%;
          border-top: 1px solid #000;
        }
        .g > .lf {
          border-right: 1px solid #000;
        }
        .bk {
          display: flex;
          flex-direction: column;
        }
        .bk > div {
          display: grid;
          grid-template-columns: 37% 63%;
          border-top: 1px solid #000;
          padding: 1px 0;
        }
        .bk > div:first-child {
          display: block;
          border-top: 0;
          text-align: center;
          padding: 1px 3px;
        }
        .bk > div:last-child {
          flex: 1;
        }
        .bk > div > span {
          padding: 0 3px;
        }
        .bk > div > span + span {
          border-left: 1px solid #000;
          text-align: center;
        }
        .tx {
          width: 100%;
          border-collapse: collapse;
          text-align: center;
        }
        .tx td,
        .tx th {
          border-left: 1px solid #000;
          border-top: 1px solid #000;
          padding: 1px 3px;
          font-weight: 400;
        }
        .tx tr:first-child > * {
          border-top: 0;
        }
        .tx td:first-child,
        .tx th:first-child {
          border-left: 0;
        }
        .ft {
          text-align: center;
          border-top: 1px solid #000;
          padding: 2px;
        }
        .cx {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font: 700 84px Arial;
          color: rgba(170, 20, 20, 0.2);
          transform: rotate(-22deg);
          pointer-events: none;
        }
        @media print {
          @page {
            size: A4;
            margin: 10mm;
          }
          body {
            background: #fff;
            display: block;
            min-height: 0;
          }
          .sheet {
            width: auto;
            box-shadow: none;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="sh">
        {isCancelled && <div className="cx">CANCELLED</div>}

        {/* 1. Header Title & Top Spacer */}
        <div className="tt">{docTitle}</div>
        <div className="sp"></div>

        {/* 2. Two-Column Header Block */}
        <div className="hd">
          {/* Left Block: Company Details & Buyer */}
          <div className="L">
            <div className="cb">
              <div className="cn">
                <img src={seller.logoUrl || '/logo.png'} alt="Logo" />
                <b>{seller.legalName || 'MAYUR ENGINEERS'}</b>
              </div>
              <div className="ad">
                {seller.address ||
                  'Shop No-2, Dnyaneshwar Nagar, Avhad Farm, Pathardi Phata,\nNashik-422009'}
              </div>
              <div className="kv">
                <span>GSTIN/UIN</span>
                <span>{seller.gstin || '27CRLPG6253P3Z1'}</span>
              </div>
              <div className="kv">
                <span>State Name</span>
                <span>
                  : {seller.state || 'Maharashtra'}, Code :{' '}
                  {seller.stateCode || '27'}
                </span>
              </div>
              <div className="kv">
                <span>E-Mail</span>
                <span>
                  <u className="em">
                    {seller.email || 'maayurengineers@gmail.com'}
                  </u>
                </span>
              </div>
            </div>

            <div className="bb">
              <div className="bl">Buyer</div>
              <b>{buyer.name || 'TechArtMedia'}</b>
              <div className="ad" style={{ minHeight: '28px' }}>
                {buyer.billingAddress || buyer.address || ''}
              </div>
              <div className="kv">
                <span>GSTIN/UIN</span>
                <span>{buyer.gstin || ''}</span>
              </div>
              <div className="kv">
                <span>State Name</span>
                <span>
                  : {buyer.state || 'Maharashtra'}, Code :{' '}
                  {buyer.stateCode || '27'}
                </span>
              </div>
            </div>
          </div>

          {/* Right Block: Reference Details (without Terms of Delivery) */}
          <div className="R">
            {pair(
              [numberLabel, docNumber],
              ['Dated', fmtDate(invoice.issueDate || invoice.date)]
            )}
            {pair(
              ['VENDOR', invoice.vendor || ''],
              ['E-Way Bill No.', invoice.ewayBillNo || '']
            )}
            {pair(
              ["Buyer's Order No.", invoice.buyersOrderNo || ''],
              ['Dated', fmtDate(invoice.orderDate)]
            )}
            {pair(
              ['Delivery Note', invoice.deliveryNote || ''],
              ['Mode/Terms of Payment', invoice.paymentTerms || '']
            )}
            {pair(
              ['Despatched through', invoice.despatchedThrough || ''],
              ['Destination', invoice.destination || ''],
              true
            )}
          </div>
        </div>

        {/* 3. Items Table */}
        <table className="it">
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '46%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '7%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th>
                Sr.
                <br />
                No.
              </th>
              <th>Description of Goods</th>
              <th>HSN/SAC</th>
              <th>{QH}</th>
              <th>Rate</th>
              <th>Unit</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((r, i) => (
              <tr key={r.id || i}>
                <td className="ct">{i + 1}</td>
                <td>
                  <b>{r.description}</b>
                </td>
                <td>{r.hsnSacCode || ''}</td>
                <td className="ct">
                  <b>{Number(r.quantity) || 1}</b>
                </td>
                <td className="r">{inr(r.unitPricePaise)}</td>
                <td className="ct">{r.unit || 'NOS'}</td>
                <td className="r">
                  <b>{inr(r.taxableValuePaise)}</b>
                </td>
              </tr>
            ))}

            {/* Spacer row */}
            <tr>
              <td
                style={{
                  height: `${Math.max(10, 170 - items.length * 22)}px`,
                }}
              ></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>

            {/* Taxable base and tax rows (ONLY IF GST BILL WITH TAX > 0) */}
            {tax && (
              <>
                <tr>
                  <td></td>
                  <td className="r lab"></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="r">{inr(invoice.taxableAmountPaise)}</td>
                </tr>

                {!isInterState ? (
                  <>
                    <tr>
                      <td></td>
                      <td className="r lab">Output CGST</td>
                      <td>{halfRate}%</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="r">
                        <b>{inr(invoice.cgstAmountPaise)}</b>
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td className="r lab">Output SGST</td>
                      <td>{halfRate}%</td>
                      <td></td>
                      <td></td>
                      <td></td>
                      <td className="r">
                        <b>{inr(invoice.sgstAmountPaise)}</b>
                      </td>
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td></td>
                    <td className="r lab">Output IGST</td>
                    <td>{effectiveGstRate}%</td>
                    <td></td>
                    <td></td>
                    <td></td>
                    <td className="r">
                      <b>{inr(invoice.igstAmountPaise)}</b>
                    </td>
                  </tr>
                )}
              </>
            )}

            {/* Round off row */}
            <tr>
              <td></td>
              <td className="r lab">R/Off</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td className="r">
                <b>{inr(invoice.roundOffPaise)}</b>
              </td>
            </tr>

            {/* Total row */}
            <tr>
              <td></td>
              <td className="r">Total</td>
              <td></td>
              <td className="ct">
                <b>{mainUnit ? totalQty : ''}</b>
              </td>
              <td></td>
              <td className="ct">
                <b>{mainUnit}</b>
              </td>
              <td className="r tv">{inr(invoice.netTotalPaise)}</td>
            </tr>
          </tbody>
        </table>

        {/* 4. Words */}
        <div className="ow b">
          <span>Amount Chargeable (in words)</span>
          <i>E. &amp; O.E</i>
        </div>
        <div className="wd">{formatINRWords(invoice.netTotalPaise)}</div>

        {/* 5. Bank Details and GST Breakdown Table */}
        <div className="g">
          <div className="lf">
            <div className="bk">
              <div>{seller.bankName || 'State Bank of India'}</div>
              <div>
                <span>Account no.</span>
                <span>{seller.bankAccountNo || '12345678901'}</span>
              </div>
              <div>
                <span>IFSC code</span>
                <span>{seller.bankIfsc || 'SBIN0001234'}</span>
              </div>
            </div>
          </div>
          <div>
            {tax ? (
              <table className="tx">
                <thead>
                  <tr>
                    <th>Taxable</th>
                    {!isInterState ? (
                      <>
                        <th colSpan={2}>Central Tax</th>
                        <th colSpan={2}>State Tax</th>
                      </>
                    ) : (
                      <th colSpan={2}>Integrated Tax</th>
                    )}
                    <th>Total</th>
                  </tr>
                  <tr>
                    <th>Value</th>
                    {!isInterState ? (
                      <>
                        <th>Rate</th>
                        <th>Amount</th>
                        <th>Rate</th>
                        <th>Amount</th>
                      </>
                    ) : (
                      <>
                        <th>Rate</th>
                        <th>Amount</th>
                      </>
                    )}
                    <th>Tax Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{inr(invoice.taxableAmountPaise)}</td>
                    {!isInterState ? (
                      <>
                        <td>{halfRate}%</td>
                        <td>{inr(invoice.cgstAmountPaise)}</td>
                        <td>{halfRate}%</td>
                        <td>{inr(invoice.sgstAmountPaise)}</td>
                      </>
                    ) : (
                      <>
                        <td>{effectiveGstRate}%</td>
                        <td>{inr(invoice.igstAmountPaise)}</td>
                      </>
                    )}
                    <td>{inr(totalTax)}</td>
                  </tr>
                </tbody>
              </table>
            ) : null}
          </div>
        </div>

        {/* 6. Tax Amount in words (ONLY IF GST BILL) */}
        {tax && (
          <div className="g">
            <div className="lf" style={{ minHeight: '40px', padding: '1px 3px' }}>
              Tax Amount (in words) :
            </div>
            <div style={{ padding: '14px 3px 1px', fontWeight: 700 }}>
              {formatINRWords(totalTax)}
            </div>
          </div>
        )}

        {/* 7. CST No. & Terms of Delivery Header */}
        <div className="g">
          <div className="lf">
            <div style={{ display: 'grid', gridTemplateColumns: '37% 63%' }}>
              <span style={{ padding: '1px 3px' }}>Buyer's CST No. :</span>
              <span style={{ borderLeft: '1px solid #000', padding: '1px 3px' }}>
                {invoice.buyersCstNo || ''}
              </span>
            </div>
            <div style={{ height: '16px', borderTop: '1px solid #000' }}></div>
            <div style={{ borderTop: '1px solid #000', padding: '1px 3px' }}>
              Terms of Delivery
            </div>
          </div>
          <div style={{ padding: '1px 3px', fontWeight: 700 }}>
            for {seller.legalName || 'Mayur Engineers'} ({financialYear})
          </div>
        </div>

        {/* 8. Terms of Delivery & Signature */}
        <div
          className="b"
          style={{ display: 'grid', gridTemplateColumns: '71% 29%' }}
        >
          <div style={{ padding: '2px 3px' }}>
            {invoice.terms ||
              seller.defaultTerms ||
              'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.'}
          </div>
          <div
            style={{
              borderLeft: '1px solid #000',
              textAlign: 'center',
              padding: '14px 3px',
            }}
          >
            Authorised Signatory
          </div>
        </div>

        {/* 9. Footer Computer Generated Document */}
        <div className="ft">This Is A Computer Generated Document</div>
      </div>
    </div>
  );
}
