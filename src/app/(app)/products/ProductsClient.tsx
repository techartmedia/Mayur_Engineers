'use client';

import React, { useState } from 'react';
import { createProduct, updateProduct, toggleProductActive } from '@/lib/actions/products';
import { formatINR, toRupees } from '@/lib/calculations/money';
import { Package, Plus, Edit2, Check, X, Search, Tag } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description: string | null;
  hsnSacCode: string | null;
  unit: string;
  pricePaise: number;
  gstRate: number;
  isActive: number;
}

export default function ProductsClient({ initialProducts }: { initialProducts: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [hsnSacCode, setHsnSacCode] = useState('');
  const [unit, setUnit] = useState('NOS');
  const [price, setPrice] = useState('0');
  const [gstRate, setGstRate] = useState('18.0');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setHsnSacCode('');
    setUnit('NOS');
    setPrice('');
    setGstRate('18.0');
    setIsActive(true);
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setName(prod.name);
    setDescription(prod.description || '');
    setHsnSacCode(prod.hsnSacCode || '');
    setUnit(prod.unit);
    setPrice(toRupees(prod.pricePaise).toString());
    setGstRate(prod.gstRate.toString());
    setIsActive(prod.isActive === 1);
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData();
    formData.append('name', name);
    formData.append('description', description);
    formData.append('hsnSacCode', hsnSacCode);
    formData.append('unit', unit);
    formData.append('price', price);
    formData.append('gstRate', gstRate);
    formData.append('isActive', isActive ? '1' : '0');

    try {
      if (editingProduct) {
        await updateProduct(editingProduct.id, formData);
        setProducts((prev) =>
          prev.map((p) =>
            p.id === editingProduct.id
              ? {
                  ...p,
                  name,
                  description: description || null,
                  hsnSacCode: hsnSacCode || null,
                  unit,
                  pricePaise: Math.round(parseFloat(price || '0') * 100),
                  gstRate: parseFloat(gstRate),
                }
              : p
          )
        );
      } else {
        const res = await createProduct(formData);
        if (res.success && res.id) {
          setProducts([
            {
              id: res.id,
              name,
              description: description || null,
              hsnSacCode: hsnSacCode || null,
              unit,
              pricePaise: Math.round(parseFloat(price || '0') * 100),
              gstRate: parseFloat(gstRate),
              isActive: 1,
            },
            ...products,
          ]);
        }
      }
      setModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Failed to save product');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string, currentStatus: number) => {
    try {
      await toggleProductActive(id, currentStatus);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: currentStatus === 1 ? 0 : 1 } : p))
      );
    } catch (err: any) {
      alert(err.message || 'Failed to update status');
    }
  };

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.hsnSacCode && p.hsnSacCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.description && p.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Products & Services
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Catalogue with HSN/SAC classification, GST rate and GST-exclusive selling rates.
          </p>
        </div>
        <button
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
        >
          <Plus size={15} />
          <span>Add Product</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-2 max-w-md bg-white border border-slate-200 rounded-md px-3 py-2 text-xs shadow-sm">
        <Search size={15} className="text-slate-400 shrink-0" />
        <input
          type="text"
          placeholder="Search by product name, HSN/SAC code, description..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-transparent border-0 p-0 text-xs focus:ring-0 outline-none text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {searchTerm ? 'No products match your search.' : 'No products in catalogue yet. Click "Add Product" to create one.'}
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Item & Description</th>
                  <th className="py-2.5 px-4 font-semibold">HSN / SAC</th>
                  <th className="py-2.5 px-4 font-semibold">Unit</th>
                  <th className="py-2.5 px-4 font-semibold">Selling Price (Excl. GST)</th>
                  <th className="py-2.5 px-4 font-semibold">GST Rate</th>
                  <th className="py-2.5 px-4 font-semibold">Status</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      {p.description && (
                        <div className="text-[11px] text-slate-500">{p.description}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {p.hsnSacCode || <span className="text-slate-400 italic">—</span>}
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {p.unit}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {formatINR(p.pricePaise)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        {p.gstRate}%
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleToggle(p.id, p.isActive)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold transition ${
                          p.isActive === 1
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {p.isActive === 1 ? <Check size={10} /> : <X size={10} />}
                        <span>{p.isActive === 1 ? 'Active' : 'Inactive'}</span>
                      </button>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => openEditModal(p)}
                        className="p-1 rounded text-slate-500 hover:text-teal-600 hover:bg-slate-100"
                        title="Edit Product"
                      >
                        <Edit2 size={14} />
                      </button>
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
              {editingProduct ? 'Edit Product' : 'Add New Product / Service'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Item / Service Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. CNC Precision Shaft 25mm"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Description / Specification
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Mild steel EN8, tolerance ±0.02mm, blackodised"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    HSN / SAC Code
                  </label>
                  <input
                    type="text"
                    value={hsnSacCode}
                    onChange={(e) => setHsnSacCode(e.target.value)}
                    placeholder="e.g. 8483 / 9987"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Unit of Measurement <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  >
                    <option value="NOS">NOS (Numbers / Pieces)</option>
                    <option value="SET">SET (Sets)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="MTR">MTR (Meters)</option>
                    <option value="LOT">LOT (Lots)</option>
                    <option value="HRS">HRS (Hours / Labour)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Selling Price (₹ excl. GST) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 450.00"
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    GST Rate (%) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
                  >
                    <option value="18.0">18% (Standard Engineering goods)</option>
                    <option value="12.0">12%</option>
                    <option value="28.0">28%</option>
                    <option value="5.0">5%</option>
                    <option value="0.0">0% (Nil / Exempt)</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 font-medium text-slate-700 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>Active in catalogue (visible during invoice creation)</span>
                </label>
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
                  {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
