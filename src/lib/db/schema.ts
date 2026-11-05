import {
  sqliteTable,
  text,
  integer,
  real,
  primaryKey,
} from 'drizzle-orm/sqlite-core';

/**
 * Single-business configuration profile for Mayur Engineers.
 */
export const businessProfile = sqliteTable('business_profile', {
  id: integer('id').primaryKey().default(1),
  legalName: text('legal_name').notNull().default('Mayur Engineers'),
  tradeName: text('trade_name').notNull().default('Mayur Engineers'),
  address: text('address').notNull().default(''),
  state: text('state').notNull().default('Maharashtra'),
  stateCode: text('state_code').notNull().default('27'),
  gstin: text('gstin').default(''),
  pan: text('pan').default(''),
  phone: text('phone').default(''),
  email: text('email').default(''),
  bankName: text('bank_name').default(''),
  bankAccountNo: text('bank_account_no').default(''),
  bankIfsc: text('bank_ifsc').default(''),
  bankBranch: text('bank_branch').default(''),
  upiId: text('upi_id').default(''),
  logoUrl: text('logo_url').default(''),
  /** GST status: 'regular' | 'composition' | 'unregistered' | 'not_confirmed' */
  gstStatus: text('gst_status').notNull().default('regular'),
  /** Default invoice prefix: 'ME' */
  invoicePrefix: text('invoice_prefix').notNull().default('ME'),
  /** Default opening sequence: 1 (starts at 001) */
  openingSequence: integer('opening_sequence').notNull().default(1),
  defaultTerms: text('default_terms').default(''),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Customer directory.
 */
export const customers = sqliteTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  tradeName: text('trade_name'),
  phone: text('phone'),
  email: text('email'),
  billingAddress: text('billing_address').notNull(),
  shippingAddress: text('shipping_address'),
  gstin: text('gstin'),
  state: text('state').notNull(),
  stateCode: text('state_code').notNull(),
  isArchived: integer('is_archived').notNull().default(0),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Product & Service catalogue.
 */
export const products = sqliteTable('products', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  hsnSacCode: text('hsn_sac_code'),
  unit: text('unit').notNull().default('NOS'),
  /** Base selling price in integer paise */
  pricePaise: integer('price_paise').notNull(),
  /** Standard GST rate percentage (e.g. 0, 5, 12, 18, 28) */
  gstRate: real('gst_rate').notNull().default(18.0),
  isActive: integer('is_active').notNull().default(1),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Invoices and sales documents.
 */
export const invoices = sqliteTable('invoices', {
  id: text('id').primaryKey(),
  documentType: text('document_type').notNull().default('TAX_INVOICE'),
  /** Nullable for drafts; set atomically upon issuance */
  invoiceNumber: text('invoice_number').unique(),
  financialYear: text('financial_year').notNull(),
  series: text('series').notNull().default('ME'),
  sequence: integer('sequence'),
  status: text('status').notNull().default('DRAFT'),
  issueDate: text('issue_date').notNull(),
  dueDate: text('due_date'),
  customerId: text('customer_id').references(() => customers.id),
  /** Frozen immutable snapshot of seller details at issuance */
  sellerSnapshot: text('seller_snapshot').notNull(),
  /** Frozen immutable snapshot of customer details at issuance */
  customerSnapshot: text('customer_snapshot').notNull(),
  isInterState: integer('is_inter_state').notNull().default(0),
  isReverseCharge: integer('is_reverse_charge').notNull().default(0),
  subtotalPaise: integer('subtotal_paise').notNull().default(0),
  discountPaise: integer('discount_paise').notNull().default(0),
  taxableAmountPaise: integer('taxable_amount_paise').notNull().default(0),
  cgstAmountPaise: integer('cgst_amount_paise').notNull().default(0),
  sgstAmountPaise: integer('sgst_amount_paise').notNull().default(0),
  igstAmountPaise: integer('igst_amount_paise').notNull().default(0),
  roundOffPaise: integer('round_off_paise').notNull().default(0),
  netTotalPaise: integer('net_total_paise').notNull().default(0),
  paidAmountPaise: integer('paid_amount_paise').notNull().default(0),
  outstandingAmountPaise: integer('outstanding_amount_paise').notNull().default(0),
  notes: text('notes'),
  terms: text('terms'),
  vendor: text('vendor'),
  ewayBillNo: text('eway_bill_no'),
  buyersOrderNo: text('buyers_order_no'),
  orderDate: text('order_date'),
  deliveryNote: text('delivery_note'),
  paymentTerms: text('payment_terms'),
  despatchedThrough: text('despatched_through'),
  destination: text('destination'),
  termsOfDelivery: text('terms_of_delivery'),
  buyersCstNo: text('buyers_cst_no'),
  cancelledAt: text('cancelled_at'),
  cancelledBy: text('cancelled_by'),
  cancellationReason: text('cancellation_reason'),
  sourceQuotationId: text('source_quotation_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Line items belonging to invoices.
 */
export const invoiceItems = sqliteTable('invoice_items', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),
  description: text('description').notNull(),
  hsnSacCode: text('hsn_sac_code'),
  unit: text('unit').default('NOS'),
  quantity: real('quantity').notNull().default(1),
  unitPricePaise: integer('unit_price_paise').notNull(),
  discountPaise: integer('discount_paise').notNull().default(0),
  taxableValuePaise: integer('taxable_value_paise').notNull(),
  gstRate: real('gst_rate').notNull().default(18.0),
  cgstRate: real('cgst_rate').notNull().default(0),
  cgstAmountPaise: integer('cgst_amount_paise').notNull().default(0),
  sgstRate: real('sgst_rate').notNull().default(0),
  sgstAmountPaise: integer('sgst_amount_paise').notNull().default(0),
  igstRate: real('igst_rate').notNull().default(0),
  igstAmountPaise: integer('igst_amount_paise').notNull().default(0),
  totalLineAmountPaise: integer('total_line_amount_paise').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * Quotations.
 */
export const quotations = sqliteTable('quotations', {
  id: text('id').primaryKey(),
  quotationNumber: text('quotation_number').notNull().unique(),
  financialYear: text('financial_year').notNull(),
  series: text('series').notNull().default('QT'),
  sequence: integer('sequence').notNull(),
  status: text('status').notNull().default('DRAFT'),
  date: text('date').notNull(),
  expiryDate: text('expiry_date'),
  customerId: text('customer_id').references(() => customers.id),
  sellerSnapshot: text('seller_snapshot').notNull(),
  customerSnapshot: text('customer_snapshot').notNull(),
  isInterState: integer('is_inter_state').notNull().default(0),
  isReverseCharge: integer('is_reverse_charge').notNull().default(0),
  subtotalPaise: integer('subtotal_paise').notNull().default(0),
  discountPaise: integer('discount_paise').notNull().default(0),
  taxableAmountPaise: integer('taxable_amount_paise').notNull().default(0),
  totalTaxPaise: integer('total_tax_paise').notNull().default(0),
  roundOffPaise: integer('round_off_paise').notNull().default(0),
  netTotalPaise: integer('net_total_paise').notNull().default(0),
  convertedInvoiceId: text('converted_invoice_id'),
  notes: text('notes'),
  terms: text('terms'),
  vendor: text('vendor'),
  ewayBillNo: text('eway_bill_no'),
  buyersOrderNo: text('buyers_order_no'),
  orderDate: text('order_date'),
  deliveryNote: text('delivery_note'),
  paymentTerms: text('payment_terms'),
  despatchedThrough: text('despatched_through'),
  destination: text('destination'),
  termsOfDelivery: text('terms_of_delivery'),
  buyersCstNo: text('buyers_cst_no'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Quotation line items.
 */
export const quotationItems = sqliteTable('quotation_items', {
  id: text('id').primaryKey(),
  quotationId: text('quotation_id')
    .notNull()
    .references(() => quotations.id, { onDelete: 'cascade' }),
  productId: text('product_id').references(() => products.id),
  description: text('description').notNull(),
  hsnSacCode: text('hsn_sac_code'),
  unit: text('unit').default('NOS'),
  quantity: real('quantity').notNull().default(1),
  unitPricePaise: integer('unit_price_paise').notNull(),
  discountPaise: integer('discount_paise').notNull().default(0),
  taxableValuePaise: integer('taxable_value_paise').notNull(),
  gstRate: real('gst_rate').notNull().default(18.0),
  totalLineAmountPaise: integer('total_line_amount_paise').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
});

/**
 * Payment records on invoices.
 */
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoiceId: text('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),
  paymentDate: text('payment_date').notNull(),
  amountPaise: integer('amount_paise').notNull(),
  paymentMethod: text('payment_method').notNull(), // CASH, UPI, BANK_TRANSFER, OTHER
  referenceNumber: text('reference_number'),
  notes: text('notes'),
  createdAt: text('created_at').notNull(),
});

/**
 * Atomic sequence tracking table.
 */
export const invoiceSequences = sqliteTable(
  'invoice_sequences',
  {
    financialYear: text('financial_year').notNull(),
    series: text('series').notNull(),
    lastSequence: integer('last_sequence').notNull().default(0),
    updatedAt: text('updated_at').notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.financialYear, table.series] }),
  })
);

/**
 * Audit trail table for sensitive actions.
 */
export const auditLogs = sqliteTable('audit_logs', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  action: text('action').notNull(), // ISSUE, VOID, PAYMENT_RECORD, SETTINGS_UPDATE
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  metadata: text('metadata'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

/**
 * User accounts for authenticated owner and staff access.
 */
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  username: text('username').unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('owner'), // 'owner' | 'staff'
  mustChangePassword: integer('must_change_password').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

/**
 * Active login sessions.
 */
export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull(),
});
