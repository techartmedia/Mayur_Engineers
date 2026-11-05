export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { ensureDatabaseInitialized } = await import('@/lib/db');
    try {
      await ensureDatabaseInitialized();
      console.log('✅ SQLite database initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize SQLite database:', error);
    }
  }
}
