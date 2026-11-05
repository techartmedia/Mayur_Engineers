'use server';

import { db, initializeDatabase, client } from '@/lib/db';
import { businessProfile } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getBusinessProfile() {
  await initializeDatabase();
  let profile = await db
    .select()
    .from(businessProfile)
    .where(eq(businessProfile.id, 1))
    .get();

  if (!profile) {
    // Self-healing: if row 1 is missing, ensure default Mayur Engineers profile exists
    const now = new Date().toISOString();
    await client.execute({
      sql: `INSERT OR REPLACE INTO business_profile (
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
    profile = await db
      .select()
      .from(businessProfile)
      .where(eq(businessProfile.id, 1))
      .get();
  }

  return profile || null;
}

export async function updateBusinessProfile(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await initializeDatabase();

    const legalName = (formData.get('legalName') as string)?.trim() || 'MAYUR ENGINEERS';
    const tradeName = (formData.get('tradeName') as string)?.trim() || legalName;
    const address = (formData.get('address') as string)?.trim() || '';
    const state = (formData.get('state') as string)?.trim() || 'Maharashtra';
    const stateCode = (formData.get('stateCode') as string)?.trim() || '27';
    const gstin = (formData.get('gstin') as string)?.trim().toUpperCase() || '';
    const pan = (formData.get('pan') as string)?.trim().toUpperCase() || '';
    const phone = (formData.get('phone') as string)?.trim() || '';
    const email = (formData.get('email') as string)?.trim() || '';
    const bankName = (formData.get('bankName') as string)?.trim() || '';
    const bankAccountNo = (formData.get('bankAccountNo') as string)?.trim() || '';
    const bankIfsc = (formData.get('bankIfsc') as string)?.trim().toUpperCase() || '';
    const bankBranch = (formData.get('bankBranch') as string)?.trim() || '';
    const upiId = (formData.get('upiId') as string)?.trim() || '';
    const logoUrl = ((formData.get('logoUrl') as string) || '/logo.png').trim();
    const gstStatus = (formData.get('gstStatus') as string) || 'regular';
    const invoicePrefix = ((formData.get('invoicePrefix') as string) || 'ME').trim().toUpperCase();
    const openingSequence = parseInt((formData.get('openingSequence') as string) || '1', 10) || 1;
    const defaultTerms = (formData.get('defaultTerms') as string)?.trim() || '';

    const now = new Date().toISOString();

    await client.execute({
      sql: `INSERT INTO business_profile (
        id, legal_name, trade_name, address, state, state_code,
        gstin, pan, phone, email, bank_name, bank_account_no,
        bank_ifsc, bank_branch, upi_id, logo_url, gst_status,
        invoice_prefix, opening_sequence, default_terms, updated_at
      ) VALUES (
        1, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?
      )
      ON CONFLICT(id) DO UPDATE SET
        legal_name = excluded.legal_name,
        trade_name = excluded.trade_name,
        address = excluded.address,
        state = excluded.state,
        state_code = excluded.state_code,
        gstin = excluded.gstin,
        pan = excluded.pan,
        phone = excluded.phone,
        email = excluded.email,
        bank_name = excluded.bank_name,
        bank_account_no = excluded.bank_account_no,
        bank_ifsc = excluded.bank_ifsc,
        bank_branch = excluded.bank_branch,
        upi_id = excluded.upi_id,
        logo_url = excluded.logo_url,
        gst_status = excluded.gst_status,
        invoice_prefix = excluded.invoice_prefix,
        opening_sequence = excluded.opening_sequence,
        default_terms = excluded.default_terms,
        updated_at = excluded.updated_at`,
      args: [
        legalName, tradeName, address, state, stateCode,
        gstin, pan, phone, email, bankName, bankAccountNo,
        bankIfsc, bankBranch, upiId, logoUrl, gstStatus,
        invoicePrefix, openingSequence, defaultTerms, now,
      ],
    });

    revalidatePath('/settings');
    revalidatePath('/');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update business profile:', err);
    return { success: false, error: err?.message || 'Failed to update settings' };
  }
}
