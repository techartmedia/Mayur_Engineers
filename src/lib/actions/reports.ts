'use server';

import { db, initializeDatabase } from '@/lib/db';
import { invoices, customers, payments } from '@/lib/db/schema';
import { desc, ne } from 'drizzle-orm';

export interface DashboardMetrics {
  totalSalesPaise: number;
  totalInvoicesCount: number;
  totalPaidPaise: number;
  totalOutstandingPaise: number;
  paidInvoicesCount: number;
  pendingInvoicesCount: number;
  draftInvoicesCount: number;
  monthlySales: { month: string; amountPaise: number; count: number }[];
  recentInvoices: any[];
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  await initializeDatabase();

  const allInvoices = await db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .all();

  let totalSalesPaise = 0;
  let totalPaidPaise = 0;
  let totalOutstandingPaise = 0;
  let paidInvoicesCount = 0;
  let pendingInvoicesCount = 0;
  let draftInvoicesCount = 0;

  const monthMap: Record<string, { amountPaise: number; count: number }> = {};

  for (const inv of allInvoices) {
    if (inv.status === 'DRAFT') {
      draftInvoicesCount++;
      continue;
    }

    if (inv.status === 'CANCELLED') {
      continue;
    }

    totalSalesPaise += inv.netTotalPaise;
    totalPaidPaise += inv.paidAmountPaise;
    totalOutstandingPaise += inv.outstandingAmountPaise;

    if (inv.status === 'PAID') {
      paidInvoicesCount++;
    } else {
      pendingInvoicesCount++;
    }

    // Month bucket e.g. "2026-11"
    const monthKey = inv.issueDate ? inv.issueDate.substring(0, 7) : 'Unknown';
    if (!monthMap[monthKey]) {
      monthMap[monthKey] = { amountPaise: 0, count: 0 };
    }
    monthMap[monthKey].amountPaise += inv.netTotalPaise;
    monthMap[monthKey].count += 1;
  }

  const monthlySales = Object.keys(monthMap)
    .sort()
    .map((month) => ({
      month,
      amountPaise: monthMap[month].amountPaise,
      count: monthMap[month].count,
    }));

  return {
    totalSalesPaise,
    totalInvoicesCount: allInvoices.length,
    totalPaidPaise,
    totalOutstandingPaise,
    paidInvoicesCount,
    pendingInvoicesCount,
    draftInvoicesCount,
    monthlySales,
    recentInvoices: allInvoices.slice(0, 5),
  };
}

export async function getSalesReport() {
  await initializeDatabase();
  const list = await db
    .select()
    .from(invoices)
    .where(ne(invoices.status, 'CANCELLED'))
    .orderBy(desc(invoices.issueDate))
    .all();

  return list;
}
