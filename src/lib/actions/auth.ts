'use server';

import { db, initializeDatabase, ensureDatabaseInitialized } from '@/lib/db';
import { users, sessions, auditLogs } from '@/lib/db/schema';
import { eq, or, sql } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SESSION_COOKIE_NAME = 'me_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface AuthUser {
  id: string;
  email: string;
  username?: string | null;
  name: string;
  role: string;
  mustChangePassword?: number;
}

/**
 * Retrieves the currently authenticated user from the active session cookie.
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  await ensureDatabaseInitialized();
  let sessionToken: string | undefined;

  try {
    const cookieStore = await cookies();
    sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  } catch (e) {
    // When called outside Next.js request context (e.g. tests or standalone scripts)
    return null;
  }

  if (!sessionToken) {
    return null;
  }

  try {
    const sessionRecord = await db
      .select({
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
        userId: users.id,
        email: users.email,
        username: users.username,
        name: users.name,
        role: users.role,
        mustChangePassword: users.mustChangePassword,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.id, sessionToken))
      .get();

    if (!sessionRecord) {
      return null;
    }

    // Verify session expiration
    if (new Date(sessionRecord.expiresAt) < new Date()) {
      await db.delete(sessions).where(eq(sessions.id, sessionToken));
      cookieStore.delete(SESSION_COOKIE_NAME);
      return null;
    }

    return {
      id: sessionRecord.userId,
      email: sessionRecord.email,
      username: sessionRecord.username,
      name: sessionRecord.name,
      role: sessionRecord.role,
      mustChangePassword: sessionRecord.mustChangePassword,
    };
  } catch (error) {
    console.error('Error fetching current user:', error);
    return null;
  }
}

/**
 * Authenticates user credentials and establishes an encrypted session.
 * Supports both username and email.
 */
export async function login(formData: FormData): Promise<{
  success: boolean;
  error?: string;
  requirePasswordChange?: boolean;
}> {
  await ensureDatabaseInitialized();
  const rawIdentifier = (formData.get('identifier') || formData.get('email') || formData.get('username') as string)?.toString();
  const identifier = rawIdentifier?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!identifier || !password) {
    return { success: false, error: 'Username/email and password are required' };
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(
        or(
          eq(sql`lower(${users.username})`, identifier),
          eq(sql`lower(${users.email})`, identifier)
        )
      )
      .get();

    if (!user) {
      return { success: false, error: 'Invalid username or password' };
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Invalid username or password' };
    }

    // Generate secure random session token
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS).toISOString();
    const now = new Date().toISOString();

    await db.insert(sessions).values({
      id: sessionToken,
      userId: user.id,
      expiresAt,
      createdAt: now,
    });

    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    // Record login audit event
    await db.insert(auditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: user.id,
      action: 'AUTH_LOGIN',
      entityType: 'user',
      entityId: user.id,
      metadata: JSON.stringify({ identifier, mustChangePassword: user.mustChangePassword }),
      createdAt: now,
    });

    return {
      success: true,
      requirePasswordChange: Boolean(user.mustChangePassword === 1),
    };
  } catch (error: any) {
    console.error('Login error:', error);
    return { success: false, error: error.message || 'Authentication error occurred' };
  }
}

/**
 * Updates the user's password when prompted on first login.
 */
export async function setInitialPassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  await initializeDatabase();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized. Please log in first.' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }

  if (newPassword === 'Mayur@26' || newPassword === 'Mayur@2026') {
    return { success: false, error: 'Please choose a different password from the initial default password' };
  }

  try {
    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        mustChangePassword: 0,
        updatedAt: now,
      })
      .where(eq(users.id, currentUser.id));

    await db.insert(auditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      action: 'PASSWORD_INITIAL_CHANGE',
      entityType: 'user',
      entityId: currentUser.id,
      createdAt: now,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Error setting initial password:', error);
    return { success: false, error: error.message || 'Failed to update password' };
  }
}

/**
 * Destroys the active session and logs out the user.
 */
export async function logout(): Promise<void> {
  await initializeDatabase();
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    try {
      const session = await db
        .select()
        .from(sessions)
        .where(eq(sessions.id, sessionToken))
        .get();

      if (session) {
        await db.delete(sessions).where(eq(sessions.id, sessionToken));
        await db.insert(auditLogs).values({
          id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId: session.userId,
          action: 'AUTH_LOGOUT',
          entityType: 'user',
          entityId: session.userId,
          createdAt: new Date().toISOString(),
        });
      }
    } catch (e) {}

    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  redirect('/login');
}

/**
 * Updates the user's password securely.
 */
export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  await initializeDatabase();
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: 'Unauthorized' };
  }

  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: 'New password must be at least 6 characters' };
  }

  try {
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, currentUser.id))
      .get();

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Current password is incorrect' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    const now = new Date().toISOString();

    await db
      .update(users)
      .set({
        passwordHash: newHash,
        updatedAt: now,
      })
      .where(eq(users.id, currentUser.id));

    await db.insert(auditLogs).values({
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser.id,
      action: 'PASSWORD_CHANGE',
      entityType: 'user',
      entityId: currentUser.id,
      createdAt: now,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Password change error:', error);
    return { success: false, error: error.message || 'Failed to update password' };
  }
}
