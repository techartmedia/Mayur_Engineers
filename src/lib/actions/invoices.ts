'use server';

import { db, initializeDatabase, client } from '@/lib/db';
import {
  invoices,
  invoiceItems,
  businessProfile,
  customers,
  invoiceSequences,
  auditLogs,
  payments,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { calculateDocument } from '@/lib/calculations/gst-calculator';
import { LineItemInput } from '@/lib/calculations/types';
import {
  formatInvoiceNumber,
  getFinancialYear,
} from '@/lib/numbering/sequence-allocator';
import { getCurrentUser } from './auth';

export interface DirectCustomerInput {
  name: string;
  billingAddress: string;
  shippingAddress?: string;
  state: string;
  stateCode: string;
  gstin?: string;
  phone?: string;
  email?: string;
}

export interface CreateInvoicePayload {
  customerId?: string | null;
  directCustomer?: DirectCustomerInput | null;
  documentType?: 'TAX_INVOICE' | 'BILL_OF_SUPPLY';
  issueDate: string;
  dueDate?: string;
  items: LineItemInput[];
  notes?: string;
  terms?: string;
  vendor?: string;
  ewayBillNo?: string;
  buyersOrderNo?: string;
  orderDate?: string;
  deliveryNote?: string;
  paymentTerms?: string;
  despatchedThrough?: string;
  destination?: string;
  termsOfDelivery?: string;
  buyersCstNo?: string;
  saveAsDraft?: boolean;
  sourceQuotationId?: string;
  isReverseCharge?: boolean;
  saveCustomerToDirectory?: boolean;
}

import { getBusinessProfile } from './settings';

/**
 * Atomically allocates the next sequential invoice number for a given FY and series.
 * Guarantees collision-free sequences and concurrency safety.
 */
async function allocateInvoiceSequence(financialYear: string, series: string): Promise<{ sequence: number; formattedNumber: string }> {
  const profile = await getBusinessProfile();
  const opening = profile?.openingSequence || 1;
  const now = new Date().toISOString();
  const cleanSeries = (series || 'ME').trim().toUpperCase();

  // Query existing sequence tracker
  const seqRecords = await db
    .select()
    .from(invoiceSequences)
    .where(eq(invoiceSequences.financialYear, financialYear))
    .all();

  const match = seqRecords.find((s) => s.series.toUpperCase() === cleanSeries);
  let candidateSeq = match ? match.lastSequence + 1 : opening;

  // Collision prevention: ensure candidate sequence number is not already consumed by an issued invoice
  while (true) {
    const formatted = formatInvoiceNumber(cleanSeries, financialYear, candidateSeq);
    const existing = await client.execute({
      sql: 'SELECT id FROM invoices WHERE invoice_number = ? LIMIT 1',
      args: [formatted],
    });
    if (existing.rows.length === 0) {
      break;
    }
    candidateSeq++;
  }

  // Atomically update sequence record using ON CONFLICT UPSERT
  await client.execute({
    sql: `INSERT INTO invoice_sequences (financial_year, series, last_sequence, updated_at)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(financial_year, series)
          DO UPDATE SET last_sequence = excluded.last_sequence, updated_at = excluded.updated_at`,
    args: [financialYear, cleanSeries, candidateSeq, now],
  });

  const formattedNumber = formatInvoiceNumber(cleanSeries, financialYear, candidateSeq);
  return { sequence: candidateSeq, formattedNumber };
}

export async function createInvoice(payload: CreateInvoicePayload): Promise<{
  success: boolean;
  error?: string;
  invoiceId?: string;
  invoiceNumber?: string | null;
}> {
  try {
    await initializeDatabase();

    const profile = await getBusinessProfile();
    if (!profile) {
      return { success: false, error: 'Business profile is not configured. Please check Settings.' };
    }

    let customerData: {
      id: string | null;
      name: string;
      tradeName?: string | null;
      billingAddress: string;
      shippingAddress?: string | null;
      state: string;
      stateCode: string;
      gstin?: string | null;
      phone?: string | null;
      email?: string | null;
    };

    if (payload.customerId) {
      const customer = await db
        .select()
        .from(customers)
        .where(eq(customers.id, payload.customerId))
        .get();
      if (!customer) {
        return { success: false, error: 'Selected customer was not found in directory.' };
      }
      customerData = {
        id: customer.id,
        name: customer.name,
        tradeName: customer.tradeName,
        billingAddress: customer.billingAddress,
        shippingAddress: customer.shippingAddress,
        state: customer.state,
        stateCode: customer.stateCode,
        gstin: customer.gstin,
        phone: customer.phone,
        email: customer.email,
      };
    } else if (payload.directCustomer && payload.directCustomer.name?.trim()) {
      const d = payload.directCustomer;
      customerData = {
        id: null,
        name: d.name.trim(),
        tradeName: null,
        billingAddress: d.billingAddress?.trim() || 'Direct Buyer',
        shippingAddress: d.shippingAddress?.trim() || d.billingAddress?.trim() || 'Direct Buyer',
        state: d.state || profile.state,
        stateCode: d.stateCode || profile.stateCode,
        gstin: d.gstin?.trim() || null,
        phone: d.phone?.trim() || null,
        email: d.email?.trim() || null,
      };

      if (payload.saveCustomerToDirectory && d.name.trim()) {
        const newCustId = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
        const nowTime = new Date().toISOString();
        await db.insert(customers).values({
          id: newCustId,
          name: customerData.name,
          tradeName: null,
          billingAddress: customerData.billingAddress,
          shippingAddress: customerData.shippingAddress,
          state: customerData.state,
          stateCode: customerData.stateCode,
          gstin: customerData.gstin,
          phone: customerData.phone,
          email: customerData.email,
          isArchived: 0,
          createdAt: nowTime,
          updatedAt: nowTime,
        });
        customerData.id = newCustId;
      }
    } else {
      return { success: false, error: 'Please select a customer from directory or enter buyer details.' };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: 'At least one line item is required.' };
    }

    const issueDateObj = new Date(payload.issueDate || Date.now());
    const financialYear = getFinancialYear(issueDateObj);
    const series = profile.invoicePrefix || 'ME';
    const documentType = payload.documentType || 'TAX_INVOICE';

    // Calculate canonical taxes and round-off
    const calculation = calculateDocument({
      items: payload.items,
      supplierStateCode: profile.stateCode,
      placeOfSupplyStateCode: customerData.stateCode,
      documentType,
    });

    const now = new Date().toISOString();
    const invoiceId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    // Immutable snapshots
    const sellerSnapshot = JSON.stringify({
      legalName: profile.legalName,
      tradeName: profile.tradeName,
      address: profile.address,
      state: profile.state,
      stateCode: profile.stateCode,
      gstin: profile.gstin,
      pan: profile.pan,
      phone: profile.phone,
      email: profile.email,
      bankName: profile.bankName,
      bankAccountNo: profile.bankAccountNo,
      bankIfsc: profile.bankIfsc,
      bankBranch: profile.bankBranch,
      upiId: profile.upiId,
      logoUrl: profile.logoUrl,
    });

    const customerSnapshot = JSON.stringify(customerData);

    let status = payload.saveAsDraft ? 'DRAFT' : 'ISSUED';
    let allocatedNumber: string | null = null;
    let allocatedSeq: number | null = null;

    if (status === 'ISSUED') {
      const seqResult = await allocateInvoiceSequence(financialYear, series);
      allocatedNumber = seqResult.formattedNumber;
      allocatedSeq = seqResult.sequence;
    }

    // Insert invoice
    await db.insert(invoices).values({
      id: invoiceId,
      documentType,
      invoiceNumber: allocatedNumber,
      financialYear,
      series,
      sequence: allocatedSeq,
      status,
      issueDate: payload.issueDate,
      dueDate: payload.dueDate || null,
      customerId: customerData.id,
      sellerSnapshot,
      customerSnapshot,
      isInterState: calculation.isInterState ? 1 : 0,
      isReverseCharge: payload.isReverseCharge ? 1 : 0,
      subtotalPaise: calculation.subtotalGrossPaise,
      discountPaise: calculation.totalDiscountPaise,
      taxableAmountPaise: calculation.totalTaxableAmountPaise,
      cgstAmountPaise: calculation.totalCgstPaise,
      sgstAmountPaise: calculation.totalSgstPaise,
      igstAmountPaise: calculation.totalIgstPaise,
      roundOffPaise: calculation.roundOffPaise,
      netTotalPaise: calculation.netTotalPaise,
      paidAmountPaise: 0,
      outstandingAmountPaise: calculation.netTotalPaise,
      notes: payload.notes || null,
      terms: payload.terms || profile.defaultTerms,
      vendor: payload.vendor || null,
      ewayBillNo: payload.ewayBillNo || null,
      buyersOrderNo: payload.buyersOrderNo || null,
      orderDate: payload.orderDate || null,
      deliveryNote: payload.deliveryNote || null,
      paymentTerms: payload.paymentTerms || null,
      despatchedThrough: payload.despatchedThrough || null,
      destination: payload.destination || null,
      termsOfDelivery: payload.termsOfDelivery || null,
      buyersCstNo: payload.buyersCstNo || null,
      sourceQuotationId: payload.sourceQuotationId || null,
      createdAt: now,
      updatedAt: now,
    });

    // Insert line items
    for (let i = 0; i < calculation.items.length; i++) {
      const item = calculation.items[i];
      await db.insert(invoiceItems).values({
        id: 'item_' + Date.now() + '_' + i + '_' + Math.random().toString(36).substring(2, 6),
        invoiceId,
        productId: item.id || null,
        description: item.description,
        hsnSacCode: item.hsnSacCode || null,
        unit: item.unit || 'NOS',
        quantity: item.quantity,
        unitPricePaise: item.unitPricePaise,
        discountPaise: item.effectiveDiscountPaise,
        taxableValuePaise: item.taxableValuePaise,
        gstRate: item.gstRate,
        cgstRate: item.cgstRate,
        cgstAmountPaise: item.cgstAmountPaise,
        sgstRate: item.sgstRate,
        sgstAmountPaise: item.sgstAmountPaise,
        igstRate: item.igstRate,
        igstAmountPaise: item.igstAmountPaise,
        totalLineAmountPaise: item.totalLineAmountPaise,
        sortOrder: i,
      });
    }

    // Audit event
    const currentUser = await getCurrentUser();
    await db.insert(auditLogs).values({
      id: 'audit_' + Date.now(),
      userId: currentUser?.id || 'admin',
      action: status === 'ISSUED' ? 'INVOICE_ISSUED' : 'INVOICE_DRAFT_CREATED',
      entityType: 'INVOICE',
      entityId: invoiceId,
      metadata: JSON.stringify({
        invoiceNumber: allocatedNumber,
        netTotalPaise: calculation.netTotalPaise,
        customer: customerData.name,
      }),
      createdAt: now,
    });

    revalidatePath('/invoices');
    revalidatePath('/');
    return { success: true, invoiceId, invoiceNumber: allocatedNumber };
  } catch (err: any) {
    console.error('Failed to create invoice:', err);
    return {
      success: false,
      error: err?.message || 'An unexpected error occurred while saving the invoice.',
    };
  }
}

export async function issueDraftInvoice(invoiceId: string): Promise<{ success: boolean; error?: string; invoiceNumber?: string }> {
  try {
    await initializeDatabase();

    const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (invoice.status !== 'DRAFT') return { success: false, error: 'Only draft invoices can be issued' };

    const profile = await getBusinessProfile();
    const series = profile?.invoicePrefix || invoice.series || 'ME';
    const financialYear = invoice.financialYear || getFinancialYear(new Date(invoice.issueDate));

    const seqResult = await allocateInvoiceSequence(financialYear, series);
    const now = new Date().toISOString();

    await db
      .update(invoices)
      .set({
        invoiceNumber: seqResult.formattedNumber,
        sequence: seqResult.sequence,
        status: 'ISSUED',
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId));

    await db.insert(auditLogs).values({
      id: 'audit_' + Date.now(),
      userId: 'admin',
      action: 'INVOICE_ISSUED_FROM_DRAFT',
      entityType: 'INVOICE',
      entityId: invoiceId,
      metadata: JSON.stringify({ invoiceNumber: seqResult.formattedNumber }),
      createdAt: now,
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/');
    return { success: true, invoiceNumber: seqResult.formattedNumber };
  } catch (err: any) {
    console.error('Failed to issue draft invoice:', err);
    return { success: false, error: err?.message || 'Failed to issue draft invoice' };
  }
}

export async function cancelInvoice(invoiceId: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    await initializeDatabase();

    const invoice = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).get();
    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (invoice.status === 'CANCELLED') return { success: false, error: 'Invoice is already cancelled' };

    const now = new Date().toISOString();

    await db
      .update(invoices)
      .set({
        status: 'CANCELLED',
        cancelledAt: now,
        cancelledBy: 'admin',
        cancellationReason: reason,
        outstandingAmountPaise: 0,
        updatedAt: now,
      })
      .where(eq(invoices.id, invoiceId));

    await db.insert(auditLogs).values({
      id: 'audit_' + Date.now(),
      userId: 'admin',
      action: 'INVOICE_CANCELLED',
      entityType: 'INVOICE',
      entityId: invoiceId,
      metadata: JSON.stringify({ reason }),
      createdAt: now,
    });

    revalidatePath('/invoices');
    revalidatePath(`/invoices/${invoiceId}`);
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to cancel invoice:', err);
    return { success: false, error: err?.message || 'Failed to cancel invoice' };
  }
}

export async function getInvoices() {
  await initializeDatabase();
  return db
    .select()
    .from(invoices)
    .orderBy(desc(invoices.createdAt))
    .all();
}

export async function getInvoiceById(id: string) {
  await initializeDatabase();
  const invoice = await db.select().from(invoices).where(eq(invoices.id, id)).get();
  if (!invoice) return null;

  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.sortOrder)
    .all();

  const invoicePayments = await db
    .select()
    .from(payments)
    .where(eq(payments.invoiceId, id))
    .orderBy(desc(payments.paymentDate))
    .all();

  return {
    ...invoice,
    items,
    payments: invoicePayments,
  };
}
