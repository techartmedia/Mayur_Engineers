import { describe, it, expect, beforeAll, vi } from 'vitest';

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

import { initializeDatabase, db } from '@/lib/db';
import { createCustomer, getCustomers } from '@/lib/actions/customers';
import { createProduct, getProducts } from '@/lib/actions/products';
import { createInvoice, getInvoiceById, cancelInvoice } from '@/lib/actions/invoices';
import { createQuotation, convertQuotationToInvoice, getQuotationById } from '@/lib/actions/quotations';
import { recordPayment } from '@/lib/actions/payments';
import { getDashboardMetrics } from '@/lib/actions/reports';
import { toRupees } from '@/lib/calculations/money';

describe('End-to-End Business Workflow Integration Test', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it('supports one-time / direct walk-in buyers without requiring a directory customer', async () => {
    const res = await createInvoice({
      directCustomer: {
        name: 'Omkar Fabrication Works',
        billingAddress: 'Gala 14, MIDC Bhosari, Pune',
        state: 'Maharashtra',
        stateCode: '27',
        gstin: '27AAACP5555M1Z2',
        phone: '+91 9898989898',
      },
      issueDate: '2026-11-05',
      items: [
        {
          description: 'Custom Laser Cut Steel Flange 10mm',
          quantity: 4,
          unitPricePaise: 120000, // ₹1,200.00 each
          gstRate: 18,
        },
      ],
      saveAsDraft: false,
    });

    expect(res.success).toBe(true);
    expect(res.invoiceNumber).toBeDefined();

    const inv = await getInvoiceById(res.invoiceId!);
    expect(inv).toBeDefined();
    expect(inv?.customerId).toBeNull();

    const buyer = JSON.parse(inv!.customerSnapshot);
    expect(buyer.name).toBe('Omkar Fabrication Works');
    expect(buyer.stateCode).toBe('27');
    expect(inv?.taxableAmountPaise).toBe(480000); // 4 * 120000 = 480000
    expect(inv?.cgstAmountPaise).toBe(43200); // 9% of 4800 = 432
    expect(inv?.sgstAmountPaise).toBe(43200); // 9% of 4800 = 432
    expect(inv?.netTotalPaise).toBe(566400); // ₹5,664.00
  });

  it('completes the full billing lifecycle: customer -> quotation -> convert to invoice -> partial payment -> full settlement', async () => {
    // 1. Create a customer
    const custForm = new FormData();
    custForm.append('name', 'Pawar Auto Components Pvt Ltd');
    custForm.append('tradeName', 'Pawar Auto');
    custForm.append('billingAddress', 'Plot 88, Chakan Industrial Area, Pune 410501');
    custForm.append('gstin', '27AABCP1111E1Z9');
    custForm.append('phone', '+91 9822001122');
    custForm.append('email', 'purchase@pawarauto.com');
    custForm.append('state', 'Maharashtra');
    custForm.append('stateCode', '27');

    const customerRes = await createCustomer(custForm);
    expect(customerRes.success).toBe(true);
    expect(customerRes.id).toBeDefined();
    const customerId = customerRes.id!;

    // 2. Create a product
    const prodForm = new FormData();
    prodForm.append('name', 'Hardened CNC Pin 20mm');
    prodForm.append('hsnSacCode', '8483');
    prodForm.append('unit', 'NOS');
    prodForm.append('price', '250.00'); // ₹250.00 each
    prodForm.append('gstRate', '18.0');

    const prodRes = await createProduct(prodForm);
    expect(prodRes.success).toBe(true);
    const productId = prodRes.id!;

    // 3. Create a quotation
    const quoteRes = await createQuotation({
      customerId,
      date: '2026-11-05',
      items: [
        {
          id: productId,
          description: 'Hardened CNC Pin 20mm',
          hsnSacCode: '8483',
          unit: 'NOS',
          quantity: 10,
          unitPricePaise: 25000, // ₹250.00
          discountPaise: 0,
          gstRate: 18,
        },
      ],
      notes: 'Supply within 1 week of confirmation',
    });

    expect(quoteRes.success).toBe(true);
    expect(quoteRes.quotationNumber).toContain('QT/');

    // 4. Convert quotation to official invoice (Real sequence from 001)
    const convertRes = await convertQuotationToInvoice(quoteRes.quotationId!);
    expect(convertRes.success).toBe(true);
    expect(convertRes.invoiceNumber).toContain('ME/');

    const invoiceId = convertRes.invoiceId!;
    const invoice = await getInvoiceById(invoiceId);
    expect(invoice).toBeDefined();
    expect(invoice?.status).toBe('ISSUED');

    expect(invoice?.taxableAmountPaise).toBe(250000);
    expect(invoice?.cgstAmountPaise).toBe(22500);
    expect(invoice?.sgstAmountPaise).toBe(22500);
    expect(invoice?.igstAmountPaise).toBe(0);
    expect(invoice?.netTotalPaise).toBe(295000);
    expect(invoice?.outstandingAmountPaise).toBe(295000);
    expect(invoice?.paidAmountPaise).toBe(0);

    // 5. Record partial payment (₹1,000.00 = 100000 paise)
    const pay1 = await recordPayment({
      invoiceId,
      amountPaise: 100000,
      paymentMethod: 'UPI',
      paymentDate: '2026-11-05',
      referenceNumber: 'UPI/20261105/987654',
      notes: 'Advance 35% payment received via GPay',
    });
    expect(pay1.success).toBe(true);

    const invAfterPay1 = await getInvoiceById(invoiceId);
    expect(invAfterPay1?.status).toBe('PARTIALLY_PAID');
    expect(invAfterPay1?.paidAmountPaise).toBe(100000);
    expect(invAfterPay1?.outstandingAmountPaise).toBe(195000); // ₹1,950.00 remaining

    // 6. Record final payment (₹1,950.00 = 195000 paise)
    const pay2 = await recordPayment({
      invoiceId,
      amountPaise: 195000,
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: '2026-11-06',
      referenceNumber: 'NEFT/PUNB12345678',
      notes: 'Final balance settled via NEFT',
    });
    expect(pay2.success).toBe(true);

    const invAfterPay2 = await getInvoiceById(invoiceId);
    expect(invAfterPay2?.status).toBe('PAID');
    expect(invAfterPay2?.paidAmountPaise).toBe(295000);
    expect(invAfterPay2?.outstandingAmountPaise).toBe(0);

    // 7. Verify dashboard metrics reflect the issued and paid invoice
    const metrics = await getDashboardMetrics();
    expect(metrics.totalPaidPaise).toBeGreaterThanOrEqual(295000);
    expect(metrics.paidInvoicesCount).toBeGreaterThanOrEqual(1);
  });

  it('cancels an invoice with a recorded audit reason and sets outstanding to zero', async () => {
    // Create customer and draft invoice
    const customer = (await getCustomers())[0];
    const invRes = await createInvoice({
      customerId: customer.id,
      issueDate: '2026-11-05',
      items: [
        {
          description: 'Cancelled test machining service',
          quantity: 1,
          unitPricePaise: 50000,
          gstRate: 18,
        },
      ],
      saveAsDraft: false,
    });
    expect(invRes.success).toBe(true);

    const cancelRes = await cancelInvoice(invRes.invoiceId!, 'Client retracted work order due to design change');
    expect(cancelRes.success).toBe(true);

    const cancelledInv = await getInvoiceById(invRes.invoiceId!);
    expect(cancelledInv?.status).toBe('CANCELLED');
    expect(cancelledInv?.cancellationReason).toBe('Client retracted work order due to design change');
    expect(cancelledInv?.outstandingAmountPaise).toBe(0);
  });
});
