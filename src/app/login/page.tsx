'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login, setInitialPassword } from '@/lib/actions/auth';
import { Lock, User, ArrowRight, ShieldCheck, KeyRound } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mode, setMode] = useState<'LOGIN' | 'FORCE_CHANGE'>('LOGIN');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const formData = new FormData();
    formData.append('identifier', identifier);
    formData.append('password', password);

    try {
      const res = await login(formData);
      if (res.success) {
        if (res.requirePasswordChange) {
          setMode('FORCE_CHANGE');
        } else {
          router.push('/');
          router.refresh();
        }
      } else {
        setError(res.error || 'Invalid username or password');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      setError(msg.includes('Minified React error') ? 'A server error occurred. Please try again.' : (msg || 'An error occurred during login'));
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await setInitialPassword(newPassword);
      if (res.success) {
        router.push('/');
        router.refresh();
      } else {
        setError(res.error || 'Failed to update password');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      setError(msg.includes('Minified React error') ? 'A server error occurred. Please try again.' : (msg || 'An error occurred while updating password'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-white p-2.5 rounded-xl shadow-md inline-flex items-center justify-center border border-slate-700/50">
            <img
              src="/logo.png"
              alt="Mayur Engineers Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Mayur Engineers
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          GST Billing & Invoicing System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-800 py-8 px-6 shadow-xl rounded-xl sm:px-10 border border-slate-700">
          {mode === 'LOGIN' ? (
            <form className="space-y-5" onSubmit={handleLoginSubmit}>
              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="admin"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-900/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-900/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition shadow-sm cursor-pointer"
              >
                <span>{loading ? 'Signing in...' : 'Sign In'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          ) : (
            <form className="space-y-5" onSubmit={handlePasswordChangeSubmit}>
              <div className="border-b border-slate-700 pb-3">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-sm">
                  <KeyRound size={16} />
                  <span>Update Initial Password</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Please choose a new permanent password to secure your Mayur Engineers account.
                </p>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    autoFocus
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-900/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={16} />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-600 rounded-lg bg-slate-900/80 text-white text-sm placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 transition shadow-sm cursor-pointer"
              >
                <span>{loading ? 'Saving...' : 'Set New Password & Enter Dashboard'}</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
