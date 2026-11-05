'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createQuotation } from '@/lib/actions/quotations';
import { calculateDocument } from '@/lib/calculations/gst-calculator';
import { formatINR, toPaise, toRupees } from '@/lib/calculations/money';
import { LineItemInput } from '@/lib/calculations/types';
import { INDIAN_STATES, getStateFromGstin } from '@/lib/constants/states';
import { Plus, Trash2, ArrowLeft, Save, UserCheck, UserPlus } from 'lucide-react';
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

export default function NewQuotationClient({
  customers,
  products,
  profile,
}: {
  customers: Customer[];
  products: Product[];
  profile: any;
}) {
  const router = useRouter();

  // Buyer Mode: 'DIRECTORY' or 'DIRECT'
  const [buyerMode, setBuyerMode] = useState<'DIRECTORY' | 'DIRECT'>(
    customers.length > 0 ? 'DIRECTORY' : 'DIRECT'
  );

  const [customerId, setCustomerId] = useState(customers[0]?.id || '');
  const [directName, setDirectName] = useState('');
  const [directAddress, setDirectAddress] = useState('');
  const [directShippingAddress, setDirectShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [saveCustomerToDirectory, setSaveCustomerToDirectory] = useState(false);
  const [directGstin, setDirectGstin] = useState('');
  const [directStateCode, setDirectStateCode] = useState('27');
  const [directPhone, setDirectPhone] = useState('');
  const [directEmail, setDirectEmail] = useState('');
  const [applyRoundOff, setApplyRoundOff] = useState(true);
  const [isGstQuote, setIsGstQuote] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(profile?.defaultTerms || '');
  const [loading, setLoading] = useState(false);

  // Transport & Dispatch Fields
  const [vendor, setVendor] = useState('');
  const [ewayBillNo, setEwayBillNo] = useState('');
  const [buyersOrderNo, setBuyersOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [despatchedThrough, setDespatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [buyersCstNo, setBuyersCstNo] = useState('');
  const [showTransportDetails, setShowTransportDetails] = useState(true);

  const handleGstQuoteToggle = (checked: boolean) => {
    setIsGstQuote(checked);
    if (!checked) {
      setItems((prev) => prev.map((it) => ({ ...it, gstRate: 0 })));
    } else {
      setItems((prev) => prev.map((it) => ({ ...it, gstRate: 18 })));
    }
  };

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

  const calculation = useMemo(() => {
    const res = calculateDocument({
      items: calculationInputs,
      supplierStateCode: profile?.stateCode || '27',
      placeOfSupplyStateCode: activeStateCode,
      documentType: 'TAX_INVOICE',
    });
    if (!applyRoundOff) {
      return {
        ...res,
        roundOffPaise: 0,
        netTotalPaise: res.totalTaxableAmountPaise + res.totalTaxPaise,
      };
    }
    return res;
  }, [calculationInputs, profile, activeStateCode, applyRoundOff]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

      const res = await createQuotation({
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
        date,
        expiryDate: expiryDate || undefined,
        items: calculationInputs,
        notes,
        terms,
        vendor: vendor.trim() || undefined,
        ewayBillNo: ewayBillNo.trim() || undefined,
        buyersOrderNo: buyersOrderNo.trim() || undefined,
        orderDate: orderDate || undefined,
        deliveryNote: deliveryNote.trim() || undefined,
        paymentTerms: paymentTerms.trim() || undefined,
        despatchedThrough: despatchedThrough.trim() || undefined,
        destination: destination.trim() || undefined,
        buyersCstNo: buyersCstNo.trim() || undefined,
        saveCustomerToDirectory,
      });

      if (res.success && res.quotationId) {
        router.push(`/quotations/${res.quotationId}`);
      }
    } catch (err: any) {
      alert(err.message || 'Failed to create quotation');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/quotations"
            className="p-1.5 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              New Quotation
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Fill in buyer and quotation particulars.
            </p>
          </div>
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={handleSubmit}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
        >
          <Save size={15} />
          <span>{loading ? 'Saving...' : 'Save Quotation'}</span>
        </button>
      </div>

      {/* Buyer & Quotation Details Block */}
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
                  placeholder="e.g. Acme Precision Tools"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">GSTIN (Optional)</label>
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
                  State <span className="text-rose-500">*</span>
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
              <label className="block font-medium text-slate-700 mb-1">Billing Address</label>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-100">
          <div>
            <label className="block font-medium text-slate-700 mb-1">Quotation Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Valid Until / Expiry</label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-6">
          <label className="flex items-center gap-2 font-medium text-slate-800 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isGstQuote}
              onChange={(e) => handleGstQuoteToggle(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 h-4 w-4"
            />
            <span className="font-bold text-xs text-slate-900">
              {isGstQuote ? 'GST Quotation (with GST breakdown)' : 'Non-GST Quotation / Estimate (0% Tax)'}
            </span>
          </label>

          <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={applyRoundOff}
              onChange={(e) => setApplyRoundOff(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
            />
            <span>Auto Round-Off total (R/Off)</span>
          </label>

          <button
            type="button"
            onClick={() => setShowTransportDetails(!showTransportDetails)}
            className="text-xs font-semibold text-teal-700 hover:text-teal-900 hover:underline flex items-center gap-1 ml-auto"
          >
            {showTransportDetails ? 'Hide Dispatch Details' : '+ Add Dispatch / Transport Details'}
          </button>
        </div>

        {/* Dispatch & Transport Particulars */}
        {showTransportDetails && (
          <div className="pt-3 border-t border-slate-100 space-y-3 bg-slate-50/60 p-3 rounded-md">
            <div className="font-semibold text-slate-800 text-xs">
              Dispatch, Transport & Order Particulars
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 mb-0.5">Buyer's Order No.</label>
                <input
                  type="text"
                  value={buyersOrderNo}
                  onChange={(e) => setBuyersOrderNo(e.target.value)}
                  placeholder="PO / Order #"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Order Date</label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Delivery Note</label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Challan #"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Mode/Terms of Payment</label>
                <input
                  type="text"
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="Immediate / 30 Days"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Despatched through</label>
                <input
                  type="text"
                  value={despatchedThrough}
                  onChange={(e) => setDespatchedThrough(e.target.value)}
                  placeholder="Truck / Transport"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">Destination</label>
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Nashik"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">E-Way Bill No.</label>
                <input
                  type="text"
                  value={ewayBillNo}
                  onChange={(e) => setEwayBillNo(e.target.value)}
                  placeholder="E-Way Bill No"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-slate-600 mb-0.5">VENDOR</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={(e) => setVendor(e.target.value)}
                  placeholder="Vendor Code"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-slate-600 mb-0.5">Buyer's CST No.</label>
                <input
                  type="text"
                  value={buyersCstNo}
                  onChange={(e) => setBuyersCstNo(e.target.value)}
                  placeholder="CST No. if applicable"
                  className="w-full bg-white border border-slate-300 rounded px-2 py-1 outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden text-xs">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">Quotation Line Items</h2>
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
                        placeholder="Description of item"
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
                        className="w-full border border-slate-200 rounded px-1.5 py-1 text-right focus:border-teal-500 outline-none"
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
                        className="p-1 rounded text-slate-300 hover:text-rose-600 disabled:opacity-30"
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

      {/* Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Notes / Subject</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Quotation for supply of precision CNC components"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Terms of Delivery</label>
            <textarea
              rows={3}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none whitespace-pre-line"
            />
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-2.5 text-xs">
          <h3 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-2">
            Quotation Summary
          </h3>
          <div className="flex justify-between py-1 text-slate-600">
            <span>Taxable Amount:</span>
            <span className="font-mono font-medium">{formatINR(calculation.totalTaxableAmountPaise)}</span>
          </div>
          <div className="flex justify-between py-1 text-slate-600">
            <span>Total Estimated Tax:</span>
            <span className="font-mono">{formatINR(calculation.totalTaxPaise)}</span>
          </div>
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
