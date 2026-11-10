'use client';

import React, { useState } from 'react';
import { updateBusinessProfile } from '@/lib/actions/settings';
import { INDIAN_STATES } from '@/lib/constants/states';
import { getFinancialYear } from '@/lib/numbering/sequence-allocator';
import { useNotification } from '@/components/ui/NotificationProvider';
import { Settings, Save, CheckCircle, Building, Landmark, Receipt, FileText, Lock } from 'lucide-react';
import { changePassword } from '@/lib/actions/auth';

export default function SettingsClient({ profile }: { profile: any }) {
  const { toast } = useNotification();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form states
  const [legalName, setLegalName] = useState(profile?.legalName || 'Mayur Engineers');
  const [tradeName, setTradeName] = useState(profile?.tradeName || 'Mayur Engineers');
  const [address, setAddress] = useState(profile?.address || '');
  const [stateCode, setStateCode] = useState(profile?.stateCode || '27');
  const [gstin, setGstin] = useState(profile?.gstin || '');
  const [pan, setPan] = useState(profile?.pan || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [email, setEmail] = useState(profile?.email || '');

  // Bank & UPI
  const [bankName, setBankName] = useState(profile?.bankName || '');
  const [bankAccountNo, setBankAccountNo] = useState(profile?.bankAccountNo || '');
  const [bankIfsc, setBankIfsc] = useState(profile?.bankIfsc || '');
  const [bankBranch, setBankBranch] = useState(profile?.bankBranch || '');
  const [upiId, setUpiId] = useState(profile?.upiId || '');
  const [logoUrl, setLogoUrl] = useState(profile?.logoUrl || '/logo.png');

  // Sequence & Scheme
  const [gstStatus, setGstStatus] = useState(profile?.gstStatus || 'regular');
  const [invoicePrefix, setInvoicePrefix] = useState(profile?.invoicePrefix || 'ME');
  const [openingSequence, setOpeningSequence] = useState(profile?.openingSequence?.toString() || '1');
  const [defaultTerms, setDefaultTerms] = useState(
    profile?.defaultTerms || 'Payment terms: Due within 30 days.\nGoods once sold will not be taken back.'
  );

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentFY = getFinancialYear();
  const sequencePreview = `${invoicePrefix || 'ME'}/${currentFY}/${(parseInt(openingSequence, 10) || 1).toString().padStart(3, '0')}`;

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);

    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ type: 'error', text: 'Password must be at least 6 characters' });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordMsg({ type: 'success', text: 'Password updated successfully' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMsg({ type: 'error', text: res.error || 'Failed to update password' });
      }
    } catch (err: any) {
      setPasswordMsg({ type: 'error', text: err.message || 'Error updating password' });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const formData = new FormData();
    formData.append('legalName', legalName);
    formData.append('tradeName', tradeName);
    formData.append('address', address);

    const selectedState = INDIAN_STATES.find((s) => s.code === stateCode);
    formData.append('state', selectedState?.name || 'Maharashtra');
    formData.append('stateCode', stateCode);
    formData.append('gstin', gstin.toUpperCase());
    formData.append('pan', pan.toUpperCase());
    formData.append('phone', phone);
    formData.append('email', email);

    formData.append('bankName', bankName);
    formData.append('bankAccountNo', bankAccountNo);
    formData.append('bankIfsc', bankIfsc.toUpperCase());
    formData.append('bankBranch', bankBranch);
    formData.append('upiId', upiId);
    formData.append('logoUrl', logoUrl);

    formData.append('gstStatus', gstStatus);
    formData.append('invoicePrefix', invoicePrefix);
    formData.append('openingSequence', openingSequence);
    formData.append('defaultTerms', defaultTerms);

    try {
      const res = await updateBusinessProfile(formData);
      if (res.success) {
        setSaved(true);
        toast.success('Business profile and settings updated successfully');
        setTimeout(() => setSaved(false), 3000);
      } else {
        toast.error(res.error || 'Failed to update settings');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      toast.error(msg.includes('Minified React error') ? 'Failed to update settings due to server error.' : (msg || 'Failed to update settings'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Settings & Business Profile
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Configure legal identity, bank details, invoice prefix, and sequence numbering.
          </p>
        </div>
        {saved && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
            <CheckCircle size={14} />
            <span>Settings saved successfully!</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Section 1: Business Identity & Tax */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Building size={16} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Business Identity & GST Registration</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Legal Name</label>
              <input
                type="text"
                required
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Trade Name / Brand</label>
              <input
                type="text"
                required
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          {/* Logo Preview and Setting */}
          <div>
            <label className="block font-medium text-slate-700 mb-1">Company Logo</label>
            <div className="flex items-center gap-4 bg-slate-50 p-3 rounded border border-slate-200">
              <div className="h-14 w-28 bg-white border border-slate-200 rounded p-1 flex items-center justify-center shrink-0 shadow-xs">
                <img
                  src={logoUrl || '/logo.png'}
                  alt="Company Logo Preview"
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div className="flex-1 text-xs">
                <input
                  type="text"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="/logo.png"
                  className="w-full border border-slate-300 bg-white rounded px-2.5 py-1.5 font-mono text-xs focus:border-teal-500 outline-none"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Logo file from <code className="bg-slate-200 px-1 rounded text-slate-700">public/logo.png</code> is automatically used across invoice PDFs, print views, sidebar, and login.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Business Registered Address</label>
            <textarea
              rows={2}
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full workshop or factory address in Pune, Maharashtra"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Supplier State & Code</label>
              <select
                value={stateCode}
                onChange={(e) => setStateCode(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none font-medium"
              >
                {INDIAN_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.code} - {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">GSTIN</label>
              <input
                type="text"
                maxLength={15}
                value={gstin}
                onChange={(e) => setGstin(e.target.value.toUpperCase())}
                placeholder="27AABCM1234F1Z1"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">PAN Number</label>
              <input
                type="text"
                maxLength={10}
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                placeholder="AABCM1234F"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">GST Status / Scheme</label>
              <select
                value={gstStatus}
                onChange={(e) => setGstStatus(e.target.value)}
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none font-bold"
              >
                <option value="regular">Regular GST Scheme (Active)</option>
                <option value="composition">Composition Scheme (Bill of Supply)</option>
                <option value="unregistered">Unregistered Business</option>
                <option value="not_confirmed">Unconfirmed / Placeholder</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Contact Phone</label>
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
                placeholder="info@mayurengineers.com"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Bank & UPI Information for Invoices */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Landmark size={16} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Bank Particulars & UPI Payment Details</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. State Bank of India"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Bank Account Number</label>
              <input
                type="text"
                value={bankAccountNo}
                onChange={(e) => setBankAccountNo(e.target.value)}
                placeholder="e.g. 123456789012"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">IFSC Code</label>
              <input
                type="text"
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                placeholder="SBIN0001234"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Branch Name</label>
              <input
                type="text"
                value={bankBranch}
                onChange={(e) => setBankBranch(e.target.value)}
                placeholder="Pune Main Branch"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">UPI ID for Direct Transfers</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="mayurengineers@sbi"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold text-teal-800"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Invoice Numbering & Series */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
            <Receipt size={16} className="text-teal-600" />
            <h2 className="font-semibold text-slate-900 text-sm">Invoice Numbering & Financial Sequence</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-700 mb-1">Invoice Prefix</label>
              <input
                type="text"
                required
                value={invoicePrefix}
                onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="ME"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">Opening Sequence Number</label>
              <input
                type="number"
                min="1"
                required
                value={openingSequence}
                onChange={(e) => setOpeningSequence(e.target.value)}
                placeholder="1"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 font-mono focus:border-teal-500 outline-none font-bold"
              />
            </div>
          </div>

          {/* Sequence Preview Box */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs flex items-center justify-between">
            <span className="text-slate-600 font-medium">Opening Invoice Number Preview:</span>
            <span className="font-mono font-bold text-sm text-teal-800 bg-white px-3 py-1 rounded border border-slate-200 shadow-sm">
              {sequencePreview}
            </span>
          </div>

          <div>
            <label className="block font-medium text-slate-700 mb-1">Default Terms & Conditions</label>
            <textarea
              rows={3}
              value={defaultTerms}
              onChange={(e) => setDefaultTerms(e.target.value)}
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none whitespace-pre-line"
            />
          </div>
        </div>

        {/* Submit button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-md bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs shadow transition"
          >
            <Save size={15} />
            <span>{loading ? 'Saving Settings...' : 'Save Settings'}</span>
          </button>
        </div>
      </form>

      {/* Account Security & Password */}
      <div className="bg-white rounded-lg border border-slate-200 p-5 shadow-sm space-y-4 text-xs mt-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Lock size={16} className="text-teal-600" />
          <h2 className="font-bold text-slate-900 text-sm">Security & Owner Credentials</h2>
        </div>

        {passwordMsg && (
          <div
            className={`p-3 rounded text-xs font-medium ${
              passwordMsg.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border border-rose-200 text-rose-800'
            }`}
          >
            {passwordMsg.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                Confirm New Password <span className="text-rose-500">*</span>
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full border border-slate-300 rounded px-2.5 py-1.5 focus:border-teal-500 outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={passwordLoading}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow transition disabled:opacity-50"
          >
            <Lock size={14} />
            <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
