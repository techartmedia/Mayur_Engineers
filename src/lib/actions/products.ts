'use server';

import { db, initializeDatabase } from '@/lib/db';
import { products } from '@/lib/db/schema';
import { eq, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { toPaise } from '@/lib/calculations/money';

export async function getProducts() {
  await initializeDatabase();
  return db
    .select()
    .from(products)
    .orderBy(desc(products.createdAt))
    .all();
}

export async function getProductById(id: string) {
  await initializeDatabase();
  return db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .get();
}

export async function createProduct(formData: FormData): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await initializeDatabase();

    const name = (formData.get('name') as string)?.trim();
    if (!name) return { success: false, error: 'Product name is required' };

    const description = (formData.get('description') as string)?.trim() || null;
    const hsnSacCode = (formData.get('hsnSacCode') as string)?.trim() || null;
    const unit = (formData.get('unit') as string)?.trim() || 'NOS';
    const priceInput = (formData.get('price') as string) || '0';
    const pricePaise = toPaise(priceInput);
    const gstRate = parseFloat((formData.get('gstRate') as string) || '18.0');

    const now = new Date().toISOString();
    const id = 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

    await db.insert(products).values({
      id,
      name,
      description,
      hsnSacCode,
      unit,
      pricePaise,
      gstRate,
      isActive: 1,
      createdAt: now,
      updatedAt: now,
    });

    revalidatePath('/products');
    return { success: true, id };
  } catch (err: any) {
    console.error('Failed to create product:', err);
    return { success: false, error: err?.message || 'Failed to save product' };
  }
}

export async function updateProduct(id: string, formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    await initializeDatabase();

    const name = (formData.get('name') as string)?.trim();
    if (!name) return { success: false, error: 'Product name is required' };

    const description = (formData.get('description') as string)?.trim() || null;
    const hsnSacCode = (formData.get('hsnSacCode') as string)?.trim() || null;
    const unit = (formData.get('unit') as string)?.trim() || 'NOS';
    const priceInput = (formData.get('price') as string) || '0';
    const pricePaise = toPaise(priceInput);
    const gstRate = parseFloat((formData.get('gstRate') as string) || '18.0');

    const now = new Date().toISOString();

    await db
      .update(products)
      .set({
        name,
        description,
        hsnSacCode,
        unit,
        pricePaise,
        gstRate,
        updatedAt: now,
      })
      .where(eq(products.id, id));

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to update product:', err);
    return { success: false, error: err?.message || 'Failed to update product' };
  }
}

export async function toggleProductActive(id: string, currentStatus: number): Promise<{ success: boolean; error?: string }> {
  try {
    await initializeDatabase();
    const newStatus = currentStatus === 1 ? 0 : 1;
    const now = new Date().toISOString();

    await db
      .update(products)
      .set({ isActive: newStatus, updatedAt: now })
      .where(eq(products.id, id));

    revalidatePath('/products');
    return { success: true };
  } catch (err: any) {
    console.error('Failed to toggle product status:', err);
    return { success: false, error: err?.message || 'Failed to update status' };
  }
}
