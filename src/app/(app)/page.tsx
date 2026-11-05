import Link from 'next/link';
import { getDashboardMetrics } from '@/lib/actions/reports';
import { getBusinessProfile } from '@/lib/actions/settings';
import { formatINR } from '@/lib/calculations/money';
import { getFinancialYear } from '@/lib/numbering/sequence-allocator';
import {
  TrendingUp,
  Receipt,
  CheckCircle,
  Clock,
  PlusCircle,
  Users,
  FileSpreadsheet,
  ArrowRight,
  Package,
  CreditCard,
  Settings,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const [metrics, profile] = await Promise.all([
    getDashboardMetrics(),
    getBusinessProfile(),
  ]);

  const currentFY = getFinancialYear();

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-lg bg-white p-1 border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Mayur Engineers Logo"
              className="max-h-full max-w-full object-contain"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Dashboard
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Overview of sales, collections, and pending balances.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/invoices/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold shadow-sm transition"
          >
            <PlusCircle size={15} />
            <span>New Invoice</span>
          </Link>
          <Link
            href="/quotations/new"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-sm transition"
          >
            <FileSpreadsheet size={15} />
            <span>New Quote</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Total Sales</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {formatINR(metrics.totalSalesPaise)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              From {metrics.totalInvoicesCount} issued documents
            </div>
          </div>
        </div>

        {/* Total Paid */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Collected / Paid</span>
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-emerald-600">
              {formatINR(metrics.totalPaidPaise)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.paidInvoicesCount} settled invoices
            </div>
          </div>
        </div>

        {/* Outstanding Balance */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Pending Balance</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-amber-600">
              {formatINR(metrics.totalOutstandingPaise)}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.pendingInvoicesCount} invoices pending payment
            </div>
          </div>
        </div>

        {/* Total Invoices Count */}
        <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium uppercase tracking-wider">
            <span>Invoices Count</span>
            <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
              <Receipt size={16} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {metrics.totalInvoicesCount}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {metrics.draftInvoicesCount} drafts in progress
            </div>
          </div>
        </div>
      </div>

      {/* Middle Grid: Recent Invoices & Monthly Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Invoices Table (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Recent Invoices</h2>
            <Link
              href="/invoices"
              className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="overflow-x-auto">
            {metrics.recentInvoices.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No invoices created yet. Click "New Invoice" to create your first invoice starting at <span className="font-mono font-semibold text-slate-600">ME/{currentFY}/001</span>.
              </div>
            ) : (
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-2.5 px-4 font-semibold">Invoice No</th>
                    <th className="py-2.5 px-4 font-semibold">Date</th>
                    <th className="py-2.5 px-4 font-semibold">Amount</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {metrics.recentInvoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {inv.invoiceNumber || 'DRAFT'}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {inv.issueDate}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {formatINR(inv.netTotalPaise)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                            inv.status === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-blue-100 text-blue-800'
                              : inv.status === 'ISSUED'
                              ? 'bg-amber-100 text-amber-800'
                              : inv.status === 'CANCELLED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-teal-600 hover:text-teal-700 font-medium text-xs"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Monthly Breakdown & Quick Navigation (1 Col) */}
        <div className="space-y-6">
          {/* Monthly Breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Monthly Revenue Summary
            </h2>
            {metrics.monthlySales.length === 0 ? (
              <p className="text-xs text-slate-400">
                Monthly revenue aggregations will appear here as invoices are issued.
              </p>
            ) : (
              <div className="space-y-3">
                {metrics.monthlySales.map((m) => (
                  <div
                    key={m.month}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                  >
                    <div>
                      <div className="font-semibold text-slate-800">{m.month}</div>
                      <div className="text-[10px] text-slate-500">{m.count} invoices</div>
                    </div>
                    <div className="font-mono font-bold text-slate-900">
                      {formatINR(m.amountPaise)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Quick Shortcuts
            </h2>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <Link
                href="/customers"
                className="p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-slate-50 text-slate-800 font-medium flex flex-col items-center text-center gap-1 transition"
              >
                <Users size={18} className="text-teal-600" />
                <span>Customers</span>
              </Link>
              <Link
                href="/products"
                className="p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-slate-50 text-slate-800 font-medium flex flex-col items-center text-center gap-1 transition"
              >
                <Package size={18} className="text-teal-600" />
                <span>Products</span>
              </Link>
              <Link
                href="/payments"
                className="p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-slate-50 text-slate-800 font-medium flex flex-col items-center text-center gap-1 transition"
              >
                <CreditCard size={18} className="text-teal-600" />
                <span>Payments</span>
              </Link>
              <Link
                href="/settings"
                className="p-3 rounded border border-slate-200 hover:border-teal-500 hover:bg-slate-50 text-slate-800 font-medium flex flex-col items-center text-center gap-1 transition"
              >
                <Settings size={18} className="text-teal-600" />
                <span>Settings</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
