'use server';

import { db, initializeDatabase } from '@/lib/db';
import { customers } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getStateFromGstin } from '@/lib/constants/states';

export async function getCustomers() {
  await initializeDatabase();
  return db
    .select()
    .from(customers)
    .where(eq(customers.isArchived, 0))
    .orderBy(desc(customers.createdAt))
    .all();
}

export async function getCustomerById(id: string) {
  await initializeDatabase();
  return db
    .select()
    .from(customers)
    .where(eq(customers.id, id))
    .get();
}

export async function createCustomer(formData: FormData) {
  await initializeDatabase();

  const name = (formData.get('name') as string)?.trim();
  if (!name) throw new Error('Customer name is required');

  const tradeName = (formData.get('tradeName') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.trim() || null;
  const email = (formData.get('email') as string)?.trim() || null;
  const billingAddress = (formData.get('billingAddress') as string)?.trim();
  if (!billingAddress) throw new Error('Billing address is required');

  const shippingAddress = (formData.get('shippingAddress') as string)?.trim() || billingAddress;
  const gstin = (formData.get('gstin') as string)?.trim().toUpperCase() || null;

  let state = (formData.get('state') as string)?.trim() || 'Maharashtra';
  let stateCode = (formData.get('stateCode') as string)?.trim() || '27';

  // Auto-detect state from GSTIN if provided
  if (gstin && gstin.length >= 2) {
    const detected = getStateFromGstin(gstin);
    if (detected) {
      state = detected.name;
      stateCode = detected.code;
    }
  }

  const notes = (formData.get('notes') as string)?.trim() || null;
  const now = new Date().toISOString();
  const id = 'cust_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

  await db.insert(customers).values({
    id,
    name,
    tradeName,
    phone,
    email,
    billingAddress,
    shippingAddress,
    gstin,
    state,
    stateCode,
    isArchived: 0,
    notes,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath('/customers');
  revalidatePath('/invoices/new');
  return { success: true, id };
}

export async function updateCustomer(id: string, formData: FormData) {
  await initializeDatabase();

  const name = (formData.get('name') as string)?.trim();
  if (!name) throw new Error('Customer name is required');

  const tradeName = (formData.get('tradeName') as string)?.trim() || null;
  const phone = (formData.get('phone') as string)?.trim() || null;
  const email = (formData.get('email') as string)?.trim() || null;
  const billingAddress = (formData.get('billingAddress') as string)?.trim();
  if (!billingAddress) throw new Error('Billing address is required');

  const shippingAddress = (formData.get('shippingAddress') as string)?.trim() || billingAddress;
  const gstin = (formData.get('gstin') as string)?.trim().toUpperCase() || null;

  let state = (formData.get('state') as string)?.trim() || 'Maharashtra';
  let stateCode = (formData.get('stateCode') as string)?.trim() || '27';

  if (gstin && gstin.length >= 2) {
    const detected = getStateFromGstin(gstin);
    if (detected) {
      state = detected.name;
      stateCode = detected.code;
    }
  }

  const notes = (formData.get('notes') as string)?.trim() || null;
  const now = new Date().toISOString();

  await db
    .update(customers)
    .set({
      name,
      tradeName,
      phone,
      email,
      billingAddress,
      shippingAddress,
      gstin,
      state,
      stateCode,
      notes,
      updatedAt: now,
    })
    .where(eq(customers.id, id));

  revalidatePath('/customers');
  return { success: true };
}

export async function archiveCustomer(id: string) {
  await initializeDatabase();
  const now = new Date().toISOString();
  await db
    .update(customers)
    .set({ isArchived: 1, updatedAt: now })
    .where(eq(customers.id, id));

  revalidatePath('/customers');
  return { success: true };
}
