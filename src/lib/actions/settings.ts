'use server';

import { db, initializeDatabase } from '@/lib/db';
import { businessProfile } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function getBusinessProfile() {
  await initializeDatabase();
  const profile = await db
    .select()
    .from(businessProfile)
    .where(eq(businessProfile.id, 1))
    .get();

  return profile || null;
}

export async function updateBusinessProfile(formData: FormData) {
  await initializeDatabase();

  const legalName = formData.get('legalName') as string;
  const tradeName = formData.get('tradeName') as string;
  const address = formData.get('address') as string;
  const state = formData.get('state') as string;
  const stateCode = formData.get('stateCode') as string;
  const gstin = formData.get('gstin') as string;
  const pan = formData.get('pan') as string;
  const phone = formData.get('phone') as string;
  const email = formData.get('email') as string;
  const bankName = formData.get('bankName') as string;
  const bankAccountNo = formData.get('bankAccountNo') as string;
  const bankIfsc = formData.get('bankIfsc') as string;
  const bankBranch = formData.get('bankBranch') as string;
  const upiId = formData.get('upiId') as string;
  const logoUrl = (formData.get('logoUrl') as string) || '/logo.png';
  const gstStatus = formData.get('gstStatus') as string;
  const invoicePrefix = formData.get('invoicePrefix') as string;
  const openingSequence = parseInt(formData.get('openingSequence') as string, 10) || 1;
  const defaultTerms = formData.get('defaultTerms') as string;

  const now = new Date().toISOString();

  await db
    .update(businessProfile)
    .set({
      legalName,
      tradeName,
      address,
      state,
      stateCode,
      gstin,
      pan,
      phone,
      email,
      bankName,
      bankAccountNo,
      bankIfsc,
      bankBranch,
      upiId,
      logoUrl,
      gstStatus,
      invoicePrefix,
      openingSequence,
      defaultTerms,
      updatedAt: now,
    })
    .where(eq(businessProfile.id, 1));

  revalidatePath('/settings');
  revalidatePath('/');
  return { success: true };
}
