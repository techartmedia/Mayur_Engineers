import { NextResponse } from 'next/server';
import { client, ensureDatabaseInitialized } from '@/lib/db';

export async function GET() {
  try {
    await ensureDatabaseInitialized();
    await client.execute('SELECT 1');
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      app: 'Mayur Engineers GST Billing Lite',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      database: error?.message || 'failed',
      timestamp: new Date().toISOString(),
    }, { status: 500 });
  }
}

