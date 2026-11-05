import { describe, it, expect, beforeAll } from 'vitest';
import { client, db, initializeDatabase } from '@/lib/db';
import { businessProfile, customers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Initialization & Persistence Integration', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it('initializes the database and seeds the default business profile', async () => {
    const profile = await db
      .select()
      .from(businessProfile)
      .where(eq(businessProfile.id, 1))
      .get();

    expect(profile).toBeDefined();
    expect(profile?.legalName?.toUpperCase()).toBe('MAYUR ENGINEERS');
    expect(profile?.gstStatus).toBe('regular');
    expect(profile?.stateCode).toBe('27');
    expect(profile?.invoicePrefix).toBe('ME');
  });

  it('allows inserting and retrieving customer records', async () => {
    const customerId = 'cust_test_' + Date.now();
    const now = new Date().toISOString();

    await db.insert(customers).values({
      id: customerId,
      name: 'Test Precision Engineering',
      tradeName: 'Test Precision',
      billingAddress: 'Plot 10, MIDC Bhosari, Pune',
      state: 'Maharashtra',
      stateCode: '27',
      gstin: '27AABCT9999F1Z1',
      createdAt: now,
      updatedAt: now,
    });

    const inserted = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .get();

    expect(inserted).toBeDefined();
    expect(inserted?.name).toBe('Test Precision Engineering');
    expect(inserted?.gstin).toBe('27AABCT9999F1Z1');
    expect(inserted?.stateCode).toBe('27');
  });
});
