'use server';

import { db, initializeDatabase, client } from '@/lib/db';
import {
  quotations,
  quotationItems,
  businessProfile,
  customers,
  auditLogs,
} from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { calculateDocument } from '@/lib/calculations/gst-calculator';
import { LineItemInput } from '@/lib/calculations/types';
import { formatInvoiceNumber, getFinancialYear } from '@/lib/numbering/sequence-allocator';
import { createInvoice, DirectCustomerInput } from './invoices';

export interface CreateQuotationPayload {
  customerId?: string | null;
  directCustomer?: DirectCustomerInput | null;
  date: string;
  expiryDate?: string;
  items: LineItemInput[];
  notes?: string;
  terms?: string;
  saveCustomerToDirectory?: boolean;
}

export async function createQuotation(payload: CreateQuotationPayload) {
  await initializeDatabase();

  const profile = await db.select().from(businessProfile).where(eq(businessProfile.id, 1)).get();
  if (!profile) throw new Error('Business profile not configured');

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
    const customer = await db.select().from(customers).where(eq(customers.id, payload.customerId)).get();
    if (!customer) throw new Error('Customer not found');
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
    throw new Error('Please select a customer or enter buyer details');
  }

  const dateObj = new Date(payload.date || Date.now());
  const financialYear = getFinancialYear(dateObj);
  const series = 'QT';

  // Get next quotation sequence
  const existingQuotes = await db.select().from(quotations).where(eq(quotations.financialYear, financialYear)).all();
  const nextSeq = existingQuotes.length + 1;
  const quotationNumber = formatInvoiceNumber(series, financialYear, nextSeq);

  const calculation = calculateDocument({
    items: payload.items,
    supplierStateCode: profile.stateCode,
    placeOfSupplyStateCode: customerData.stateCode,
    documentType: 'TAX_INVOICE',
  });

  const now = new Date().toISOString();
  const quotationId = 'quote_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

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

  await db.insert(quotations).values({
    id: quotationId,
    quotationNumber,
    financialYear,
    series,
    sequence: nextSeq,
    status: 'DRAFT',
    date: payload.date,
    expiryDate: payload.expiryDate || null,
    customerId: customerData.id,
    sellerSnapshot,
    customerSnapshot,
    isInterState: calculation.isInterState ? 1 : 0,
    subtotalPaise: calculation.subtotalGrossPaise,
    discountPaise: calculation.totalDiscountPaise,
    taxableAmountPaise: calculation.totalTaxableAmountPaise,
    totalTaxPaise: calculation.totalTaxPaise,
    roundOffPaise: calculation.roundOffPaise,
    netTotalPaise: calculation.netTotalPaise,
    notes: payload.notes || null,
    terms: payload.terms || profile.defaultTerms,
    createdAt: now,
    updatedAt: now,
  });

  for (let i = 0; i < calculation.items.length; i++) {
    const item = calculation.items[i];
    await db.insert(quotationItems).values({
      id: 'qitem_' + Date.now() + '_' + i,
      quotationId,
      productId: item.id || null,
      description: item.description,
      hsnSacCode: item.hsnSacCode || null,
      unit: item.unit || 'NOS',
      quantity: item.quantity,
      unitPricePaise: item.unitPricePaise,
      discountPaise: item.effectiveDiscountPaise,
      taxableValuePaise: item.taxableValuePaise,
      gstRate: item.gstRate,
      totalLineAmountPaise: item.totalLineAmountPaise,
      sortOrder: i,
    });
  }

  revalidatePath('/quotations');
  return { success: true, quotationId, quotationNumber };
}

export async function convertQuotationToInvoice(quotationId: string) {
  await initializeDatabase();

  const quotation = await db.select().from(quotations).where(eq(quotations.id, quotationId)).get();
  if (!quotation) throw new Error('Quotation not found');
  if (quotation.status === 'CONVERTED') throw new Error('Quotation is already converted');

  const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, quotationId)).all();

  const lineItems: LineItemInput[] = items.map((it) => ({
    description: it.description,
    hsnSacCode: it.hsnSacCode || undefined,
    unit: it.unit || 'NOS',
    quantity: it.quantity,
    unitPricePaise: it.unitPricePaise,
    discountPaise: it.discountPaise,
    gstRate: it.gstRate,
  }));

  const invoiceResult = await createInvoice({
    customerId: quotation.customerId || '',
    issueDate: new Date().toISOString().split('T')[0],
    items: lineItems,
    notes: `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes || ''}`,
    terms: quotation.terms || undefined,
    saveAsDraft: false, // Issue immediately with official sequence
    sourceQuotationId: quotationId,
  });

  const now = new Date().toISOString();
  await db
    .update(quotations)
    .set({
      status: 'CONVERTED',
      convertedInvoiceId: invoiceResult.invoiceId,
      updatedAt: now,
    })
    .where(eq(quotations.id, quotationId));

  await db.insert(auditLogs).values({
    id: 'audit_' + Date.now(),
    userId: 'admin',
    action: 'QUOTATION_CONVERTED_TO_INVOICE',
    entityType: 'QUOTATION',
    entityId: quotationId,
    metadata: JSON.stringify({
      quotationNumber: quotation.quotationNumber,
      invoiceId: invoiceResult.invoiceId,
      invoiceNumber: invoiceResult.invoiceNumber,
    }),
    createdAt: now,
  });

  revalidatePath('/quotations');
  revalidatePath('/invoices');
  revalidatePath('/');
  return { success: true, invoiceId: invoiceResult.invoiceId, invoiceNumber: invoiceResult.invoiceNumber };
}

export async function getQuotations() {
  await initializeDatabase();
  return db.select().from(quotations).orderBy(desc(quotations.createdAt)).all();
}

export async function getQuotationById(id: string) {
  await initializeDatabase();
  const quote = await db.select().from(quotations).where(eq(quotations.id, id)).get();
  if (!quote) return null;

  const items = await db.select().from(quotationItems).where(eq(quotationItems.quotationId, id)).orderBy(quotationItems.sortOrder).all();
  return { ...quote, items };
}
