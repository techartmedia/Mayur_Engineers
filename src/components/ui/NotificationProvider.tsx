'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
}

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning';
}

interface NotificationContextType {
  toast: {
    success: (message: string, title?: string) => void;
    error: (message: string, title?: string) => void;
    warning: (message: string, title?: string) => void;
    info: (message: string, title?: string) => void;
  };
  confirm: (options: string | ConfirmOptions) => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    variant: 'primary' | 'danger' | 'warning';
    resolve: (value: boolean) => void;
  } | null>(null);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, message: string, title?: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const newToast: ToastItem = { id, type, title, message };

      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  const toast = {
    success: (message: string, title?: string) => addToast('success', message, title),
    error: (message: string, title?: string) => addToast('error', message, title),
    warning: (message: string, title?: string) => addToast('warning', message, title),
    info: (message: string, title?: string) => addToast('info', message, title),
  };

  const confirm = useCallback((options: string | ConfirmOptions): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (typeof options === 'string') {
        setConfirmDialog({
          isOpen: true,
          title: 'Confirmation',
          message: options,
          confirmText: 'Confirm',
          cancelText: 'Cancel',
          variant: 'primary',
          resolve,
        });
      } else {
        setConfirmDialog({
          isOpen: true,
          title: options.title || 'Confirmation',
          message: options.message,
          confirmText: options.confirmText || 'Confirm',
          cancelText: options.cancelText || 'Cancel',
          variant: options.variant || 'primary',
          resolve,
        });
      }
    });
  }, []);

  const handleConfirmClose = (result: boolean) => {
    if (confirmDialog) {
      confirmDialog.resolve(result);
      setConfirmDialog(null);
    }
  };

  // Close confirm modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && confirmDialog?.isOpen) {
        handleConfirmClose(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmDialog]);

  return (
    <NotificationContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Floating Toast Notification Container */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none p-3 sm:p-0 no-print"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === 'success';
          const isError = t.type === 'error';
          const isWarning = t.type === 'warning';
          const isInfo = t.type === 'info';

          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full rounded-lg border shadow-lg p-3.5 flex items-start gap-3 transition-all duration-200 bg-white ${
                isSuccess
                  ? 'border-emerald-200 shadow-emerald-500/5'
                  : isError
                  ? 'border-rose-200 shadow-rose-500/5'
                  : isWarning
                  ? 'border-amber-200 shadow-amber-500/5'
                  : 'border-blue-200 shadow-blue-500/5'
              }`}
            >
              <div className="shrink-0 pt-0.5">
                {isSuccess && <CheckCircle2 size={18} className="text-emerald-600" />}
                {isError && <AlertCircle size={18} className="text-rose-600" />}
                {isWarning && <AlertTriangle size={18} className="text-amber-500" />}
                {isInfo && <Info size={18} className="text-blue-600" />}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                {t.title && (
                  <h4 className="text-xs font-semibold text-slate-900 leading-snug">
                    {t.title}
                  </h4>
                )}
                <p className="text-xs text-slate-600 leading-relaxed break-words">
                  {t.message}
                </p>
              </div>

              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-slate-600 rounded transition"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal Dialog */}
      {confirmDialog?.isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150 no-print"
          role="dialog"
          aria-modal="true"
          onClick={() => handleConfirmClose(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-teal-100 text-teal-700'
                }`}
              >
                {confirmDialog.variant === 'danger' ? (
                  <AlertCircle size={20} />
                ) : confirmDialog.variant === 'warning' ? (
                  <AlertTriangle size={20} />
                ) : (
                  <HelpCircle size={20} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm sm:text-base font-semibold text-slate-900 leading-snug">
                  {confirmDialog.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed whitespace-pre-line">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleConfirmClose(false)}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
              >
                {confirmDialog.cancelText}
              </button>
              <button
                type="button"
                onClick={() => handleConfirmClose(true)}
                autoFocus
                className={`px-4 py-2 text-xs font-semibold rounded-lg text-white transition shadow-sm ${
                  confirmDialog.variant === 'danger'
                    ? 'bg-rose-600 hover:bg-rose-700 focus:ring-2 focus:ring-rose-500 focus:ring-offset-1'
                    : confirmDialog.variant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-1'
                    : 'bg-teal-600 hover:bg-teal-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-1'
                }`}
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}

export const useToast = useNotification;
