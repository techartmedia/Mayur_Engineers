'use server';

import { db, initializeDatabase } from '@/lib/db';
import { invoices, payments, auditLogs } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function recordPayment(payload: {
  invoiceId: string;
  amountPaise: number;
  paymentMethod: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'OTHER';
  paymentDate: string;
  referenceNumber?: string;
  notes?: string;
}): Promise<{ success: boolean; error?: string; paymentId?: string }> {
  try {
    await initializeDatabase();

    const invoice = await db
      .select()
      .from(invoices)
      .where(eq(invoices.id, payload.invoiceId))
      .get();

    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (invoice.status === 'CANCELLED') return { success: false, error: 'Cannot record payment on a cancelled invoice' };
    if (payload.amountPaise <= 0) return { success: false, error: 'Payment amount must be greater than zero' };

    const currentPaid = invoice.paidAmountPaise || 0;
    const newPaidAmount = currentPaid + payload.amountPaise;
    const newOutstanding = Math.max(0, invoice.netTotalPaise - newPaidAmount);

    // Status transitions
    const newStatus = newOutstanding === 0 ? 'PAID' : 'PARTIALLY_PAID';
    const now = new Date().toISOString();
    const paymentId = 'pay_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    // Insert payment record
    await db.insert(payments).values({
      id: paymentId,
      invoiceId: payload.invoiceId,
      paymentDate: payload.paymentDate || now.split('T')[0],
      amountPaise: payload.amountPaise,
      paymentMethod: payload.paymentMethod,
      referenceNumber: payload.referenceNumber || null,
      notes: payload.notes || null,
      createdAt: now,
    });

    // Update invoice totals
    await db
      .update(invoices)
      .set({
        paidAmountPaise: newPaidAmount,
        outstandingAmountPaise: newOutstanding,
        status: newStatus,
        updatedAt: now,
      })
      .where(eq(invoices.id, payload.invoiceId));

    // Record audit
    await db.insert(auditLogs).values({
      id: 'audit_' + Date.now(),
      userId: 'admin',
      action: 'PAYMENT_RECORDED',
      entityType: 'PAYMENT',
      entityId: paymentId,
      metadata: JSON.stringify({
        invoiceId: payload.invoiceId,
        invoiceNumber: invoice.invoiceNumber,
        amountPaise: payload.amountPaise,
        method: payload.paymentMethod,
      }),
      createdAt: now,
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${payload.invoiceId}`);
    revalidatePath('/payments');
    revalidatePath('/');
    return { success: true, paymentId };
  } catch (err: any) {
    console.error('Failed to record payment:', err);
    return { success: false, error: err?.message || 'Failed to record payment' };
  }
}

export async function getPayments() {
  await initializeDatabase();
  return db
    .select({
      id: payments.id,
      invoiceId: payments.invoiceId,
      invoiceNumber: invoices.invoiceNumber,
      paymentDate: payments.paymentDate,
      amountPaise: payments.amountPaise,
      paymentMethod: payments.paymentMethod,
      referenceNumber: payments.referenceNumber,
      notes: payments.notes,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .leftJoin(invoices, eq(payments.invoiceId, invoices.id))
    .orderBy(desc(payments.paymentDate))
    .all();
}
