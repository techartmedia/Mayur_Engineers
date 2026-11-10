'use client';

import React, { useState } from 'react';
import { createCustomer, updateCustomer, archiveCustomer } from '@/lib/actions/customers';
import { INDIAN_STATES, getStateFromGstin } from '@/lib/constants/states';
import { useNotification } from '@/components/ui/NotificationProvider';
import { Users, Plus, Edit2, Archive, Search, Phone, Mail, MapPin } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  tradeName: string | null;
  phone: string | null;
  email: string | null;
  billingAddress: string;
  shippingAddress: string | null;
  gstin: string | null;
  state: string;
  stateCode: string;
}

export default function CustomersClient({ initialCustomers }: { initialCustomers: Customer[] }) {
  const { toast, confirm } = useNotification();
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [tradeName, setTradeName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [billingAddress, setBillingAddress] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [sameAsBilling, setSameAsBilling] = useState(true);
  const [gstin, setGstin] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setName('');
    setTradeName('');
    setPhone('');
    setEmail('');
    setBillingAddress('');
    setShippingAddress('');
    setSameAsBilling(true);
    setGstin('');
    setStateCode('27');
    setModalOpen(true);
  };

  const openEditModal = (cust: Customer) => {
    setEditingCustomer(cust);
    setName(cust.name);
    setTradeName(cust.tradeName || '');
    setPhone(cust.phone || '');
    setEmail(cust.email || '');
    setBillingAddress(cust.billingAddress);
    const isSame = !cust.shippingAddress || cust.shippingAddress === cust.billingAddress;
    setSameAsBilling(isSame);
    setShippingAddress(cust.shippingAddress || cust.billingAddress);
    setGstin(cust.gstin || '');
    setStateCode(cust.stateCode);
    setModalOpen(true);
  };

  const handleGstinChange = (val: string) => {
    const upper = val.toUpperCase();
    setGstin(upper);
    if (upper.length >= 2) {
      const match = getStateFromGstin(upper);
      if (match) {
        setStateCode(match.code);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('tradeName', tradeName);
    formData.append('phone', phone);
    formData.append('email', email);
    formData.append('billingAddress', billingAddress);
    const finalShippingAddress = sameAsBilling ? billingAddress : shippingAddress.trim() || billingAddress;
    formData.append('shippingAddress', finalShippingAddress);
    formData.append('gstin', gstin);

    const selectedState = INDIAN_STATES.find((s) => s.code === stateCode);
    formData.append('state', selectedState?.name || 'Maharashtra');
    formData.append('stateCode', stateCode);

    try {
      if (editingCustomer) {
        const res = await updateCustomer(editingCustomer.id, formData);
        if (!res.success) {
          toast.error(res.error || 'Failed to update customer');
          setLoading(false);
          return;
        }
        setCustomers((prev) =>
          prev.map((c) =>
            c.id === editingCustomer.id
              ? {
                  ...c,
                  name,
                  tradeName: tradeName || null,
                  phone: phone || null,
                  email: email || null,
                  billingAddress,
                  shippingAddress: finalShippingAddress,
                  gstin: gstin || null,
                  state: selectedState?.name || 'Maharashtra',
                  stateCode,
                }
              : c
          )
        );
        toast.success('Customer updated successfully');
      } else {
        const res = await createCustomer(formData);
        if (!res.success || !res.id) {
          toast.error(res.error || 'Failed to create customer');
          setLoading(false);
          return;
        }
        setCustomers([
          {
            id: res.id,
            name,
            tradeName: tradeName || null,
            phone: phone || null,
            email: email || null,
            billingAddress,
            shippingAddress: finalShippingAddress,
            gstin: gstin || null,
            state: selectedState?.name || 'Maharashtra',
            stateCode,
          },
          ...customers,
        ]);
        toast.success('Customer added successfully');
      }
      setModalOpen(false);
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('Minified React error') ? 'Failed to save customer due to server error.' : (msg || 'Failed to save customer'));
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (id: string, customerName: string) => {
    const confirmed = await confirm({
      title: 'Archive Customer',
      message: `Are you sure you want to archive "${customerName}"?`,
      confirmText: 'Archive',
      variant: 'danger',
    });
    if (!confirmed) return;

    try {
      const res = await archiveCustomer(id);
      if (res.success) {
        setCustomers((prev) => prev.filter((c) => c.id !== id));
        toast.success(`"${customerName}" archived successfully`);
      } else {
        toast.error(res.error || 'Failed to archive customer');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('Minified React error') ? 'Failed to archive customer due to server error.' : (msg || 'Failed to archive customer'));
    }
  };

  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.phone && c.phone.includes(searchTerm))
  );

  const allSelected = filtered.length > 0 && selectedIds.length === filtered.length;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((c) => c.id));
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
              Customer Directory
            </h1>
            {selectedIds.length > 0 && (
              <span className="text-xs bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full border border-teal-200 font-semibold">
                {selectedIds.length} selected
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage buyer profiles, addresses, and GSTIN details for invoicing.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus size={15} />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-slate-200 rounded-md px-3 py-2 text-xs shadow-sm">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by customer name, trade name, GSTIN, phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchTerm ? 'No customers match your search.' : 'No customers yet. Click "Add Customer" to create your first buyer profile.'}
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
                  <th className="py-2.5 px-4 font-semibold">Customer / Trade Name</th>
                  <th className="py-2.5 px-4 font-semibold">GSTIN</th>
                  <th className="py-2.5 px-4 font-semibold">State / Code</th>
                  <th className="py-2.5 px-4 font-semibold">Contact</th>
                  <th className="py-2.5 px-4 font-semibold">Billing Address</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50/50 ${selectedIds.includes(c.id) ? 'bg-teal-50/30' : ''}`}>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(c.id)}
                        onChange={() => toggleSelectOne(c.id)}
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{c.name}</div>
                      {c.tradeName && (
                        <div className="text-[11px] text-slate-500">{c.tradeName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {c.gstin || <span className="text-slate-400 italic">Unregistered</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      {c.state} <span className="font-mono text-slate-500">({c.stateCode})</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {c.phone && <div className="flex items-center gap-1"><Phone size={11} className="text-slate-400" />{c.phone}</div>}
                      {c.email && <div className="flex items-center gap-1 text-[11px] text-slate-500"><Mail size={11} className="text-slate-400" />{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={c.billingAddress}>
                      <div className="flex items-start gap-1">
                        <MapPin size={12} className="text-slate-400 shrink-0 mt-0.5" />
                        <span className="truncate">{c.billingAddress}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => openEditModal(c)}
                          className="p-1 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                          title="Edit Customer"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleArchive(c.id, c.name)}
                          className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-slate-100"
                          title="Archive Customer"
                        >
                          <Archive size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-slate-900">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Legal Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Acme Precision Tools Pvt Ltd"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Trade Name / Alias
                  </label>
                  <input
                    type="text"
                    value={tradeName}
                    onChange={(e) => setTradeName(e.target.value)}
                    placeholder="e.g. Acme Tools"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    maxLength={15}
                    value={gstin}
                    onChange={(e) => handleGstinChange(e.target.value)}
                    placeholder="27AAACA9876E1Z5"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono uppercase focus:border-teal-500 outline-none"
                  />
                  <span className="text-[10px] text-slate-400">State code auto-detected from first 2 digits</span>
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    State & Code <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s.code} value={s.code}>
                        {s.code} - {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="accounts@acme.com"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Billing Address <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={billingAddress}
                  onChange={(e) => setBillingAddress(e.target.value)}
                  placeholder="Plot 45, MIDC Industrial Area, Pune 411026"
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
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Shipping / Delivery Address
                    </label>
                    <textarea
                      rows={2}
                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      placeholder="Enter separate shipping destination address"
                      className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium"
                >
                  {loading ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Add Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
