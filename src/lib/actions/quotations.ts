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

import { getBusinessProfile } from './settings';

export interface CreateQuotationPayload {
  customerId?: string | null;
  directCustomer?: DirectCustomerInput | null;
  date: string;
  expiryDate?: string;
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
  saveCustomerToDirectory?: boolean;
}

export async function createQuotation(payload: CreateQuotationPayload): Promise<{
  success: boolean;
  error?: string;
  quotationId?: string;
  quotationNumber?: string;
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
      const customer = await db.select().from(customers).where(eq(customers.id, payload.customerId)).get();
      if (!customer) {
        return { success: false, error: 'Customer was not found in directory.' };
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
      return { success: false, error: 'Please select a customer or enter buyer details.' };
    }

    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: 'At least one line item is required.' };
    }

    const dateObj = new Date(payload.date || Date.now());
    const financialYear = getFinancialYear(dateObj);
    const series = 'QT';

    // Get next quotation sequence with collision prevention
    let nextSeq = 1;
    const existingQuotes = await db.select().from(quotations).where(eq(quotations.financialYear, financialYear)).all();
    if (existingQuotes.length > 0) {
      const maxSeq = Math.max(...existingQuotes.map((q) => q.sequence || 0), 0);
      nextSeq = maxSeq + 1;
    }

    let quotationNumber = formatInvoiceNumber(series, financialYear, nextSeq);
    while (true) {
      const check = await client.execute({
        sql: 'SELECT id FROM quotations WHERE quotation_number = ? LIMIT 1',
        args: [quotationNumber],
      });
      if (check.rows.length === 0) break;
      nextSeq++;
      quotationNumber = formatInvoiceNumber(series, financialYear, nextSeq);
    }

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
  } catch (err: any) {
    console.error('Failed to create quotation:', err);
    return { success: false, error: err?.message || 'Failed to save quotation' };
  }
}

export async function convertQuotationToInvoice(quotationId: string): Promise<{
  success: boolean;
  error?: string;
  invoiceId?: string;
  invoiceNumber?: string | null;
}> {
  try {
    await initializeDatabase();

    const quotation = await db.select().from(quotations).where(eq(quotations.id, quotationId)).get();
    if (!quotation) return { success: false, error: 'Quotation not found' };
    if (quotation.status === 'CONVERTED') return { success: false, error: 'Quotation is already converted' };

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

    let directCust: DirectCustomerInput | null = null;
    if (!quotation.customerId && quotation.customerSnapshot) {
      try {
        directCust = JSON.parse(quotation.customerSnapshot);
      } catch {}
    }

    const invoiceResult = await createInvoice({
      customerId: quotation.customerId || null,
      directCustomer: directCust,
      issueDate: new Date().toISOString().split('T')[0],
      items: lineItems,
      notes: `Converted from Quotation ${quotation.quotationNumber}. ${quotation.notes || ''}`.trim(),
      terms: quotation.terms || undefined,
      vendor: quotation.vendor || undefined,
      ewayBillNo: quotation.ewayBillNo || undefined,
      buyersOrderNo: quotation.buyersOrderNo || undefined,
      orderDate: quotation.orderDate || undefined,
      deliveryNote: quotation.deliveryNote || undefined,
      paymentTerms: quotation.paymentTerms || undefined,
      despatchedThrough: quotation.despatchedThrough || undefined,
      destination: quotation.destination || undefined,
      termsOfDelivery: quotation.termsOfDelivery || undefined,
      buyersCstNo: quotation.buyersCstNo || undefined,
      saveAsDraft: false, // Issue immediately with official sequence
      sourceQuotationId: quotationId,
    });

    if (!invoiceResult.success || !invoiceResult.invoiceId) {
      return { success: false, error: invoiceResult.error || 'Failed to create invoice from quotation' };
    }

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
  } catch (err: any) {
    console.error('Failed to convert quotation:', err);
    return { success: false, error: err?.message || 'Failed to convert quotation' };
  }
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
