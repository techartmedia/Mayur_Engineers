import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import * as schema from './schema';
import fs from 'fs';
import path from 'path';

// Resolve database file path
const dbPath = process.env.DATABASE_URL || 'file:./data/mayur.db';

// Ensure directory exists if it's a local file path
if (dbPath.startsWith('file:')) {
  const filePath = dbPath.replace('file:', '');
  const dir = path.dirname(path.resolve(filePath));
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Create LibSQL client for local SQLite with WAL mode
export const client = createClient({
  url: dbPath,
});

export const db = drizzle(client, { schema });

let initPromise: Promise<void> | null = null;

/**
 * Initializes database tables and default business profile if not present.
 * Uses singleton caching so table creation and seeding only runs once per process.
 */
export async function initializeDatabase(): Promise<void> {
  if (initPromise) {
    return initPromise;
  }
  initPromise = runMigrationsAndSeed().catch((err) => {
    initPromise = null;
    throw err;
  });
  return initPromise;
}

export const ensureDatabaseInitialized = initializeDatabase;

async function runMigrationsAndSeed() {
  // Configure WAL mode and busy timeout for high concurrency
  try {
    await client.execute('PRAGMA journal_mode = WAL;');
    await client.execute('PRAGMA busy_timeout = 5000;');
  } catch (e) {}

  // Create tables if they do not exist
  await client.execute(`
    CREATE TABLE IF NOT EXISTS business_profile (
      id INTEGER PRIMARY KEY DEFAULT 1,
      legal_name TEXT NOT NULL DEFAULT 'Mayur Engineers',
      trade_name TEXT NOT NULL DEFAULT 'Mayur Engineers',
      address TEXT NOT NULL DEFAULT '',
      state TEXT NOT NULL DEFAULT 'Maharashtra',
      state_code TEXT NOT NULL DEFAULT '27',
      gstin TEXT DEFAULT '',
      pan TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      email TEXT DEFAULT '',
      bank_name TEXT DEFAULT '',
      bank_account_no TEXT DEFAULT '',
      bank_ifsc TEXT DEFAULT '',
      bank_branch TEXT DEFAULT '',
      upi_id TEXT DEFAULT '',
      logo_url TEXT DEFAULT '',
      gst_status TEXT NOT NULL DEFAULT 'regular',
      invoice_prefix TEXT NOT NULL DEFAULT 'ME',
      opening_sequence INTEGER NOT NULL DEFAULT 1,
      default_terms TEXT DEFAULT '',
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trade_name TEXT,
      phone TEXT,
      email TEXT,
      billing_address TEXT NOT NULL,
      shipping_address TEXT,
      gstin TEXT,
      state TEXT NOT NULL,
      state_code TEXT NOT NULL,
      is_archived INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      hsn_sac_code TEXT,
      unit TEXT NOT NULL DEFAULT 'NOS',
      price_paise INTEGER NOT NULL,
      gst_rate REAL NOT NULL DEFAULT 18.0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      document_type TEXT NOT NULL DEFAULT 'TAX_INVOICE',
      invoice_number TEXT UNIQUE,
      financial_year TEXT NOT NULL,
      series TEXT NOT NULL DEFAULT 'ME',
      sequence INTEGER,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      issue_date TEXT NOT NULL,
      due_date TEXT,
      customer_id TEXT REFERENCES customers(id),
      seller_snapshot TEXT NOT NULL,
      customer_snapshot TEXT NOT NULL,
      is_inter_state INTEGER NOT NULL DEFAULT 0,
      subtotal_paise INTEGER NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      taxable_amount_paise INTEGER NOT NULL DEFAULT 0,
      cgst_amount_paise INTEGER NOT NULL DEFAULT 0,
      sgst_amount_paise INTEGER NOT NULL DEFAULT 0,
      igst_amount_paise INTEGER NOT NULL DEFAULT 0,
      round_off_paise INTEGER NOT NULL DEFAULT 0,
      net_total_paise INTEGER NOT NULL DEFAULT 0,
      paid_amount_paise INTEGER NOT NULL DEFAULT 0,
      outstanding_amount_paise INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      terms TEXT,
      cancelled_at TEXT,
      cancelled_by TEXT,
      cancellation_reason TEXT,
      source_quotation_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS invoice_items (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      description TEXT NOT NULL,
      hsn_sac_code TEXT,
      unit TEXT DEFAULT 'NOS',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      taxable_value_paise INTEGER NOT NULL,
      gst_rate REAL NOT NULL DEFAULT 18.0,
      cgst_rate REAL NOT NULL DEFAULT 0,
      cgst_amount_paise INTEGER NOT NULL DEFAULT 0,
      sgst_rate REAL NOT NULL DEFAULT 0,
      sgst_amount_paise INTEGER NOT NULL DEFAULT 0,
      igst_rate REAL NOT NULL DEFAULT 0,
      igst_amount_paise INTEGER NOT NULL DEFAULT 0,
      total_line_amount_paise INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS quotations (
      id TEXT PRIMARY KEY,
      quotation_number TEXT NOT NULL UNIQUE,
      financial_year TEXT NOT NULL,
      series TEXT NOT NULL DEFAULT 'QT',
      sequence INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      date TEXT NOT NULL,
      expiry_date TEXT,
      customer_id TEXT REFERENCES customers(id),
      seller_snapshot TEXT NOT NULL,
      customer_snapshot TEXT NOT NULL,
      is_inter_state INTEGER NOT NULL DEFAULT 0,
      subtotal_paise INTEGER NOT NULL DEFAULT 0,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      taxable_amount_paise INTEGER NOT NULL DEFAULT 0,
      total_tax_paise INTEGER NOT NULL DEFAULT 0,
      round_off_paise INTEGER NOT NULL DEFAULT 0,
      net_total_paise INTEGER NOT NULL DEFAULT 0,
      converted_invoice_id TEXT,
      notes TEXT,
      terms TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS quotation_items (
      id TEXT PRIMARY KEY,
      quotation_id TEXT NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
      product_id TEXT REFERENCES products(id),
      description TEXT NOT NULL,
      hsn_sac_code TEXT,
      unit TEXT DEFAULT 'NOS',
      quantity REAL NOT NULL DEFAULT 1,
      unit_price_paise INTEGER NOT NULL,
      discount_paise INTEGER NOT NULL DEFAULT 0,
      taxable_value_paise INTEGER NOT NULL,
      gst_rate REAL NOT NULL DEFAULT 18.0,
      total_line_amount_paise INTEGER NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
      payment_date TEXT NOT NULL,
      amount_paise INTEGER NOT NULL,
      payment_method TEXT NOT NULL,
      reference_number TEXT,
      notes TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS invoice_sequences (
      financial_year TEXT NOT NULL,
      series TEXT NOT NULL,
      last_sequence INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (financial_year, series)
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      metadata TEXT,
      ip_address TEXT,
      created_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      username TEXT UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'owner',
      must_change_password INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  // Safe backward-compatible column migrations
  try {
    await client.execute('ALTER TABLE invoices ADD COLUMN is_reverse_charge INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await client.execute('ALTER TABLE quotations ADD COLUMN is_reverse_charge INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}
  try {
    await client.execute('ALTER TABLE users ADD COLUMN username TEXT;');
  } catch (e) {}
  try {
    await client.execute('ALTER TABLE users ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {}

  const dispatchCols = [
    'vendor', 'eway_bill_no', 'buyers_order_no', 'order_date',
    'delivery_note', 'payment_terms', 'despatched_through',
    'destination', 'terms_of_delivery', 'buyers_cst_no'
  ];
  for (const col of dispatchCols) {
    try { await client.execute(`ALTER TABLE invoices ADD COLUMN ${col} TEXT;`); } catch (e) {}
    try { await client.execute(`ALTER TABLE quotations ADD COLUMN ${col} TEXT;`); } catch (e) {}
  }

  // Ensure default admin user exists with username 'admin', password 'Mayur@26', and must_change_password = 1
  const existingUsers = await client.execute("SELECT id, must_change_password FROM users WHERE username = 'admin' OR id = 'usr_admin_default' LIMIT 1");
  const defaultHash = bcrypt.hashSync('Mayur@26', 10);
  const now = new Date().toISOString();

  if (existingUsers.rows.length === 0) {
    await client.execute({
      sql: `INSERT INTO users (id, email, username, name, password_hash, role, must_change_password, created_at, updated_at)
            VALUES ('usr_admin_default', 'admin@mayurengineers.com', 'admin', 'Mayur Admin', ?, 'owner', 1, ?, ?)`,
      args: [defaultHash, now, now],
    });
  } else {
    // Keep user's custom password intact; only guarantee username is set to 'admin' if empty
    await client.execute({
      sql: `UPDATE users SET username = 'admin' WHERE id = ? AND (username IS NULL OR username = '')`,
      args: [existingUsers.rows[0].id],
    });
  }

  // Seed or update default business profile
  const existing = await client.execute('SELECT id, gst_status FROM business_profile WHERE id = 1 LIMIT 1');
  if (existing.rows.length === 0) {
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO business_profile (
        id, legal_name, trade_name, address, state, state_code,
        gstin, pan, phone, email, bank_name, bank_account_no,
        bank_ifsc, bank_branch, upi_id, logo_url, gst_status,
        invoice_prefix, opening_sequence, default_terms, updated_at
      ) VALUES (
        1, 'MAYUR ENGINEERS', 'MAYUR ENGINEERS', 'Shop No-2, Dnyaneshwar Nagar, Avhad Farm, Pathardi Phata, Nashik-422009', 'Maharashtra', '27',
        '27CRLPG6253P3Z1', 'CRLPG6253P', '+91 9876543210', 'maayurengineers@gmail.com', 
        'State Bank of India', '12345678901', 'SBIN0001234', 'Pune Main Branch', 
        'mayurengineers@sbi', '/logo.png', 'regular', 'ME', 1,
        'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.', ?
      )`,
      args: [now],
    });
  } else {
    // If the database has old placeholder address, update to verified Nashik address from sample PDF
    await client.execute(`
      UPDATE business_profile
      SET legal_name = 'MAYUR ENGINEERS',
          trade_name = 'MAYUR ENGINEERS',
          address = CASE WHEN address LIKE '%Pune%' OR address = '' THEN 'Shop No-2, Dnyaneshwar Nagar, Avhad Farm, Pathardi Phata, Nashik-422009' ELSE address END,
          gstin = CASE WHEN gstin LIKE '%27AABCM%' OR gstin = '' THEN '27CRLPG6253P3Z1' ELSE gstin END,
          email = CASE WHEN email LIKE '%info@%' OR email = '' THEN 'maayurengineers@gmail.com' ELSE email END,
          default_terms = CASE WHEN default_terms LIKE '%Goods once sold%' OR default_terms = '' THEN 'We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.' ELSE default_terms END,
          gst_status = 'regular'
      WHERE id = 1
    `);
  }

  // Seed default custom job work product if catalogue is empty
  const existingProds = await client.execute('SELECT id FROM products LIMIT 1');
  if (existingProds.rows.length === 0) {
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO products (
        id, name, description, hsn_sac_code, unit, price_paise, gst_rate, is_active, created_at, updated_at
      ) VALUES (
        'prod_custom_jobwork', 'Custom Machining / Job Work', 'Precision fabrication, turning, milling and machining service as per drawing', '9988', 'LOT', 100000, 18.0, 1, ?, ?
      )`,
      args: [now, now],
    });
  }
}
