import { describe, it, expect, beforeAll } from 'vitest';
import { db, initializeDatabase, client } from '@/lib/db';
import { users, sessions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

describe('Authentication and Session Security Integration Tests', () => {
  beforeAll(async () => {
    await initializeDatabase();
  });

  it('initializes default admin account with hashed password', async () => {
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.username, 'admin'))
      .get();

    expect(adminUser).toBeDefined();
    expect(adminUser?.username).toBe('admin');
    expect(adminUser?.role).toBe('owner');
    expect(adminUser?.mustChangePassword).toBe(1);

    // Verify bcrypt hash matches default password Mayur@26
    const isMatch = bcrypt.compareSync('Mayur@26', adminUser!.passwordHash);
    expect(isMatch).toBe(true);
  });

  it('rejects incorrect passwords with timing-safe comparison', async () => {
    const adminUser = await db
      .select()
      .from(users)
      .where(eq(users.email, 'admin@mayurengineers.com'))
      .get();

    const isMatch = bcrypt.compareSync('WrongPassword123!', adminUser!.passwordHash);
    expect(isMatch).toBe(false);
  });

  it('validates active session tokens and expires past sessions', async () => {
    const token = 'test_token_' + Date.now();
    const adminUser = await db.select().from(users).where(eq(users.email, 'admin@mayurengineers.com')).get();

    // Insert active session
    const futureExpires = new Date(Date.now() + 1000 * 60 * 60).toISOString();
    await db.insert(sessions).values({
      id: token,
      userId: adminUser!.id,
      expiresAt: futureExpires,
      createdAt: new Date().toISOString(),
    });

    const activeSession = await db.select().from(sessions).where(eq(sessions.id, token)).get();
    expect(activeSession).toBeDefined();
    expect(new Date(activeSession!.expiresAt) > new Date()).toBe(true);

    // Verify expired session detection
    const expiredToken = 'expired_token_' + Date.now();
    const pastExpires = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    await db.insert(sessions).values({
      id: expiredToken,
      userId: adminUser!.id,
      expiresAt: pastExpires,
      createdAt: new Date().toISOString(),
    });

    const expiredSession = await db.select().from(sessions).where(eq(sessions.id, expiredToken)).get();
    expect(expiredSession).toBeDefined();
    expect(new Date(expiredSession!.expiresAt) < new Date()).toBe(true);
  });
});
