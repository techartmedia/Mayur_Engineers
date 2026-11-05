'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createInvoice } from '@/lib/actions/invoices';
import { calculateDocument } from '@/lib/calculations/gst-calculator';
import { formatINR, toPaise, toRupees } from '@/lib/calculations/money';
import { LineItemInput } from '@/lib/calculations/types';
import { INDIAN_STATES, getStateFromGstin } from '@/lib/constants/states';
import { Plus, Trash2, ArrowLeft, CheckCircle, Save, UserCheck, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  tradeName: string | null;
  state: string;
  stateCode: string;
  gstin: string | null;
  billingAddress: string;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  hsnSacCode: string | null;
  unit: string;
  pricePaise: number;
  gstRate: number;
}

interface NewInvoiceClientProps {
  customers: Customer[];
  products: Product[];
  profile: any;
}

export default function NewInvoiceClient({
  customers,
  products,
  profile,
}: NewInvoiceClientProps) {
  const router = useRouter();

  // Buyer Mode: 'DIRECTORY' or 'DIRECT'
  const [buyerMode, setBuyerMode] = useState<'DIRECTORY' | 'DIRECT'>(
    customers.length > 0 ? 'DIRECTORY' : 'DIRECT'
  );

  // Directory customer selection
  const [customerId, setCustomerId] = useState(customers[0]?.id || '');

  // One-time / Direct Buyer fields
  const [directName, setDirectName] = useState('');
  const [directAddress, setDirectAddress] = useState('');
  const [directShippingAddress, setDirectShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [saveCustomerToDirectory, setSaveCustomerToDirectory] = useState(false);
  const [directGstin, setDirectGstin] = useState('');
  const [directStateCode, setDirectStateCode] = useState('27');
  const [directPhone, setDirectPhone] = useState('');
  const [directEmail, setDirectEmail] = useState('');

  const [documentType, setDocumentType] = useState<'TAX_INVOICE' | 'BILL_OF_SUPPLY'>('TAX_INVOICE');
  const [isReverseCharge, setIsReverseCharge] = useState(false);
  const [applyRoundOff, setApplyRoundOff] = useState(true);
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(profile?.defaultTerms || '');
  const [loading, setLoading] = useState(false);

  // Line items state
  const [items, setItems] = useState<
    {
      description: string;
      hsnSacCode: string;
      unit: string;
      quantity: number;
      priceRupees: string;
      discountRupees: string;
      gstRate: number;
    }[]
  >([
    {
      description: '',
      hsnSacCode: '',
      unit: 'NOS',
      quantity: 1,
      priceRupees: '0',
      discountRupees: '0',
      gstRate: 18,
    },
  ]);

  const selectedCustomer = customers.find((c) => c.id === customerId);

  // Resolve active place of supply state code
  const activeStateCode = useMemo(() => {
    if (buyerMode === 'DIRECTORY') {
      return selectedCustomer?.stateCode || profile?.stateCode || '27';
    }
    return directStateCode || profile?.stateCode || '27';
  }, [buyerMode, selectedCustomer, directStateCode, profile]);

  const handleDirectGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setDirectGstin(upper);
    if (upper.length >= 2) {
      const match = getStateFromGstin(upper);
      if (match) {
        setDirectStateCode(match.code);
      }
    }
  };

  // Handle product auto-fill
  const handleProductSelect = (index: number, productId: string) => {
    if (productId === 'custom' || !productId) {
      setItems((prev) => {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          description: copy[index].description || 'Custom Job Work / Service',
          hsnSacCode: copy[index].hsnSacCode || '9988',
          unit: copy[index].unit || 'NOS',
        };
        return copy;
      });
      return;
    }

    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    setItems((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        description: prod.name + (prod.description ? ` (${prod.description})` : ''),
        hsnSacCode: prod.hsnSacCode || '',
        unit: prod.unit || 'NOS',
        priceRupees: toRupees(prod.pricePaise).toString(),
        gstRate: prod.gstRate,
      };
      return copy;
    });
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      {
        description: '',
        hsnSacCode: '',
        unit: 'NOS',
        quantity: 1,
        priceRupees: '0',
        discountRupees: '0',
        gstRate: 18,
      },
    ]);
  };

  const removeItemRow = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // Convert raw UI items to canonical calculation input
  const calculationInputs: LineItemInput[] = useMemo(() => {
    return items.map((it) => ({
      description: it.description || 'Item',
      hsnSacCode: it.hsnSacCode,
      unit: it.unit,
      quantity: Math.max(0, it.quantity || 1),
      unitPricePaise: toPaise(it.priceRupees || 0),
      discountPaise: toPaise(it.discountRupees || 0),
      gstRate: it.gstRate,
    }));
  }, [items]);

  // Live real-time tax math calculation
  const calculation = useMemo(() => {
    const res = calculateDocument({
      items: calculationInputs,
      supplierStateCode: profile?.stateCode || '27',
      placeOfSupplyStateCode: activeStateCode,
      documentType,
    });
    if (!applyRoundOff) {
      return {
        ...res,
        roundOffPaise: 0,
        netTotalPaise: res.totalTaxableAmountPaise + res.totalTaxPaise,
      };
    }
    return res;
  }, [calculationInputs, profile, activeStateCode, documentType, applyRoundOff]);

  const handleSubmit = async (saveAsDraft: boolean) => {
    if (buyerMode === 'DIRECTORY' && !customerId) {
      alert('Please select a customer or switch to Direct Entry');
      return;
    }

    if (buyerMode === 'DIRECT' && !directName.trim()) {
      alert('Please enter the buyer name');
      return;
    }

    const hasEmpty = items.some((it) => !it.description.trim());
    if (hasEmpty) {
      alert('Please fill out descriptions for all line items');
      return;
    }

    setLoading(true);

    try {
      const selectedState = INDIAN_STATES.find((s) => s.code === directStateCode);

      const res = await createInvoice({
        customerId: buyerMode === 'DIRECTORY' ? customerId : null,
        directCustomer:
          buyerMode === 'DIRECT'
            ? {
                name: directName.trim(),
                billingAddress: directAddress.trim() || 'Direct Buyer',
                shippingAddress: sameAsBilling
                  ? directAddress.trim() || 'Direct Buyer'
                  : directShippingAddress.trim() || directAddress.trim() || 'Direct Buyer',
                state: selectedState?.name || 'Maharashtra',
                stateCode: directStateCode,
                gstin: directGstin.trim() || undefined,
                phone: directPhone.trim() || undefined,
                email: directEmail.trim() || undefined,
              }
            : null,
        documentType,
        issueDate,
        dueDate: dueDate || undefined,
        items: calculationInputs,
        notes,
        terms,
        saveAsDraft,
        isReverseCharge,
        saveCustomerToDirectory,
      });

      if (res.success && res.invoiceId) {
        router.push(`/invoices/${res.invoiceId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create invoice');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/invoices"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              New Invoice
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in buyer and item particulars.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <Save size={14} />
            <span>Save as Draft</span>
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => handleSubmit(false)}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <CheckCircle size={15} />
            <span>{loading ? 'Issuing...' : 'Issue Invoice'}</span>
          </button>
        </div>
      </div>

      {/* Buyer & Document Particulars Block */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4 text-xs">
        {/* Buyer Selection Tabs */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="font-semibold text-slate-900 text-sm">Buyer Details</div>
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md text-[11px]">
            <button
              type="button"
              onClick={() => setBuyerMode('DIRECTORY')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                buyerMode === 'DIRECTORY'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserCheck size={12} />
              <span>Saved Customer</span>
            </button>
            <button
              type="button"
              onClick={() => setBuyerMode('DIRECT')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded transition ${
                buyerMode === 'DIRECT'
                  ? 'bg-white text-slate-900 font-semibold shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus size={12} />
              <span>One-Time / Direct Entry</span>
            </button>
          </div>
        </div>

        {/* Directory Customer Selection */}
        {buyerMode === 'DIRECTORY' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Select Customer <span className="text-rose-500">*</span>
              </label>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none font-medium"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.state})
                  </option>
                ))}
              </select>
            </div>
            {selectedCustomer && (
              <div className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 flex flex-col justify-center">
                <div className="font-semibold text-slate-800">{selectedCustomer.name}</div>
                <div>{selectedCustomer.billingAddress}</div>
                <div>State: {selectedCustomer.state} ({selectedCustomer.stateCode}) {selectedCustomer.gstin ? `| GSTIN: ${selectedCustomer.gstin}` : ''}</div>
              </div>
            )}
          </div>
        )}

        {/* Direct One-Time Buyer Input */}
        {buyerMode === 'DIRECT' && (
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-medium text-slate-700 mb-1">
                  Buyer / Customer Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={directName}
                  onChange={(e) => setDirectName(e.target.value)}
                  placeholder="e.g. Acme Precision Tools / Walk-in Client"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  GSTIN (Optional)
                </label>
                <input
                  type="text"
                  maxLength={15}
                  value={directGstin}
                  onChange={(e) => handleDirectGstinChange(e.target.value)}
                  placeholder="27AAACA9876E1Z5"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Place of Supply / State <span className="text-rose-500">*</span>
                </label>
                <select
                  value={directStateCode}
                  onChange={(e) => setDirectStateCode(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                >
                  {INDIAN_STATES.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Phone (Optional)</label>
                <input
                  type="text"
                  value={directPhone}
                  onChange={(e) => setDirectPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={directEmail}
                  onChange={(e) => setDirectEmail(e.target.value)}
                  placeholder="buyer@example.com"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Billing Address / Location
              </label>
              <textarea
                rows={2}
                value={directAddress}
                onChange={(e) => setDirectAddress(e.target.value)}
                placeholder="Address or workshop location"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>

            <div className="space-y-2 pt-1 border-t border-slate-100">
              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={sameAsBilling}
                  onChange={(e) => setSameAsBilling(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Shipping address is same as billing address</span>
              </label>

              {!sameAsBilling && (
                <div className="pt-1">
                  <label className="block font-medium text-slate-700 mb-1">
                    Shipping / Delivery Address
                  </label>
                  <textarea
                    rows={2}
                    value={directShippingAddress}
                    onChange={(e) => setDirectShippingAddress(e.target.value)}
                    placeholder="Enter destination delivery address"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  />
                </div>
              )}

              <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={saveCustomerToDirectory}
                  onChange={(e) => setSaveCustomerToDirectory(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                <span>Save this buyer to Customer Directory for future billing</span>
              </label>
            </div>
          </div>
        )}

        {/* Dates & Document Type */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Document Type</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value as any)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            >
              <option value="TAX_INVOICE">Tax Invoice</option>
              <option value="BILL_OF_SUPPLY">Bill of Supply</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Issue Date</label>
            <input
              type="date"
              value={issueDate}
              onChange={(e) => setIssueDate(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        {/* GST & Calculation Checkbox Options */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isReverseCharge}
              onChange={(e) => setIsReverseCharge(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Tax is payable on Reverse Charge (RCM)</span>
          </label>

          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyRoundOff}
              onChange={(e) => setApplyRoundOff(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Auto Round-Off total to nearest Rupee</span>
          </label>
        </div>
      </div>

      {/* Line Items Editor */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Line Items</h2>
          <button
            type="button"
            onClick={addItemRow}
            className="inline-flex items-center gap-1 text-teal-600 hover:text-teal-700 font-semibold text-xs"
          >
            <Plus size={14} />
            <span>Add Item</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3 w-48 font-semibold">Catalogue Item</th>
                <th className="py-2 px-3 font-semibold">Description</th>
                <th className="py-2 px-2 w-20 font-semibold">HSN/SAC</th>
                <th className="py-2 px-2 w-16 font-semibold">Qty</th>
                <th className="py-2 px-2 w-20 font-semibold">Unit</th>
                <th className="py-2 px-2 w-24 font-semibold text-right">Price (₹)</th>
                <th className="py-2 px-2 w-20 font-semibold text-right">Disc (₹)</th>
                <th className="py-2 px-2 w-20 font-semibold text-right">GST %</th>
                <th className="py-2 px-3 w-28 font-semibold text-right">Total (₹)</th>
                <th className="py-2 px-2 w-10 text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, idx) => {
                const calcItem = calculation.items[idx];
                return (
                  <tr key={idx} className="hover:bg-slate-50/30">
                    <td className="p-2">
                      <select
                        onChange={(e) => handleProductSelect(idx, e.target.value)}
                        className="w-full border border-slate-200 rounded px-2 py-1 text-[11px] focus:border-teal-500 outline-none font-medium"
                        defaultValue="custom"
                      >
                        <option value="custom">Custom / Ad-hoc Item</option>
                        {products.length > 0 && (
                          <optgroup label="Saved Catalogue Items">
                            {products.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                    </td>

                    <td className="p-2">
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].description = val;
                            return copy;
                          });
                        }}
                        placeholder="Description of item / work"
                        className="w-full border border-slate-200 rounded px-2 py-1 focus:border-teal-500 outline-none"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="text"
                        value={item.hsnSacCode}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].hsnSacCode = val;
                            return copy;
                          });
                        }}
                        placeholder="8483"
                        className="w-full border border-slate-200 rounded px-1.5 py-1 font-mono text-[11px] focus:border-teal-500 outline-none"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        min="0.01"
                        step="any"
                        value={item.quantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].quantity = val;
                            return copy;
                          });
                        }}
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-center font-semibold focus:border-teal-500 outline-none"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].unit = val;
                            return copy;
                          });
                        }}
                        placeholder="NOS"
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-center focus:border-teal-500 outline-none"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.priceRupees}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].priceRupees = val;
                            return copy;
                          });
                        }}
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-right font-mono focus:border-teal-500 outline-none"
                      />
                    </td>

                    <td className="p-2">
                      <input
                        type="number"
                        step="0.01"
                        value={item.discountRupees}
                        onChange={(e) => {
                          const val = e.target.value;
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].discountRupees = val;
                            return copy;
                          });
                        }}
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-right font-mono focus:border-teal-500 outline-none"
                      />
                    </td>

                    <td className="p-2">
                      <select
                        value={item.gstRate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setItems((prev) => {
                            const copy = [...prev];
                            copy[idx].gstRate = val;
                            return copy;
                          });
                        }}
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-right focus:border-teal-500 outline-none font-medium"
                      >
                        <option value="18">18%</option>
                        <option value="12">12%</option>
                        <option value="28">28%</option>
                        <option value="5">5%</option>
                        <option value="0">0%</option>
                      </select>
                    </td>

                    <td className="p-2 text-right font-mono font-bold text-slate-900">
                      {calcItem ? formatINR(calcItem.totalLineAmountPaise) : '—'}
                    </td>

                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeItemRow(idx)}
                        disabled={items.length <= 1}
                        className="p-1 rounded text-slate-300 hover:text-rose-600 disabled:opacity-30 disabled:hover:text-slate-300"
                        title="Remove Item"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bottom Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / PO Reference</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PO No / Work Order details..."
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Terms & Conditions</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none whitespace-pre-line"
            />
          </div>
        </div>

        {/* Calculation Summary */}
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-2.5 text-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Summary
          </h3>

          <div className="flex justify-between py-1 text-slate-600">
            <span>Gross Subtotal:</span>
            <span className="font-mono font-medium">{formatINR(calculation.subtotalGrossPaise)}</span>
          </div>

          {calculation.totalDiscountPaise > 0 && (
            <div className="flex justify-between py-1 text-emerald-700 font-medium">
              <span>Total Discounts:</span>
              <span className="font-mono">-{formatINR(calculation.totalDiscountPaise)}</span>
            </div>
          )}

          <div className="flex justify-between py-1 text-slate-800 font-semibold border-t border-slate-100 pt-2">
            <span>Taxable Amount:</span>
            <span className="font-mono">{formatINR(calculation.totalTaxableAmountPaise)}</span>
          </div>

          {!calculation.isInterState ? (
            <>
              <div className="flex justify-between py-1 text-slate-600">
                <span>Central GST (CGST):</span>
                <span className="font-mono">{formatINR(calculation.totalCgstPaise)}</span>
              </div>
              <div className="flex justify-between py-1 text-slate-600">
                <span>State GST (SGST):</span>
                <span className="font-mono">{formatINR(calculation.totalSgstPaise)}</span>
              </div>
            </>
          ) : (
            <div className="flex justify-between py-1 text-slate-600">
              <span>Integrated GST (IGST):</span>
              <span className="font-mono">{formatINR(calculation.totalIgstPaise)}</span>
            </div>
          )}

          {calculation.roundOffPaise !== 0 && (
            <div className="flex justify-between py-1 text-slate-500">
              <span>Round-off:</span>
              <span className="font-mono">{formatINR(calculation.roundOffPaise)}</span>
            </div>
          )}

          <div className="flex justify-between py-3 border-t-2 border-slate-900 text-base font-black text-slate-900">
            <span>Total:</span>
            <span className="font-mono text-teal-800">{formatINR(calculation.netTotalPaise)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
